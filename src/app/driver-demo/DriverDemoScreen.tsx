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
  X,
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
  "สายที่ 1 : สายหลัก",
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

const VEHICLE_LIST = [
  { id: "TRAM-1", name: "TRAM-1", status: "สายที่ 1: อาคารหลัก", isOnline: true },
  { id: "TRAM-2", name: "TRAM-2", status: "สายที่ 2: หอประชุม", isOnline: false },
  { id: "TRAM-8", name: "TRAM-8", status: "สายที่ 1: อาคารหลัก", isOnline: true },
] as const;

const DRIVER_NAME = "นายณัฐวัฒน์ แซ่ตั้ง";

const MODE_CONFIG: Record<DriverMode, DriverModeConfig> = {
  off: {
    orbIcon: Power,
    dutyLabel: "หยุดทำงาน",
    dotClassName: "bg-[#ff4b4b] text-[#ff4b4b]",
    statusLabel: "คนน้อย",
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
    statusLabel: "คนน้อย",
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

function BottomNavButton({ active, icon: Icon, label, onClick }: BottomNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-[60px] flex-1 flex-col items-center justify-end pb-1.5 text-[10px] text-white/62 transition focus:outline-none"
    >
      <div className="absolute -top-7 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center transition-all duration-300">
        {active ? (
          <div className="relative flex h-[56px] w-[56px] items-center justify-center rounded-full bg-black shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
            <Icon className="h-[24px] w-[24px] text-white" />
          </div>
        ) : (
          <div className="flex h-[44px] w-[44px] translate-y-6 items-center justify-center rounded-full bg-transparent opacity-0 transition-all duration-300 group-hover:bg-white/[0.04] group-hover:opacity-100">
            <Icon className="h-[20px] w-[20px] text-white/54" />
          </div>
        )}
      </div>

      {!active && (
        <div className="mb-1 flex h-[28px] w-[28px] items-center justify-center">
          <Icon className="h-[20px] w-[20px] text-white/54 transition-colors group-hover:text-white/80" />
        </div>
      )}

      <span
        className={cn(
          "relative z-20 transition-all duration-300 text-[11px]",
          active ? "font-semibold text-white" : "font-medium text-white/46 group-hover:text-white/60"
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
    <main className={cn("min-h-screen bg-[#2a2a2a] text-white lg:grid lg:place-items-center lg:p-6", kanit.className)}>
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

        <div className="flex min-h-screen flex-col lg:min-h-0 lg:h-[calc(100dvh-48px)] lg:max-h-[860px]">
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

              <div className="flex flex-1 flex-col px-5 pb-0 pt-0">
                <div
                  className="inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-white/20 bg-transparent px-3 text-[12px] font-medium text-white/90"
                  aria-live="polite"
                >
                  <Clock3 className="h-4 w-4" />
                  {elapsedLabel}
                </div>

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
              <header className="border-b border-white/10 px-5 pb-4 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-white">แจ้งเตือน</p>
                    <p className="mt-1 text-[11px] text-white/42">{selectedVehicle}</p>
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

          <nav className="relative mt-auto grid grid-cols-2 items-end gap-2 bg-transparent px-5 pb-3 pt-2">
            {/* Transparent Cutout Background Overlay */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div className="grid h-full w-full grid-cols-2 gap-2 px-5 pt-2">
                <div className="relative h-full w-full">
                  {activeTab === "home" && (
                    <div className="absolute left-1/2 top-0 h-[68px] w-[68px] -translate-x-1/2 -translate-y-[34px] rounded-full bg-transparent shadow-[0_0_0_2000px_#060606] transition-all duration-300" />
                  )}
                </div>
                <div className="relative h-full w-full">
                  {activeTab === "alerts" && (
                    <div className="absolute left-1/2 top-0 h-[68px] w-[68px] -translate-x-1/2 -translate-y-[34px] rounded-full bg-transparent shadow-[0_0_0_2000px_#060606] transition-all duration-300" />
                  )}
                </div>
              </div>
            </div>

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
