"use client";

import { Clock3, DatabaseZap, FileClock, History, TriangleAlert, Users } from "lucide-react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

type ActivityData = {
  recentActions: { id: string; title: string; kind: "snapshot" | "session" | "user" | "role"; detail: string; occurredAt: Date | null }[];
  writableAssets: { label: string; scope: string; status: string; updatedAt: Date | null; sizeKb: number | null }[];
  activeSessionCount: number;
  recentUserCount: number;
  authEnabled: boolean;
  editorProtected: boolean;
  jsonBackedStorage: boolean;
  databaseConnected: boolean;
};

function formatDateTime(date: Date | null, locale: string) {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getEventTone(kind: "snapshot" | "session" | "user" | "role") {
  if (kind === "snapshot" || kind === "role") return "success" as const;
  if (kind === "session") return "neutral" as const;
  return "warning" as const;
}

export function AdminActivityContent({ activity }: { activity: ActivityData }) {
  const { t, locale } = useAdminLocale();

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("activity.recent_actions")} value={String(activity.recentActions.length)} hint={t("activity.recent_actions_hint")} accent="amber" icon={<History size={18} />} />
        <MetricCard label={t("activity.writable_assets")} value={String(activity.writableAssets.length)} hint={t("activity.writable_assets_hint")} icon={<FileClock size={18} />} />
        <MetricCard label={t("activity.active_sessions")} value={String(activity.activeSessionCount)} hint={t("activity.active_sessions_hint")} icon={<Clock3 size={18} />} />
        <MetricCard label={t("activity.recent_users")} value={String(activity.recentUserCount)} hint={t("activity.recent_users_hint")} icon={<Users size={18} />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_420px]">
        <SectionCard eyebrow={t("activity.recent_actions")} title={t("activity.timeline")} description={t("activity.timeline_desc")}>
          <div className="space-y-3">
            {activity.recentActions.length > 0 ? (
              activity.recentActions.map((event) => (
                <article key={event.id} className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[var(--color-text)]">{event.title}</p>
                        <StatusBadge label={event.kind} tone={getEventTone(event.kind)} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{event.detail}</p>
                    </div>
                    <div className="text-sm font-medium text-[var(--text-soft)]">{formatDateTime(event.occurredAt, locale) ?? t("common.no_timestamp")}</div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4 text-sm text-[var(--text-soft)]">{t("activity.no_events")}</div>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow={t("activity.system_notes")} title={t("activity.known_state")} description={t("activity.known_state_desc")}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("activity.authentication")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{t("activity.authentication_desc")}</p>
                </div>
                <StatusBadge label={activity.authEnabled ? t("common.enabled") : t("common.missing")} tone={activity.authEnabled ? "success" : "warning"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("activity.editor_protection")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{t("activity.editor_protection_desc")}</p>
                </div>
                <StatusBadge label={activity.editorProtected ? t("common.protected") : t("common.unprotected")} tone={activity.editorProtected ? "success" : "warning"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("activity.storage_mode")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{t("activity.storage_mode_desc")}</p>
                </div>
                <StatusBadge label={activity.jsonBackedStorage ? t("common.json_backed") : t("common.db_backed")} tone={activity.jsonBackedStorage ? "warning" : "success"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-warning-card-bg)] p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--admin-icon-bg)] text-[var(--admin-badge-warning-text)]">
                  <TriangleAlert size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("activity.future_audit")}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{t("activity.future_audit_desc")}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <SectionCard eyebrow={t("activity.recent_save_status")} title={t("activity.writable_runtime")} description={t("activity.writable_runtime_desc")}>
        <div className="grid gap-4 lg:grid-cols-2">
          {activity.writableAssets.map((asset) => (
            <article key={asset.label} className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--color-text)]">{asset.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{asset.scope}</p>
                </div>
                <StatusBadge label={asset.status === "healthy" ? t("common.healthy") : t("common.missing")} tone={asset.status === "healthy" ? "success" : "warning"} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                    <Clock3 size={12} />
                    {t("activity.last_update")}
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{formatDateTime(asset.updatedAt, locale) ?? t("common.no_timestamp")}</p>
                </div>
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                    <DatabaseZap size={12} />
                    {t("activity.file_size")}
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{asset.sizeKb ? `${asset.sizeKb} KB` : t("common.no_file_size")}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{t("activity.database_availability")}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{t("activity.database_availability_desc")}</p>
            </div>
            <StatusBadge label={activity.databaseConnected ? t("common.connected") : t("common.degraded")} tone={activity.databaseConnected ? "success" : "warning"} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
