import type { VehicleTelemetry } from "../hooks/useGpsReplay";
import { STOPS_ON_ROUTE } from "../hooks/useGpsReplay";
import type { Vehicle } from "../features/shuttle/api";
import { Bus, User, ChevronDown, Clock, Bell } from "lucide-react";
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

/** Density level from speed / status */
function getDensity(status: string): { label: string; level: number; color: string } {
    if (status === "warning") return { label: "Full", level: 3, color: "#EF4444" };
    return { label: "Normal", level: 1, color: "#22C55E" };
}

/** Density bar indicator */
function DensityBars({ level, color }: { level: number; color: string }) {
    return (
        <div className="flex items-end gap-[2px]">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="w-[5px] rounded-sm"
                    style={{
                        height: `${8 + i * 3}px`,
                        backgroundColor: i <= level ? color : "var(--text-faint)",
                        opacity: i <= level ? 1 : 0.25,
                    }}
                />
            ))}
        </div>
    );
}

function BusCard({
    tele,
    isSelected,
    onSelect,
}: {
    vehicle: Vehicle;
    tele: VehicleTelemetry;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const [showDetails, setShowDetails] = useState(false);
    const [selectedToStop, setSelectedToStop] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    // Determine the displayed "To" stop and ETA
    const toStopName = selectedToStop ?? tele.nextStopName;
    const customDistanceM = selectedToStop
        ? (() => {
            const currentStop = STOPS_ON_ROUTE.find(s => s.name === tele.prevStopName);
            const targetStop = STOPS_ON_ROUTE.find(s => s.name === selectedToStop);
            if (!currentStop || !targetStop) return tele.distanceToNextStopM;
            let dist = targetStop.distanceM - currentStop.distanceM;
            if (dist < 0) dist += STOPS_ON_ROUTE[STOPS_ON_ROUTE.length - 1].distanceM;
            return Math.max(0, dist);
        })()
        : tele.distanceToNextStopM;
    const eta = formatETA(customDistanceM, tele.speedKmh);
    const density = getDensity(tele.status);

    return (
        <div className="relative">
            {/* Main card area – always visible */}
            <button
                onClick={onSelect}
                className={`bus-card w-full p-4 text-left transition-all relative overflow-hidden group rounded-2xl ${isSelected ? "bg-surface-light/10" : "bg-transparent hover:bg-[var(--map-control-hover)]"
                    }`}
            >
                {/* Row 1: Bus icon + Name + ETA badge */}
                <div className="flex items-center gap-3 mb-2">
                    {/* Bus Icon */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--text-faint)] bg-transparent">
                        <Bus size={24} className="text-[var(--color-text)]" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-heading text-xl font-bold text-[var(--color-text)] tracking-wide leading-tight">
                            {tele.label}
                        </h3>
                    </div>

                    {/* ETA Badge */}
                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10">
                        <Clock size={12} className="text-primary" />
                        <span className="text-xs font-semibold text-primary whitespace-nowrap">{eta}</span>
                    </div>
                </div>

                {/* Row 2: Density + Route */}
                <div className="flex items-center justify-between text-xs mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <User size={14} style={{ color: density.color }} />
                        <span style={{ color: density.color }} className="font-medium">
                            Density : {density.label}
                        </span>
                        <DensityBars level={density.level} color={density.color} />
                    </div>
                    <span className="text-[var(--text-faint)] text-[11px] truncate ml-2">
                        {tele.prevStopName} {">"}{">"}  {tele.nextStopName}
                    </span>
                </div>

                {/* Row 3: Progress Bar */}
                <div className="relative h-1.5 bg-surface-lighter rounded-full mx-1">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-dark to-primary flex items-center rounded-l-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(5, tele.progressPercent)}%` }}
                    >
                        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 z-10 filter drop-shadow-[0_0_4px_rgba(254,80,80,0.6)]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                <path d="M21 12l-18 12v-24z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </button>

            {/* Expanded section: Pin button + Journey + Notifications */}
            {isSelected && (
                <div className="pb-3 pt-2 mt-2 space-y-3">
                    {/* Pin / Unpin toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
                        className={`relative w-full flex items-center justify-center py-3 rounded-[28px] text-sm font-semibold border transition-all overflow-visible ${showDetails
                            ? "text-white border-[#7a3333]"
                            : "text-white border-[#2a5060]"
                            }`}
                        style={{ backgroundColor: showDetails ? '#662B2B' : '#203C48' }}
                    >
                        {/* Bookmark ribbon hanging from top-left */}
                        <div className="absolute left-20 -top-1">
                            <svg width="18" height="24" viewBox="0 0 18 24" fill={showDetails ? '#B75050' : '#357087'} xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 0H18V22L9 17L0 22V0Z" />
                            </svg>
                        </div>
                        <span className="">{showDetails ? `ยกเลิกปักหมุด ${tele.label}` : `ปักหมุด ${tele.label}`}</span>
                    </button>

                    {/* Journey details (From/To) */}
                    <div className={`transition-all px-4 duration-300 ${showDetails ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                        <div className="flex gap-3">
                            {/* Left: Dots + From/To labels (50%) */}
                            <div className="flex gap-2 basis-1/2">
                                {/* Dots + line */}
                                <div className="flex flex-col items-center pt-1 shrink-0">
                                    <div className="w-4 h-4 rounded-full border-[3px] border-primary bg-transparent" />
                                    <div className="flex-1 w-0 border-l-2 border-dotted border-[var(--text-faint)] my-1" />
                                    <div className="w-4 h-4 rounded-full border-[3px] border-primary bg-primary" />
                                </div>
                                {/* Labels */}
                                <div className="flex flex-col justify-between flex-1 gap-3 py-0.5">
                                    <div className="rounded-xl bg-surface-lighter/30 border border-[var(--glass-border)] px-3 py-3">
                                        <span className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider">From :</span>
                                        <span className="ml-1 text-sm font-medium text-[var(--color-text)]">{tele.prevStopName}</span>
                                    </div>
                                    <div className="relative" ref={dropdownRef}>
                                        <div
                                            className="rounded-xl bg-surface-lighter/30 border border-[var(--glass-border)] px-3 py-3 cursor-pointer hover:bg-surface-lighter/50 transition-colors flex items-center justify-between"
                                            onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                                        >
                                            <div>
                                                <span className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider">To :</span>
                                                <span className="ml-1 text-sm font-medium text-[var(--color-text)]">{toStopName}</span>
                                            </div>
                                            <ChevronDown size={14} className={`text-[var(--text-faint)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {/* Dropdown */}
                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 max-h-[200px] overflow-y-auto rounded-xl bg-[var(--glass-strong-bg)] border border-[var(--glass-border)] shadow-2xl z-[100] backdrop-blur-xl">
                                                {STOPS_ON_ROUTE.map((stop) => (
                                                    <button
                                                        key={stop.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedToStop(stop.name);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-surface-lighter/40 ${stop.name === toStopName
                                                            ? 'text-primary font-semibold bg-primary/10'
                                                            : 'text-[var(--color-text)]'
                                                            }`}
                                                    >
                                                        {stop.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Vertical Divider */}
                            <div className="w-px bg-[var(--glass-border)] self-stretch my-1" />

                            {/* Right: Summary + Notification (50%) */}
                            <div className="flex flex-col justify-between gap-3 py-0.5 basis-1/2">
                                {/* Route summary */}
                                <div className="rounded-xl bg-surface-lighter/30 border border-[var(--glass-border)] px-3 py-2.5 flex-1 flex flex-col justify-center text-center">
                                    <div className="flex items-center gap-1 justify-center text-[11px] text-[var(--color-text)]">
                                        <Bus size={12} />
                                        <span className="font-medium">{tele.prevStopName}{">>"}{toStopName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 justify-center mt-1">
                                        <Clock size={10} className="text-primary" />
                                        <span className="text-[10px] text-primary font-semibold">{eta}</span>
                                    </div>
                                </div>

                                {/* Notifications button */}
                                <button
                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Bell size={12} />
                                    Notifications
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* "แตะเพื่อดูเพิ่มเติม" for non-selected cards */}
            {!isSelected && (
                <div className="px-4 pb-3 -mt-1">
                    <button
                        onClick={onSelect}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-medium text-[var(--text-faint)] border border-[var(--glass-border)] hover:bg-surface-lighter/30 transition-all"
                    >
                        <Clock size={12} />
                        แตะเพื่อดูเพิ่มเติม
                    </button>
                </div>
            )}

            {/* Divider */}
            <div className="mx-4 h-px bg-[var(--map-control-hover)]" />
        </div>
    );
}

