import { Clock3, Map, Pentagon, Route, Shapes, Waypoints } from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/admin/MetricCard";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminNetworkData } from "@/lib/admin/network";

function formatDateTime(date: Date | null) {
  if (!date) {
    return "No file timestamp";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number, digits = 4) {
  return value.toFixed(digits);
}

export default async function AdminNetworkPage() {
  const network = await getAdminNetworkData();
  const topIcons = network.iconUsage.slice(0, 4);
  const topColors = network.colorUsage.slice(0, 4);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Route Summary"
          value={`${network.routeCount} / ${network.directionCount}`}
          hint={`${network.coordinateCount} coordinates across all route directions in the live snapshot.`}
          accent="amber"
          icon={<Route size={18} />}
        />
        <MetricCard
          label="Stops Summary"
          value={`${network.stopCount} stops`}
          hint={`${network.namedStopCount} stops already have names assigned in the current editor payload.`}
          icon={<Map size={18} />}
        />
        <MetricCard
          label="Service Area"
          value={`${network.polygonPointCount} points`}
          hint={`Last network file update: ${formatDateTime(network.lastUpdatedAt)}.`}
          icon={<Pentagon size={18} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard
          eyebrow="Action Rail"
          title="Open the right editing surface"
          description="The network page stays read-only and descriptive. Editing still routes back into the full-screen editor."
        >
          <div className="grid gap-4">
            <QuickActionCard
              href="/editor?tab=route"
              title="Route Geometry"
              description="Adjust direction coordinates and path layout."
              icon={<Waypoints size={20} />}
              badge="Live"
              tone="dark"
            />
            <QuickActionCard
              href="/editor?tab=stops"
              title="Stop Placement"
              description="Reorder, rename, and move stop markers."
              icon={<Map size={20} />}
              badge="Live"
              tone="accent"
            />
            <QuickActionCard
              href="/editor?tab=mask"
              title="Service Area Mask"
              description="Refine the campus boundary polygon used by the live map."
              icon={<Pentagon size={20} />}
              badge="Live"
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Read-Only Preview"
          title="Network anatomy"
          description="A compact breakdown of what is currently stored in the route, stop, and mask snapshots."
          actions={
            <Link
              href="/api/admin/export"
              className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-white"
            >
              <span>Download snapshot</span>
              <Shapes size={16} />
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-white/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">Routes</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-text)]">Direction breakdown</h3>
                </div>
                <StatusBadge label={`${network.directionCount} dirs`} tone="neutral" />
              </div>

              <div className="mt-4 space-y-3">
                {network.routes.map((route) => (
                  <div key={route.id} className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.7)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{route.name}</p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {route.coordinateCount} coordinates across {route.directionCount} direction set(s)
                    </p>
                    <div className="mt-3 space-y-2">
                      {route.directions.map((direction) => (
                        <div key={`${route.id}-${direction.direction}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="capitalize text-[var(--text-soft)]">{direction.direction}</span>
                          <span className="font-medium text-[var(--color-text)]">
                            {direction.coordinateCount} pts / {direction.stopReferenceCount} stop refs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-white/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">Stops</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-text)]">Identity and styling</h3>
                </div>
                <StatusBadge label={`${network.stopCount} total`} tone="neutral" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {topIcons.map((entry) => (
                  <div
                    key={`icon-${entry.name}`}
                    className="rounded-full border border-[rgba(100,116,139,0.14)] bg-[rgba(237,242,249,0.7)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)]"
                  >
                    {entry.name} x {entry.count}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {topColors.map((entry) => (
                  <div
                    key={`color-${entry.name}`}
                    className="rounded-full border border-[rgba(100,116,139,0.14)] bg-[rgba(255,255,255,0.84)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)]"
                  >
                    {entry.name} x {entry.count}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {network.stops.slice(0, 6).map((stop) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.7)] px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text)]">{stop.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-faint)]">
                        {stop.icon} / {stop.color}
                      </p>
                    </div>
                    <StatusBadge label={`#${stop.sequence}`} tone="neutral" />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-white/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">Mask</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-text)]">Service area metadata</h3>
                </div>
                <StatusBadge label={`${network.polygonPointCount} pts`} tone="neutral" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.7)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Zoom range</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {network.polygonSettings.minZoom} to {network.polygonSettings.maxZoom}, default {network.polygonSettings.initialZoom}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.7)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Mask opacity</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{network.polygonSettings.maskOpacity}</p>
                </div>
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[rgba(237,242,249,0.7)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Bounds</p>
                  <div className="mt-2 space-y-1 text-sm text-[var(--text-soft)]">
                    <p>Lng {formatNumber(network.bounds.minLng)} to {formatNumber(network.bounds.maxLng)}</p>
                    <p>Lat {formatNumber(network.bounds.minLat)} to {formatNumber(network.bounds.maxLat)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
                  <Clock3 size={14} />
                  <span>{formatDateTime(network.lastUpdatedAt)}</span>
                </div>
              </div>
            </article>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
