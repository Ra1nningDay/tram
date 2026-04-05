"use client";

import { Cpu, Wifi } from "lucide-react";
import { useState } from "react";

import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

type HardwareMapping = {
  id: string;
  vehicleId: string;
  displayLabel: string | null;
  hardwareVehicleId: string | null;
  hardwareId: string | null;
  enabled: boolean;
  updatedAt: Date | string;
};

type PendingHardwarePreview = {
  sourceKey: string;
  hardwareVehicleId?: string;
  hardwareId?: string;
  label?: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  observedAt: string;
  lastPolledAt: string;
};

type Props = {
  locale: string;
  mappings: HardwareMapping[];
  pendingHardware: PendingHardwarePreview[];
};

type MappingResponse = {
  ok: boolean;
  error?: string;
  mapping?: HardwareMapping;
};

type CreateDraft = {
  vehicleId: string;
  displayLabel: string;
  hardwareVehicleId: string;
  hardwareId: string;
  enabled: boolean;
};

function formatDateTime(value: Date | string | null | undefined, locale: string) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sortMappings(mappings: HardwareMapping[]) {
  return [...mappings].sort((left, right) => {
    if (left.enabled !== right.enabled) return left.enabled ? -1 : 1;
    return left.vehicleId.localeCompare(right.vehicleId);
  });
}

function emptyDraft(): CreateDraft {
  return {
    vehicleId: "",
    displayLabel: "",
    hardwareVehicleId: "",
    hardwareId: "",
    enabled: true,
  };
}

