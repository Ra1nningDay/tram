"use client";

import { Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

type LocaleOption = {
  value: Locale;
  label: string;
  flag: string;
};

const OPTIONS: LocaleOption[] = [
  { value: "th", label: "ไทย", flag: "🇹🇭" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useAdminLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const active = OPTIONS.find((o) => o.value === locale) ?? OPTIONS[0];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
          "border-[var(--admin-panel-border)] bg-[var(--glass-bg)] text-[var(--color-text)]",
          "hover:bg-[var(--admin-nav-hover)] focus:outline-none",
          open && "bg-[var(--admin-nav-hover)]"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${active.label}`}
        title={`Language: ${active.label}`}
      >
        <Languages size={16} />
        <span>{active.flag} {locale.toUpperCase()}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 min-w-[160px] overflow-hidden rounded-xl border border-[var(--admin-panel-border)] bg-[var(--glass-strong-bg)] p-1 shadow-xl backdrop-blur-xl"
        >
          {OPTIONS.map((option) => {
            const selected = option.value === locale;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setLocale(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  selected
                    ? "bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]"
                    : "text-[var(--color-text)] hover:bg-[var(--admin-nav-hover)]"
                )}
              >
                <span className="text-base">{option.flag}</span>
                <span>{option.label}</span>
                {selected && (
                  <span className="ml-auto text-xs opacity-60">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
