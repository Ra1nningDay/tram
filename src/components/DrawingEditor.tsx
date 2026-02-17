import { useState, useCallback } from "react";
import { Route, Pentagon, Pencil, Undo2, Trash2, Copy, Check, Square } from "lucide-react";

type DrawMode = "route" | "polygon";

type DrawingEditorControlsProps = {
    mode: DrawMode;
    isDrawing: boolean;
    points: [number, number][];
    onToggleDrawing: () => void;
    onClear: () => void;
    onUndo: () => void;
    onExport: () => void;
};

export function DrawingEditorControls({
    mode,
    isDrawing,
    points,
    onToggleDrawing,
    onClear,
    onUndo,
    onExport,
}: DrawingEditorControlsProps) {
    const [copied, setCopied] = useState(false);

    const handleExport = () => {
        onExport();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isPolygon = mode === "polygon";
    const canExport = isPolygon ? points.length >= 3 : points.length >= 2;

    return (
        <div className="glass-card p-4 animate-slideUp min-w-[220px]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                {isPolygon ? (
                    <Pentagon className="h-4 w-4 text-purple-500" />
                ) : (
                    <Route className="h-4 w-4 text-red-500" />
                )}
                <h3 className="text-sm font-bold text-[var(--color-text)]">
                    {isPolygon ? "Mask Editor" : "Route Editor"}
                </h3>
            </div>

            <div className="flex flex-col gap-2">
                {/* Draw Button */}
                <button
                    onClick={onToggleDrawing}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isDrawing
                        ? "bg-[var(--color-surface-dark)] text-[var(--color-text)] hover:opacity-90"
                        : isPolygon
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                >
                    {isDrawing ? (
                        <>
                            <Square className="h-4 w-4" />
                            <span>หยุดวาด</span>
                        </>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4" />
                            <span>{isPolygon ? "วาด Polygon" : "วาดเส้นทาง"}</span>
                        </>
                    )}
                </button>

                {points.length > 0 && (
                    <>
                        <div className="text-xs text-[var(--color-text-muted)] text-center">
                            {points.length} จุด {isPolygon && points.length < 3 && "(ต้องการ 3+)"}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onUndo}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-surface-lighter)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:brightness-95"
                            >
                                <Undo2 className="h-4 w-4" />
                            </button>

                            <button
                                onClick={onClear}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-surface-lighter)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:brightness-95"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {canExport && (
                            <button
                                onClick={handleExport}
                                className="flex items-center justify-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>คัดลอกแล้ว</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        <span>Export</span>
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>

            {isDrawing && (
                <p className="mt-3 text-xs text-[var(--color-text-muted)] text-center">
                    {isPolygon
                        ? "คลิกบนแมพเพื่อวาด Polygon"
                        : "คลิกบนแมพเพื่อวาดเส้นทาง"
                    }
                </p>
            )}
        </div>
    );
}

export function useDrawingEditor() {
    const [mode, setMode] = useState<DrawMode>("route");
    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<[number, number][]>([]);

    const toggleDrawing = useCallback(() => {
        setIsDrawing((prev) => !prev);
    }, []);

    const changeMode = useCallback((newMode: DrawMode) => {
        setMode(newMode);
        setPoints([]);
        setIsDrawing(false);
    }, []);

    const loadData = useCallback((newPoints: [number, number][]) => {
        setPoints(newPoints);
    }, []);

    const addPoint = useCallback((lngLat: [number, number]) => {
        setPoints((prev) => [...prev, lngLat]);
    }, []);

    const movePoint = useCallback((index: number, lngLat: [number, number]) => {
        setPoints((prev) => {
            const newPoints = [...prev];
            newPoints[index] = lngLat;
            return newPoints;
        });
    }, []);

    const insertPoint = useCallback((index: number, lngLat: [number, number]) => {
        setPoints((prev) => {
            const newPoints = [...prev];
            newPoints.splice(index, 0, lngLat);
            return newPoints;
        });
    }, []);

    const undo = useCallback(() => {
        setPoints((prev) => prev.slice(0, -1));
    }, []);

    const clear = useCallback(() => {
        setPoints([]);
    }, []);

    const exportData = useCallback(() => {
        let code: string;
        if (mode === "polygon") {
            code = JSON.stringify(points, null, 2);
        } else {
            const geojson = {
                type: "LineString",
                coordinates: points,
            };
            code = JSON.stringify(geojson, null, 2);
        }
        navigator.clipboard.writeText(code);
        console.log(`Exported ${mode}:`, code);
    }, [mode, points]);

    return {
        mode,
        isDrawing,
        points,
        changeMode,
        toggleDrawing,
        addPoint,
        movePoint,
        insertPoint,
        undo,
        clear,
        exportData,
        loadData,
    };
}

