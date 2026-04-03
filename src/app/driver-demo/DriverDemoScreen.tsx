"use client";

import { Kanit } from "next/font/google";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BusFront,
  ChevronDown,
  Clock3,
  Check,
  Power,
  RefreshCcw,
  TriangleAlert,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useGpsReporter } from "@/features/shuttle/useGpsReporter";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

type DriverMode = "off" | "available" | "full";
type DriverTab = "home" | "alerts";
type AlertTone = "idle" | "positive" | "negative";

type DriverModeConfig = {
  orbIcon: LucideIcon;
  dutyLabel: string;
  dotClassName: string;
  statusLabel: string;
  statusClassName: string;
  helperLabel: string;
  orbClassName: string;
  orbGlow: string;
  iconClassName: string;
};

const ROUTE_OPTIONS = [
  "สายที่ 1 : สายหลัก",
  "สายที่ 2 : หอประชุม",
  "สายที่ 3 : ศูนย์กีฬา",
] as const;

const ISSUE_OPTIONS = [
  "ปัญหา",
  "อินเทอร์เน็ตขัดข้อง",
  "การแจ้งเตือนไม่ทำงาน",
  "อุปกรณ์ภายในรถมีปัญหา",
  "อื่น ๆ",
] as const;

const VEHICLE_LIST = [
  { id: "TRAM-1", name: "TRAM-1", status: "สายที่ 1: อาคารหลัก", isOnline: true },
  { id: "TRAM-2", name: "TRAM-2", status: "สายที่ 2: หอประชุม", isOnline: false },
  { id: "TRAM-8", name: "TRAM-8", status: "สายที่ 1: อาคารหลัก", isOnline: true },
] as const;

// Map route label → direction for the GPS ingest payload
const ROUTE_DIRECTION_MAP: Record<string, "outbound" | "inbound"> = {
  "สายที่ 1 : สายหลัก": "outbound",
  "สายที่ 2 : หอประชุม": "outbound",
  "สายที่ 3 : ศูนย์กีฬา": "outbound",
};

const DRIVER_NAME = "นายณัฐวัฒน์ แซ่ตั้ง";

const MODE_CONFIG: Record<DriverMode, DriverModeConfig> = {
  off: {
    orbIcon: Power,
    dutyLabel: "หยุดทำงาน",
    dotClassName: "bg-[#ff4b4b] text-[#ff4b4b]",
    statusLabel: "ว่าง",
    statusClassName: "text-white",
    helperLabel: "แตะเพื่อทำงาน",
    orbClassName:
      "border-white/10 bg-[#3a2020]",
    orbGlow: "rgba(255, 75, 75, 0.15)",
    iconClassName: "text-white",
  },
  available: {
    orbIcon: Users,
    dutyLabel: "กำลังทำงาน",
    dotClassName: "bg-[#4ade80] text-[#4ade80]",
    statusLabel: "ว่าง",
    statusClassName: "text-[#4ade80]",
    helperLabel: "แตะเพื่อเปลี่ยนสถานะ",
    orbClassName:
      "border-white/20 bg-[#3a3a3a]",
    orbGlow: "rgba(255, 255, 255, 0.1)",
    iconClassName: "text-white/60",
  },
  full: {
    orbIcon: Users,
    dutyLabel: "กำลังทำงาน",
    dotClassName: "bg-[#4ade80] text-[#4ade80]",
    statusLabel: "คนเต็ม",
    statusClassName: "text-[#ff4b4b]",
    helperLabel: "แตะเพื่อเปลี่ยนสถานะ",
    orbClassName:
      "border-[#ff4b4b]/30 bg-[#4a2a2a]",
    orbGlow: "rgba(255, 75, 75, 0.3)",
    iconClassName: "text-[#ff4b4b]",
  },
};

