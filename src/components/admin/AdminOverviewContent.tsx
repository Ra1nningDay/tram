"use client";

import { ArrowRight, DatabaseZap, Map, Pentagon, Route, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { MetricCard } from "@/components/admin/MetricCard";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

type OverviewData = {
  routeCount: number;
  stopCount: number;
  roleCount: number;
  lastUpdatedAt: Date | null;
  authEnabled: boolean;
  editorProtected: boolean;
  databaseConnected: boolean;
  polygonPointCount: number;
  snapshotFiles: { label: string; updatedAt: Date | null; sizeKb: number | null }[];
};

function formatRelativeDate(date: Date | null, locale: string) {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminOverviewContent({ overview }: { overview: OverviewData }) {
  const { t, locale } = useAdminLocale();

  const metrics = [
    {
      label: t("overview.routes"),
      value: String(overview.routeCount),
      hint: t("common.json_backed"),
      accent: "amber" as const,
      icon: <Route size={18} />,
    },
    {
      label: t("overview.stops"),
      value: String(overview.stopCount),
      hint: t("common.json_backed"),
      icon: <Map size={18} />,
    },
    {
      label: t("overview.roles"),
      value: String(overview.roleCount),
      hint: t("common.credential"),
      icon: <ShieldCheck size={18} />,
    },
    {
      label: t("overview.last_update"),
      value: formatRelativeDate(overview.lastUpdatedAt, locale) ?? t("common.no_file_timestamp"),
      hint: t("common.verified"),
      icon: <DatabaseZap size={18} />,
    },
  ];

  const systemSignals = [
    {
      label: t("overview.authentication"),
      value: overview.authEnabled ? t("common.enabled") : t("common.missing"),
      tone: overview.authEnabled ? "success" as const : "warning" as const,
      source: "Better Auth",
    },
    {
      label: t("overview.editor_guard"),
      value: overview.editorProtected ? t("common.protected") : t("common.unprotected"),
      tone: overview.editorProtected ? "success" as const : "warning" as const,
      source: "/editor",
    },
    {
      label: t("overview.database"),
      value: overview.databaseConnected ? t("common.connected") : t("common.degraded"),
      tone: overview.databaseConnected ? "success" as const : "warning" as const,
      source: "Prisma",
    },
  ];

  const setupCards = [
    {
      label: t("overview.storage_mode"),
      value: t("common.json_backed"),
      caption: "/api/admin/export",
    },
    {
      label: t("overview.mask_geometry"),
      value: String(overview.polygonPointCount),
      caption: t("network.service_area"),
    },
    {
      label: t("sidebar.open_editor"),
      value: "/editor",
      caption: t("common.open"),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            accent={metric.accent}
            icon={metric.icon}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title={t("overview.quick_actions")}
          className="h-full"
          actions={
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:bg-slate-100 dark:text-slate-950"
            >
              <span>{t("overview.open_live_editor")}</span>
              <ArrowRight size={16} />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickActionCard
              href="/editor?tab=route"
              title={t("overview.route_editor")}
              icon={<Route size={20} />}
              tone="dark"
            />
            <QuickActionCard
              href="/editor?tab=stops"
              title={t("overview.stops_editor")}
              icon={<Map size={20} />}
              tone="accent"
            />
            <QuickActionCard
              href="/editor?tab=mask"
              title={t("overview.mask_editor")}
              icon={<Pentagon size={20} />}
            />
            <QuickActionCard
              href="/api/admin/export"
              title={t("overview.export_snapshot")}
              icon={<DatabaseZap size={20} />}
              badge="JSON"
              badgeTone="neutral"
              download
            />
          </div>
        </SectionCard>

        <SectionCard title={t("overview.system_status")} className="h-full">
          <div className="grid gap-3">
            {systemSignals.map((signal) => (
              <div
                key={signal.label}
                className="rounded-[18px] border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{signal.label}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                      {signal.source}
                    </p>
                  </div>
                  <StatusBadge label={signal.value} tone={signal.tone} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <SectionCard title={t("overview.recent_snapshot")}>
          <div className="overflow-hidden rounded-[20px] border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)]">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_96px] gap-4 border-b border-[var(--admin-panel-border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)] md:grid">
              <span>{t("overview.recent_snapshot")}</span>
              <span>{t("overview.last_update")}</span>
              <span className="text-right">{t("activity.file_size")}</span>
            </div>

            <div className="divide-y divide-[var(--admin-panel-border)]">
              {overview.snapshotFiles.map((file) => (
                <div
                  key={file.label}
                  className="grid gap-2 px-4 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_96px] md:items-center md:gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{file.label}</p>
                    <p className="mt-1 text-sm text-[var(--text-soft)] md:hidden">
                      {file.updatedAt ? formatRelativeDate(file.updatedAt, locale) : t("common.file_not_found")}
                    </p>
                  </div>
                  <p className="hidden text-sm text-[var(--text-soft)] md:block">
                    {file.updatedAt ? formatRelativeDate(file.updatedAt, locale) : t("common.file_not_found")}
                  </p>
                  <p className="text-sm font-medium text-[var(--text-soft)] md:text-right">
                    {file.sizeKb ? `${file.sizeKb} KB` : t("common.no_size")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t("overview.notes")}>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {setupCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[18px] border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                  {card.label}
                </p>
                <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">{card.value}</p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{card.caption}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
