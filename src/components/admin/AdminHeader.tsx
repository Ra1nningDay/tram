"use client";

import { ChevronDown, Languages, LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { type Locale } from "@/i18n";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AdminHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
};

const LOCALE_OPTIONS: { value: Locale; label: string; flag: string }[] = [
  { value: "th", label: "ไทย", flag: "🇹🇭" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

const THEME_OPTIONS: { value: string; label: string; labelTh: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", labelTh: "สว่าง", Icon: Sun },
  { value: "dark", label: "Dark", labelTh: "มืด", Icon: Moon },
];

export function AdminHeader({ user }: AdminHeaderProps) {
  const { t, locale, setLocale } = useAdminLocale();
  const pathname = usePathname();

  const PAGE_TITLES: Record<string, string> = {
    "/admin": t("header.title"),
    "/admin/network": t("sidebar.network"),
    "/admin/access": t("sidebar.access"),
    "/admin/activity": t("sidebar.activity"),
  };
  const pageTitle = PAGE_TITLES[pathname] ?? t("header.title");
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const displayName = user.name?.trim() || user.email?.trim() || "Admin";
  const email = user.email?.trim();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authClient.signOut({}, { throw: true });
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const activeTheme = mounted ? theme : "light";

  return (
    <header className="admin-panel relative px-4 py-4 sm:px-5 sm:py-5 md:px-7">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-0 top-0 h-32 w-40 bg-[radial-gradient(circle,var(--admin-accent-glow),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-[var(--color-text)] md:text-4xl">
            {pageTitle}
          </h1>
        </div>

        {/* User card + dropdown */}
        <div ref={rootRef} className="relative xl:flex-none">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-[22px] border border-[var(--admin-panel-border)] bg-[linear-gradient(180deg,var(--glass-strong-bg),var(--glass-bg))] px-4 py-3 text-left transition-colors",
              "hover:border-[var(--admin-panel-border-strong)]",
              open && "border-[var(--admin-panel-border-strong)]"
            )}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-icon-bg)] text-[var(--color-text)]">
              <UserRound size={18} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <span className="truncate">{displayName}</span>
                <span className="rounded-full bg-[var(--admin-badge-success-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-badge-success-text)]">
                  Admin
                </span>
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs text-[var(--text-soft)]">
                <ShieldCheck size={12} />
                <span className="truncate">{email ?? "Role verified"}</span>
              </span>
            </span>
            <ChevronDown
              size={16}
              className={cn(
                "ml-2 shrink-0 text-[var(--text-faint)] transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[260px] overflow-hidden rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--glass-strong-bg)] p-2 shadow-2xl backdrop-blur-xl"
            >
              {/* Language section */}
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                <Languages size={11} className="mr-1 inline-block" />
                {locale === "th" ? "ภาษา" : "Language"}
              </p>
              <div className="mb-1.5 grid grid-cols-2 gap-1">
                {LOCALE_OPTIONS.map((opt) => {
                  const selected = opt.value === locale;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => setLocale(opt.value)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                        selected
                          ? "bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]"
                          : "text-[var(--color-text)] hover:bg-[var(--admin-nav-hover)]"
                      )}
                    >
                      <span>{opt.flag}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <hr className="border-[var(--admin-panel-border)]" />

              {/* Theme section */}
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                {locale === "th" ? "ธีม" : "Theme"}
              </p>
              <div className="mb-1.5 grid grid-cols-2 gap-1">
                {THEME_OPTIONS.map((opt) => {
                  const selected = activeTheme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                        selected
                          ? "bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]"
                          : "text-[var(--color-text)] hover:bg-[var(--admin-nav-hover)]"
                      )}
                    >
                      <opt.Icon size={14} />
                      <span>{locale === "th" ? opt.labelTh : opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <hr className="border-[var(--admin-panel-border)]" />

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={15} />
                <span>{isLoggingOut ? (locale === "th" ? "กำลังออก..." : "Signing out...") : t("common.logout")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
