"use client";

import {
  Activity,
  ChevronRight,
  LayoutDashboard,
  Map,
  ShieldCheck,
  Waypoints,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  labelKey: string;
  href?: string;
  icon: typeof LayoutDashboard;
};

const PRIMARY_ITEMS: AdminNavItem[] = [
  {
    labelKey: "sidebar.overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    labelKey: "sidebar.network",
    href: "/admin/network",
    icon: Waypoints,
  },
  {
    labelKey: "sidebar.access",
    href: "/admin/access",
    icon: ShieldCheck,
  },
  {
    labelKey: "sidebar.activity",
    href: "/admin/activity",
    icon: Activity,
  },
];

const TOOL_ITEMS: AdminNavItem[] = [
  {
    labelKey: "sidebar.open_editor",
    href: "/editor",
    icon: Map,
  },
];

function NavRow({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t } = useAdminLocale();
  const isActive =
    Boolean(item.href) &&
    (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)));
  const classes = cn(
    "group flex items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition-colors duration-200",
    isActive
      ? "border-[var(--admin-panel-border-strong)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)] shadow-[0_10px_22px_rgba(15,23,42,0.06)] dark:text-[var(--admin-accent-strong)]"
      : "border-transparent bg-transparent text-[var(--text-soft)] hover:border-[var(--admin-panel-border)] hover:bg-[var(--admin-nav-hover)] hover:text-[var(--color-text)]"
  );

  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          isActive
            ? "border-[var(--admin-panel-border-strong)] bg-[var(--glass-strong-bg)] text-[var(--admin-accent-strong)]"
            : "border-[var(--admin-panel-border)] bg-[var(--admin-nav-icon-bg)] text-[var(--text-soft)] group-hover:text-[var(--color-text)]"
        )}
      >
        <item.icon size={17} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span>{t(item.labelKey)}</span>
        </span>
      </span>

      {item.href ? (
        <ChevronRight
          size={15}
          className={cn(
            "shrink-0 transition-transform duration-200",
            isActive ? "text-[var(--admin-accent-strong)]" : "text-[var(--text-faint)] group-hover:translate-x-0.5"
          )}
        />
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <div aria-disabled="true" className={cn(classes, "cursor-default opacity-90")}>
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className={classes} onClick={onNavigate}>
      {content}
    </Link>
  );
}

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { t, locale } = useAdminLocale();
  const accessNote =
    locale === "th"
      ? "\u0e2b\u0e19\u0e49\u0e32\u0e19\u0e35\u0e49\u0e43\u0e0a\u0e49\u0e14\u0e39\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21 \u0e2a\u0e48\u0e27\u0e19\u0e07\u0e32\u0e19\u0e41\u0e01\u0e49\u0e44\u0e02\u0e40\u0e1b\u0e34\u0e14\u0e43\u0e0a\u0e49\u0e1c\u0e48\u0e32\u0e19 /editor"
      : "Overview stays here. Editing opens in /editor.";

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll when sidebar overlay is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const sidebarContent = (
    <div
      data-admin-sidebar
      className="admin-panel flex h-full flex-col p-4 sm:p-5 lg:sticky lg:top-0 lg:min-h-screen lg:rounded-none lg:border-0 lg:px-0 lg:py-0 lg:shadow-none"
    >
      <div className="mb-5 flex items-center gap-3 border-b border-[var(--admin-panel-border)] pb-4 lg:mb-0 lg:min-h-[104px] lg:px-5 lg:py-4 lg:pb-4 xl:min-h-[108px] xl:px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--admin-panel-border-strong)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]">
          <LayoutDashboard size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
            {t("sidebar.brand")}
          </p>
          <h2 className="text-base font-semibold text-[var(--color-text)]">{t("sidebar.title")}</h2>
        </div>

        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--admin-panel-border)] text-[var(--text-soft)] transition-colors hover:bg-[var(--admin-nav-hover)] hover:text-[var(--color-text)] lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <section className="space-y-2 lg:px-5 lg:pt-5 xl:px-6">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
          {t("sidebar.control")}
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {PRIMARY_ITEMS.map((item) => (
            <NavRow key={item.labelKey} item={item} pathname={pathname} onNavigate={onClose} />
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-2 lg:px-5 xl:px-6">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
          {t("sidebar.tools")}
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {TOOL_ITEMS.map((item) => (
            <NavRow key={item.labelKey} item={item} pathname={pathname} onNavigate={onClose} />
          ))}
        </div>
      </section>

      <section className="mt-auto rounded-[20px] border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] p-4 lg:mx-5 lg:mb-5 xl:mx-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
          {t("sidebar.access_model")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{accessNote}</p>
        <Link
          href="/editor"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--admin-panel-border)] bg-[var(--admin-nav-hover)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--admin-panel-border-strong)]"
        >
          <span>{t("sidebar.open_editor")}</span>
          <ChevronRight size={15} />
        </Link>
      </section>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="relative hidden shrink-0 lg:block lg:border-r lg:border-[var(--admin-panel-border)]">
        {sidebarContent}
      </aside>

      {/* Mobile overlay sidebar — visible when open on < lg */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Slide-in panel */}
          <aside
            className="absolute inset-y-0 left-0 w-[min(320px,85vw)] animate-[slideInLeft_0.25s_ease-out] overflow-y-auto border-r border-[var(--admin-panel-border)] bg-[var(--admin-bg-start)]"
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
