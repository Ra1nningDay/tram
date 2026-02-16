import { useState, useCallback } from "react";
import { MapPin, Pencil, Undo2, Trash2, Copy, Check, Edit3 } from "lucide-react";
import shuttleData from "../data/shuttle-data.json";
import { AVAILABLE_ICONS } from "../lib/icons";

const AVAILABLE_COLORS = [
    { name: "blue", class: "bg-blue-500", text: "text-blue-600", border: "border-blue-500" },
    { name: "red", class: "bg-red-500", text: "text-red-600", border: "border-red-500" },
    { name: "green", class: "bg-green-500", text: "text-green-600", border: "border-green-500" },
    { name: "purple", class: "bg-purple-500", text: "text-purple-600", border: "border-purple-500" },
    { name: "orange", class: "bg-orange-500", text: "text-orange-600", border: "border-orange-500" },
    { name: "teal", class: "bg-teal-500", text: "text-teal-600", border: "border-teal-500" },
];

type StopMarker = {
    id: string;
    position: [number, number];
    name_th: string;
    name_en: string;
    icon?: string;
    color?: string;
};

type StopEditorControlsProps = {
    isPlacing: boolean;
    stops: StopMarker[];
    editingIndex: number | null;
    onTogglePlacing: () => void;
    onClear: () => void;
    onUndo: () => void;
    onExport: () => void;
    onEditStop: (index: number) => void;
    onUpdateStopName: (index: number, name_th: string, name_en: string, icon?: string, color?: string) => void;
};