function formatDuration(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function cycleAlertTone(currentTone: AlertTone) {
  if (currentTone === "idle") {
    return "positive";
  }

  if (currentTone === "positive") {
    return "negative";
  }

  return "idle";
}

function getConnectivityLabel(tone: AlertTone) {
  if (tone === "positive") {
    return "อินเตอร์เน็ต";
  }

  if (tone === "negative") {
    return "อินเตอร์เน็ต";
  }

  return "อินเตอร์เน็ต";
}

function getNotificationLabel(tone: AlertTone) {
  if (tone === "positive") {
    return "เปิดแจ้งเตือน";
  }

  if (tone === "negative") {
    return "ปิดแจ้งเตือน";
  }

  return "เปิดแจ้งเตือน";
}

type AlertStatusButtonProps = {
  icon: LucideIcon;
  label: string;
  tone: AlertTone;
  onClick: () => void;
};

function AlertStatusButton({ icon: Icon, label, tone, onClick }: AlertStatusButtonProps) {
  const toneClassName =
    tone === "positive"
      ? "border-[#7af18b]/50 bg-[radial-gradient(circle_at_top,_#71df7c_0%,_#4db95a_58%,_#3a9246_100%)] shadow-[0_0_0_6px_rgba(80,212,108,0.1),0_10px_24px_rgba(37,102,48,0.38)]"
      : tone === "negative"
        ? "border-[#ff756f]/45 bg-[radial-gradient(circle_at_top,_#ff7975_0%,_#f0524c_58%,_#bf342f_100%)] shadow-[0_0_0_6px_rgba(255,98,92,0.12),0_18px_28px_rgba(89,23,22,0.44)]"
        : "border-white/[0.08] bg-[linear-gradient(180deg,_#3a3a3a_0%,_#303030_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_22px_rgba(0,0,0,0.24)]";

  const innerRingClassName =
    tone === "idle" ? "border-white/[0.05]" : "border-white/10";

  const labelClassName =
    tone === "positive"
      ? "text-[#50d86a]"
      : tone === "negative"
        ? "text-[#ff625c]"
        : "text-white/48";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-3 focus:outline-none"
      aria-label={label}
    >
      <span
        className={cn(
          "relative flex h-[78px] w-[78px] items-center justify-center rounded-full border transition duration-200",
          toneClassName
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute inset-[6px] rounded-full border",
            innerRingClassName
          )}
        />
        <Icon className="relative z-10 h-[31px] w-[31px] stroke-[2.1] text-white" />
      </span>

      <span className={cn("text-[12px] font-semibold leading-none", labelClassName)}>{label}</span>
    </button>
  );
}

type ActionRowProps = {
  icon: LucideIcon;
  label: string;
  trailingIcon: LucideIcon;
  onClick?: () => void;
};

function ActionRow({ icon: Icon, label, trailingIcon: TrailingIcon, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center text-white transition hover:bg-white/[0.03] focus:outline-none"
    >
      <span className="flex h-full w-[72px] items-center justify-center text-white/70">
        <Icon className="h-5 w-5 stroke-[1.5]" />
      </span>
      <span className="h-[22px] w-px bg-white/10" />
      <span className="flex-1 px-5 text-left text-[14px] font-medium text-white/90">
        {label}
      </span>
      <span className="flex h-full w-[72px] items-center justify-center text-white/50">
        <TrailingIcon className="h-5 w-5 stroke-[2]" />
      </span>
    </button>
  );
}

type BottomNavButtonProps = {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

type BackgroundTrackingNoticeProps = {
  emphasized: boolean;
};

function BackgroundTrackingNotice({ emphasized }: BackgroundTrackingNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-[18px] border px-4 py-3 text-[12px] leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        emphasized
          ? "border-[#f0c46a]/35 bg-[#5a4420]/45 text-[#ffe4a3]"
          : "border-white/10 bg-white/[0.04] text-white/62",
      )}
    >
      <div className="flex items-start gap-2.5">
        <TriangleAlert
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 mt-[18px]",
            emphasized ? "text-[#ffd47b]" : "text-white/55",
          )}
        />
        <p>
          เมื่อแอปอยู่เบื้องหลังหรือหน้าจอดับ browser อาจหยุดส่ง GPS ชั่วคราว ระบบจะเปลี่ยนรถเป็นล่าช้า
          หรือออฟไลน์อัตโนมัติหากไม่มีตำแหน่งใหม่เข้ามา
        </p>
      </div>
    </div>
  );
}

