import { useState, useCallback, useEffect, useRef } from "react";
import { DrawingEditorControls, useDrawingEditor } from "../components/DrawingEditor";
import { DrawingEditorMap } from "../features/map/DrawingEditorMap";
import { StopEditorControls, useStopEditor } from "../components/StopEditor";
import { StopEditorMap } from "../features/map/StopEditorMap";
import { Route, MapPin, Pentagon, Check } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import shuttleData from "../data/shuttle-data.json";
import campusConfig from "../data/campus-config.json";

type EditorTab = "route" | "stops" | "mask";

type StopPayload = {
  id: string;
  name_th: string;
  name_en?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  direction: "outbound" | "inbound";
  icon?: string;
  color?: string;
};

function normalizeStopPayload(stops: Array<{
  id: string;
  position: [number, number];
  name_th: string;
  name_en: string;
  icon?: string;
  color?: string;
}>): StopPayload[] {
  return stops.map((stop, index) => ({
    id: stop.id?.trim() ? stop.id : `stop-${index + 1}`,
    name_th: stop.name_th?.trim() ? stop.name_th : `Stop ${index + 1}`,
    name_en: stop.name_en?.trim() ? stop.name_en : `Stop ${index + 1}`,
    latitude: stop.position[1],
    longitude: stop.position[0],
    sequence: index + 1,
    direction: "outbound",
    icon: stop.icon ?? "MapPin",
    color: stop.color,
  }));
}

export function RouteEditorPage() {
  const [activeTab, setActiveTab] = useState<EditorTab>("route");
  const drawingEditor = useDrawingEditor();
  const stopEditor = useStopEditor();

  const routePointsRef = useRef<[number, number][]>(
    shuttleData.routes[0].directions[0].geometry.coordinates as [number, number][]
  );
  const maskPointsRef = useRef<[number, number][]>(campusConfig.polygon as [number, number][]);
  const hasLoadedRef = useRef(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Saved");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setShowToast(false), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleTabChange = useCallback(
    (newTab: EditorTab) => {
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
    },
    [activeTab, drawingEditor]
  );

  useEffect(() => {
    if (!hasLoadedRef.current) {
      drawingEditor.loadData(routePointsRef.current);
      hasLoadedRef.current = true;
    }
  }, [drawingEditor]);

  const persistEditorData = useCallback(async () => {
    const routeCoordinates = activeTab === "route" ? drawingEditor.points : routePointsRef.current;
    const polygon = activeTab === "mask" ? drawingEditor.points : maskPointsRef.current;
    const stops = normalizeStopPayload(stopEditor.stops);

    const res = await fetch("/api/editor/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        routeCoordinates,
        polygon,
        stops,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = typeof body?.error === "string" ? body.error : "Failed to save editor data";
      throw new Error(message);
    }

    routePointsRef.current = routeCoordinates;
    maskPointsRef.current = polygon;
  }, [activeTab, drawingEditor.points, stopEditor.stops]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();

        void persistEditorData()
          .then(() => {
            showToastMessage("Saved to JSON files");
          })
          .catch((error: unknown) => {
            console.error(error);
            showToastMessage("Save failed");
          });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [persistEditorData, showToastMessage]);

  const handleDrawingExport = useCallback(() => {
    drawingEditor.exportData();
    void persistEditorData()
      .then(() => {
        showToastMessage("Copied and saved");
      })
      .catch((error: unknown) => {
        console.error(error);
        showToastMessage("Copied, but save failed");
      });
  }, [drawingEditor, persistEditorData, showToastMessage]);

  const handleStopsExport = useCallback(() => {
    stopEditor.exportStops();
    void persistEditorData()
      .then(() => {
        showToastMessage("Copied and saved");
      })
      .catch((error: unknown) => {
        console.error(error);
        showToastMessage("Copied, but save failed");
      });
  }, [persistEditorData, showToastMessage, stopEditor]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div
        className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 transform transition-all duration-300 pointer-events-none ${
          showToast ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        <div className="glass-card-dark flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg">
          <Check className="h-4 w-4 text-fresh" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      </div>

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

      <div className="absolute left-4 top-4 z-10">
        <div className="glass-card flex gap-1 p-1">
          <button
            onClick={() => handleTabChange("route")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "route"
                ? "bg-red-500 text-white"
                : "text-[var(--color-text)] hover:bg-[var(--color-surface-lighter)]"
            }`}
          >
            <Route className="h-4 w-4" />
            <span>Route</span>
          </button>
          <button
            onClick={() => handleTabChange("stops")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "stops"
                ? "bg-blue-500 text-white"
                : "text-[var(--color-text)] hover:bg-[var(--color-surface-lighter)]"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Stops</span>
          </button>
          <button
            onClick={() => handleTabChange("mask")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "mask"
                ? "bg-purple-500 text-white"
                : "text-[var(--color-text)] hover:bg-[var(--color-surface-lighter)]"
            }`}
          >
            <Pentagon className="h-4 w-4" />
            <span>Mask</span>
          </button>
        </div>
      </div>

      <ThemeToggle className="absolute right-4 top-20 z-20 md:right-[272px] md:top-4" />

      <div className="absolute right-4 top-4 z-10">
        {activeTab === "stops" ? (
          <StopEditorControls
            isPlacing={stopEditor.isPlacing}
            stops={stopEditor.stops}
            editingIndex={stopEditor.editingIndex}
            onTogglePlacing={stopEditor.togglePlacing}
            onClear={stopEditor.clear}
            onUndo={stopEditor.undo}
            onExport={handleStopsExport}
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
            onExport={handleDrawingExport}
          />
        )}
      </div>

      <div className="glass-card absolute bottom-4 left-1/2 z-10 -translate-x-1/2 px-4 py-2">
        <p className="text-sm text-[var(--color-text-muted)]">
          {activeTab === "stops"
            ? stopEditor.isPlacing
              ? "Click map to place stops"
              : "Enable place mode to add stops"
            : activeTab === "mask"
              ? drawingEditor.isDrawing
                ? "Click map to draw mask polygon"
                : "Press draw to start mask"
              : drawingEditor.isDrawing
                ? "Click map to draw route"
                : "Press draw to start route"}
        </p>
      </div>
    </div>
  );
}
