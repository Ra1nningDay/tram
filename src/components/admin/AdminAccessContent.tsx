"use client";

import { Clock3, KeyRound, ShieldCheck, Users, UserSquare2 } from "lucide-react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

type AccessData = {
  totalUsers: number;
  adminUsers: number;
  editorUsers: number;
  activeSessions: number;
  databaseConnected: boolean;
  roles: { id: string; name: string; key: string; description: string | null; memberCount: number }[];
  users: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    emailVerified: boolean;
    hasPasswordAccount: boolean;
    hasAdminAccess: boolean;
    hasEditorAccess: boolean;
    roleKeys: string[];
    activeSessionCount: number;
    lastSessionAt: Date | null;
    createdAt: Date | null;
  }[];
};

function formatDateTime(date: Date | null, locale: string) {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function AdminAccessContent({ access }: { access: AccessData }) {
  const { t, locale } = useAdminLocale();

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard label={t("access.total_users")} value={String(access.totalUsers)} hint={t("access.total_users_hint")} accent="amber" icon={<Users size={18} />} />
        <MetricCard label={t("access.admin_users")} value={String(access.adminUsers)} hint={t("access.admin_users_hint")} icon={<ShieldCheck size={18} />} />
        <MetricCard label={t("access.editor_users")} value={String(access.editorUsers)} hint={t("access.editor_users_hint")} icon={<UserSquare2 size={18} />} />
        <MetricCard label={t("access.active_sessions")} value={String(access.activeSessions)} hint={access.databaseConnected ? t("access.active_sessions_hint") : t("access.active_sessions_hint_no_db")} icon={<Clock3 size={18} />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard eyebrow={t("access.role_ledger")} title={t("access.role_ledger_title")} description={t("access.role_ledger_desc")}>
          <div className="space-y-3">
            {access.roles.length > 0 ? (
              access.roles.map((role) => (
                <div key={role.id} className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-[var(--color-text)]">{role.name}</p>
                        <StatusBadge label={role.key} tone={role.key === "admin" || role.key === "editor" ? "success" : "neutral"} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{role.description || t("access.no_role_desc")}</p>
                    </div>
                    <StatusBadge label={`${role.memberCount} member${role.memberCount === 1 ? "" : "s"}`} tone={role.memberCount > 0 ? "success" : "neutral"} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4 text-sm text-[var(--text-soft)]">{t("access.no_roles")}</div>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow={t("access.user_access_matrix")} title={t("access.user_access_matrix_title")} description={t("access.user_access_matrix_desc")}>
          <div className="grid gap-4">
            {access.users.length > 0 ? (
              access.users.map((user) => (
                <article key={user.id} className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--color-text)]">{user.name}</h3>
                        <StatusBadge label={user.emailVerified ? t("common.verified") : t("common.unverified")} tone={user.emailVerified ? "success" : "warning"} />
                        {user.hasPasswordAccount ? <StatusBadge label={t("common.credential")} tone="neutral" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">{user.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-faint)]">
                        {user.username ? `username ${user.username}` : t("access.username_not_set")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={user.hasAdminAccess ? t("common.admin_access") : t("common.no_admin")} tone={user.hasAdminAccess ? "success" : "neutral"} />
                      <StatusBadge label={user.hasEditorAccess ? t("common.editor_access") : t("common.no_editor")} tone={user.hasEditorAccess ? "success" : "warning"} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 border-t border-[rgba(100,116,139,0.12)] pt-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">{t("access.role_memberships")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.roleKeys.length > 0 ? (
                          user.roleKeys.map((roleKey) => (
                            <StatusBadge key={`${user.id}-${roleKey}`} label={roleKey} tone={roleKey === "admin" || roleKey === "editor" ? "success" : "neutral"} />
                          ))
                        ) : (
                          <span className="text-sm text-[var(--text-soft)]">{t("access.no_role_memberships")}</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">{t("access.session_signal")}</p>
                      <div className="mt-3 flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--admin-icon-bg)] text-[var(--color-text)]">
                          <KeyRound size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {(user.activeSessionCount === 1 ? t("access.active_session_count") : t("access.active_session_count_plural")).replace("{count}", String(user.activeSessionCount))}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                            {t("access.last_session_update").replace("{date}", formatDateTime(user.lastSessionAt, locale) ?? t("common.no_active_session"))}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-faint)]">
                            {t("access.joined").replace("{date}", formatDateTime(user.createdAt, locale) ?? "")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-6 text-sm text-[var(--text-soft)]">{t("access.no_users")}</div>
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