function BottomNavButton({ active, icon: Icon, label, onClick }: BottomNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[62px] flex-1 flex-col items-center justify-end pb-1 text-[11px] transition focus:outline-none"
    >
      {active && (
        <div className="absolute -top-[28px] left-1/2 z-20 flex h-[56px] w-[56px] -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-[#080808] shadow-[0_0_0_5px_#252525]">
          <Icon className="h-[22px] w-[22px] text-white" />
        </div>
      )}

      <div className="mb-1 flex h-[22px] w-[22px] items-center justify-center">
        {!active && <Icon className="h-[18px] w-[18px] text-white/55" />}
      </div>

      <span
        className={cn(
          "relative z-20 text-[11px]",
          active ? "font-medium text-white" : "font-medium text-white/46"
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function DriverDemoScreen() {
  const [mode, setMode] = useState<DriverMode>("off");
  const [activeTab, setActiveTab] = useState<DriverTab>("home");
  const [routeIndex, setRouteIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("TRAM-8");
  const [connectivityTone, setConnectivityTone] = useState<AlertTone>("positive");
  const [notificationTone, setNotificationTone] = useState<AlertTone>("positive");
  const [selectedIssue, setSelectedIssue] = useState<(typeof ISSUE_OPTIONS)[number]>("ปัญหา");
  const [issueDetails, setIssueDetails] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [hasBackgroundedWhileOnDuty, setHasBackgroundedWhileOnDuty] = useState(false);

  // ── GPS Reporting ──────────────────────────────────────────────────────────
  // Automatically starts when mode goes from "off" → "available"
  // and stops when driver taps "หยุดทำงาน" (mode → "off")
  useGpsReporter({
    enabled: mode !== "off",
    vehicleId: selectedVehicle,
    vehicleLabel: selectedVehicle,
    direction: ROUTE_DIRECTION_MAP[ROUTE_OPTIONS[routeIndex]] ?? "outbound",
    crowding: mode === "full" ? "full" : "normal",
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (mode === "off") {
      setHasBackgroundedWhileOnDuty(false);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && mode !== "off") {
        setHasBackgroundedWhileOnDuty(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mode]);

  const config = MODE_CONFIG[mode];
  const MainIcon = config.orbIcon;
  const elapsedLabel = formatDuration(startedAt ? now - startedAt : 0);
  const connectivityLabel = getConnectivityLabel(connectivityTone);
  const notificationLabel = getNotificationLabel(notificationTone);
  const shouldShowBackgroundTrackingNotice = mode !== "off";

  function handlePrimaryAction() {
    startTransition(() => {
      if (mode === "off") {
        setMode("available");
        setStartedAt(Date.now());
        return;
      }

      setMode(mode === "available" ? "full" : "available");
    });
  }

  function handleStopDuty() {
    startTransition(() => {
      setMode("off");
      setStartedAt(null);
    });
  }

  function cycleRoute() {
    setRouteIndex((previousIndex) => (previousIndex + 1) % ROUTE_OPTIONS.length);
  }

  return (
    <main className={cn("min-h-[100dvh] bg-[#2a2a2a] text-white lg:grid lg:place-items-center lg:p-6", kanit.className)}>
      <section className="relative w-full bg-[#252525] lg:max-w-[390px] lg:overflow-hidden lg:rounded-[30px] lg:border lg:border-white/8 lg:shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
        {isModalOpen && (
          <div className="absolute inset-0 z-50 flex items-end justify-center p-0 lg:items-center">
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm focus:outline-none"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal background"
            />
            {/* Modal Content - Slid up on mobile style sheet */}
            <div className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-[32px] border border-white/5 bg-[#252525] shadow-2xl animate-in slide-in-from-bottom-full pb-8 pt-4 lg:w-[320px] lg:rounded-[30px] lg:slide-in-from-bottom-12">
              <div className="relative flex items-center justify-between px-6 pb-4">
                <h2 className="text-[17px] font-semibold text-white">เลือกรถที่ท่านต้องการขับ</h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 stroke-[2]" />
                </button>
              </div>

              <div className="flex max-h-[400px] flex-col overflow-y-auto px-4">
                {VEHICLE_LIST.map((vehicle) => {
                  const isSelected = selectedVehicle === vehicle.id;
                  return (
                    <button
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicle(vehicle.id);
                        setIsModalOpen(false);
                      }}
                      className={cn(
                        "group mb-2 flex w-full items-center justify-between rounded-[20px] p-4 text-left transition focus:outline-none",
                        isSelected
                          ? "bg-[#4ade80]/15"
                          : "bg-white/[0.03] hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full border border-white/5",
                          isSelected ? "bg-[#4ade80]/20 text-[#4ade80]" : "bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white/80"
                        )}>
                          <BusFront className="h-[22px] w-[22px] stroke-[1.5]" />
                        </div>
                        <div>
                          <p className={cn("text-[15px] font-semibold", isSelected ? "text-[#4ade80]" : "text-white")}>
                            {vehicle.name} <span className={cn("ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full", vehicle.isOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>{vehicle.isOnline ? "พร้อมวิ่ง" : "กำลังบำรุงรักษา"}</span>
                          </p>
                          <p className="mt-0.5 text-[12px] text-white/50">{vehicle.status}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mr-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.4)]">
                          <Check className="h-4 w-4 text-black stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-[100dvh] flex-col lg:min-h-0 lg:h-[calc(100dvh-48px)] lg:max-h-[860px]">
          {activeTab === "home" ? (
            <>
              <header className="px-5 pb-4 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shadow-[0_0_14px_currentColor]",
                        config.dotClassName
                      )}
                    />
                    <p className="text-[15px] font-semibold text-white">{config.dutyLabel}</p>
                  </div>

                  {mode === "off" ? (
                    <span className="w-[92px]" aria-hidden />
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopDuty}
                      className="flex items-center gap-1.5 rounded-[20px] bg-[#ff4b4b] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-[0_4px_14px_rgba(255,75,75,0.4)] transition hover:bg-[#ff5c5c] focus:outline-none focus:ring-2 focus:ring-white/15"
                    >
                      <Power className="h-3.5 w-3.5" />
                      หยุดทำงาน
                    </button>
                  )}
                </div>
              </header>

              <div className="border-t border-white/10 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div
                  className="inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-white/20 bg-transparent px-3 text-[12px] font-medium text-white/90"
                  aria-live="polite"
                >
                  <Clock3 className="h-4 w-4" />
                  {elapsedLabel}
                </div>

                {shouldShowBackgroundTrackingNotice && (
                  <div className="mt-4">
                    <BackgroundTrackingNotice emphasized={hasBackgroundedWhileOnDuty} />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col px-5 pb-0 pt-6">
                <div className="mt-8 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className={cn(
                      "relative flex h-[180px] w-[180px] items-center justify-center rounded-full border transition",
                      "shadow-[rgba(0,0,0,0.5)_0px_20px_48px]",
                      "focus:outline-none focus:ring-2 focus:ring-white/14",
                      config.orbClassName
                    )}
                    aria-label={config.helperLabel}
                  >
                    <div
                      className="pointer-events-none absolute inset-[12px] rounded-full"
                      style={{
                        boxShadow: `0 0 40px ${config.orbGlow}`,
                      }}
                    />
                    <MainIcon className={cn("relative z-10 h-[80px] w-[80px] stroke-[2]", config.iconClassName)} />
                  </button>

                  <p className="mt-6 text-[14px] font-medium text-white/50">{config.helperLabel}</p>

                  <p className="mt-4 text-[20px] font-semibold text-white">
                    สถานะ : <span className={config.statusClassName}>{config.statusLabel}</span>
                  </p>
                </div>

                <div className="mt-6 w-full">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-[12px] border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <BusFront className="h-4 w-4" />
                      {selectedVehicle}
                      <RefreshCcw className="ml-1 h-3.5 w-3.5" />
                    </button>
                    <p className="text-[13px] font-medium text-white">
                      ชื่อ : {DRIVER_NAME}
                    </p>
                  </div>

                  <div className="mt-6 border-y border-white/10 -mx-5 bg-white/[0.01]">
                    <ActionRow
                      icon={BusFront}
                      label={ROUTE_OPTIONS[routeIndex]}
                      trailingIcon={RefreshCcw}
                      onClick={cycleRoute}
                    />
                    <div className="h-px bg-white/10 border-none" />
                    <ActionRow
                      icon={Bell}
                      label="เช็คสถานะรถ"
                      trailingIcon={ChevronDown}
                      onClick={() => setActiveTab("alerts")}
                    />
                  </div>
                </div>

                <div className="min-h-[60px] flex-1" />
              </div>
            </>
          ) : (
            <>
              <header className="px-5 pb-3 pt-5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full shadow-[0_0_14px_currentColor]",
                      config.dotClassName
                    )}
                  />
                  <p className="text-[15px] font-semibold text-white">{config.dutyLabel}</p>
                </div>
              </header>

              <div className="h-px bg-white/10" />

              <div className="flex flex-1 flex-col overflow-y-auto">
                <div className="px-[35px] pt-[28px]">
                  {shouldShowBackgroundTrackingNotice && (
                    <BackgroundTrackingNotice emphasized={hasBackgroundedWhileOnDuty} />
                  )}

                  <div className="grid grid-cols-2 gap-[36px]">
                    <AlertStatusButton
                      icon={Wifi}
                      label={connectivityLabel}
                      tone={connectivityTone}
                      onClick={() =>
                        setConnectivityTone((currentTone) => cycleAlertTone(currentTone))
                      }
                    />
                    <AlertStatusButton
                      icon={Bell}
                      label={notificationLabel}
                      tone={notificationTone}
                      onClick={() =>
                        setNotificationTone((currentTone) => cycleAlertTone(currentTone))
                      }
                    />
                  </div>

                  <div className="mt-[18px] flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[#8391af]/70 bg-[#26282c] pl-3 pr-2.5 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-[#2b2d33] focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <BusFront className="h-[14px] w-[14px] stroke-[1.8]" />
                      {selectedVehicle}
                      <RefreshCcw className="h-[11px] w-[11px] stroke-[2]" />
                    </button>
                    <p className="min-w-0 truncate text-[13px] font-medium text-white/92">
                      ชื่อ : {DRIVER_NAME}
                    </p>
                  </div>
                </div>

                <div className="mt-[16px] h-px bg-white/10" />

                <form className="flex flex-1 flex-col px-[43px] pb-[14px] pt-[18px]">
                  <label htmlFor="driver-issue" className="text-[12px] font-medium text-white/34">
                    เลือกปัญหาที่พบ
                  </label>
                  <div className="relative mt-[13px]">
                    <select
                      id="driver-issue"
                      value={selectedIssue}
                      onChange={(event) =>
                        setSelectedIssue(event.target.value as (typeof ISSUE_OPTIONS)[number])
                      }
                      className="h-[47px] w-full appearance-none rounded-[8px] border border-white/[0.12] bg-[linear-gradient(135deg,_#4a4a4a_0%,_#323232_100%)] px-4 text-[13px] font-medium text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-white/16"
                    >
                      {ISSUE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-white/36" />
                  </div>

                  <label
                    htmlFor="driver-issue-detail"
                    className="mt-[20px] text-[12px] font-medium text-white/34"
                  >
                    รายละเอียดเพิ่มเติม
                  </label>
                  <textarea
                    id="driver-issue-detail"
                    value={issueDetails}
                    onChange={(event) => setIssueDetails(event.target.value)}
                    placeholder="พิมพ์รายละเอียดเบื้องต้น..."
                    className="mt-[13px] h-[140px] mb-[18px] w-full resize-none rounded-[8px] border border-white/[0.12] bg-[linear-gradient(135deg,_#464646_0%,_#2e2e2e_100%)] px-4 py-4 text-[13px] leading-6 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none placeholder:text-white/24 transition focus:border-white/16"
                  />

                  <button
                    type="button"
                    className="mt-auto h-[42px] w-full rounded-[14px] bg-[#ff5256] text-[17px] mb-8 font-medium text-white shadow-[0_10px_24px_rgba(255,82,86,0.2)] transition hover:bg-[#ff6161] focus:outline-none focus:ring-2 focus:ring-white/12"
                  >
                    แจ้งปัญหา
                  </button>
                </form>
              </div>
            </>
          )}

          <nav className="sticky bottom-0 z-20 mt-auto grid grid-cols-2 items-end gap-2 border-t border-white/10 bg-[#060606]/95 px-6 pb-2 pt-3 shadow-[0_-18px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl [padding-bottom:calc(env(safe-area-inset-bottom)+0.5rem)]">
            <BottomNavButton
              active={activeTab === "home"}
              icon={BusFront}
              label="หน้าหลัก"
              onClick={() => setActiveTab("home")}
            />
            <BottomNavButton
              active={activeTab === "alerts"}
              icon={TriangleAlert}
              label="แจ้งเตือน"
              onClick={() => setActiveTab("alerts")}
            />
          </nav>
        </div>
      </section>
    </main>
  );
}
