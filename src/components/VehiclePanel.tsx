import type { VehicleTelemetry } from "../hooks/useGpsReplay";
import type { Vehicle } from "../features/shuttle/api";
import { Bus, User, MapPin, ChevronDown, Clock, Info } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface VehiclePanelProps {
    vehicles: Vehicle[];
    telemetry: VehicleTelemetry[];
    onSelectVehicle?: (id: string | null) => void;
    selectedVehicleId?: string | null;
}

/** Calculate ETA string from distance (meters) and speed (km/h) */
function formatETA(distanceM: number, speedKmh: number): string {
    if (speedKmh < 0.5) return "รอออกตัว";
    const hours = (distanceM / 1000) / speedKmh;
    const minutes = Math.round(hours * 60);
    if (minutes < 1) return "< 1 นาที";
    if (minutes === 1) return "~1 นาที";
    return `~${minutes} นาที`;
}

function BusCard({
    tele,
    isSelected,
    onSelect,
    isFirst,
}: {
    vehicle: Vehicle;
    tele: VehicleTelemetry;
    isSelected: boolean;
    onSelect: () => void;
    isFirst: boolean;
}) {
    const isWarning = tele.status === "warning";
    const [showDetails, setShowDetails] = useState(false);
    const eta = formatETA(tele.distanceToNextStopM, tele.speedKmh);

    return (
        <div className="relative">
            <button
                onClick={onSelect}
                className={`bus-card w-full p-5 text-left transition-all relative overflow-hidden group rounded-2xl ${isSelected ? "bg-surface-light/10" : "bg-transparent hover:bg-[var(--map-control-hover)]"
                    }`}
            >
                {/* Header Section */}
                <div className="flex items-start gap-4 mb-3">
                    {/* Large Bus Icon */}
                    <Bus size={42} className="text-[var(--color-text)] shrink-0 mt-1" strokeWidth={1.5} />

                    <div className="flex-1 min-w-0">
                        <h3 className="font-heading text-2xl font-bold text-[var(--color-text)] tracking-wide leading-tight">
                            {tele.label}
                        </h3>
                        <p className="text-xs text-[var(--text-faint)] mt-1 font-light truncate">
                            ถึง {tele.nextStopName}
                        </p>
                    </div>

                    {/* ETA Badge */}
                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30">
                        <Clock size={12} className="text-primary" />
                        <span className="text-xs font-semibold text-primary whitespace-nowrap">{eta}</span>
                    </div>
                </div>

                {/* Progress Bar with Arrow Head */}
                <div className="relative h-1.5 bg-surface-lighter rounded-full mb-4 mx-1 mt-4">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-dark to-primary flex items-center rounded-l-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(5, tele.progressPercent)}%` }}
                    >
                        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 z-10 filter drop-shadow-[0_0_4px_rgba(254,80,80,0.6)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="transform rotate-0">
                                <path d="M21 12l-18 12v-24z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Info Row */}
                <div className="flex items-center justify-between text-xs mb-2 px-1">
                    <div className="flex items-center gap-2">
                        <User size={14} className={isWarning ? "text-offline" : "text-fresh"} />
                        <span className={isWarning ? "text-offline font-medium" : "text-fresh font-medium"}>
                            {isWarning ? "Stopped" : "Normal"}
                        </span>
                    </div>
                    <div className="font-mono text-[var(--color-text)] tracking-wider">
                        <span className="text-[var(--text-faint)] mr-2">»</span>
                        {tele.distanceToNextStopM >= 1000
                            ? (tele.distanceToNextStopM / 1000).toFixed(1) + " KM"
                            : Math.round(tele.distanceToNextStopM) + " M"}
                        <span className="mx-2 text-[var(--text-faint)]">|</span>
                        {tele.progressPercent}%
                    </div>
                </div>

                {/* Timeline Section - Only show when expanded */}
                <div className={`transition-all duration-300 overflow-hidden ${showDetails ? "max-h-[250px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
                    <div className="relative pl-3">
                        {/* Vertical Dotted Line */}
                        <div className="absolute left-[27px] top-4 bottom-4 w-0 border-l-2 border-dotted border-[var(--glass-border)]" />

                        {/* From Stop */}
                        <div className="relative flex items-center gap-4 mb-3">
                            <div className="relative z-10 flex items-center justify-center w-8 h-8">
                                <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                            </div>
                            <div className="flex-1 py-3 px-4 rounded-xl bg-surface-lighter/30 border border-[var(--glass-border)] shadow-sm">
                                <span className="text-sm font-medium text-[var(--color-text)]">{tele.prevStopName}</span>
                            </div>
                        </div>

                        {/* To Stop */}
                        <div className="relative flex items-center gap-4">
                            <div className="relative z-10 flex items-center justify-center w-8 h-8">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <MapPin size={14} className="text-primary" />
                                </div>
                            </div>
                            <div className="flex-1 py-3 px-4 rounded-xl bg-surface-lighter/30 border border-[var(--glass-border)] shadow-sm flex items-center justify-between">
                                <span className="text-sm font-medium text-[var(--color-text)]">{tele.nextStopName}</span>
                                <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{eta}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </button>

            {/* Details Toggle Button */}
            {isSelected && (
                <div className="px-5 pb-3 -mt-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-[var(--text-faint)] hover:text-[var(--color-text)] hover:bg-surface-lighter/30 transition-all border border-transparent hover:border-[var(--glass-border)]"
                    >
                        <Info size={13} />
                        {showDetails ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                    </button>
                </div>
            )}

            {/* Divider Line */}
            {!isSelected && <div className="mx-6 h-px bg-[var(--map-control-hover)]" />}
        </div>
    );
}

export function VehiclePanel({ vehicles, telemetry, onSelectVehicle, selectedVehicleId }: VehiclePanelProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(true);
    const hasAutoSelected = useRef(false);

    // Auto-select first vehicle if none selected initially
    useEffect(() => {
        if (!hasAutoSelected.current && !selectedVehicleId && vehicles.length > 0 && onSelectVehicle) {
            hasAutoSelected.current = true;
            onSelectVehicle(vehicles[0].id);
        }
    }, [vehicles, selectedVehicleId, onSelectVehicle]);

    return (
        <>
            {/* Desktop side panel */}
            <div className="hidden md:flex flex-col absolute top-4 right-4 z-20 w-[380px] max-h-[calc(100vh-2rem)] animate-slideUp">
                <div className="glass-card-dark relative flex flex-col overflow-hidden border-[var(--panel-border)] bg-[var(--glass-strong-bg)] backdrop-blur-xl">

                    {/* Header Gradient Line (Top Only) */}
                    <div className="relative z-10 h-2 w-full bg-gradient-to-r from-[#FE5050] to-[#C28437] rounded-t-[14px]" />

                    {/* Scrollable cards */}
                    <div className="relative z-10 flex-1 overflow-y-auto p-2 space-y-1">
                        {vehicles.map((v, i) => {
                            const tele = telemetry[i];
                            if (!tele) return null;
                            return (
                                <BusCard
                                    key={v.id}
                                    vehicle={v}
                                    tele={tele}
                                    isSelected={selectedVehicleId === v.id}
                                    isFirst={i === 0}
                                    onSelect={() => onSelectVehicle?.(v.id)}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Mobile bottom sheet - Toggleable */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none flex flex-col justify-end h-[80vh]">
                <div
                    className={`glass-card-dark w-full pointer-events-auto transition-all duration-300 ease-spring ${isMobileOpen ? 'h-[70vh]' : 'h-[60px]'} flex flex-col overflow-hidden bg-[var(--glass-strong-bg)] backdrop-blur-xl border-t border-[var(--panel-border)] rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.5)]`}
                >
                    {/* Handle Bar Area - Click to toggle */}
                    <div
                        className="cursor-pointer active:bg-[var(--map-control-hover)] transition-colors absolute top-0 left-0 right-0 h-[60px] z-30"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                    >
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#FE5050] to-[#C28437]" />
                        <div className="flex flex-col items-center justify-center pt-2 pb-1">
                            <div className="w-12 h-1 rounded-full bg-[var(--text-faint)] mb-1" />
                            {!isMobileOpen && (
                                <span className="text-[10px] uppercase tracking-widest text-[var(--text-faint)] font-bold animate-pulse">
                                    Tap to Expand
                                </span>
                            )}
                            {isMobileOpen && (
                                <ChevronDown size={16} className="text-[var(--text-faint)] animate-bounce mt-1" />
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className={`flex-1 overflow-y-auto px-2 pb-4 space-y-2 mt-[50px] transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        {vehicles.map((v, i) => {
                            const tele = telemetry[i];
                            if (!tele) return null;
                            return (
                                <BusCard
                                    key={v.id}
                                    vehicle={v}
                                    tele={tele}
                                    isSelected={selectedVehicleId === v.id}
                                    isFirst={i === 0}
                                    onSelect={() => onSelectVehicle?.(v.id)}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
