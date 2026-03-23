"use client";

import { Clock3, Map, Pentagon, Route, Shapes, Waypoints } from "lucide-react";
import Link from "next/link";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { MetricCard } from "@/components/admin/MetricCard";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

type NetworkData = {
  routeCount: number;
  directionCount: number;
  coordinateCount: number;
  stopCount: number;
  namedStopCount: number;
  polygonPointCount: number;
  lastUpdatedAt: Date | null;
  routes: { id: string; name: string; directionCount: number; coordinateCount: number; directions: { direction: string; coordinateCount: number; stopReferenceCount: number }[] }[];
  stops: { id: string; name: string; icon: string; color: string; sequence: number }[];
  iconUsage: { name: string; count: number }[];
  colorUsage: { name: string; count: number }[];
  polygonSettings: { minZoom: number; maxZoom: number; initialZoom: number; maskOpacity: number };
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
};

function formatDateTime(date: Date | null, locale: string) {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatNumber(value: number, digits = 4) {
  return value.toFixed(digits);
}

export function AdminNetworkContent({ network }: { network: NetworkData }) {
  const { t, locale } = useAdminLocale();
  const topIcons = network.iconUsage.slice(0, 4);
  const topColors = network.colorUsage.slice(0, 4);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t("network.route_summary")}
          value={`${network.routeCount} / ${network.directionCount}`}
          hint={t("network.route_summary_hint").replace("{count}", String(network.coordinateCount))}
          accent="amber"
          icon={<Route size={18} />}
        />
        <MetricCard
          label={t("network.stops_summary")}
          value={t("network.stops_summary_value").replace("{count}", String(network.stopCount))}
          hint={t("network.stops_summary_hint").replace("{count}", String(network.namedStopCount))}
          icon={<Map size={18} />}
        />
        <MetricCard
          label={t("network.service_area")}
          value={t("network.service_area_value").replace("{count}", String(network.polygonPointCount))}
          hint={t("network.service_area_hint").replace("{date}", formatDateTime(network.lastUpdatedAt, locale) ?? t("common.no_file_timestamp"))}
          icon={<Pentagon size={18} />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard eyebrow={t("network.action_rail")} title={t("network.action_rail_title")} description={t("network.action_rail_desc")}>
          <div className="grid gap-4">
            <QuickActionCard href="/editor?tab=route" title={t("network.route_geometry")} description={t("network.route_geometry_desc")} icon={<Waypoints size={20} />} tone="dark" />
            <QuickActionCard href="/editor?tab=stops" title={t("network.stop_placement")} description={t("network.stop_placement_desc")} icon={<Map size={20} />} tone="accent" />
            <QuickActionCard href="/editor?tab=mask" title={t("network.service_area_mask")} description={t("network.service_area_mask_desc")} icon={<Pentagon size={20} />} />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={t("network.read_only_preview")}
          title={t("network.network_anatomy")}
          description={t("network.network_anatomy_desc")}
          actions={
            <Link
              href="/api/admin/export"
              className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(100,116,139,0.18)] bg-[var(--admin-inner-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--admin-nav-hover)]"
            >
              <span>{t("network.download_snapshot")}</span>
              <Shapes size={16} />
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">{t("network.routes")}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-text)]">{t("network.direction_breakdown")}</h3>
                </div>
                <StatusBadge label={`${network.directionCount} dirs`} tone="neutral" />
              </div>
              <div className="mt-4 space-y-3">
                {network.routes.map((route) => (
                  <div key={route.id} className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] p-4">
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

            <article className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">{t("network.stops_label")}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-text)]">{t("network.identity_styling")}</h3>
                </div>
                <StatusBadge label={`${network.stopCount} total`} tone="neutral" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {topIcons.map((entry) => (
                  <div key={`icon-${entry.name}`} className="rounded-full border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)]">
                    {entry.name} x {entry.count}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {topColors.map((entry) => (
                  <div key={`color-${entry.name}`} className="rounded-full border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)]">
                    {entry.name} x {entry.count}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {network.stops.slice(0, 6).map((stop) => (
                  <div key={stop.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text)]">{stop.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-faint)]">{stop.icon} / {stop.color}</p>
                    </div>
                    <StatusBadge label={`#${stop.sequence}`} tone="neutral" />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">{t("network.mask")}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-text)]">{t("network.service_area_metadata")}</h3>
                </div>
                <StatusBadge label={`${network.polygonPointCount} pts`} tone="neutral" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("network.zoom_range")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {network.polygonSettings.minZoom} to {network.polygonSettings.maxZoom}, default {network.polygonSettings.initialZoom}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("network.mask_opacity")}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{network.polygonSettings.maskOpacity}</p>
                </div>
                <div className="rounded-2xl border border-[rgba(100,116,139,0.12)] bg-[var(--admin-inner-muted)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t("network.bounds")}</p>
                  <div className="mt-2 space-y-1 text-sm text-[var(--text-soft)]">
                    <p>Lng {formatNumber(network.bounds.minLng)} to {formatNumber(network.bounds.maxLng)}</p>
                    <p>Lat {formatNumber(network.bounds.minLat)} to {formatNumber(network.bounds.maxLat)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
                  <Clock3 size={14} />
                  <span>{formatDateTime(network.lastUpdatedAt, locale) ?? t("common.no_file_timestamp")}</span>
                </div>
              </div>
            </article>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
