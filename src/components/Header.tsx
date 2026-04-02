"use client";

import { Bell, BellOff, Search, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "./ThemeToggle";

export type HeaderSearchResult = {
  id: string;
  type: "vehicle" | "stop";
  title: string;
  subtitle?: string;
};

export type HeaderSearchControls = {
  value: string;
  results: HeaderSearchResult[];
  isOpen: boolean;
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: HeaderSearchResult) => void;
};

type HeaderProps = {
  isAlertEnabled?: boolean;
  isAlertSupported?: boolean;
  onToggleAlert?: () => void;
  search?: HeaderSearchControls;
};

function SearchResultsSection({
  title,
  results,
  onSelect,
}: {
  title: string;
  results: HeaderSearchResult[];
  onSelect: (result: HeaderSearchResult) => void;
}) {
  if (!results.length) return null;

  return (
    <section>
      <div className="px-3 pb-2 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
          {title}
        </p>
      </div>

      <div className="space-y-1">
        {results.map((result) => (
          <button
            key={`${result.type}:${result.id}`}
            type="button"
            onClick={() => onSelect(result)}
            className="flex w-full items-start justify-between gap-3 rounded-[22px] px-3 py-3 text-left transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.04]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                {result.title}
              </p>
              {result.subtitle && (
                <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                  {result.subtitle}
                </p>
              )}
            </div>

            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {result.type === "vehicle" ? "รถ" : "ป้าย"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Header({
  isAlertEnabled = false,
  isAlertSupported = true,
  onToggleAlert,
  search,
}: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const searchControls = search ?? null;
  const hasSearchQuery = Boolean(searchControls?.value.trim());
  const showSearchDropdown = Boolean(searchControls && searchControls.isOpen && hasSearchQuery);
  const vehicleResults = searchControls?.results.filter((result) => result.type === "vehicle") ?? [];
  const stopResults = searchControls?.results.filter((result) => result.type === "stop") ?? [];

  useEffect(() => {
    if (!settingsOpen && !searchControls?.isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (settingsOpen && !settingsRef.current?.contains(target)) {
        setSettingsOpen(false);
      }

      if (searchControls?.isOpen && !searchRef.current?.contains(target)) {
        searchControls.onOpenChange(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (settingsOpen) {
        setSettingsOpen(false);
      }

      if (searchControls?.isOpen) {
        searchControls.onOpenChange(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchControls, settingsOpen]);

  return (
    <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full flex-col gap-4 bg-gradient-to-b from-white/95 via-white/70 to-transparent px-4 pb-6 pt-6 dark:from-[#111111]/95 dark:via-[#111111]/70 md:left-3 md:top-3 md:w-[340px] md:rounded-3xl md:border md:border-white/20 md:bg-none md:bg-white/90 md:pb-5 md:pt-5 md:shadow-2xl md:backdrop-blur-xl md:dark:border-white/5 md:dark:bg-[#111111]/90 lg:left-4 lg:top-4 lg:w-[380px] lg:pb-6 lg:pt-6 xl:w-[420px]">
      <div className="pointer-events-auto flex w-full items-center justify-between">
        <div ref={settingsRef} className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={settingsOpen}
            aria-label="Open settings"
            className="rounded-full bg-white/50 p-1.5 text-gray-500 transition-colors hover:text-gray-700 dark:bg-black/20 dark:text-gray-400 dark:hover:text-gray-200 md:bg-transparent"
          >
            <Settings size={22} strokeWidth={1.5} />
          </button>

          {settingsOpen && (
            <div
              role="menu"
              className="glass-card pointer-events-auto absolute left-0 top-[calc(100%+0.75rem)] z-40 w-[220px] rounded-[22px] border border-[var(--glass-border)] bg-white/95 p-3 shadow-[0_16px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:bg-[#181b22]/95 dark:shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
            >
              <div className="mb-3 border-b border-[var(--glass-border)]/80 pb-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                  Settings
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                  Appearance
                </p>
              </div>

              <ThemeToggle mode="inline" onSelect={() => setSettingsOpen(false)} />
            </div>
          )}
        </div>

        <h1 className="text-lg font-bold tracking-wide text-[#1e293b] dark:text-white">
          BU Bus
        </h1>

        <button
          onClick={onToggleAlert}
          aria-pressed={isAlertEnabled}
          aria-label={isAlertEnabled ? "Disable arrival alerts" : "Enable arrival alerts"}
          title={
            !isAlertSupported
              ? "Notifications are not supported"
              : isAlertEnabled
                ? "Turn off arrival alerts"
                : "Turn on arrival alerts"
          }
          className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors ${isAlertEnabled
            ? "border-orange-200 bg-orange-100 text-orange-500 hover:bg-orange-200 dark:border-orange-500/30 dark:bg-orange-500/20 dark:hover:bg-orange-500/30"
            : !isAlertSupported
              ? "border-orange-100 bg-orange-50 text-orange-300 dark:border-orange-500/10 dark:bg-orange-500/5 dark:text-orange-500/60"
              : "border-orange-100 bg-orange-50 text-orange-400 hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:hover:bg-orange-500/20"
            }`}
        >
          {isAlertEnabled ? (
            <Bell size={18} strokeWidth={2.5} />
          ) : (
            <BellOff size={18} strokeWidth={2.2} />
          )}
        </button>
      </div>

      <div
        ref={searchRef}
        className="pointer-events-auto relative mt-1 w-full rounded-[2rem] border border-gray-100/50 bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-white/5 dark:bg-[#1f1f1f]/95 dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] md:bg-gray-50/80 md:shadow-inner md:dark:bg-black/40"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
          <Search size={18} className="text-gray-400/80" strokeWidth={2} />
        </div>
        <input
          type="text"
          value={searchControls?.value ?? ""}
          placeholder="ค้นหารถหรือป้าย"
          readOnly={!searchControls}
          onChange={(event) => searchControls?.onValueChange(event.target.value)}
          onFocus={() => {
            if (searchControls?.value.trim()) {
              searchControls.onOpenChange(true);
            }
          }}
          aria-expanded={showSearchDropdown}
          aria-controls={searchControls ? "header-search-results" : undefined}
          aria-autocomplete={searchControls ? "list" : undefined}
          className="block w-full rounded-[2rem] border-none bg-transparent py-3.5 pl-12 pr-4 text-[15px] placeholder-gray-400/80 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
        />

        {showSearchDropdown && searchControls && (
          <div
            id="header-search-results"
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-40 max-h-[min(55vh,28rem)] overflow-y-auto rounded-[28px] border border-[var(--glass-border)] bg-white/95 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:bg-[#181b22]/95 dark:shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
          >
            {searchControls.results.length > 0 ? (
              <div className="space-y-2">
                <SearchResultsSection
                  title="รถ"
                  results={vehicleResults}
                  onSelect={(result) => {
                    searchControls.onSelect(result);
                    searchControls.onOpenChange(false);
                  }}
                />

                {vehicleResults.length > 0 && stopResults.length > 0 && (
                  <div className="mx-2 h-px bg-[var(--glass-border)]" />
                )}

                <SearchResultsSection
                  title="ป้าย"
                  results={stopResults}
                  onSelect={(result) => {
                    searchControls.onSelect(result);
                    searchControls.onOpenChange(false);
                  }}
                />
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-[var(--color-text-muted)]">
                ไม่พบรถหรือป้ายที่ค้นหา
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
