import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { DrawingEditorControls, useDrawingEditor } from "../components/DrawingEditor";
import { StopEditorControls, type StopMarker, useStopEditor } from "../components/StopEditor";
import { DrawingEditorMap } from "../features/map/DrawingEditorMap";
import { StopEditorMap } from "../features/map/StopEditorMap";
import { Route, MapPin, Pentagon, Check, PanelBottomClose, PanelBottomOpen } from "lucide-react";

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

type EditorBootstrapResponse = {
  ok?: boolean;
  data?: {
    routeCoordinates?: unknown;
    polygon?: unknown;
    stops?: unknown;
  };
  error?: string;
};

type PersistErrorCode = "UNAUTHORIZED" | "FORBIDDEN";

type PersistError = Error & {
  code?: PersistErrorCode;
};

function createPersistError(message: string, code?: PersistErrorCode): PersistError {
  const error = new Error(message) as PersistError;
  error.code = code;
  return error;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLngLat(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1])
  );
}

function normalizeLngLatList(value: unknown): [number, number][] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isLngLat);
}

function normalizeEditorStops(value: unknown): StopMarker[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item, index) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const stop = item as Partial<StopPayload>;

      if (!isFiniteNumber(stop.longitude) || !isFiniteNumber(stop.latitude)) {
        return [];
      }

      const sequence = isFiniteNumber(stop.sequence) ? stop.sequence : index + 1;

      return [
        {
          sequence,
          marker: {
            id: typeof stop.id === "string" && stop.id.trim() ? stop.id : `stop-${index + 1}`,
            position: [stop.longitude, stop.latitude] as [number, number],
            name_th: typeof stop.name_th === "string" ? stop.name_th : "",
            name_en: typeof stop.name_en === "string" ? stop.name_en : "",
            icon: typeof stop.icon === "string" ? stop.icon : undefined,
            color: typeof stop.color === "string" ? stop.color : undefined,
          },
        },
      ];
    })
    .sort((left, right) => left.sequence - right.sequence)
    .map((entry) => entry.marker);
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialTab: EditorTab =
    initialTabParam === "stops" || initialTabParam === "mask" ? initialTabParam : "route";
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [panelOpen, setPanelOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const drawingEditor = useDrawingEditor();
  const stopEditor = useStopEditor();

  const routePointsRef = useRef<[number, number][]>([]);
  const maskPointsRef = useRef<[number, number][]>([]);
  const hasLoadedRef = useRef(false);
  const skipNextAutoSaveRef = useRef(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

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

  // We use a ref to capture the initial theme when the component first mounts.
  const originalThemeRef = useRef<string | undefined>(undefined);

  // Capture the initial theme on mount, and restore it on unmount.
  useEffect(() => {
    // Only set the original theme once to avoid overwriting it if theme changes while mounted.
    if (originalThemeRef.current === undefined) {
      originalThemeRef.current = theme;
    }

    setTheme("light");

    return () => {
      // When unmounting, if we had an original theme and it's not light, restore it.
      if (originalThemeRef.current && originalThemeRef.current !== "light") {
        setTheme(originalThemeRef.current);
      }
    };
  }, []);

  const applyDrawingDataForTab = useCallback(
    (tab: EditorTab) => {
      if (tab === "mask") {
        drawingEditor.changeMode("polygon");
        drawingEditor.loadData(maskPointsRef.current);
        return;
      }

      drawingEditor.changeMode("route");
      drawingEditor.loadData(routePointsRef.current);
    },
    [drawingEditor.changeMode, drawingEditor.loadData]
  );

  const handleTabChange = useCallback(
    (newTab: EditorTab) => {
      if (!hasLoadedRef.current) {
        return;
      }

      if (activeTab === "route") {
        routePointsRef.current = drawingEditor.points;
      } else if (activeTab === "mask") {
        maskPointsRef.current = drawingEditor.points;
      }

      setActiveTab(newTab);

      if (newTab !== "stops") {
        applyDrawingDataForTab(newTab);
      }

      if (newTab !== activeTab) {
        router.replace(`/editor?tab=${newTab}`);
      }
    },
    [activeTab, applyDrawingDataForTab, drawingEditor.points, router]
  );

  const handlePersistFailure = useCallback(
    (error: unknown, fallbackMessage: string) => {
      console.error(error);

      const code = error instanceof Error && "code" in error ? (error as PersistError).code : undefined;

      if (code === "UNAUTHORIZED") {
        showToastMessage("Session expired. Sign in again.");
        router.replace("/login?next=/editor&reason=session-expired");
        return;
      }

      if (code === "FORBIDDEN") {
        showToastMessage("Editor role required.");
        router.replace("/unauthorized");
        return;
      }

      showToastMessage(fallbackMessage);
    },
    [router, showToastMessage]
  );

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }

    let cancelled = false;

    const loadInitialEditorData = async () => {
      try {
        const res = await fetch("/api/editor/save", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as EditorBootstrapResponse;

        if (!res.ok) {
          if (res.status === 401) {
            throw createPersistError("Authentication required", "UNAUTHORIZED");
          }

          if (res.status === 403) {
            throw createPersistError("Editor role required", "FORBIDDEN");
          }

          throw createPersistError(body.error ?? "Failed to load editor data");
        }

        if (cancelled) {
          return;
        }

        routePointsRef.current = normalizeLngLatList(body.data?.routeCoordinates);
        maskPointsRef.current = normalizeLngLatList(body.data?.polygon);
        skipNextAutoSaveRef.current = true;
        stopEditor.loadStops(normalizeEditorStops(body.data?.stops));

        applyDrawingDataForTab(activeTab);
        hasLoadedRef.current = true;
      } catch (error) {
        if (!cancelled) {
          handlePersistFailure(error, "Failed to load editor data");
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void loadInitialEditorData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, applyDrawingDataForTab, handlePersistFailure, stopEditor.loadStops]);

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
      if (res.status === 401) {
        throw createPersistError("Authentication required", "UNAUTHORIZED");
      }

      if (res.status === 403) {
        throw createPersistError("Editor role required", "FORBIDDEN");
      }

      const body = await res.json().catch(() => ({}));
      const message = typeof body?.error === "string" ? body.error : "Failed to save editor data";
      throw createPersistError(message);
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
            showToastMessage("Saved to server");
          })
          .catch((error: unknown) => {
            handlePersistFailure(error, "Save failed");
          });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePersistFailure, persistEditorData, showToastMessage]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void persistEditorData().catch((error: unknown) => {
        console.error("Auto-save failed:", error);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [drawingEditor.points, stopEditor.stops, persistEditorData]);

  const handleDrawingExport = useCallback(() => {
    drawingEditor.exportData();
    void persistEditorData()
      .then(() => {
        showToastMessage("Copied and saved");
      })
      .catch((error: unknown) => {
        handlePersistFailure(error, "Copied, but save failed");
      });
  }, [drawingEditor, handlePersistFailure, persistEditorData, showToastMessage]);

  const handleStopsExport = useCallback(() => {
    stopEditor.exportStops();
    void persistEditorData()
      .then(() => {
        showToastMessage("Copied and saved");
      })
      .catch((error: unknown) => {
        handlePersistFailure(error, "Copied, but save failed");
      });
  }, [handlePersistFailure, persistEditorData, showToastMessage, stopEditor]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {isBootstrapping && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.18)] backdrop-blur-sm">
          <div className="glass-card-dark flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span className="text-sm font-medium">Loading saved editor data...</span>
          </div>
        </div>
      )}

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

      {/* Top bar: tabs (left) + theme/logout (right) */}
      <div className="absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
        <div className="glass-card flex gap-1 p-1">
          <button
            onClick={() => handleTabChange("route")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
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
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
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
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
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

      {/* Editor controls panel — bottom-left, above status bar */}
      <div className="absolute bottom-14 left-3 z-10 w-[min(280px,calc(100vw-24px))] sm:left-4 sm:w-[260px]">
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setPanelOpen((prev) => !prev)}
          className="mb-2 inline-flex items-center gap-1.5 rounded-xl bg-[var(--glass-strong-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] shadow-md backdrop-blur-md transition-colors hover:bg-[var(--color-surface-lighter)]"
          style={{ border: '1px solid var(--glass-border)' }}
        >
          {panelOpen ? <PanelBottomClose className="h-3.5 w-3.5" /> : <PanelBottomOpen className="h-3.5 w-3.5" />}
          <span>{panelOpen ? "ซ่อน" : "แสดงเครื่องมือ"}</span>
        </button>

        {panelOpen && (
          activeTab === "stops" ? (
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
          )
        )}
      </div>

      {/* Status hint — bottom center */}
      <div className="glass-card absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 sm:bottom-4 sm:px-4 sm:py-2">
        <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">
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
