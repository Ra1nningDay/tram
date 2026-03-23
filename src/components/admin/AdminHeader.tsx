"use client";

import { ChevronDown, Languages, LogOut, Menu, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
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
  onMenuClick?: () => void;
};

const LOCALE_OPTIONS: { value: Locale; label: string; short: string }[] = [
  { value: "th", label: "\u0e44\u0e17\u0e22", short: "TH" },
  { value: "en", label: "English", short: "EN" },
];

const THEME_OPTIONS: { value: string; label: string; labelTh: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", labelTh: "\u0e2a\u0e27\u0e48\u0e32\u0e07", Icon: Sun },
  { value: "dark", label: "Dark", labelTh: "\u0e21\u0e37\u0e14", Icon: Moon },
];

export function AdminHeader({ user, onMenuClick }: AdminHeaderProps) {
  const { t, locale, setLocale } = useAdminLocale();
  const pathname = usePathname();

  const PAGE_TITLES: Record<string, string> = {
    "/admin": t("header.title"),
    "/admin/network": t("header.map_title"),
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
    <header className="admin-panel rounded-none border-0 border-b border-[var(--admin-panel-border)] px-4 py-4 sm:px-5 md:px-6 lg:sticky lg:top-0 lg:z-20 lg:min-h-[104px] lg:px-5 lg:py-3.5 lg:shadow-none xl:min-h-[108px] xl:px-6 xl:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] text-[var(--text-soft)] transition-colors hover:border-[var(--admin-panel-border-strong)] hover:text-[var(--color-text)] lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)] hidden sm:block">
              {t("header.eyebrow")}
            </p>
            <h1 className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-[1.75rem] md:text-[2rem] sm:mt-1">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div ref={rootRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-[18px] border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-3.5 py-3 text-left transition-colors",
              "hover:border-[var(--admin-panel-border-strong)]",
              open && "border-[var(--admin-panel-border-strong)]"
            )}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-icon-bg)] text-[var(--color-text)] sm:h-10 sm:w-10 sm:rounded-2xl">
              <UserRound size={18} />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <span className="truncate">{displayName}</span>
                <span className="rounded-full bg-[var(--admin-badge-success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--admin-badge-success-text)]">
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
              className="absolute right-0 top-[calc(100%+0.625rem)] z-40 w-[264px] overflow-hidden rounded-[20px] border border-[var(--admin-panel-border)] bg-[var(--glass-strong-bg)] p-2 shadow-[var(--admin-shadow-strong)] backdrop-blur-xl"
            >
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                <Languages size={11} className="mr-1 inline-block" />
                {locale === "th" ? "\u0e20\u0e32\u0e29\u0e32" : "Language"}
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
                      <span className="inline-flex h-5 min-w-8 items-center justify-center rounded-full bg-[var(--admin-icon-bg)] px-1.5 text-[10px] font-semibold">
                        {opt.short}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <hr className="border-[var(--admin-panel-border)]" />

              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                {locale === "th" ? "\u0e18\u0e35\u0e21" : "Theme"}
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

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={15} />
                <span>
                  {isLoggingOut
                    ? locale === "th"
                      ? "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2d\u0e2d\u0e01..."
                      : "Signing out..."
                    : t("common.logout")}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
