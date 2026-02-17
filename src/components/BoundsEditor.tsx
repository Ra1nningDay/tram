import { useState, useCallback } from "react";
import { Square as SquareIcon, Pencil, Trash2, Copy, Check } from "lucide-react";

type BoundsEditorControlsProps = {
    isDrawing: boolean;
    bounds: [[number, number], [number, number]] | null;
    onToggleDrawing: () => void;
    onClear: () => void;
    onExport: () => void;
};

export function BoundsEditorControls({
    isDrawing,
    bounds,
    onToggleDrawing,
    onClear,
    onExport,
}: BoundsEditorControlsProps) {
    const [copied, setCopied] = useState(false);

    const handleExport = () => {
        onExport();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-card p-4 animate-slideUp min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
                <SquareIcon className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-800">Bounds Editor</h3>
            </div>

            <div className="flex flex-col gap-2">
                <button
                    onClick={onToggleDrawing}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isDrawing
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                >
                    <Pencil className="h-4 w-4" />
                    <span>{isDrawing ? "กำลังวาด..." : "วาดพื้นที่"}</span>
                </button>

                {bounds && (
                    <>
                        <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                            <div>SW: {bounds[0][0].toFixed(4)}, {bounds[0][1].toFixed(4)}</div>
                            <div>NE: {bounds[1][0].toFixed(4)}, {bounds[1][1].toFixed(4)}</div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onClear}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>

                            <button
                                onClick={handleExport}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {isDrawing && !bounds && (
                <p className="mt-3 text-xs text-slate-500">
                    คลิก 2 จุด (SW → NE)
                </p>
            )}
        </div>
    );
}

// Hook for managing bounds drawing state
export function useBoundsEditor() {
    const [isDrawing, setIsDrawing] = useState(false);
    const [corners, setCorners] = useState<[number, number][]>([]);

    const bounds: [[number, number], [number, number]] | null =
        corners.length === 2
            ? [
                [Math.min(corners[0][0], corners[1][0]), Math.min(corners[0][1], corners[1][1])],
                [Math.max(corners[0][0], corners[1][0]), Math.max(corners[0][1], corners[1][1])],
            ]
            : null;

    const toggleDrawing = useCallback(() => {
        setIsDrawing((prev) => !prev);
    }, []);

    const addCorner = useCallback((lngLat: [number, number]) => {
        setCorners((prev) => {
            if (prev.length >= 2) return [lngLat];
            return [...prev, lngLat];
        });
    }, []);

    const clear = useCallback(() => {
        setCorners([]);
    }, []);

    const exportBounds = useCallback(() => {
        if (bounds) {
            const code = `const campusBounds: maplibregl.LngLatBoundsLike = [
  [${bounds[0][0]}, ${bounds[0][1]}],  // SW
  [${bounds[1][0]}, ${bounds[1][1]}],  // NE
];`;
            navigator.clipboard.writeText(code);
            console.log("Bounds code:", code);
        }
    }, [bounds]);

    return {
        isDrawing,
        bounds,
        corners,
        toggleDrawing,
        addCorner,
        clear,
        exportBounds,
    };
}
