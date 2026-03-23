"use client";

import { Clock3, Plus, Search, ShieldCheck, UserSquare2, Users } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { AdminCreateRoleDialog } from "@/components/admin/AdminCreateRoleDialog";
import { AdminCreateUserDialog } from "@/components/admin/AdminCreateUserDialog";
import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
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

type AccessData = {
  totalUsers: number;
  adminUsers: number;
  editorUsers: number;
  activeSessions: number;
  databaseConnected: boolean;
  roles: AccessRole[];
  users: AccessUser[];
};

type RoleUpdateResponse = {
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    roleKeys: string[];
    hasAdminAccess: boolean;
    hasEditorAccess: boolean;
  };
  role?: {
    key: string;
    memberCount: number;
  };
};

type RoleFilter = "all" | "admin" | "editor" | "unassigned";

const ADMIN_ROLE_KEY = "admin";
const EDITOR_ROLE_KEY = "editor";

function formatDateTime(date: Date | null, locale: string) {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ManageRoleButton({
  label,
  active,
  disabled,
  pending,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex min-w-[108px] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
        active
          ? "border-[var(--admin-panel-border-strong)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]"
          : "border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] text-[var(--color-text)] hover:border-[var(--admin-panel-border-strong)]",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {pending ? "..." : label}
    </button>
  );
}

export function AdminAccessContent({ access }: { access: AccessData }) {
  const { t, locale } = useAdminLocale();
  const [accessState, setAccessState] = useState(access);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const copy =
    locale === "th"
      ? {
          title: "\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e41\u0e25\u0e30 role",
          description: "\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u0e14\u0e39 role \u0e17\u0e35\u0e48\u0e16\u0e37\u0e2d\u0e2d\u0e22\u0e39\u0e48 \u0e41\u0e25\u0e30\u0e1b\u0e23\u0e31\u0e1a\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e08\u0e32\u0e01\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27",
          searchPlaceholder: "\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e0a\u0e37\u0e48\u0e2d, \u0e2d\u0e35\u0e40\u0e21\u0e25, username \u0e2b\u0e23\u0e37\u0e2d role",
          addUser: "\u0e40\u0e1e\u0e34\u0e48\u0e21 user",
          addRole: "\u0e40\u0e1e\u0e34\u0e48\u0e21 role",
          allFilter: "\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14",
          adminFilter: "Admin",
          editorFilter: "Editor",
          unassignedFilter: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35 role",
          userCol: "\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49",
          usernameCol: "Username",
          rolesCol: "Roles",
          accessCol: "\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
          sessionsCol: "\u0e40\u0e0b\u0e2a\u0e0a\u0e31\u0e19",
          manageCol: "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23",
          activeSessions: "\u0e40\u0e0b\u0e2a\u0e0a\u0e31\u0e19\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
          lastSeen: "\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14",
          updateSuccess: "\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15 role \u0e41\u0e25\u0e49\u0e27",
          createUserSuccess: "\u0e40\u0e1e\u0e34\u0e48\u0e21 user \u0e41\u0e25\u0e49\u0e27",
          createRoleSuccess: "\u0e40\u0e1e\u0e34\u0e48\u0e21 role \u0e41\u0e25\u0e49\u0e27",
          updateError: "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15 role \u0e44\u0e14\u0e49",
          noUsers: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a",
          noResults: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e15\u0e32\u0e21\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01",
          noActiveSession: "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e0b\u0e2a\u0e0a\u0e31\u0e19",
          noUsername: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35",
          noRole: "\u0e44\u0e21\u0e48\u0e21\u0e35",
          members: "\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01",
          unknownUser: "\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\u0e0a\u0e37\u0e48\u0e2d",
        }
      : {
          title: "Users & Roles",
          description: "Search accounts, inspect roles, and update access from one table.",
          searchPlaceholder: "Search name, email, username, or role",
          addUser: "Add User",
          addRole: "Add Role",
          allFilter: "All",
          adminFilter: "Admin",
          editorFilter: "Editor",
          unassignedFilter: "No role",
          userCol: "User",
          usernameCol: "Username",
          rolesCol: "Roles",
          accessCol: "Access",
          sessionsCol: "Sessions",
          manageCol: "Manage",
          activeSessions: "active sessions",
          lastSeen: "Last seen",
          updateSuccess: "Roles updated.",
          createUserSuccess: "User created.",
          createRoleSuccess: "Role created.",
          updateError: "Failed to update roles.",
          noUsers: "No users available yet.",
          noResults: "No users match the current filters.",
          noActiveSession: "No active session",
          noUsername: "Not set",
          noRole: "None",
          members: "members",
          unknownUser: "Unknown user",
        };

  const metrics = [
    {
      label: t("access.total_users"),
      value: String(accessState.totalUsers),
      hint: "Users",
      accent: "amber" as const,
      icon: <Users size={18} />,
    },
    {
      label: t("access.admin_users"),
      value: String(accessState.adminUsers),
      hint: "Admin",
      icon: <ShieldCheck size={18} />,
    },
    {
      label: t("access.editor_users"),
      value: String(accessState.editorUsers),
      hint: "Editor",
      icon: <UserSquare2 size={18} />,
    },
    {
      label: t("access.active_sessions"),
      value: String(accessState.activeSessions),
      hint: copy.activeSessions,
      icon: <Clock3 size={18} />,
    },
  ];

  const roleSummaries = accessState.roles.map((role) => ({
    key: role.key,
    label: role.name,
    count: role.memberCount,
  }));

  const filteredUsers = accessState.users.filter((user) => {
    const matchesRole =
      roleFilter === "all"
        ? true
        : roleFilter === "admin"
          ? user.hasAdminAccess
          : roleFilter === "editor"
            ? user.hasEditorAccess
            : user.roleKeys.length === 0;

    if (!matchesRole) return false;
    if (!deferredQuery) return true;

    const haystack = [user.name, user.email, user.username ?? "", user.roleKeys.join(" ")]
      .join(" ")
      .toLowerCase();

    return haystack.includes(deferredQuery);
  });

  function updateRoleCounts(roles: AccessRole[], updates: Array<{ key: string; memberCount: number }>) {
    return roles.map((role) => {
      const next = updates.find((item) => item.key === role.key);
      return next ? { ...role, memberCount: next.memberCount } : role;
    });
  }

  async function handleRoleUpdate(userId: string, roleKey: string, enabled: boolean) {
    const requestKey = `${userId}:${roleKey}`;
    setPendingKey(requestKey);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/access/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, roleKey, enabled }),
      });

      const result = (await response.json()) as RoleUpdateResponse;

      if (!response.ok || !result.ok || !result.user || !result.role) {
        throw new Error(result.error || copy.updateError);
      }

      setAccessState((current) => {
        const users = current.users.map((user) =>
          user.id === result.user?.id
            ? {
                ...user,
                roleKeys: result.user.roleKeys,
                hasAdminAccess: result.user.hasAdminAccess,
                hasEditorAccess: result.user.hasEditorAccess,
              }
            : user
        );

        const roles = current.roles.map((role) =>
          role.key === result.role?.key ? { ...role, memberCount: result.role.memberCount } : role
        );

        return {
          ...current,
          roles,
          users,
          adminUsers: users.filter((user) => user.hasAdminAccess).length,
          editorUsers: users.filter((user) => user.hasEditorAccess).length,
        };
      });

      setFeedback(copy.updateSuccess);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.updateError);
    } finally {
      setPendingKey(null);
    }
  }

  const filterOptions: { key: RoleFilter; label: string }[] = [
    { key: "all", label: copy.allFilter },
    { key: "admin", label: copy.adminFilter },
    { key: "editor", label: copy.editorFilter },
    { key: "unassigned", label: copy.unassignedFilter },
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              accent={metric.accent}
              icon={metric.icon}
            />
          ))}
        </section>

        <SectionCard
          title={copy.title}
          description={copy.description}
          actions={
            <div className="flex w-full flex-col gap-2 xl:w-auto xl:flex-row xl:items-center xl:justify-end">
              <div className="relative w-full xl:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="h-11 w-full rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] pl-10 pr-4 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--admin-panel-border-strong)]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--admin-panel-border-strong)]"
                >
                  <Plus size={14} />
                  <span>{copy.addUser}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRoleDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--admin-panel-border-strong)]"
                >
                  <Plus size={14} />
                  <span>{copy.addRole}</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {roleSummaries.map((role) => (
                  <div
                    key={role.key}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-[var(--color-text)]">{role.label}</span>
                    <span className="rounded-full bg-[var(--admin-badge-neutral-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-soft)]">
                      {role.count} {copy.members}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRoleFilter(option.key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      roleFilter === option.key
                        ? "border-[var(--admin-panel-border-strong)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]"
                        : "border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] text-[var(--text-soft)] hover:border-[var(--admin-panel-border-strong)] hover:text-[var(--color-text)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-badge-success-bg)] px-4 py-3 text-sm font-medium text-[var(--admin-badge-success-text)]">
                {feedback}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-badge-warning-bg)] px-4 py-3 text-sm font-medium text-[var(--admin-badge-warning-text)]">
                {error}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[20px] border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)]">
              {filteredUsers.length > 0 ? (
                <>
                  {/* Mobile card layout */}
                  <div className="divide-y divide-[var(--admin-panel-border)] lg:hidden">
                    {filteredUsers.map((user) => {
                      const adminActive = user.roleKeys.includes(ADMIN_ROLE_KEY);
                      const editorActive = user.roleKeys.includes(EDITOR_ROLE_KEY);
                      const adminPending = pendingKey === `${user.id}:${ADMIN_ROLE_KEY}`;
                      const editorPending = pendingKey === `${user.id}:${EDITOR_ROLE_KEY}`;

                      return (
                        <div key={user.id} className="space-y-3 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--color-text)]">
                              {user.name || copy.unknownUser}
                            </p>
                            <StatusBadge
                              label={user.emailVerified ? t("common.verified") : t("common.unverified")}
                              tone={user.emailVerified ? "success" : "warning"}
                            />
                          </div>
                          <p className="text-sm text-[var(--text-soft)]">{user.email}</p>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">{copy.rolesCol}:</span>
                            {user.roleKeys.length > 0 ? (
                              user.roleKeys.map((roleKey) => (
                                <StatusBadge
                                  key={`${user.id}-${roleKey}`}
                                  label={roleKey}
                                  tone={roleKey === ADMIN_ROLE_KEY || roleKey === EDITOR_ROLE_KEY ? "success" : "neutral"}
                                />
                              ))
                            ) : (
                              <span className="text-sm text-[var(--text-soft)]">{copy.noRole}</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              label={user.hasAdminAccess ? t("common.admin_access") : t("common.no_admin")}
                              tone={user.hasAdminAccess ? "success" : "neutral"}
                            />
                            <StatusBadge
                              label={user.hasEditorAccess ? t("common.editor_access") : t("common.no_editor")}
                              tone={user.hasEditorAccess ? "success" : "warning"}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <ManageRoleButton
                              label="Admin"
                              active={adminActive}
                              disabled={adminPending || editorPending}
                              pending={adminPending}
                              onClick={() => handleRoleUpdate(user.id, ADMIN_ROLE_KEY, !adminActive)}
                            />
                            <ManageRoleButton
                              label="Editor"
                              active={editorActive}
                              disabled={adminPending || editorPending}
                              pending={editorPending}
                              onClick={() => handleRoleUpdate(user.id, EDITOR_ROLE_KEY, !editorActive)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table layout */}
                  <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1120px] border-collapse">
                    <thead className="bg-[var(--admin-panel-muted)]">
                      <tr className="border-b border-[var(--admin-panel-border)] text-left">
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                          {copy.userCol}
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                          {copy.usernameCol}
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                          {copy.rolesCol}
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                          {copy.accessCol}
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                          {copy.sessionsCol}
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                          {copy.manageCol}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const adminActive = user.roleKeys.includes(ADMIN_ROLE_KEY);
                        const editorActive = user.roleKeys.includes(EDITOR_ROLE_KEY);
                        const adminPending = pendingKey === `${user.id}:${ADMIN_ROLE_KEY}`;
                        const editorPending = pendingKey === `${user.id}:${EDITOR_ROLE_KEY}`;

                        return (
                          <tr key={user.id} className="border-b border-[var(--admin-panel-border)] last:border-b-0">
                            <td className="px-4 py-4 align-top">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-[var(--color-text)]">
                                    {user.name || copy.unknownUser}
                                  </p>
                                  <StatusBadge
                                    label={user.emailVerified ? t("common.verified") : t("common.unverified")}
                                    tone={user.emailVerified ? "success" : "warning"}
                                  />
                                  {user.hasPasswordAccount ? (
                                    <StatusBadge label={t("common.credential")} tone="neutral" />
                                  ) : null}
                                </div>
                                <p className="mt-1 text-sm text-[var(--text-soft)]">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm font-medium text-[var(--color-text)]">
                                {user.username ?? copy.noUsername}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-faint)]">
                                {t("access.joined").replace("{date}", formatDateTime(user.createdAt, locale) ?? "-")}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                {user.roleKeys.length > 0 ? (
                                  user.roleKeys.map((roleKey) => (
                                    <StatusBadge
                                      key={`${user.id}-${roleKey}`}
                                      label={roleKey}
                                      tone={
                                        roleKey === ADMIN_ROLE_KEY || roleKey === EDITOR_ROLE_KEY
                                          ? "success"
                                          : "neutral"
                                      }
                                    />
                                  ))
                                ) : (
                                  <span className="text-sm text-[var(--text-soft)]">{copy.noRole}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                <StatusBadge
                                  label={user.hasAdminAccess ? t("common.admin_access") : t("common.no_admin")}
                                  tone={user.hasAdminAccess ? "success" : "neutral"}
                                />
                                <StatusBadge
                                  label={user.hasEditorAccess ? t("common.editor_access") : t("common.no_editor")}
                                  tone={user.hasEditorAccess ? "success" : "warning"}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm font-semibold text-[var(--color-text)]">
                                {user.activeSessionCount} {copy.activeSessions}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-soft)]">
                                {formatDateTime(user.lastSessionAt, locale) ?? copy.noActiveSession}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-faint)]">{copy.lastSeen}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                <ManageRoleButton
                                  label="Admin"
                                  active={adminActive}
                                  disabled={adminPending || editorPending}
                                  pending={adminPending}
                                  onClick={() => handleRoleUpdate(user.id, ADMIN_ROLE_KEY, !adminActive)}
                                />
                                <ManageRoleButton
                                  label="Editor"
                                  active={editorActive}
                                  disabled={adminPending || editorPending}
                                  pending={editorPending}
                                  onClick={() => handleRoleUpdate(user.id, EDITOR_ROLE_KEY, !editorActive)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              ) : (
                <div className="p-6 text-sm text-[var(--text-soft)]">
                  {accessState.users.length > 0 ? copy.noResults : copy.noUsers}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <AdminCreateUserDialog
        open={isUserDialogOpen}
        onClose={() => setIsUserDialogOpen(false)}
        roles={accessState.roles}
        onCreated={(user, roleCounts) => {
          setAccessState((current) => {
            const roles = updateRoleCounts(current.roles, roleCounts);
            const users = [user, ...current.users];

            return {
              ...current,
              roles,
              users,
              totalUsers: users.length,
              adminUsers: users.filter((entry) => entry.hasAdminAccess).length,
              editorUsers: users.filter((entry) => entry.hasEditorAccess).length,
            };
          });
          setFeedback(copy.createUserSuccess);
          setError(null);
        }}
      />

      <AdminCreateRoleDialog
        open={isRoleDialogOpen}
        onClose={() => setIsRoleDialogOpen(false)}
        onCreated={(role) => {
          setAccessState((current) => ({
            ...current,
            roles: [...current.roles, role].sort((left, right) => left.key.localeCompare(right.key)),
          }));
          setFeedback(copy.createRoleSuccess);
          setError(null);
        }}
      />
    </>
  );
}