export function VehiclePanel({ vehicles, telemetry, onSelectVehicle, selectedVehicleId }: VehiclePanelProps) {
    // 0 = Collapsed (60px), 1 = Half (45vh), 2 = Full (85vh)
    const [snapLevel, setSnapLevel] = useState<0 | 1 | 2>(1);
    const hasAutoSelected = useRef(false);

    // Auto-select first vehicle if none selected initially
    useEffect(() => {
        if (!hasAutoSelected.current && !selectedVehicleId && vehicles.length > 0 && onSelectVehicle) {
            hasAutoSelected.current = true;
            onSelectVehicle(vehicles[0].id);
        }
    }, [vehicles, selectedVehicleId, onSelectVehicle]);

    const handleToggle = () => {
        setSnapLevel((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    };

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
                                    onSelect={() => onSelectVehicle?.(v.id)}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Mobile bottom sheet - 3-level toggleable */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none flex flex-col justify-end h-[90vh]">
                <div
                    className={`glass-card-dark w-full pointer-events-auto transition-all duration-300 ease-spring ${snapLevel === 0 ? 'h-[60px]' : snapLevel === 1 ? 'h-[45vh]' : 'h-[85vh]'
                        } flex flex-col overflow-hidden bg-[var(--glass-strong-bg)] backdrop-blur-xl border-t border-[var(--panel-border)] rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.5)]`}
                >
                    {/* Handle Bar Area */}
                    <div
                        className="cursor-pointer active:bg-[var(--map-control-hover)] transition-colors absolute top-0 left-0 right-0 h-[60px] z-30"
                        onClick={handleToggle}
                    >
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#FE5050] to-[#C28437]" />
                        <div className="flex flex-col items-center justify-center pt-2 pb-1">
                            <div className="w-12 h-1 rounded-full bg-[var(--text-faint)] mb-1" />
                            {snapLevel === 0 && (
                                <span className="text-[10px] uppercase tracking-widest text-[var(--text-faint)] font-bold animate-pulse">
                                    Tap to Expand
                                </span>
                            )}
                            {snapLevel > 0 && (
                                <ChevronDown
                                    size={16}
                                    className={`text-[var(--text-faint)] transition-transform duration-300 mt-1 ${snapLevel === 2 ? 'rotate-180' : ''}`}
                                />
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 overflow-y-auto px-2 pb-4 space-y-1 mt-[50px] transition-opacity duration-300 ${snapLevel > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        {vehicles.map((v, i) => {
                            const tele = telemetry[i];
                            if (!tele) return null;
                            return (
                                <BusCard
                                    key={v.id}
                                    vehicle={v}
                                    tele={tele}
                                    isSelected={selectedVehicleId === v.id}
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
