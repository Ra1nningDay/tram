import { useState, useCallback } from "react";
import { Route, Pencil, Undo2, Trash2, Copy, Check, Square } from "lucide-react";

type RouteEditorControlsProps = {
    isDrawing: boolean;
    points: [number, number][];
    onToggleDrawing: () => void;
    onClear: () => void;
    onUndo: () => void;
    onExport: () => void;
};

export function RouteEditorControls({
    isDrawing,
    points,
    onToggleDrawing,
    onClear,
    onUndo,
    onExport,
}: RouteEditorControlsProps) {
    const [copied, setCopied] = useState(false);

    const handleExport = () => {
        onExport();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-card p-4 animate-slideUp min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
                <Route className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-800">Route Editor</h3>
            </div>

            <div className="flex flex-col gap-2">
                <button
                    onClick={onToggleDrawing}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isDrawing
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-primary text-white hover:bg-red-700"
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
                            <span>วาดเส้นทาง</span>
                        </>
                    )}
                </button>

                {points.length > 0 && (
                    <>
                        <div className="text-xs text-slate-500 text-center">
                            {points.length} จุด
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onUndo}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            >
                                <Undo2 className="h-4 w-4" />
                            </button>

                            <button
                                onClick={onClear}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

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
                    </>
                )}
            </div>
        </div>
    );
}

// Hook for managing route drawing state
export function useRouteEditor() {
    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<[number, number][]>([]);

    const toggleDrawing = useCallback(() => {
        setIsDrawing((prev) => !prev);
    }, []);

    const addPoint = useCallback((lngLat: [number, number]) => {
        setPoints((prev) => [...prev, lngLat]);
    }, []);

    const undo = useCallback(() => {
        setPoints((prev) => prev.slice(0, -1));
    }, []);

    const clear = useCallback(() => {
        setPoints([]);
    }, []);

    const exportCoordinates = useCallback(() => {
        const json = JSON.stringify(points, null, 2);
        navigator.clipboard.writeText(json);
        console.log("Route coordinates:", json);
    }, [points]);

    return {
        isDrawing,
        points,
        toggleDrawing,
        addPoint,
        undo,
        clear,
        exportCoordinates,
    };
}
