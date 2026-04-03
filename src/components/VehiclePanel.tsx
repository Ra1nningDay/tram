import Image from "next/image";
import { Bell, BellRing, Bus, ChevronDown, ChevronUp, Clock, MapPin, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Eta, Stop, Vehicle } from "../features/shuttle/api";
import { formatDistance, formatWalkingTime } from "../lib/format-distance";
import { STOPS_ON_ROUTE, type VehicleTelemetry } from "../hooks/useGpsReplay";
import { getCrowdingDisplay } from "../lib/vehicles/crowding";

interface VehiclePanelProps {
  vehicles: Vehicle[];
  telemetry: VehicleTelemetry[];
  onSelectVehicle?: (id: string | null) => void;
  selectedVehicleId?: string | null;
  snapLevel?: 0 | 1 | 2;
  onSnapLevelChange?: (level: 0 | 1 | 2) => void;
  autoExpandVehicleRequest?: string | null;
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
  if (speedKmh < 0.5) return "รถจอดรับ";
  const hours = distanceM / 1000 / speedKmh;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return "< 1 นาที";
  if (minutes === 1) return "~1 นาที";
  return `~${minutes} นาที`;
}

function formatEtaMinutes(eta?: Eta): string {
  if (!eta || eta.status !== "fresh" || eta.eta_minutes < 0) {
    return "กำลังอัปเดต";
  }

  if (eta.eta_minutes < 1) return "< 1 นาที";
  return `~${eta.eta_minutes} นาที`;
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

type PanelTheme = {
  skyGradient: string;
  skyGlow: string;
  handleChevron: string;
};

const MOBILE_HEADER_HEIGHT = 126;
const DESKTOP_HEADER_HEIGHT = 110;

function getPanelTheme(date = new Date()): PanelTheme {
  const hour = date.getHours();
  const isMorning = hour >= 5 && hour < 12;

  if (isMorning) {
    return {
      skyGradient:
        "linear-gradient(180deg, #8BD9FF 0%, #55C1F4 58%, #219BDF 100%)",
      skyGlow:
        "radial-gradient(circle at 50% -12%, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.16) 34%, rgba(255,255,255,0) 72%)",
      handleChevron: "#7E9ECE",
    };
  }

  return {
    skyGradient:
      "linear-gradient(180deg, #F1A253 0%, #E68E57 52%, #C76B61 100%)",
    skyGlow:
      "radial-gradient(circle at 50% -12%, rgba(255,243,224,0.44) 0%, rgba(255,223,187,0.12) 36%, rgba(255,255,255,0) 72%)",
    handleChevron: "#FFF7ED",
  };
}

function IllustratedPanelHeader({
  theme,
  mobile = false,
  snapLevel,
  onToggle,
}: {
  theme: PanelTheme;
  mobile?: boolean;
  snapLevel?: 0 | 1 | 2;
  onToggle?: () => void;
}) {
  const headerHeight = mobile ? MOBILE_HEADER_HEIGHT : DESKTOP_HEADER_HEIGHT;
  const ChevronIcon = snapLevel === 2 ? ChevronDown : ChevronUp;

  const content = (
    <>
      <div className="absolute inset-0" style={{ background: theme.skyGradient }} />
      <div className="absolute inset-0" style={{ background: theme.skyGlow }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-[28px] h-10 bg-gradient-to-b from-transparent via-white/5 to-white/20 opacity-80" />
      <div
        className="absolute inset-x-0 bottom-0 h-[28px] border-t border-black/10 backdrop-blur-xl"
        style={{ background: "var(--glass-strong-bg)" }}
      />

      {mobile && (
        <div className="absolute inset-x-0 top-[8px] z-20 flex justify-center">
          <ChevronIcon
            size={28}
            strokeWidth={2.25}
            className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
            style={{ color: theme.handleChevron }}
          />
        </div>
      )}

      <div className={`absolute left-5 z-20 ${mobile ? "top-[22px]" : "top-[16px]"}`}>
        <h2
          className={`font-heading font-bold leading-none tracking-[-0.04em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.22)] ${mobile ? "text-[1.45rem]" : "text-[1.35rem] lg:text-[1.65rem]"
            }`}
        >
          ดูรอบรถ
        </h2>
      </div>

      <div className={`pointer-events-none absolute z-10 ${mobile ? "bottom-[12px] left-4" : "bottom-[10px] left-5"}`}>
        <Image
          src="/busstop.png"
          alt=""
          aria-hidden="true"
          width={131}
          height={65}
          sizes={mobile ? "118px" : "110px"}
          className={`${mobile ? "w-[118px]" : "w-[100px] lg:w-[126px]"} h-auto`}
        />
      </div>

      <div className={`pointer-events-none absolute z-10 ${mobile ? "bottom-[4px] -right-[5px]" : "bottom-[2px] -right-[10px]"}`}>
        <Image
          src="/bus.png"
          alt=""
          aria-hidden="true"
          width={115}
          height={85}
          sizes={mobile ? "122px" : "115px"}
          className={`${mobile ? "w-[122px]" : "w-[105px] lg:w-[132px]"} h-auto`}
        />
      </div>
    </>
  );

  if (mobile) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle?.();
          }
        }}
        className="absolute inset-x-0 top-0 z-30 w-full overflow-hidden rounded-t-[28px] text-left transition-[filter] duration-200 active:brightness-95"
        style={{ height: headerHeight }}
        aria-label={snapLevel === 2 ? "ย่อแผงข้อมูลรถ" : "ขยายแผงข้อมูลรถ"}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="relative z-10 overflow-hidden border-b border-[var(--glass-border)]/70"
      style={{ height: headerHeight }}
    >
      {content}
    </div>
  );
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
  const kindLabel = stopKind === "nearest" ? "ป้ายใกล้คุณ" : "ป้ายที่เลือก";
  const vehicleCountLabel = `รถกำลังมาถึง ${stopEtas.length} คัน`;
  const distanceLabel =
    typeof stopDistanceM === "number"
      ? `${formatDistance(stopDistanceM)} | ${formatWalkingTime(stopDistanceM)}`
      : null;

  return (
    <div className="relative z-10 overflow-hidden border-b border-[var(--glass-border)]/80 px-4 pb-3 pt-3">
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
                  ป้าย {stop.sequence}
                </span>
              </div>

              <h3 className="overflow-hidden pb-1 text-ellipsis whitespace-nowrap text-[1.9rem] font-semibold leading-[1.2] tracking-normal text-[var(--color-text)]">
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
                aria-label="ปิดข้อมูลป้าย"
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
          ยังไม่มีข้อมูลเวลารถถึงสำหรับ {stopName}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          การ์ดรถจะปรากฏเมื่อมีข้อมูล ETA พร้อมใช้งาน
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
  autoExpandRequest,
  isAlertEnabled,
  isAlertSupported,
  onToggleAlert,
}: {
  tele: VehicleTelemetry;
  isSelected: boolean;
  onSelect: () => void;
  contextStopName?: string;
  stopEta?: Eta;
  autoExpandRequest?: string | null;
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
    if (!isSelected) {
      setShowDetails(false);
    }
  }, [isSelected]);

  useEffect(() => {
    if (isSelected && autoExpandRequest) {
      setShowDetails(true);
    }
  }, [autoExpandRequest, isSelected]);

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
  const density = getCrowdingDisplay(tele.crowding);
  const routeLabel = `${tele.prevStopName} >> ${toStopName}`;
  const alertLabel = "แจ้งเตือน";
  const AlertIcon = isAlertEnabled ? BellRing : Bell;

  return (
    <div
      className={`relative transition-colors duration-300 rounded-[24px] ${isSelected ? "bg-surface-light shadow-lg" : ""
        }`}
    >
      <button
        onClick={onSelect}
        className={`bus-card group relative w-full overflow-hidden rounded-[24px] p-3 text-left transition-all lg:p-4 ${isSelected
          ? "![background:transparent] !translate-x-0 cursor-default"
          : "bg-transparent hover:bg-[var(--map-control-hover)]"
          }`}
      >
        <div className="mb-1.5 flex items-center gap-2.5 lg:mb-2 lg:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--text-faint)] bg-transparent lg:h-11 lg:w-11">
            <Bus
              size={20}
              className="text-[var(--color-text)] lg:h-6 lg:w-6"
              strokeWidth={1.5}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-bold leading-tight tracking-wide text-[var(--color-text)] lg:text-xl">
              {tele.label}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 lg:px-3 lg:py-1.5">
            <Clock size={12} className="text-primary" />
            <span className="whitespace-nowrap text-xs font-semibold text-primary">
              {etaLabel}
            </span>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between px-1 text-[11px] lg:mb-3 lg:text-xs">
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: density.color }} />
            <span style={{ color: density.color }} className="font-medium">
              ความหนาแน่น: {density.label}
            </span>
            <DensityBars level={density.level} color={density.color} />
          </div>
          <span className="ml-2 truncate text-[11px] text-[var(--text-faint)]">
            {routeLabel}
          </span>
        </div>

        {showDetails && (
          <div className="relative mx-1 mt-3 mb-1 h-1.5 rounded-full bg-surface-lighter">
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
        )}
      </button>

      {isSelected && (
        <div className="mt-[-4px] space-y-3 px-3 pb-4">
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
            <span>{showDetails ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}</span>
          </button>

          <div
            ref={dropdownRef}
            className={`transition-all duration-300 sm:px-3 ${showDetails
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
                      จาก : <span className="mt-1 text-[0.95rem] normal-case font-semibold leading-tight text-[var(--color-text)] break-words whitespace-normal md:text-base">
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
                        ถึง : <span className="mt-1 text-[0.95rem] normal-case font-semibold leading-tight text-[var(--color-text)] break-words whitespace-normal md:text-base">
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
                                  แนะนำ
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
            onClick={() => {
              setShowDetails(true);
              onSelect();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] py-2 text-[11px] font-medium text-[var(--text-faint)] transition-all hover:bg-surface-lighter/30"
          >
            <Clock size={12} />
            ดูรายละเอียด
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
  autoExpandVehicleRequest,
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
  autoExpandVehicleRequest?: string | null;
  isAlertEnabled?: boolean;
  isAlertSupported?: boolean;
  onToggleAlert?: () => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedVehicleId || !listRef.current) return;

    setTimeout(() => {
      if (!listRef.current) return;
      const target = listRef.current.querySelector<HTMLElement>(
        `[data-vehicle-id="${selectedVehicleId}"]`
      );

      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 100);
  }, [selectedVehicleId]);

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

      <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto p-2">
        {!items.length && stop ? (
          <EmptyArrivalState stopName={stop.name_th} />
        ) : (
          items.map((item) => (
            <div key={item.key} data-vehicle-id={item.vehicleId}>
              <BusCard
                tele={item.tele}
                isSelected={selectedVehicleId === item.vehicleId}
                onSelect={() => onSelectVehicle?.(item.vehicleId)}
                contextStopName={item.contextStopName}
                stopEta={item.stopEta}
                autoExpandRequest={
                  autoExpandVehicleRequest?.startsWith(`${item.vehicleId}:`)
                    ? autoExpandVehicleRequest
                    : null
                }
                isAlertEnabled={isAlertEnabled}
                isAlertSupported={isAlertSupported}
                onToggleAlert={onToggleAlert}
              />
            </div>
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
  snapLevel,
  onSnapLevelChange,
  autoExpandVehicleRequest,
  stop,
  stopEtas = [],
  stopDistanceM,
  stopKind,
  onClearStop,
  isAlertEnabled,
  isAlertSupported,
  onToggleAlert,
}: VehiclePanelProps) {
  const [internalSnapLevel, setInternalSnapLevel] = useState<0 | 1 | 2>(1);
  const panelTheme = useMemo(() => getPanelTheme(), []);
  const currentSnapLevel = snapLevel ?? internalSnapLevel;
  const mobilePanelHeight =
    currentSnapLevel === 0 ? MOBILE_HEADER_HEIGHT : currentSnapLevel === 1 ? "52vh" : "85vh";

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

    let resultItems = baseItems;

    if (stop) {
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
        resultItems = matchedItems;
      } else {
        resultItems = baseItems.map((item) => ({
          ...item,
          contextStopName: stop.name_th,
        }));
      }
    }

    if (selectedVehicleId) {
      const selectedIndex = resultItems.findIndex(
        (item) => item.vehicleId === selectedVehicleId
      );
      if (selectedIndex > 0) {
        const item = resultItems[selectedIndex];
        resultItems = [
          item,
          ...resultItems.slice(0, selectedIndex),
          ...resultItems.slice(selectedIndex + 1),
        ];
      }
    }

    return resultItems;
  }, [stop, stopEtas, telemetry, vehicles, selectedVehicleId]);

  const setSnapLevel = (nextLevel: 0 | 1 | 2) => {
    if (snapLevel === undefined) {
      setInternalSnapLevel(nextLevel);
    }
    onSnapLevelChange?.(nextLevel);
  };

  const handleToggle = () => {
    setSnapLevel(((currentSnapLevel + 1) % 3) as 0 | 1 | 2);
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
      autoExpandVehicleRequest={autoExpandVehicleRequest}
      isAlertEnabled={isAlertEnabled}
      isAlertSupported={isAlertSupported}
      onToggleAlert={onToggleAlert}
    />
  );

  return (
    <>
      <div className="absolute right-3 top-3 z-20 hidden max-h-[calc(100vh-1.5rem)] w-[340px] animate-slideUp flex-col md:flex lg:right-4 lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-[380px] xl:w-[420px]">
        <div className="glass-card-dark relative flex flex-1 flex-col overflow-hidden border-[var(--panel-border)] bg-[var(--glass-strong-bg)] backdrop-blur-xl">
          <IllustratedPanelHeader theme={panelTheme} />
          {renderPanelContent()}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 flex h-[90vh] flex-col justify-end pointer-events-none md:hidden">
        <div
          className="glass-card-dark relative pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-[28px] rounded-b-none border-t border-[var(--panel-border)] bg-[var(--glass-strong-bg)] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 ease-spring"
          style={{ height: mobilePanelHeight }}
        >
          <IllustratedPanelHeader
            theme={panelTheme}
            mobile
            snapLevel={currentSnapLevel}
            onToggle={handleToggle}
          />

          <div
            className={`flex flex-col min-h-0 flex-1 transition-opacity duration-300 ${currentSnapLevel > 0 ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            style={{ marginTop: MOBILE_HEADER_HEIGHT }}
          >
            {renderPanelContent()}
          </div>
        </div>
      </div>
    </>
  );
}
