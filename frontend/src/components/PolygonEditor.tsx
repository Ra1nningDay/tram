import { useState, useCallback } from "react";
import { Pentagon, Pencil, Trash2, Copy, Check, Undo2 } from "lucide-react";

type PolygonEditorControlsProps = {
    isDrawing: boolean;
    points: [number, number][];
    onToggleDrawing: () => void;
    onClear: () => void;
    onUndo: () => void;
    onExport: () => void;
};

export function PolygonEditorControls({
    isDrawing,
    points,
    onToggleDrawing,
    onClear,
    onUndo,
    onExport,
}: PolygonEditorControlsProps) {
    const [copied, setCopied] = useState(false);

    const handleExport = () => {
        onExport();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-card p-4 animate-slideUp min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
                <Pentagon className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-bold text-slate-800">Polygon Mask</h3>
            </div>

            <div className="flex flex-col gap-2">
                <button
                    onClick={onToggleDrawing}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isDrawing
                        ? "bg-purple-500 text-white hover:bg-purple-600"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                        }`}
                >
                    <Pencil className="h-4 w-4" />
                    <span>{isDrawing ? "กำลังวาด..." : "วาด Polygon"}</span>
                </button>

                {points.length > 0 && (
                    <>
                        <div className="text-xs text-slate-500 text-center">
                            {points.length} จุด {points.length >= 3 ? "✓" : "(ต้องการ 3+)"}
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

                        {points.length >= 3 && (
                            <button
                                onClick={handleExport}
                                className="flex items-center justify-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                <span>{copied ? "คัดลอกแล้ว" : "Export"}</span>
                            </button>
                        )}
                    </>
                )}
            </div>

            {isDrawing && (
                <p className="mt-3 text-xs text-slate-500">
                    คลิกรอบๆ ขอบเขตมหาลัย
                </p>
            )}
        </div>
    );
}

// Hook for managing polygon drawing state
export function usePolygonEditor() {
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

    const exportPolygon = useCallback(() => {
        if (points.length >= 3) {
            // Close the polygon
            const closedPoints = [...points, points[0]];
            const code = `// Campus polygon mask coordinates
const CAMPUS_POLYGON: [number, number][] = [
${closedPoints.map(p => `  [${p[0]}, ${p[1]}],`).join('\n')}
];`;
            navigator.clipboard.writeText(code);
            console.log("Polygon code:", code);
        }
    }, [points]);

    return {
        isDrawing,
        points,
        toggleDrawing,
        addPoint,
        undo,
        clear,
        exportPolygon,
    };
}
