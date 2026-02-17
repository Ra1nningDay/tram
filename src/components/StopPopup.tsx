import type { Stop, Eta } from "../features/shuttle/api";
import { t } from "../i18n";
import { EtaList } from "./EtaList";

export function StopPopup({ stop, etas }: { stop: Stop; etas: Eta[] }) {
  return (
    <div className="glass-card p-4 w-full md:w-auto md:min-w-[320px] animate-slideUp rounded-t-2xl rounded-b-none md:rounded-2xl shadow-2xl">
      {/* Mobile Drag Handle */}
      <div className="md:hidden w-full flex justify-center mb-3">
        <div className="h-1.5 w-12 rounded-full bg-[var(--color-surface-lighter)]" />
      </div>

      <div className="flex items-start gap-3">
        {/* Stop Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-[var(--color-text)]">{stop.name_th}</div>
          <div className="text-sm text-[var(--color-text-muted)]">{stop.name_en}</div>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--glass-border)]/50 pt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">{t("eta.coming")}</p>
        <EtaList etas={etas} />
      </div>
    </div>
  );
}
