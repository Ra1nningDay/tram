import { ArrowRight, DatabaseZap, Map, Pentagon, Route, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/admin/MetricCard";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminOverviewData } from "@/lib/admin/overview";

function formatRelativeDate(date: Date | null) {
  if (!date) {
    return "No file timestamp";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminPage() {
  const overview = await getAdminOverviewData();

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Routes"
          value={String(overview.routeCount)}
          hint="Current transit lines available in the live snapshot."
          accent="amber"
          icon={<Route size={18} />}
        />
        <MetricCard
          label="Stops"
          value={String(overview.stopCount)}
          hint="Editable stop points currently stored in the shuttle snapshot."
          icon={<Map size={18} />}
        />
        <MetricCard
          label="Roles"
          value={String(overview.roleCount)}
          hint="Authorization roles loaded from Better Auth + Prisma."
          icon={<ShieldCheck size={18} />}
        />
        <MetricCard
          label="Last Update"
          value={formatRelativeDate(overview.lastUpdatedAt)}
          hint="Latest write time across the current JSON-backed data files."
          icon={<DatabaseZap size={18} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <SectionCard
          eyebrow="Quick Actions"
          title="Jump straight into the live editing surfaces"
          description="The dashboard stays operational and summary-first. Editing still happens inside the full-screen editor."
          actions={
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1f2937] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.2)] transition hover:translate-y-[-1px]"
            >
              <span>Open Live Editor</span>
              <ArrowRight size={16} />
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <QuickActionCard
              href="/editor?tab=route"
              title="Route Editor"
              description="Open the route geometry workspace with the route tab selected."
              icon={<Route size={20} />}
              badge="Live"
              tone="dark"
            />
            <QuickActionCard
              href="/editor?tab=stops"
              title="Stops Editor"
              description="Jump directly into stop placement, drag, and naming controls."
              icon={<Map size={20} />}
              badge="Live"
              tone="accent"
            />
            <QuickActionCard
              href="/editor?tab=mask"
              title="Mask Editor"
              description="Open the service area mask workflow without switching tabs manually."
              icon={<Pentagon size={20} />}
              badge="Live"
            />
            <QuickActionCard
              href="/api/admin/export"
              title="Export Snapshot"
              description="Download the current shuttle and campus JSON payload as a single admin snapshot."
              icon={<DatabaseZap size={20} />}
              badge="JSON"
              download
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="System Status"
          title="Protection and storage signals"
          description="Overview-level status until deeper admin pages and audit history land."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Authentication</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    Better Auth secret and session handling are configured for protected surfaces.
                  </p>
                </div>
                <StatusBadge label={overview.authEnabled ? "Enabled" : "Missing"} tone={overview.authEnabled ? "success" : "warning"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Editor Guard</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    `/editor` and save APIs are behind role-aware server checks.
                  </p>
                </div>
                <StatusBadge label={overview.editorProtected ? "Protected" : "Open"} tone={overview.editorProtected ? "success" : "warning"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Database</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    Role metrics are read from Prisma-backed auth tables.
                  </p>
                </div>
                <StatusBadge label={overview.databaseConnected ? "Connected" : "Degraded"} tone={overview.databaseConnected ? "success" : "warning"} />
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SectionCard
          eyebrow="Recent Snapshot"
          title="Latest writable assets"
          description="These files still back the live map state until the full data migration moves editor content into the database."
        >
          <div className="space-y-3">
            {overview.snapshotFiles.map((file) => (
              <div
                key={file.label}
                className="flex flex-col gap-2 rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{file.label}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {file.updatedAt ? formatRelativeDate(file.updatedAt) : "File not found"}
                  </p>
                </div>
                <div className="text-sm font-medium text-[var(--text-soft)]">
                  {file.sizeKb ? `${file.sizeKb} KB` : "No size data"}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Notes"
          title="Operational context"
          description="A concise state summary that ties the overview to the deeper admin surfaces."
        >
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">Storage mode</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                Live edits are still persisted to JSON files. The dashboard deliberately surfaces that so data-layer work does not get hidden.
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">Mask geometry</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                The current campus/service area polygon contains {overview.polygonPointCount} points in the live config snapshot.
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(100,116,139,0.14)] bg-white/70 px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">Next surface</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                Use `/admin/network`, `/admin/access`, and `/admin/activity` as the detailed read-only surfaces before dropping into `/editor`.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
