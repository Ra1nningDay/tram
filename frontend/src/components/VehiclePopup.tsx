import type { Vehicle } from "../features/shuttle/api";
import { StatusBadge } from "./StatusBadge";
import { LastUpdated } from "./LastUpdated";

export function VehiclePopup({ vehicle }: { vehicle: Vehicle }) {
  const statusColor: Record<string, string> = {
    fresh: "bg-fresh",
    delayed: "bg-delayed",
    offline: "bg-offline",
    hidden: "bg-slate-400",
  };
  const bgClass = statusColor[vehicle.status] ?? "bg-slate-400";

  return (
    <div className="glass-card p-4 w-full md:w-auto md:min-w-[280px] animate-slideUp rounded-t-2xl rounded-b-none md:rounded-2xl shadow-2xl">
      {/* Mobile Drag Handle */}
      <div className="md:hidden w-full flex justify-center mb-3">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
      </div>

      <div className="flex items-center gap-3">
        {/* Vehicle Icon with status color */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bgClass} text-white shadow-md ring-2 ring-white`}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8m-4-8v16m-4 0h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <div className="font-bold text-lg text-slate-800">{vehicle.label ?? vehicle.id}</div>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-200/50 pt-3 flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">อัปเดตล่าสุด</span>
        <LastUpdated lastUpdated={vehicle.last_updated} />
      </div>
    </div>
  );
}