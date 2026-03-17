"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BusFront,
  ChevronDown,
  Clock3,
  Power,
  RefreshCcw,
  TriangleAlert,
  UserRoundPlus,
  UserRoundX,
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type DriverMode = "off" | "available" | "full";
type DriverTab = "home" | "alerts";

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
  "สายที่ 1 : อาคารหลัก",
  "สายที่ 2 : หอประชุม",
  "สายที่ 3 : ศูนย์กีฬา",
] as const;

const ALERT_ITEMS = [
  {
    id: "capacity",
    title: "รถพร้อมรับผู้โดยสาร",
    detail: "สถานะปัจจุบันพร้อมใช้งานและยังมีพื้นที่ว่างในรถ",
  },
  {
    id: "terminal",
    title: "จุดปลายทางรับทราบสถานะแล้ว",
    detail: "อัปเดตล่าสุดถูกส่งไปยังปลายทางของสายที่เลือก",
  },
  {
    id: "system",
    title: "หน้า driver ยังเป็น demo",
    detail: "ยังไม่เชื่อม auth หรือ backend จริง แต่ interaction หลักพร้อมใช้งาน",
  },
] as const;

const DRIVER_NAME = "นายภูริวัฒน์ แซ่ตั้ง";
const VEHICLE_LABEL = "TRAM-8";

const MODE_CONFIG: Record<DriverMode, DriverModeConfig> = {
  off: {
    orbIcon: Power,
    dutyLabel: "หยุดทำงาน",
    dotClassName: "bg-rose-400 text-rose-400",
    statusLabel: "คนน้อย",
    statusClassName: "text-white",
    helperLabel: "แตะเพื่อทำงาน",
    orbClassName:
      "border-white/14 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.06),rgba(130,74,74,0.32)_45%,rgba(83,48,48,0.9)_100%)]",
    orbGlow: "rgba(214, 121, 121, 0.24)",
    iconClassName: "text-white",
  },
  available: {
    orbIcon: UserRoundPlus,
    dutyLabel: "กำลังทำงาน",
    dotClassName: "bg-emerald-400 text-emerald-400",
    statusLabel: "คนน้อย",
    statusClassName: "text-emerald-400",
    helperLabel: "แตะเพื่อเปลี่ยนสถานะ",
    orbClassName:
      "border-emerald-200/25 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.08),rgba(77,201,116,0.18)_45%,rgba(44,71,49,0.92)_100%)]",
    orbGlow: "rgba(72, 221, 113, 0.3)",
    iconClassName: "text-emerald-400",
  },
  full: {
    orbIcon: UserRoundX,
    dutyLabel: "กำลังทำงาน",
    dotClassName: "bg-emerald-400 text-emerald-400",
    statusLabel: "คนเต็ม",
    statusClassName: "text-rose-400",
    helperLabel: "แตะเพื่อเปลี่ยนสถานะ",
    orbClassName:
      "border-rose-200/25 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.08),rgba(239,68,68,0.16)_45%,rgba(79,36,36,0.92)_100%)]",
    orbGlow: "rgba(239, 68, 68, 0.32)",
    iconClassName: "text-rose-400",
  },
};

