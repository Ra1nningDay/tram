import { Bell, BellRing, Bus, ChevronDown, Clock, MapPin, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Eta, Stop, Vehicle } from "../features/shuttle/api";
import { formatDistance, formatWalkingTime } from "../lib/format-distance";
import { STOPS_ON_ROUTE, type VehicleTelemetry } from "../hooks/useGpsReplay";

interface VehiclePanelProps {
  vehicles: Vehicle[];
  telemetry: VehicleTelemetry[];
  onSelectVehicle?: (id: string | null) => void;
  selectedVehicleId?: string | null;
  stop?: Stop | null;
  stopEtas?: Eta[];
  stopDistanceM?: number;
  stopKind?: "nearest" | "selected" | null;
  onClearStop?: () => void;
  isAlertEnabled?: boolean;
  isAlertSupported?: boolean;
  onToggleAlert?: () => void;
}

type PanelVehicleItem = {
  key: string;
  vehicleId: string;
  tele: VehicleTelemetry;
  stopEta?: Eta;
  contextStopName?: string;
};

function normalizeLookupKey(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

function formatDistanceEta(distanceM: number, speedKmh: number): string {
  if (speedKmh < 0.5) return "Boarding";
  const hours = distanceM / 1000 / speedKmh;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "~1 min";
  return `~${minutes} min`;
}

function formatEtaMinutes(eta?: Eta): string {
  if (!eta || eta.status !== "fresh" || eta.eta_minutes < 0) {
    return "Updating";
  }

  if (eta.eta_minutes < 1) return "< 1 min";
  return `~${eta.eta_minutes} min`;
}

function getDensity(status: string): {
  label: string;
  level: number;
  color: string;
} {
  if (status === "warning") {
    return { label: "High", level: 3, color: "#EF4444" };
  }

  return { label: "Normal", level: 1, color: "#22C55E" };
}

function getDistanceBetweenStops(
  fromStopName: string,
  toStopName: string,
  fallbackDistanceM: number
): number {
  const fromStop = STOPS_ON_ROUTE.find((stop) => stop.name === fromStopName);
  const toStop = STOPS_ON_ROUTE.find((stop) => stop.name === toStopName);

  if (!fromStop || !toStop) {
    return fallbackDistanceM;
  }

  let distance = toStop.distanceM - fromStop.distanceM;
  if (distance < 0) {
    distance += STOPS_ON_ROUTE[STOPS_ON_ROUTE.length - 1].distanceM;
  }

  return Math.max(0, distance);
}

function DensityBars({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex items-end gap-[2px]">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="w-[5px] rounded-sm"
          style={{
            height: `${8 + item * 3}px`,
            backgroundColor: item <= level ? color : "var(--text-faint)",
            opacity: item <= level ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

function StopContextHeader({
  stop,
  stopEtas,
  stopDistanceM,
  stopKind,
  onClearStop,
}: {
  stop: Stop;
  stopEtas: Eta[];
  stopDistanceM?: number;
  stopKind?: "nearest" | "selected" | null;
  onClearStop?: () => void;
}) {
  const title = stop.name_th;
  const subtitle = stop.name_en?.trim() || `Stop ${stop.sequence}`;
  const kindLabel = stopKind === "nearest" ? "Nearby Stop" : "Selected Stop";
  const vehicleCountLabel =
    stopEtas.length === 1 ? "1 vehicle arriving" : `${stopEtas.length} vehicles arriving`;
  const distanceLabel =
    typeof stopDistanceM === "number"
      ? `${formatDistance(stopDistanceM)} | ${formatWalkingTime(stopDistanceM)}`
      : null;

  return (
    <div className="relative z-10 overflow-hidden border-b border-[var(--glass-border)]/80 px-4 pb-3 pt-3">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-primary via-accent/70 to-transparent opacity-80" />
      <div className="pointer-events-none absolute left-2 top-2 h-20 w-24 rounded-full bg-primary/12 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 h-[54px] w-[4px] shrink-0 rounded-full bg-gradient-to-b from-primary via-primary to-accent-light shadow-[0_0_18px_rgba(254,80,80,0.35)]" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {kindLabel}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  Stop {stop.sequence}
                </span>
              </div>

              <h3 className="truncate font-heading text-[1.9rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text)]">
                {title}
              </h3>
              {/* <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
                {subtitle}
              </p> */}
            </div>

            {onClearStop && (
              <button
                type="button"
                onClick={onClearStop}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--map-control-hover)]/65 text-[var(--text-faint)] transition-colors hover:border-primary/30 hover:text-[var(--color-text)]"
                aria-label="Close stop context"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <div className="inline-flex items-center gap-2 font-medium text-[var(--color-text)]">
              <Bus size={13} className="text-primary" />
              <span>{vehicleCountLabel}</span>
            </div>

            {distanceLabel && (
              <>
                <span className="hidden text-[var(--glass-border)] sm:inline">/</span>
                <div className="inline-flex items-center gap-2 text-[var(--color-text-muted)]">
                  <MapPin size={13} className="text-accent-light" />
                  <span>{distanceLabel}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyArrivalState({ stopName }: { stopName: string }) {
  return (
    <div className="px-3 pb-3">
      <div className="rounded-[24px] border border-dashed border-[var(--glass-border)] bg-[var(--color-surface-dark)]/45 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          No arrival recommendations for {stopName}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Arrival cards will appear here as soon as ETA data is available.
        </p>
      </div>
    </div>
  );
}

function BusCard({
  tele,
  isSelected,
  onSelect,
  contextStopName,
  stopEta,
  isAlertEnabled,
  isAlertSupported,
  onToggleAlert,
}: {
  tele: VehicleTelemetry;
  isSelected: boolean;
  onSelect: () => void;
  contextStopName?: string;
  stopEta?: Eta;
  isAlertEnabled?: boolean;
  isAlertSupported?: boolean;
  onToggleAlert?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedToStop, setSelectedToStop] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contextStopName) {
      setSelectedToStop(null);
      setIsDropdownOpen(false);
    }
  }, [contextStopName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const recommendedStopName = contextStopName ?? null;
  const toStopName = selectedToStop ?? recommendedStopName ?? tele.nextStopName;
  const isUsingRecommendedStop = Boolean(recommendedStopName && selectedToStop === null);
  const distanceToStopM =
    toStopName === tele.nextStopName
      ? tele.distanceToNextStopM
      : getDistanceBetweenStops(
        tele.prevStopName,
        toStopName,
        tele.distanceToNextStopM
      );
  const etaLabel =
    isUsingRecommendedStop && stopEta
      ? formatEtaMinutes(stopEta)
      : formatDistanceEta(distanceToStopM, tele.speedKmh);
  const density = getDensity(tele.status);
  const routeLabel = `${tele.prevStopName} >> ${toStopName}`;
  const alertLabel = "Notifications";
  const AlertIcon = isAlertEnabled ? BellRing : Bell;

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        className={`bus-card group relative w-full overflow-hidden rounded-2xl p-4 text-left transition-all ${isSelected
          ? "bg-surface-light/10"
          : "bg-transparent hover:bg-[var(--map-control-hover)]"
          }`}
      >
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--text-faint)] bg-transparent">
            <Bus
              size={24}
              className="text-[var(--color-text)]"
              strokeWidth={1.5}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-xl font-bold leading-tight tracking-wide text-[var(--color-text)]">
              {tele.label}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
            <Clock size={12} className="text-primary" />
            <span className="whitespace-nowrap text-xs font-semibold text-primary">
              {etaLabel}
            </span>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: density.color }} />
            <span style={{ color: density.color }} className="font-medium">
              Density: {density.label}
            </span>
            <DensityBars level={density.level} color={density.color} />
          </div>
          <span className="ml-2 truncate text-[11px] text-[var(--text-faint)]">
            {routeLabel}
          </span>
        </div>

        <div className="relative mx-1 h-1.5 rounded-full bg-surface-lighter">
          <div
            className="absolute left-0 top-0 flex h-full items-center rounded-l-full bg-gradient-to-r from-primary-dark to-primary transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, tele.progressPercent)}%` }}
          >
            <div className="absolute right-[-6px] top-1/2 z-10 -translate-y-1/2 filter drop-shadow-[0_0_4px_rgba(254,80,80,0.6)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M21 12l-18 12v-24z" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {isSelected && (
        <div className="mt-1.5 space-y-2 pb-2 pt-1.5">
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowDetails((prev) => !prev);
            }}
            className={`relative flex w-full items-center justify-center overflow-visible rounded-[24px] border py-2.5 text-[13px] font-semibold transition-all ${showDetails
              ? "border-[#7a3333] text-white"
              : "border-[#2a5060] text-white"
              }`}
            style={{ backgroundColor: showDetails ? "#662B2B" : "#203C48" }}
          >
            <div className="absolute -top-1 left-20">
              <svg
                width="18"
                height="24"
                viewBox="0 0 18 24"
                fill={showDetails ? "#B75050" : "#357087"}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M0 0H18V22L9 17L0 22V0Z" />
              </svg>
            </div>
            <span>{showDetails ? `Unpin ${tele.label}` : `Pin ${tele.label}`}</span>
          </button>

          <div
            ref={dropdownRef}
            className={`px-1 transition-all duration-300 sm:px-3 ${showDetails
              ? "max-h-[420px] opacity-100"
              : "max-h-0 overflow-hidden opacity-0"
              }`}
          >
            <div className="grid grid-cols-[24px_minmax(0,1fr)_1px_minmax(0,1fr)] items-stretch gap-x-2.5 sm:grid-cols-[26px_minmax(0,1fr)_1px_minmax(0,1fr)] md:grid-cols-[28px_minmax(0,1fr)_1px_minmax(0,1fr)] md:gap-x-3">
              <div className="flex shrink-0 flex-col items-center py-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/18 md:h-7 md:w-7">
                  <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_rgba(254,80,80,0.35)] md:h-[14px] md:w-[14px]" />
                </div>
                <div className="my-1 flex-1 border-l-2 border-dotted border-[rgba(241,237,237,0.42)]" />
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/18 md:h-7 md:w-7">
                  <MapPin size={11} className="text-primary md:h-3 md:w-3" />
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-2 py-1">
                <div className="flex min-h-[52px] items-center rounded-[18px] border border-[rgba(126,142,177,0.72)] bg-[rgba(255,255,255,0.02)] px-3 py-2 md:min-h-[54px] md:px-3.5">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)] md:text-[11px]">
                      From : <span className="mt-1 text-[0.95rem] normal-case font-semibold leading-tight text-[var(--color-text)] break-words whitespace-normal md:text-base">
                        {tele.prevStopName}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="relative min-w-0">
                  <div
                    className="flex min-h-[52px] cursor-pointer items-center justify-between rounded-[18px] border border-[rgba(126,142,177,0.72)] bg-[rgba(255,255,255,0.02)] px-3 py-2 transition-colors hover:bg-[rgba(255,255,255,0.04)] md:min-h-[54px] md:px-3.5"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsDropdownOpen((prev) => !prev);
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)] md:text-[11px]">
                        To : <span className="mt-1 text-[0.95rem] normal-case font-semibold leading-tight text-[var(--color-text)] break-words whitespace-normal md:text-base">
                          {toStopName}
                        </span>
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-[var(--text-faint)] transition-transform ${isDropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[200px] overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-strong-bg)] shadow-2xl backdrop-blur-xl">
                      {STOPS_ON_ROUTE.map((stop) => {
                        const isRecommendedOption =
                          stop.name === recommendedStopName;
                        const isActive = stop.name === toStopName;

                        return (
                          <button
                            key={stop.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedToStop(
                                stop.name === recommendedStopName ? null : stop.name
                              );
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-surface-lighter/40 ${isActive
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-[var(--color-text)]"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{stop.name}</span>
                              {isRecommendedOption && (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
                                  Recommended
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="my-1 w-px self-stretch bg-[rgba(126,142,177,0.36)]" />

              <div className="min-w-0 flex-1">
                <div className="flex h-full min-h-[108px] flex-col rounded-[20px] border border-[rgba(126,142,177,0.72)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 md:min-h-[126px] md:px-3.5 md:py-3.5">
                  <div className="grid gap-2 md:gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.03)] md:h-8 md:w-8">
                        <Bus size={14} className="text-[var(--color-text)] md:h-[15px] md:w-[15px]" />
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 text-primary">
                        <Clock size={12} className="md:h-[13px] md:w-[13px]" />
                        <span className="whitespace-nowrap text-[13px] font-semibold md:text-[14px]">
                          {etaLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] font-semibold leading-tight text-[var(--color-text)] sm:text-[12px] md:text-[13px]">
                      <span className="min-w-0 break-words">{tele.prevStopName}</span>
                      <span className="shrink-0 text-[var(--text-faint)]">&gt;&gt;</span>
                      <span className="min-w-0 break-words">{toStopName}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleAlert?.();
                    }}
                    disabled={!onToggleAlert || !isAlertSupported}
                    className={`mt-auto flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:text-[12px] md:mt-1 md:gap-2.5 md:py-2.5 md:text-[13px] ${isAlertEnabled
                      ? "border-[#F4B000] bg-[#5B4310] text-[#F8D270] hover:bg-[#6A4D10]"
                      : isAlertSupported
                        ? "border-[#F4B000] bg-[#5B4310] text-[#F8D270] hover:bg-[#6A4D10]"
                        : "cursor-not-allowed border-[var(--glass-border)] bg-[var(--map-control-hover)] text-[var(--text-faint)]"
                      }`}
                  >
                    <AlertIcon size={14} className="md:h-[15px] md:w-[15px]" />
                    <span className="whitespace-nowrap">{alertLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isSelected && (
        <div className="-mt-1 px-4 pb-3">
          <button
            onClick={onSelect}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] py-2 text-[11px] font-medium text-[var(--text-faint)] transition-all hover:bg-surface-lighter/30"
          >
            <Clock size={12} />
            Tap for details
          </button>
        </div>
      )}

      <div className="mx-4 h-px bg-[var(--map-control-hover)]" />
    </div>
  );
}

function VehicleListContent({
  items,
  selectedVehicleId,
  onSelectVehicle,
  stop,
  stopEtas,
  stopDistanceM,
  stopKind,
  onClearStop,
  isAlertEnabled,
  isAlertSupported,
  onToggleAlert,
}: {
  items: PanelVehicleItem[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (id: string | null) => void;
  stop?: Stop | null;
  stopEtas: Eta[];
  stopDistanceM?: number;
  stopKind?: "nearest" | "selected" | null;
  onClearStop?: () => void;
  isAlertEnabled?: boolean;
  isAlertSupported?: boolean;
  onToggleAlert?: () => void;
}) {
  return (
    <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
      {stop && (
        <StopContextHeader
          stop={stop}
          stopEtas={stopEtas}
          stopDistanceM={stopDistanceM}
          stopKind={stopKind}
          onClearStop={onClearStop}
        />
      )}

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {!items.length && stop ? (
          <EmptyArrivalState stopName={stop.name_th} />
        ) : (
          items.map((item) => (
            <BusCard
              key={item.key}
              tele={item.tele}
              isSelected={selectedVehicleId === item.vehicleId}
              onSelect={() => onSelectVehicle?.(item.vehicleId)}
              contextStopName={item.contextStopName}
              stopEta={item.stopEta}
              isAlertEnabled={isAlertEnabled}
              isAlertSupported={isAlertSupported}
              onToggleAlert={onToggleAlert}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function VehiclePanel({
  vehicles,
  telemetry,
  onSelectVehicle,
  selectedVehicleId,
  stop,
  stopEtas = [],
  stopDistanceM,
  stopKind,
  onClearStop,
  isAlertEnabled,
  isAlertSupported,
  onToggleAlert,
}: VehiclePanelProps) {
  const [snapLevel, setSnapLevel] = useState<0 | 1 | 2>(1);

  const items = useMemo<PanelVehicleItem[]>(() => {
    const baseItems = vehicles
      .map((vehicle, index) => {
        const tele = telemetry[index];
        if (!tele) return null;

        return {
          key: vehicle.id,
          vehicleId: vehicle.id,
          tele,
        } satisfies PanelVehicleItem;
      })
      .filter((item): item is PanelVehicleItem => item !== null);

    if (!stop) {
      return baseItems;
    }

    const byVehicleId = new Map<string, PanelVehicleItem>();
    const byLabel = new Map<string, PanelVehicleItem>();

    for (const item of baseItems) {
      const vehicleIdKey = normalizeLookupKey(item.vehicleId);
      const labelKey = normalizeLookupKey(item.tele.label);

      if (vehicleIdKey) {
        byVehicleId.set(vehicleIdKey, item);
      }
      if (labelKey) {
        byLabel.set(labelKey, item);
      }
    }

    const matchedItems: PanelVehicleItem[] = [];
    const seenVehicleIds = new Set<string>();

    for (const eta of stopEtas) {
      const labelKey =
        normalizeLookupKey(eta.vehicle_label) ?? normalizeLookupKey(eta.line_name);
      const vehicleIdKey = normalizeLookupKey(eta.vehicle_id);
      const match =
        (labelKey ? byLabel.get(labelKey) : undefined) ??
        (vehicleIdKey ? byVehicleId.get(vehicleIdKey) : undefined);

      if (!match || seenVehicleIds.has(match.vehicleId)) {
        continue;
      }

      seenVehicleIds.add(match.vehicleId);
      matchedItems.push({
        ...match,
        key: `${match.vehicleId}-${eta.vehicle_id ?? eta.vehicle_label ?? "eta"}`,
        stopEta: eta,
        contextStopName: stop.name_th,
      });
    }

    if (matchedItems.length > 0) {
      return matchedItems;
    }

    return baseItems.map((item) => ({
      ...item,
      contextStopName: stop.name_th,
    }));
  }, [stop, stopEtas, telemetry, vehicles]);

  const handleToggle = () => {
    setSnapLevel((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
  };

  const renderPanelContent = () => (
    <VehicleListContent
      items={items}
      selectedVehicleId={selectedVehicleId}
      onSelectVehicle={onSelectVehicle}
      stop={stop}
      stopEtas={stopEtas}
      stopDistanceM={stopDistanceM}
      stopKind={stopKind}
      onClearStop={onClearStop}
      isAlertEnabled={isAlertEnabled}
      isAlertSupported={isAlertSupported}
      onToggleAlert={onToggleAlert}
    />
  );

  return (
    <>
      <div className="absolute right-4 top-4 z-20 hidden max-h-[calc(100vh-2rem)] w-[380px] animate-slideUp flex-col md:flex lg:w-[392px]">
        <div className="glass-card-dark relative flex flex-1 flex-col overflow-hidden border-[var(--panel-border)] bg-[var(--glass-strong-bg)] backdrop-blur-xl">
          <div className="relative z-10 h-2 w-full rounded-t-[14px] bg-gradient-to-r from-[#FE5050] to-[#C28437]" />
          {renderPanelContent()}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 flex h-[90vh] flex-col justify-end pointer-events-none md:hidden">
        <div
          className={`glass-card-dark pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-[var(--panel-border)] bg-[var(--glass-strong-bg)] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 ease-spring ${snapLevel === 0 ? "h-[60px]" : snapLevel === 1 ? "h-[45vh]" : "h-[85vh]"
            }`}
        >
          <div
            className="absolute left-0 right-0 top-0 z-30 h-[60px] cursor-pointer transition-colors active:bg-[var(--map-control-hover)]"
            onClick={handleToggle}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[#FE5050] to-[#C28437]" />
            <div className="flex flex-col items-center justify-center pb-1 pt-2">
              <div className="mb-1 h-1 w-12 rounded-full bg-[var(--text-faint)]" />
              {snapLevel === 0 && (
                <span className="max-w-[75vw] truncate text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)]">
                  {stop ? stop.name_th : "Tap to Expand"}
                </span>
              )}
              {snapLevel > 0 && (
                <ChevronDown
                  size={16}
                  className={`mt-1 text-[var(--text-faint)] transition-transform duration-300 ${snapLevel === 2 ? "rotate-180" : ""
                    }`}
                />
              )}
            </div>
          </div>

          <div
            className={`mt-[50px] min-h-0 flex-1 transition-opacity duration-300 ${snapLevel > 0 ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
          >
            {renderPanelContent()}
          </div>
        </div>
      </div>
    </>
  );
}
