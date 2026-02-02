import type { Stop, Eta } from "../features/shuttle/api";
import { EtaList } from "./EtaList";

export function StopPopup({ stop, etas }: { stop: Stop; etas: Eta[] }) {
  return (
    <div className="glass-card p-4 w-full md:w-auto md:min-w-[320px] animate-slideUp rounded-t-2xl rounded-b-none md:rounded-2xl shadow-2xl">
      {/* Mobile Drag Handle */}
      <div className="md:hidden w-full flex justify-center mb-3">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
      </div>

      <div className="flex items-start gap-3">
        {/* Stop Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-bold text-lg text-slate-800">{stop.name_th}</div>
          <div className="text-sm text-slate-500">{stop.name_en}</div>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-200/50 pt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">รถที่กำลังมา</p>
        <EtaList etas={etas} />
      </div>
    </div>
  );
}