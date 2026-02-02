export function MapLegend() {
    const items = [
        { color: "bg-fresh", label: "ออนไลน์" },
        { color: "bg-delayed", label: "หน่วง" },
        { color: "bg-offline", label: "ออฟไลน์" },
    ];

    return (
        <div className="glass-card absolute bottom-4 left-4 z-10 px-3 py-2 animate-slideUp">
            <p className="mb-2 text-xs font-semibold text-slate-600">สถานะรถ</p>
            <div className="flex flex-col gap-1.5">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${item.color}`} />
                        <span className="text-xs text-slate-700">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
