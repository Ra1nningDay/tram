import type { Vehicle } from "../features/shuttle/api";
import type { VehicleTelemetry } from "../features/shuttle/simulated-insights";
import { formatClockTime } from "../lib/time";
import { t } from "../i18n";
import { StatusBadge } from "./StatusBadge";
import { LastUpdated } from "./LastUpdated";

export function VehiclePopup({ vehicle, telemetry }: { vehicle: Vehicle; telemetry?: VehicleTelemetry }) {
  const statusColor: Record<string, string> = {
    fresh: "bg-fresh",
    delayed: "bg-delayed",
    offline: "bg-offline",
    hidden: "bg-slate-400",
  };
  const bgClass = statusColor[vehicle.status] ?? "bg-slate-400";

  const plate = telemetry?.plate ?? vehicle.label ?? vehicle.id;
  const speed = typeof telemetry?.speed_kph === "number" ? `${Math.round(telemetry.speed_kph)} km/h` : "-- km/h";
  const nextStop = telemetry?.next_stop_name_th ?? telemetry?.next_stop_id ?? "--";
  const dist = typeof telemetry?.distance_to_next_stop_m === "number" ? `${Math.round(telemetry.distance_to_next_stop_m)}m` : "--";
  const etaMin =
    typeof telemetry?.eta_to_next_stop_s === "number"
      ? `${Math.max(0, Math.ceil(telemetry.eta_to_next_stop_s / 60))} min`
      : "--";
  const arrival = telemetry?.arrival_time ? formatClockTime(telemetry.arrival_time) : "--:--";

  return (
    <div className="glass-card p-4 w-full md:w-auto md:min-w-[280px] animate-slideUp rounded-t-2xl rounded-b-none md:rounded-2xl shadow-2xl">
      {/* Mobile Drag Handle */}
      <div className="md:hidden w-full flex justify-center mb-3">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
      </div>

      <div className="flex items-center gap-3">
        {/* Vehicle Icon with status color */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bgClass} text-white shadow-md ring-2 ring-white`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7h8M8 11h8m-4-8v16m-4 0h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <div className="font-bold text-lg text-slate-800">{plate}</div>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/50 pt-3 text-sm">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("vehicle.speed")}</span>
          <span className="font-medium text-slate-700">{speed}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("vehicle.next_stop")}</span>
          <span className="font-medium text-slate-700">{nextStop}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("eta.distance")}</span>
          <span className="font-medium text-slate-700">{dist}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ETA</span>
          <span className="font-medium text-slate-700">
            {etaMin} ({arrival})
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200/50 pt-3 flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("updated.latest")}</span>
        <LastUpdated lastUpdated={vehicle.last_updated} />
      </div>
    </div>
  );
}
