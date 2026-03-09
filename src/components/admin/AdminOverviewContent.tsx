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

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label={t("overview.routes")}
          value={String(overview.routeCount)}
          hint={t("overview.routes_hint")}
          accent="amber"
          icon={<Route size={18} />}
        />
        <MetricCard
          label={t("overview.stops")}
          value={String(overview.stopCount)}
          hint={t("overview.stops_hint")}
          icon={<Map size={18} />}
        />
        <MetricCard
          label={t("overview.roles")}
          value={String(overview.roleCount)}
          hint={t("overview.roles_hint")}
          icon={<ShieldCheck size={18} />}
        />
        <MetricCard
          label={t("overview.last_update")}
          value={formatRelativeDate(overview.lastUpdatedAt, locale) ?? t("common.no_file_timestamp")}
          hint={t("overview.last_update_hint")}
          icon={<DatabaseZap size={18} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <SectionCard
          eyebrow={t("overview.quick_actions")}
          title={t("overview.quick_actions_title")}
          description={t("overview.quick_actions_desc")}
          actions={
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1f2937] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.2)] transition hover:translate-y-[-1px]"
            >
              <span>{t("overview.open_live_editor")}</span>
              <ArrowRight size={16} />
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <QuickActionCard
              href="/editor?tab=route"
              title={t("overview.route_editor")}
              description={t("overview.route_editor_desc")}
              icon={<Route size={20} />}
              badge={t("common.live")}
              tone="dark"
            />
            <QuickActionCard
              href="/editor?tab=stops"
              title={t("overview.stops_editor")}
              description={t("overview.stops_editor_desc")}
              icon={<Map size={20} />}
              badge={t("common.live")}
              tone="accent"
            />
            <QuickActionCard
              href="/editor?tab=mask"
              title={t("overview.mask_editor")}
              description={t("overview.mask_editor_desc")}
              icon={<Pentagon size={20} />}
              badge={t("common.live")}
            />
            <QuickActionCard
              href="/api/admin/export"
              title={t("overview.export_snapshot")}
              description={t("overview.export_snapshot_desc")}
              icon={<DatabaseZap size={20} />}
              badge="JSON"
              download
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={t("overview.system_status")}
          title={t("overview.system_status_title")}
          description={t("overview.system_status_desc")}
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("overview.authentication")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{t("overview.authentication_desc")}</p>
                </div>
                <StatusBadge label={overview.authEnabled ? t("common.enabled") : t("common.missing")} tone={overview.authEnabled ? "success" : "warning"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("overview.editor_guard")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{t("overview.editor_guard_desc")}</p>
                </div>
                <StatusBadge label={overview.editorProtected ? t("common.protected") : t("common.unprotected")} tone={overview.editorProtected ? "success" : "warning"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("overview.database")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{t("overview.database_desc")}</p>
                </div>
                <StatusBadge label={overview.databaseConnected ? t("common.connected") : t("common.degraded")} tone={overview.databaseConnected ? "success" : "warning"} />
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SectionCard
          eyebrow={t("overview.recent_snapshot")}
          title={t("overview.recent_snapshot_title")}
          description={t("overview.recent_snapshot_desc")}
        >
          <div className="space-y-3">
            {overview.snapshotFiles.map((file) => (
              <div
                key={file.label}
                className="flex flex-col gap-2 rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{file.label}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {file.updatedAt ? formatRelativeDate(file.updatedAt, locale) : t("common.file_not_found")}
                  </p>
                </div>
                <div className="text-sm font-medium text-[var(--text-soft)]">
                  {file.sizeKb ? `${file.sizeKb} KB` : t("common.no_size")}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={t("overview.notes")}
          title={t("overview.notes_title")}
          description={t("overview.notes_desc")}
        >
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">{t("overview.storage_mode")}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{t("overview.storage_mode_desc")}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">{t("overview.mask_geometry")}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                {t("overview.mask_geometry_desc").replace("{count}", String(overview.polygonPointCount))}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">{t("overview.next_surface")}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{t("overview.next_surface_desc")}</p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
