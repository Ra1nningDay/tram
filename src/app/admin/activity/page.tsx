import { Clock3, DatabaseZap, FileClock, History, TriangleAlert, Users } from "lucide-react";

import { MetricCard } from "@/components/admin/MetricCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminActivityData } from "@/lib/admin/activity";

function formatDateTime(date: Date | null) {
  if (!date) {
    return "No timestamp available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEventTone(kind: "snapshot" | "session" | "user" | "role") {
  if (kind === "snapshot" || kind === "role") {
    return "success" as const;
  }

  if (kind === "session") {
    return "neutral" as const;
  }

  return "warning" as const;
}

export default async function AdminActivityPage() {
  const activity = await getAdminActivityData();

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Recent Actions"
          value={String(activity.recentActions.length)}
          hint="Derived events from snapshots, sessions, users, and role assignments."
          accent="amber"
          icon={<History size={18} />}
        />
        <MetricCard
          label="Writable Assets"
          value={String(activity.writableAssets.length)}
          hint="Files that still back the live map state before the future data migration."
          icon={<FileClock size={18} />}
        />
        <MetricCard
          label="Active Sessions"
          value={String(activity.activeSessionCount)}
          hint="Non-expired sessions visible from Better Auth session records."
          icon={<Clock3 size={18} />}
        />
        <MetricCard
          label="Recent Users"
          value={String(activity.recentUserCount)}
          hint="Most recent user records included in the derived event feed."
          icon={<Users size={18} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <SectionCard
          eyebrow="Recent Actions"
          title="Operational timeline"
          description="This feed is intentionally derived, not a permanent audit table. It gives the admin desk a useful signal surface until audit logging lands."
        >
          <div className="space-y-3">
            {activity.recentActions.length > 0 ? (
              activity.recentActions.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/72 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[var(--color-text)]">{event.title}</p>
                        <StatusBadge label={event.kind} tone={getEventTone(event.kind)} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{event.detail}</p>
                    </div>
                    <div className="text-sm font-medium text-[var(--text-soft)]">
                      {formatDateTime(event.occurredAt)}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/72 p-4 text-sm text-[var(--text-soft)]">
                No derived events are available yet.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="System Notes"
          title="Known state and caveats"
          description="This panel makes the current operational assumptions explicit so later audit work has a clear baseline."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/72 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Authentication</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    Better Auth is responsible for protected-session handling across admin and editor surfaces.
                  </p>
                </div>
                <StatusBadge label={activity.authEnabled ? "enabled" : "missing"} tone={activity.authEnabled ? "success" : "warning"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/72 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Editor protection</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    Access to `/editor` and `POST /api/editor/save` remains server-guarded by role checks.
                  </p>
                </div>
                <StatusBadge
                  label={activity.editorProtected ? "protected" : "open"}
                  tone={activity.editorProtected ? "success" : "warning"}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/72 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Storage mode</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    Runtime edits are still JSON-backed. The admin desk surfaces this explicitly until data migration moves canonical map content into the database.
                  </p>
                </div>
                <StatusBadge
                  label={activity.jsonBackedStorage ? "json-backed" : "db-backed"}
                  tone={activity.jsonBackedStorage ? "warning" : "success"}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-[rgba(255,242,223,0.72)] p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-[#9a5800]">
                  <TriangleAlert size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Future audit slot</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                    This layout is reserved to accept a persistent audit trail later. The current feed is derived to keep the structure stable without pretending there is already immutable history.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Recent Save Status"
        title="Writable runtime assets"
        description="Derived file-level status for the current save surface."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {activity.writableAssets.map((asset) => (
            <article
              key={asset.label}
              className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-white/72 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--color-text)]">{asset.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{asset.scope}</p>
                </div>
                <StatusBadge
                  label={asset.status === "healthy" ? "healthy" : "missing"}
                  tone={asset.status === "healthy" ? "success" : "warning"}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.76)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                    <Clock3 size={12} />
                    Last Update
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                    {formatDateTime(asset.updatedAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.76)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                    <DatabaseZap size={12} />
                    File Size
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                    {asset.sizeKb ? `${asset.sizeKb} KB` : "No file size"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-white/72 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Database availability</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                Prisma-backed auth data is used to enrich the derived activity feed with sessions, users, and role assignments.
              </p>
            </div>
            <StatusBadge
              label={activity.databaseConnected ? "connected" : "degraded"}
              tone={activity.databaseConnected ? "success" : "warning"}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
