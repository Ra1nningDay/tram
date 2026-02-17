"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "../lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  Icon: typeof Sun;
};

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Laptop },
];

type ThemeToggleProps = {
  className?: string;
  menuAlign?: "left" | "right";
};

export function ThemeToggle({ className, menuAlign = "right" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const active = useMemo(() => {
    const current = mounted ? theme : "system";
    return OPTIONS.find((option) => option.value === current) ?? OPTIONS[2];
  }, [mounted, theme]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "glass-card inline-flex h-10 w-10 items-center justify-center rounded-lg",
          "border border-[var(--map-control-border)] text-[var(--color-text)]",
          "hover:bg-[var(--map-control-hover)] focus:outline-none",
          open && "bg-[var(--map-control-hover)]"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${active.label}`}
        title={`Theme: ${active.label}`}
      >
        <active.Icon size={18} />
        <span className="sr-only">{active.label}</span>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "glass-card absolute top-[calc(100%+0.5rem)] z-40 min-w-[140px] p-1 shadow-xl",
            menuAlign === "left" ? "left-0" : "right-0"
          )}
        >
          {OPTIONS.map((option) => {
            const selected = option.value === active.value;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  selected
                    ? "bg-primary text-white"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface-lighter)]"
                )}
              >
                <option.Icon size={14} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
