"use client";

import { useEffect, useState } from "react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { AdminModal } from "@/components/admin/AdminModal";
import { cn } from "@/lib/utils";

type AccessRole = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  memberCount: number;
};

type AccessUser = {
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
};

type CreateUserResponse = {
  ok: boolean;
  error?: string;
  user?: AccessUser;
  roles?: Array<{
    key: string;
    memberCount: number;
  }>;
};

type AdminCreateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  roles: AccessRole[];
  onCreated: (
    user: AccessUser,
    roleCounts: Array<{
      key: string;
      memberCount: number;
    }>
  ) => void;
};

export function AdminCreateUserDialog({
  open,
  onClose,
  roles,
  onCreated,
}: AdminCreateUserDialogProps) {
  const { locale } = useAdminLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    roleKeys: [] as string[],
  });

  const copy =
    locale === "th"
      ? {
          title: "\u0e40\u0e1e\u0e34\u0e48\u0e21 user",
          nameLabel: "\u0e0a\u0e37\u0e48\u0e2d",
          emailLabel: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
          passwordLabel: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
          roleLabel: "\u0e01\u0e33\u0e2b\u0e19\u0e14 role \u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19",
          createLabel: "\u0e2a\u0e23\u0e49\u0e32\u0e07",
          creatingLabel: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07...",
          errorLabel: "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e1e\u0e34\u0e48\u0e21 user \u0e44\u0e14\u0e49",
        }
      : {
          title: "Create User",
          nameLabel: "Name",
          emailLabel: "Email",
          passwordLabel: "Password",
          roleLabel: "Initial roles",
          createLabel: "Create",
          creatingLabel: "Creating...",
          errorLabel: "Failed to create user.",
        };

  useEffect(() => {
    if (!open) return;
    setForm({
      name: "",
      email: "",
      username: "",
      password: "",
      roleKeys: [],
    });
    setError(null);
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/access/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as CreateUserResponse;
      if (!response.ok || !result.ok || !result.user) {
        throw new Error(result.error || copy.errorLabel);
      }

      onCreated(result.user, result.roles ?? []);
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
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.nameLabel}</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={fieldClassName}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.emailLabel}</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className={fieldClassName}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              className={fieldClassName}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.passwordLabel}</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className={fieldClassName}
              minLength={8}
              required
            />
          </div>
        </div>

        <div>
          <p className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.roleLabel}</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const selected = form.roleKeys.includes(role.key);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      roleKeys: selected
                        ? current.roleKeys.filter((roleKey) => roleKey !== role.key)
                        : [...current.roleKeys, role.key].sort(),
                    }))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-[var(--admin-panel-border-strong)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]"
                      : "border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] text-[var(--text-soft)] hover:border-[var(--admin-panel-border-strong)] hover:text-[var(--color-text)]"
                  )}
                >
                  {role.name}
                </button>
              );
            })}
          </div>
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
