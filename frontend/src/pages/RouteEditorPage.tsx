import { useState, useCallback, useEffect, useRef } from "react";
import { DrawingEditorControls, useDrawingEditor } from "../components/DrawingEditor";
import { DrawingEditorMap } from "../features/map/DrawingEditorMap";
import { StopEditorControls, useStopEditor } from "../components/StopEditor";
import { StopEditorMap } from "../features/map/StopEditorMap";
import { Route, MapPin, Pentagon, Check } from "lucide-react";
import shuttleData from "../data/shuttle-data.json";
import campusConfig from "../data/campus-config.json";

type EditorTab = "route" | "stops" | "mask";

export function RouteEditorPage() {
    const [activeTab, setActiveTab] = useState<EditorTab>("route");
    const drawingEditor = useDrawingEditor();
    const stopEditor = useStopEditor();

    const routePointsRef = useRef<[number, number][]>(shuttleData.routes[0].directions[0].geometry.coordinates as [number, number][]);
    const maskPointsRef = useRef<[number, number][]>(campusConfig.polygon as [number, number][]);
    const hasLoadedRef = useRef(false);

    const [showToast, setShowToast] = useState(false);

    const handleTabChange = useCallback((newTab: EditorTab) => {
        // Save current state before switching
        if (activeTab === "route") {
            routePointsRef.current = drawingEditor.points;
        } else if (activeTab === "mask") {
            maskPointsRef.current = drawingEditor.points;
        }

        setActiveTab(newTab);

        if (newTab === "route") {
            drawingEditor.changeMode("route");
            drawingEditor.loadData(routePointsRef.current);
        } else if (newTab === "mask") {
            drawingEditor.changeMode("polygon");
            drawingEditor.loadData(maskPointsRef.current);
        }
        // Stops are preserved in useStopEditor hook state
    }, [activeTab, drawingEditor]);

    // Initial load
    useEffect(() => {
        if (!hasLoadedRef.current) {
            drawingEditor.loadData(routePointsRef.current);
            hasLoadedRef.current = true;
        }
    }, [drawingEditor]);

    // Keyboard Shortcut (Ctrl + S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();

                if (activeTab === "stops") {
                    stopEditor.exportStops();
                } else {
                    // drawingEditor handles both route and mask modes
                    drawingEditor.exportData();
                }

                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTab, stopEditor, drawingEditor]);

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Toast Notification */}
            <div
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${showToast ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
                    }`}
            >
                <div className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium">Copied to clipboard!</span>
                </div>
            </div>

            {/* Map - switches based on active tab */}
            <div className="h-full w-full">
                {activeTab === "stops" ? (
                    <StopEditorMap
                        isPlacing={stopEditor.isPlacing}
                        stops={stopEditor.stops}
                        onMapClick={stopEditor.addStop}
                        onStopMove={stopEditor.moveStop}
                    />
                ) : (
                    <DrawingEditorMap
                        mode={activeTab === "mask" ? "polygon" : "route"}
                        isDrawing={drawingEditor.isDrawing}
                        points={drawingEditor.points}
                        onMapClick={drawingEditor.addPoint}
                        onPointMove={drawingEditor.movePoint}
                        onPointInsert={drawingEditor.insertPoint}
                    />
                )}
            </div>

            {/* Tab Selector - Top Left */}
            <div className="absolute left-4 top-4 z-10">
                <div className="glass-card p-1 flex gap-1">
                    <button
                        onClick={() => handleTabChange("route")}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "route"
                            ? "bg-red-500 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <Route className="h-4 w-4" />
                        <span>เส้นทาง</span>
                    </button>
                    <button
                        onClick={() => handleTabChange("stops")}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "stops"
                            ? "bg-blue-500 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <MapPin className="h-4 w-4" />
                        <span>Stops</span>
                    </button>
                    <button
                        onClick={() => handleTabChange("mask")}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "mask"
                            ? "bg-purple-500 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <Pentagon className="h-4 w-4" />
                        <span>Mask</span>
                    </button>
                </div>
            </div>

            {/* Controls Panel - Right Side */}
            <div className="absolute right-4 top-4 z-10">
                {activeTab === "stops" ? (
                    <StopEditorControls
                        isPlacing={stopEditor.isPlacing}
                        stops={stopEditor.stops}
                        editingIndex={stopEditor.editingIndex}
                        onTogglePlacing={stopEditor.togglePlacing}
                        onClear={stopEditor.clear}
                        onUndo={stopEditor.undo}
                        onExport={stopEditor.exportStops}
                        onEditStop={stopEditor.editStop}
                        onUpdateStopName={stopEditor.updateStopName}
                    />
                ) : (
                    <DrawingEditorControls
                        mode={activeTab === "mask" ? "polygon" : "route"}
                        isDrawing={drawingEditor.isDrawing}
                        points={drawingEditor.points}
                        onToggleDrawing={drawingEditor.toggleDrawing}
                        onClear={drawingEditor.clear}
                        onUndo={drawingEditor.undo}
                        onExport={drawingEditor.exportData}
                    />
                )}
            </div>

            {/* Instructions */}
            <div className="glass-card absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2">
                <p className="text-sm text-slate-600">
                    {activeTab === "stops" ? (
                        stopEditor.isPlacing
                            ? "📍 คลิกบนแมพเพื่อวาง Stop (ลากเพื่อย้ายตำแหน่ง)"
                            : "กดปุ่ม 'วาง Stop' เพื่อเริ่มวาง"
                    ) : activeTab === "mask" ? (
                        drawingEditor.isDrawing
                            ? "🔷 คลิกรอบๆ ขอบเขตมหาลัย (3 จุดขึ้นไป)"
                            : "กดปุ่มวาดเพื่อเริ่ม"
                    ) : drawingEditor.isDrawing ? (
                        "🛤️ คลิกบนแมพเพื่อวาดเส้นทาง"
                    ) : (
                        "กดปุ่มวาดเพื่อเริ่ม"
                    )}
                </p>
            </div>
        </div>
    );
}
