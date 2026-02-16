import type { Eta } from "../features/shuttle/api";
import { StatusBadge } from "./StatusBadge";
import { LastUpdated } from "./LastUpdated";
import { t } from "../i18n";
import { formatClockTime } from "../lib/time";

type EtaWithDetails = Eta & {
  plate?: string;
  vehicle_label?: string;
  distance_meters?: number;
  speed_kph?: number;
  arrival_time?: string;
};

export function EtaList({ etas }: { etas: EtaWithDetails[] }) {
  if (!etas.length) {
    return <div className="text-xs text-slate-500">{t("eta.none")}</div>;
  }

  return (
    <ul className="space-y-2">
      {etas.map((eta) => (
        <li key={`${eta.stop_id}-${eta.vehicle_id ?? "na"}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-slate-100 last:border-0 pb-2 last:pb-0 sm:border-0 sm:pb-0">
          <div className="flex items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <StatusBadge status={eta.status} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">
                  {eta.status === "fresh" && eta.eta_minutes >= 0 ? `${eta.eta_minutes} min` : t("eta.updating")}
                </span>
                <span className="text-xs text-slate-500">
                  {eta.plate ?? eta.vehicle_label ?? eta.vehicle_id ?? ""}
                </span>
              </div>
            </div>
            {/* Show LastUpdated inline on desktop, but maybe right-aligned on mobile? */}
            <div className="sm:hidden">
              <LastUpdated lastUpdated={eta.last_updated} />
            </div>
          </div>
          <div className="text-xs text-slate-500 sm:ml-2">
            <span>
              {typeof eta.distance_meters === "number" ? `${Math.round(eta.distance_meters)}m` : "--"}
            </span>
            <span className="mx-1">•</span>
            <span>
              {typeof eta.speed_kph === "number" ? `${Math.round(eta.speed_kph)} km/h` : "-- km/h"}
            </span>
            <span className="mx-1">•</span>
            <span>
              {eta.arrival_time ? formatClockTime(eta.arrival_time) : "--:--"}
            </span>
          </div>
          <div className="hidden sm:block">
            <LastUpdated lastUpdated={eta.last_updated} />
          </div>
        </li>
      ))}
    </ul>
  );
}
