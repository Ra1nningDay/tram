"use client";

import {
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  Map,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  labelKey: string;
  href?: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  descriptionKey: string;
};

const PRIMARY_ITEMS: AdminNavItem[] = [
  {
    labelKey: "sidebar.overview",
    href: "/admin",
    icon: LayoutDashboard,
    descriptionKey: "sidebar.overview_desc",
  },
  {
    labelKey: "sidebar.network",
    href: "/admin/network",
    icon: Waypoints,
    badge: "live",
    descriptionKey: "sidebar.network_desc",
  },
  {
    labelKey: "sidebar.access",
    href: "/admin/access",
    icon: ShieldCheck,
    badge: "live",
    descriptionKey: "sidebar.access_desc",
  },
  {
    labelKey: "sidebar.activity",
    href: "/admin/activity",
    icon: Activity,
    badge: "live",
    descriptionKey: "sidebar.activity_desc",
  },
];

const TOOL_ITEMS: AdminNavItem[] = [
  {
    labelKey: "sidebar.open_editor",
    href: "/editor",
    icon: Map,
    badge: "live",
    descriptionKey: "sidebar.open_editor_desc",
  },
];

function NavRow({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const { t } = useAdminLocale();
  const isActive = Boolean(item.href) && (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)));
  const classes = cn(
    "group flex h-full items-start gap-3 rounded-[22px] border px-3 py-3 text-left transition-all duration-200",
    isActive
      ? "border-[rgba(194,132,55,0.45)] bg-[linear-gradient(135deg,rgba(194,132,55,0.16),var(--admin-nav-hover))] shadow-[0_14px_30px_rgba(148,109,43,0.16)]"
      : "border-[rgba(100,116,139,0.16)] bg-[var(--admin-nav-bg)] hover:border-[rgba(194,132,55,0.3)] hover:bg-[var(--admin-nav-hover)]"
  );

  const badgeLabel = item.badge ? t(`common.${item.badge}`) : null;

  const content = (
    <>
      <span
        className={cn(
          "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          isActive
            ? "border-[rgba(194,132,55,0.38)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]"
            : "border-[rgba(100,116,139,0.18)] bg-[var(--admin-nav-icon-bg)] text-[var(--text-soft)]"
        )}
      >
        <item.icon size={17} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <span>{t(item.labelKey)}</span>
          {badgeLabel ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                item.badge === "live"
                  ? "bg-[var(--admin-badge-success-bg)] text-[var(--admin-badge-success-text)]"
                  : "bg-[var(--admin-badge-neutral-bg)] text-[var(--text-faint)]"
              )}
            >
              {badgeLabel}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-soft)]">{t(item.descriptionKey)}</span>
      </span>

      {item.href ? (
        <ArrowUpRight
          size={16}
          className={cn(
            "mt-1 shrink-0 transition-transform duration-200",
            isActive ? "text-[var(--admin-accent-strong)]" : "text-[var(--text-faint)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
    <Link href={item.href} className={classes}>
      {content}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useAdminLocale();

  return (
    <aside className="relative shrink-0 md:w-[320px] xl:w-[336px]">
      <div
        data-admin-sidebar
        className="admin-panel-strong relative overflow-hidden p-4 sm:p-5 md:sticky md:top-4 md:min-h-[calc(100vh-2rem)]"
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-28 rounded-full bg-[radial-gradient(circle,var(--admin-accent-glow),transparent_68%)] blur-2xl" />

        <div className="relative">
          <div className="mb-5 flex items-center gap-3 border-b border-[rgba(100,116,139,0.14)] pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--admin-panel-border-strong)] bg-[rgba(255,244,220,0.92)] text-[var(--admin-accent-strong)] shadow-[0_12px_30px_rgba(194,132,55,0.18)] dark:bg-[rgba(227,182,103,0.14)] dark:text-[var(--admin-accent-strong)]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                {t("sidebar.brand")}
              </p>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">{t("sidebar.title")}</h2>
            </div>
          </div>

          <section className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {t("sidebar.control")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              {PRIMARY_ITEMS.map((item) => (
                <NavRow key={item.labelKey} item={item} pathname={pathname} />
              ))}
            </div>
          </section>

          <section className="mt-5 space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {t("sidebar.tools")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              {TOOL_ITEMS.map((item) => (
                <NavRow key={item.labelKey} item={item} pathname={pathname} />
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-[22px] border border-[var(--admin-panel-border)] bg-[linear-gradient(180deg,var(--glass-strong-bg),var(--admin-panel-muted))] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {t("sidebar.access_model")}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
              {t("sidebar.access_model_desc")}
            </p>
          </section>
        </div>
      </div>
    </aside>
  );
}
