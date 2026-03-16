import { ADMIN_ROLE_KEY, EDITOR_ROLE_KEY } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/prisma";

type AccessRoleSummary = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  memberCount: number;
};

type AccessUserSummary = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  emailVerified: boolean;
  createdAt: Date;
  roleKeys: string[];
  activeSessionCount: number;
  lastSessionAt: Date | null;
  hasPasswordAccount: boolean;
  hasAdminAccess: boolean;
  hasEditorAccess: boolean;
};

export type AdminAccessData = {
  totalUsers: number;
  adminUsers: number;
  editorUsers: number;
  activeSessions: number;
  databaseConnected: boolean;
  roles: AccessRoleSummary[];
  users: AccessUserSummary[];
};

export async function getAdminAccessData(): Promise<AdminAccessData> {
  try {
    const now = new Date();
    const prisma = getPrisma();

    const [roles, users] = await Promise.all([
      prisma.role.findMany({
        orderBy: [{ key: "asc" }],
        include: {
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          emailVerified: true,
          createdAt: true,
          userRoles: {
            select: {
              role: {
                select: {
                  key: true,
                },
              },
            },
          },
          sessions: {
            where: {
              expiresAt: {
                gt: now,
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            select: {
              updatedAt: true,
            },
          },
          accounts: {
            select: {
              providerId: true,
            },
          },
        },
      }),
    ]);

    const normalizedUsers = users.map((user: typeof users[number]) => {
      const roleKeys = [...new Set(user.userRoles.map((userRole: { role: { key: string } }) => userRole.role.key))].sort();
      const hasAdminAccess = roleKeys.includes(ADMIN_ROLE_KEY);
      const hasEditorAccess = hasAdminAccess || roleKeys.includes(EDITOR_ROLE_KEY);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        roleKeys,
        activeSessionCount: user.sessions.length,
        lastSessionAt: user.sessions[0]?.updatedAt ?? null,
        hasPasswordAccount: user.accounts.some((account: { providerId: string }) => account.providerId === "credential"),
        hasAdminAccess,
        hasEditorAccess,
      };
    });

    return {
      totalUsers: normalizedUsers.length,
      adminUsers: normalizedUsers.filter((user) => user.hasAdminAccess).length,
      editorUsers: normalizedUsers.filter((user) => user.hasEditorAccess).length,
      activeSessions: normalizedUsers.reduce((sum, user) => sum + user.activeSessionCount, 0),
      databaseConnected: true,
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        memberCount: role._count.userRoles,
      })),
      users: normalizedUsers,
    };
  } catch (error) {
    console.error("Failed to load admin access data", error);

    return {
      totalUsers: 0,
      adminUsers: 0,
      editorUsers: 0,
      activeSessions: 0,
      databaseConnected: false,
      roles: [],
      users: [],
    };
  }
}
