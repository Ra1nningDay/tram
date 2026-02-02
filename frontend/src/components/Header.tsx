import { useVehicles } from "../features/shuttle/hooks";
import type { Vehicle } from "../features/shuttle/api";

export function Header() {
    const { data } = useVehicles();

    const vehicles: Vehicle[] = data?.vehicles ?? [];
    const onlineCount = vehicles.filter(v => v.status === "fresh").length;
    const totalCount = vehicles.length;

    return (
        <header className="glass-card-dark absolute left-4 top-4 z-10 flex items-center gap-3 px-4 py-3 animate-slideUp">
            {/* Bus Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8m-4-8v16m-4 0h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>

            <div>
                <h1 className="text-base font-bold tracking-tight">BU Shuttle</h1>
                <p className="text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-fresh animate-pulse-soft" />
                        {onlineCount}/{totalCount} active
                    </span>
                </p>
            </div>
        </header>
    );
}
