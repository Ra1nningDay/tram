"use client";

import { useEffect, useState } from "react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { AdminModal } from "@/components/admin/AdminModal";

type AccessRole = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  memberCount: number;
};

type CreateRoleResponse = {
  ok: boolean;
  error?: string;
  role?: AccessRole;
};

type AdminCreateRoleDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (role: AccessRole) => void;
};

export function AdminCreateRoleDialog({
  open,
  onClose,
  onCreated,
}: AdminCreateRoleDialogProps) {
  const { locale } = useAdminLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
  });

  const copy =
    locale === "th"
      ? {
          title: "\u0e40\u0e1e\u0e34\u0e48\u0e21 role",
          keyLabel: "Role key",
          nameLabel: "\u0e0a\u0e37\u0e48\u0e2d",
          descriptionLabel: "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22",
          createLabel: "\u0e2a\u0e23\u0e49\u0e32\u0e07",
          creatingLabel: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07...",
          errorLabel: "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e1e\u0e34\u0e48\u0e21 role \u0e44\u0e14\u0e49",
        }
      : {
          title: "Create Role",
          keyLabel: "Role key",
          nameLabel: "Name",
          descriptionLabel: "Description",
          createLabel: "Create",
          creatingLabel: "Creating...",
          errorLabel: "Failed to create role.",
        };

  useEffect(() => {
    if (!open) return;
    setForm({
      key: "",
      name: "",
      description: "",
    });
    setError(null);
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/access/roles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as CreateRoleResponse;
      if (!response.ok || !result.ok || !result.role) {
        throw new Error(result.error || copy.errorLabel);
      }

      onCreated(result.role);
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.errorLabel);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClassName =
    "h-11 w-full rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-4 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--admin-panel-border-strong)]";

  return (
    <AdminModal title={copy.title} open={open} onClose={isSubmitting ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.keyLabel}</label>
            <input
              type="text"
              value={form.key}
              onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toLowerCase() }))}
              className={fieldClassName}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.nameLabel}</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={fieldClassName}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            {copy.descriptionLabel}
          </label>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="min-h-[108px] w-full rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--admin-panel-border-strong)]"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-badge-warning-bg)] px-4 py-3 text-sm font-medium text-[var(--admin-badge-warning-text)]">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
          >
            <span>{isSubmitting ? copy.creatingLabel : copy.createLabel}</span>
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
