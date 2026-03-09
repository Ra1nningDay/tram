import { Clock3, KeyRound, ShieldCheck, Users, UserSquare2 } from "lucide-react";

import { MetricCard } from "@/components/admin/MetricCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminAccessData } from "@/lib/admin/access";

function formatDateTime(date: Date | null) {
  if (!date) {
    return "No active session";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminAccessPage() {
  const access = await getAdminAccessData();

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Users"
          value={String(access.totalUsers)}
          hint="All Better Auth users currently visible to the dashboard."
          accent="amber"
          icon={<Users size={18} />}
        />
        <MetricCard
          label="Admin Users"
          value={String(access.adminUsers)}
          hint="Accounts that can enter admin-only routes."
          icon={<ShieldCheck size={18} />}
        />
        <MetricCard
          label="Editor Users"
          value={String(access.editorUsers)}
          hint="Accounts that can access the editor surface."
          icon={<UserSquare2 size={18} />}
        />
        <MetricCard
          label="Active Sessions"
          value={String(access.activeSessions)}
          hint={
            access.databaseConnected
              ? "Currently non-expired sessions across all visible users."
              : "Database unavailable while loading access metrics."
          }
          icon={<Clock3 size={18} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard
          eyebrow="Role Ledger"
          title="Current authorization roles"
          description="Read-only role inventory from the Prisma-backed auth tables."
        >
          <div className="space-y-3">
            {access.roles.length > 0 ? (
              access.roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-[var(--color-text)]">{role.name}</p>
                        <StatusBadge
                          label={role.key}
                          tone={role.key === "admin" || role.key === "editor" ? "success" : "neutral"}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                        {role.description || "No role description stored yet."}
                      </p>
                    </div>
                    <StatusBadge
                      label={`${role.memberCount} member${role.memberCount === 1 ? "" : "s"}`}
                      tone={role.memberCount > 0 ? "success" : "neutral"}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 p-4 text-sm text-[var(--text-soft)]">
                No role records are available yet.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="User Access Matrix"
          title="Who can access admin and editor surfaces"
          description="This page stays intentionally read-only in the first pass. It is for verification, not role editing."
        >
          <div className="grid gap-4">
            {access.users.length > 0 ? (
              access.users.map((user) => (
                <article
                  key={user.id}
                  className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-white/72 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--color-text)]">{user.name}</h3>
                        <StatusBadge
                          label={user.emailVerified ? "verified" : "unverified"}
                          tone={user.emailVerified ? "success" : "warning"}
                        />
                        {user.hasPasswordAccount ? <StatusBadge label="credential" tone="neutral" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">{user.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-faint)]">
                        {user.username ? `username ${user.username}` : "username not set"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={user.hasAdminAccess ? "admin access" : "no admin"}
                        tone={user.hasAdminAccess ? "success" : "neutral"}
                      />
                      <StatusBadge
                        label={user.hasEditorAccess ? "editor access" : "no editor"}
                        tone={user.hasEditorAccess ? "success" : "warning"}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 border-t border-[rgba(100,116,139,0.12)] pt-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                        Role Memberships
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.roleKeys.length > 0 ? (
                          user.roleKeys.map((roleKey) => (
                            <StatusBadge
                              key={`${user.id}-${roleKey}`}
                              label={roleKey}
                              tone={roleKey === "admin" || roleKey === "editor" ? "success" : "neutral"}
                            />
                          ))
                        ) : (
                          <span className="text-sm text-[var(--text-soft)]">No role memberships assigned.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.76)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                        Session Signal
                      </p>
                      <div className="mt-3 flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-[var(--color-text)]">
                          <KeyRound size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {user.activeSessionCount} active session{user.activeSessionCount === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                            Last session update: {formatDateTime(user.lastSessionAt)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-faint)]">
                            Joined {formatDateTime(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-white/72 p-6 text-sm text-[var(--text-soft)]">
                No users were returned from the auth tables.
              </div>
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