function formatDuration(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
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
      className="flex h-11 w-full items-center text-white transition hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/10"
    >
      <span className="flex h-full w-11 items-center justify-center text-white/76">
        <Icon className="h-[15px] w-[15px]" />
      </span>
      <span className="h-5 w-px bg-white/14" />
      <span className="flex-1 px-3 text-center text-[11px] font-medium text-white/82">
        {label}
      </span>
      <span className="flex h-full w-11 items-center justify-center text-white/62">
        <TrailingIcon className="h-[15px] w-[15px]" />
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

function BottomNavButton({ active, icon: Icon, label, onClick }: BottomNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-end rounded-2xl pb-1 text-[10px] text-white/62 transition hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-white/10"
    >
      <span
        className={cn(
          "relative mb-1.5 flex h-10 w-10 items-center justify-center rounded-full border transition",
          active
            ? "-mt-5 border-white/12 bg-[#050505] text-white shadow-[0_10px_20px_rgba(0,0,0,0.45)]"
            : "-mt-1 border-transparent bg-transparent text-white/54"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={cn(active ? "text-white" : "text-white/46")}>{label}</span>
    </button>
  );
}

export function DriverDemoScreen() {
  const [mode, setMode] = useState<DriverMode>("off");
  const [activeTab, setActiveTab] = useState<DriverTab>("home");
  const [routeIndex, setRouteIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const config = MODE_CONFIG[mode];
  const MainIcon = config.orbIcon;
  const elapsedLabel = formatDuration(startedAt ? now - startedAt : 0);

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
    <main className="min-h-screen bg-[#2a2a2a] text-white lg:grid lg:place-items-center lg:p-6">
      <section className="w-full bg-[#252525] lg:max-w-[390px] lg:overflow-hidden lg:rounded-[30px] lg:border lg:border-white/8 lg:shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
        <div className="flex min-h-screen flex-col lg:min-h-0 lg:h-[calc(100dvh-48px)] lg:max-h-[860px]">
          {activeTab === "home" ? (
            <>
              <header className="border-b border-white/10 px-5 pb-4 pt-5">
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
                      className="rounded-full bg-[#ff5656] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(255,86,86,0.28)] transition hover:bg-[#ff6a6a] focus:outline-none focus:ring-2 focus:ring-white/15"
                    >
                      หยุดทำงาน
                    </button>
                  )}
                </div>
              </header>

              <div className="flex flex-1 flex-col px-5 pb-0 pt-4">
                <div
                  className="inline-flex h-6 items-center gap-1.5 self-start rounded-full border border-white/18 bg-[#202020] px-2.5 text-[10px] font-medium text-white/88"
                  aria-live="polite"
                >
                  <Clock3 className="h-[13px] w-[13px]" />
                  {elapsedLabel}
                </div>

                <div className="mt-6 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className={cn(
                      "relative flex h-[204px] w-[204px] items-center justify-center rounded-full border transition",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_48px_rgba(0,0,0,0.34)]",
                      "animate-[driver-orb-breathe_4.2s_ease-in-out_infinite] motion-reduce:animate-none",
                      "focus:outline-none focus:ring-2 focus:ring-white/14",
                      config.orbClassName
                    )}
                    aria-label={config.helperLabel}
                  >
                    <div
                      className="pointer-events-none absolute inset-[12px] rounded-full border border-white/9"
                      style={{
                        boxShadow: `0 0 36px ${config.orbGlow}`,
                      }}
                    />
                    <div className="pointer-events-none absolute -left-6 top-6 h-20 w-14 rotate-[18deg] bg-white/8 blur-xl animate-[driver-shimmer_5s_linear_infinite] motion-reduce:animate-none" />
                    <MainIcon className={cn("relative z-10 h-[72px] w-[72px] stroke-[1.6]", config.iconClassName)} />
                  </button>

                  <p className="mt-7 text-[11px] font-medium text-white/30">{config.helperLabel}</p>

                  <p className="mt-4 text-[15px] font-semibold text-white">
                    สถานะ : <span className={config.statusClassName}>{config.statusLabel}</span>
                  </p>
                </div>

                <div className="mt-4 w-full">
                  <div className="flex items-center gap-2 rounded-full border border-white/14 px-2.5 py-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/16 px-2 py-1 text-[10px] font-semibold text-white/88">
                      <BusFront className="h-[12px] w-[12px]" />
                      {VEHICLE_LABEL}
                    </span>
                    <p className="min-w-0 truncate text-[11px] font-medium text-white/82">
                      ชื่อ : {DRIVER_NAME}
                    </p>
                  </div>

                  <div className="mt-3 border-y border-white/12">
                    <ActionRow
                      icon={BusFront}
                      label={ROUTE_OPTIONS[routeIndex]}
                      trailingIcon={RefreshCcw}
                      onClick={cycleRoute}
                    />
                    <div className="h-px bg-white/12" />
                    <ActionRow
                      icon={Bell}
                      label="เช็คสถานะรถ"
                      trailingIcon={ChevronDown}
                    />
                  </div>
                </div>

                <div className="min-h-[92px] flex-1" />
              </div>
            </>
          ) : (
            <>
              <header className="border-b border-white/10 px-5 pb-4 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-white">แจ้งเตือน</p>
                    <p className="mt-1 text-[11px] text-white/42">{VEHICLE_LABEL}</p>
                  </div>
                  <span className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-medium text-white/72">
                    {ALERT_ITEMS.length} รายการ
                  </span>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-3">
                  {ALERT_ITEMS.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <p className="text-[13px] font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-white/58">{item.detail}</p>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}

          <nav className="mt-auto grid grid-cols-2 items-end gap-2 bg-[#060606] px-5 pb-3 pt-2">
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
