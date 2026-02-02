import type { Eta } from "../features/shuttle/api";
import { StatusBadge } from "./StatusBadge";
import { LastUpdated } from "./LastUpdated";
import { t } from "../i18n";

export function EtaList({ etas }: { etas: Eta[] }) {
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
              <span className="text-sm font-medium text-slate-700">
                {eta.status === "fresh" ? `${eta.eta_minutes} min` : t("eta.updating")}
              </span>
            </div>
            {/* Show LastUpdated inline on desktop, but maybe right-aligned on mobile? */}
            <div className="sm:hidden">
              <LastUpdated lastUpdated={eta.last_updated} />
            </div>
          </div>
          <div className="hidden sm:block">
            <LastUpdated lastUpdated={eta.last_updated} />
          </div>
        </li>
      ))}
    </ul>
  );
}