export function AdminHardwareMappingsPanel({
  locale,
  mappings: initialMappings,
  pendingHardware,
}: Props) {
  const [mappings, setMappings] = useState(sortMappings(initialMappings));
  const [draft, setDraft] = useState<CreateDraft>(emptyDraft());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("create");
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/network/hardware-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as MappingResponse;
      if (!response.ok || !result.ok || !result.mapping) {
        throw new Error(result.error || "Failed to create mapping");
      }

      setMappings((current) => sortMappings([...current, result.mapping!]));
      setDraft(emptyDraft());
      setFeedback("Hardware mapping created.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create mapping");
    } finally {
      setBusyId(null);
    }
  }

  function updateMappingDraft(
    id: string,
    field: keyof Omit<HardwareMapping, "updatedAt">,
    value: string | boolean | null,
  ) {
    setMappings((current) =>
      current.map((mapping) => (mapping.id === id ? { ...mapping, [field]: value } : mapping)),
    );
  }

  async function handleSave(mapping: HardwareMapping, nextEnabled: boolean = mapping.enabled) {
    setBusyId(mapping.id);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/network/hardware-mappings/${mapping.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: mapping.vehicleId,
          displayLabel: mapping.displayLabel ?? "",
          hardwareVehicleId: mapping.hardwareVehicleId ?? "",
          hardwareId: mapping.hardwareId ?? "",
          enabled: nextEnabled,
        }),
      });
      const result = (await response.json()) as MappingResponse;
      if (!response.ok || !result.ok || !result.mapping) {
        throw new Error(result.error || "Failed to update mapping");
      }

      setMappings((current) =>
        sortMappings(current.map((item) => (item.id === mapping.id ? result.mapping! : item))),
      );
      setFeedback("Hardware mapping updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update mapping");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <SectionCard eyebrow="Merge control" title="Hardware GPS Mappings" description="Map engineering hardware IDs to canonical vehicle IDs so the backend can merge hardware and driver telemetry into one live feed.">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Mapped vehicles</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{mappings.filter((mapping) => mapping.enabled).length} enabled</p>
                </div>
                <Cpu size={18} />
              </div>
            </div>
            <div className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Pending hardware IDs</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{pendingHardware.length} waiting for mapping</p>
                </div>
                <Wifi size={18} />
              </div>
            </div>
          </div>

          {feedback ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <form onSubmit={handleCreate} className="grid gap-3 rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4 md:grid-cols-2">
            <input value={draft.vehicleId} onChange={(event) => setDraft((current) => ({ ...current, vehicleId: event.target.value }))} placeholder="Vehicle ID" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
            <input value={draft.displayLabel} onChange={(event) => setDraft((current) => ({ ...current, displayLabel: event.target.value }))} placeholder="Display label" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
            <input value={draft.hardwareVehicleId} onChange={(event) => setDraft((current) => ({ ...current, hardwareVehicleId: event.target.value }))} placeholder="Hardware vehicle ID" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
            <input value={draft.hardwareId} onChange={(event) => setDraft((current) => ({ ...current, hardwareId: event.target.value }))} placeholder="Hardware ID" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
            <label className="inline-flex items-center gap-3 text-sm text-[var(--color-text)]">
              <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
              <span>Enabled</span>
            </label>
            <div className="flex items-center justify-end">
              <button type="submit" disabled={busyId === "create"} className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-text)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {busyId === "create" ? "Creating..." : "Create Mapping"}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {mappings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(100,116,139,0.2)] px-4 py-5 text-sm text-[var(--text-soft)]">No hardware mappings yet.</div>
            ) : (
              mappings.map((mapping) => (
                <div key={mapping.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{mapping.displayLabel || mapping.vehicleId}</p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {mapping.vehicleId} | {mapping.hardwareVehicleId || "-"} | {mapping.hardwareId || "-"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-faint)]">
                      Updated {formatDateTime(mapping.updatedAt, locale) ?? "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge label={mapping.enabled ? "enabled" : "disabled"} tone={mapping.enabled ? "success" : "neutral"} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input value={mapping.vehicleId} onChange={(event) => updateMappingDraft(mapping.id, "vehicleId", event.target.value)} placeholder="Vehicle ID" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
                    <input value={mapping.displayLabel ?? ""} onChange={(event) => updateMappingDraft(mapping.id, "displayLabel", event.target.value || null)} placeholder="Display label" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
                    <input value={mapping.hardwareVehicleId ?? ""} onChange={(event) => updateMappingDraft(mapping.id, "hardwareVehicleId", event.target.value || null)} placeholder="Hardware vehicle ID" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
                    <input value={mapping.hardwareId ?? ""} onChange={(event) => updateMappingDraft(mapping.id, "hardwareId", event.target.value || null)} placeholder="Hardware ID" className="rounded-2xl border border-[rgba(100,116,139,0.18)] bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none" />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-3 text-sm text-[var(--color-text)]">
                      <input type="checkbox" checked={mapping.enabled} onChange={(event) => updateMappingDraft(mapping.id, "enabled", event.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="button" disabled={busyId === mapping.id} onClick={() => void handleSave(mapping)} className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-text)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                        {busyId === mapping.id ? "Saving..." : "Save"}
                      </button>
                      <button type="button" disabled={busyId === mapping.id} onClick={() => void handleSave(mapping, !mapping.enabled)} className="inline-flex items-center justify-center rounded-2xl border border-[rgba(100,116,139,0.18)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--admin-inner-muted)] disabled:cursor-not-allowed disabled:opacity-60">
                        {mapping.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Poll preview" title="Pending Hardware Feed" description="These records were polled successfully but are still skipped from the public live feed because no mapping exists yet.">
        <div className="space-y-3">
          {pendingHardware.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(100,116,139,0.2)] px-4 py-5 text-sm text-[var(--text-soft)]">No pending hardware records.</div>
          ) : (
            pendingHardware.map((preview) => (
              <div key={preview.sourceKey} className="rounded-[24px] border border-[rgba(100,116,139,0.14)] bg-[var(--admin-inner-bg)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text)]">{preview.label || preview.hardwareVehicleId || preview.hardwareId || preview.sourceKey}</p>
                <div className="mt-2 space-y-1 text-sm text-[var(--text-soft)]">
                  <p>Vehicle ID: {preview.hardwareVehicleId || "-"}</p>
                  <p>Hardware ID: {preview.hardwareId || "-"}</p>
                  <p>Observed: {formatDateTime(preview.observedAt, locale) ?? "-"}</p>
                  <p>Last polled: {formatDateTime(preview.lastPolledAt, locale) ?? "-"}</p>
                  <p>Accuracy: {typeof preview.accuracyM === "number" ? `${preview.accuracyM} m` : "-"}</p>
                  <p>Lat {preview.latitude.toFixed(6)} / Lng {preview.longitude.toFixed(6)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </section>
  );
}