export function StopEditorControls({
    isPlacing,
    stops,
    editingIndex,
    onTogglePlacing,
    onClear,
    onUndo,
    onExport,
    onEditStop,
    onUpdateStopName,
}: StopEditorControlsProps) {
    const [copied, setCopied] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const handleExport = () => {
        onExport();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClear = () => {
        setShowClearConfirm(true);
    };

    const confirmClear = () => {
        onClear();
        setShowClearConfirm(false);
    };

    const handleEditStart = (index: number) => {
        onEditStop(index);
    };

    const handleUpdate = (index: number, changes: Partial<StopMarker>) => {
        const stop = stops[index];
        onUpdateStopName(
            index,
            changes.name_th ?? stop.name_th,
            changes.name_en ?? stop.name_en,
            changes.icon ?? stop.icon,
            changes.color ?? stop.color
        );
    };

    return (
        <div className="glass-card p-4 animate-slideUp min-w-[240px] relative">
            <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-bold text-[var(--color-text)]">Stop Editor</h3>
            </div>

            <div className="flex flex-col gap-2">
                {/* Place Button */}
                <button
                    onClick={onTogglePlacing}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isPlacing
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                >
                    <Pencil className="h-4 w-4" />
                    <span>{isPlacing ? "กำลังวาง..." : "วาง Stop"}</span>
                </button>

                {stops.length > 0 && (
                    <>
                        <div className="text-xs text-[var(--color-text-muted)] text-center">
                            {stops.length} จุด
                        </div>

                        {/* Stops List */}
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                            {stops.map((stop, index) => (
                                <div
                                    key={stop.id}
                                    className="flex items-center gap-2 p-2 bg-[var(--color-surface-lighter)] rounded text-xs"
                                >
                                    <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        {editingIndex === index ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={stop.name_th}
                                                    onChange={(e) => handleUpdate(index, { name_th: e.target.value })}
                                                    placeholder="ชื่อไทย"
                                                    className="w-full rounded border border-[var(--glass-border)] bg-[var(--color-surface-light)] px-2 py-1 text-xs text-[var(--color-text)] outline-none focus:ring-1 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                                <input
                                                    type="text"
                                                    value={stop.name_en}
                                                    onChange={(e) => handleUpdate(index, { name_en: e.target.value })}
                                                    placeholder="English name"
                                                    className="w-full rounded border border-[var(--glass-border)] bg-[var(--color-surface-light)] px-2 py-1 text-xs text-[var(--color-text)] outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <div className="flex flex-wrap gap-1">
                                                    {AVAILABLE_ICONS.map((icon) => (
                                                        <button
                                                            key={icon.name}
                                                            onClick={() => handleUpdate(index, { icon: icon.name })}
                                                            className={`p-1 rounded text-xs border transition-colors ${stop.icon === icon.name ? "bg-blue-100 border-blue-500 text-blue-600" : "bg-[var(--color-surface-light)] border-[var(--glass-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-lighter)]"}`}
                                                            title={icon.label}
                                                        >
                                                            <icon.component className="h-3 w-3" />
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex flex-wrap gap-1 pt-1 border-t border-[var(--glass-border)]">
                                                    {AVAILABLE_COLORS.map((color) => (
                                                        <button
                                                            key={color.name}
                                                            onClick={() => handleUpdate(index, { color: color.name })}
                                                            className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${color.class} ${stop.color === color.name ? "ring-2 ring-gray-400 ring-offset-1 scale-110" : "border-transparent"}`}
                                                            title={color.name}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="truncate cursor-pointer hover:text-blue-600 font-medium flex items-center gap-2"
                                                onClick={() => handleEditStart(index)}
                                            >
                                                {stop.color && (
                                                    <span className={`h-2 w-2 rounded-full ${AVAILABLE_COLORS.find(c => c.name === stop.color)?.class}`} />
                                                )}
                                                {stop.name_th || `Stop ${index + 1}`}
                                            </div>
                                        )}
                                    </div>
                                    {editingIndex !== index && (
                                        <button
                                            onClick={() => handleEditStart(index)}
                                            className="text-[var(--text-faint)] hover:text-blue-500 p-1"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onUndo}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-surface-lighter)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:brightness-95"
                            >
                                <Undo2 className="h-4 w-4" />
                            </button>

                            <button
                                onClick={handleClear}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-surface-lighter)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:brightness-95"
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
                                    <span>Export Stops</span>
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>

            {isPlacing && (
                <p className="mt-3 text-xs text-[var(--color-text-muted)] text-center">
                    คลิกบนแมพเพื่อวาง Stop
                </p>
            )}

            {/* Confirmation Overlay */}
            {showClearConfirm && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--glass-strong-bg)] p-4 backdrop-blur-sm transition-all duration-200">
                    <div className="flex flex-col items-center gap-1 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-[var(--color-text)]">ลบจุดจอดทั้งหมด?</p>
                        <p className="text-xs text-[var(--color-text-muted)]">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                    </div>
                    <div className="flex w-full gap-2">
                        <button
                            onClick={() => setShowClearConfirm(false)}
                            className="flex-1 rounded-lg bg-[var(--color-surface-lighter)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:brightness-95"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={confirmClear}
                            className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
                        >
                            ลบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Hook for managing stop placement
export function useStopEditor() {
    const [isPlacing, setIsPlacing] = useState(false);

    // Initialize with data from JSON
    const [stops, setStops] = useState<StopMarker[]>(() =>
        shuttleData.stops.map((s, i) => ({
            id: s.id,
            position: [s.longitude, s.latitude],
            name_th: s.name_th,
            name_en: s.name_en,
            icon: (s as any).icon,
            color: (s as any).color
        }))
    );

    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const togglePlacing = useCallback(() => {
        setIsPlacing((prev) => !prev);
        setEditingIndex(null);
    }, []);

    const addStop = useCallback((lngLat: [number, number]) => {
        const newStop: StopMarker = {
            id: `stop-${Date.now()}`,
            position: lngLat,
            name_th: "",
            name_en: "",
        };
        setStops((prev) => [...prev, newStop]);
    }, []);

    const moveStop = useCallback((index: number, lngLat: [number, number]) => {
        setStops((prev) => {
            const newStops = [...prev];
            newStops[index] = { ...newStops[index], position: lngLat };
            return newStops;
        });
    }, []);

    const editStop = useCallback((index: number) => {
        setEditingIndex(index);
    }, []);

    const updateStopName = useCallback(
        (index: number, name_th: string, name_en: string, icon?: string, color?: string) => {
            setStops((prev) => {
                const newStops = [...prev];
                newStops[index] = { ...newStops[index], name_th, name_en, icon, color };
                return newStops;
            });
            // Do not close editing automatically to support live typing
        },
        []
    );

    const undo = useCallback(() => {
        setStops((prev) => prev.slice(0, -1));
        setEditingIndex(null);
    }, []);

    const clear = useCallback(() => {
        setStops([]);
        setEditingIndex(null);
    }, []);

    const exportStops = useCallback(() => {
        const stopsJson = stops.map((stop, index) => ({
            id: `stop-${index + 1}`,
            name_th: stop.name_th || `จุดที่ ${index + 1}`,
            name_en: stop.name_en || `Stop ${index + 1}`,
            latitude: stop.position[1], // Ensure latitude is correct (not fixed to a value if it was)
            longitude: stop.position[0],
            sequence: index + 1,
            direction: "outbound",
            icon: stop.icon || "MapPin",
            color: stop.color,
        }));

        const code = JSON.stringify(stopsJson, null, 2);
        navigator.clipboard.writeText(code);
        console.log("Stops:", code);
    }, [stops]);

    return {
        isPlacing,
        stops,
        editingIndex,
        togglePlacing,
        addStop,
        moveStop,
        editStop,
        updateStopName,
        undo,
        clear,
        exportStops,
    };
}


