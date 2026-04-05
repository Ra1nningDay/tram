import { getPrisma } from "@/lib/prisma";

type ActivityEvent = {
  id: string;
  kind: "snapshot" | "session" | "user" | "role";
  title: string;
  detail: string;
  occurredAt: Date | null;
};

type WritableAsset = {
  label: string;
  scope: string;
  updatedAt: Date | null;
  sizeKb: number | null;
  status: "healthy" | "missing";
};

type RecentSessionRecord = {
  id: string;
  updatedAt: Date;
  user: {
    name: string;
    email: string;
  };
};

type RecentUserRecord = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

type RecentAssignmentRecord = {
  userId: string;
  assignedAt: Date;
  role: {
    key: string;
  };
  user: {
    name: string;
    email: string;
  };
};

export type AdminActivityData = {
  recentActions: ActivityEvent[];
  writableAssets: WritableAsset[];
  authEnabled: boolean;
  editorProtected: boolean;
  jsonBackedStorage: boolean;
  databaseConnected: boolean;
  activeSessionCount: number;
  recentUserCount: number;
};

async function getWritableAssets(): Promise<WritableAsset[]> {
  // Data is now stored in the database, not files
  return [
    {
      label: "Shuttle data",
      scope: "Routes, stops (Postgres)",
      updatedAt: new Date(),
      sizeKb: null,
      status: "healthy" as const,
    },
    {
      label: "Campus config",
      scope: "Service area polygon and map settings (Postgres)",
      updatedAt: new Date(),
      sizeKb: null,
      status: "healthy" as const,
    },
  ];
}

export async function getAdminActivityData(): Promise<AdminActivityData> {
  const writableAssets = await getWritableAssets();
  const events: ActivityEvent[] = writableAssets.map((asset) => ({
    id: `asset-${asset.label}`,
    kind: "snapshot",
    title: `${asset.label} snapshot available`,
    detail:
      asset.status === "healthy"
        ? `${asset.scope}. Current file size ${asset.sizeKb ?? 0} KB.`
        : `${asset.scope}. File is not currently available.`,
    occurredAt: asset.updatedAt,
  }));

  let databaseConnected = false;
  let activeSessionCount = 0;
  let recentUserCount = 0;

  try {
    const prisma = getPrisma();
    const now = new Date();

    const [recentSessions, recentUsers, recentAssignments, totalActiveSessions]: [
      RecentSessionRecord[],
      RecentUserRecord[],
      RecentAssignmentRecord[],
      number,
    ] = await Promise.all([
      prisma.session.findMany({
        where: {
          expiresAt: {
            gt: now,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 4,
        select: {
          id: true,
          updatedAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 4,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.userRole.findMany({
        orderBy: {
          assignedAt: "desc",
        },
        take: 4,
        select: {
          userId: true,
          assignedAt: true,
          role: {
            select: {
              key: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.session.count({
        where: {
          expiresAt: {
            gt: now,
          },
        },
      }),
    ]);

    databaseConnected = true;
    activeSessionCount = totalActiveSessions;
    recentUserCount = recentUsers.length;

    events.push(
      ...recentSessions.map((session: RecentSessionRecord) => ({
        id: `session-${session.id}`,
        kind: "session" as const,
        title: "Session refreshed",
        detail: `${session.user.name || session.user.email} still has active access to protected surfaces.`,
        occurredAt: session.updatedAt,
      }))
    );

    events.push(
      ...recentUsers.map((user: RecentUserRecord) => ({
        id: `user-${user.id}`,
        kind: "user" as const,
        title: "User present in auth table",
        detail: `${user.name} (${user.email}) is available in the Better Auth user store.`,
        occurredAt: user.createdAt,
      }))
    );

    events.push(
      ...recentAssignments.map((assignment: RecentAssignmentRecord, index) => ({
        id: `role-${assignment.userId}-${assignment.role.key}-${index}`,
        kind: "role" as const,
        title: "Role assignment recorded",
        detail: `${assignment.user.name || assignment.user.email} is assigned to ${assignment.role.key}.`,
        occurredAt: assignment.assignedAt,
      }))
    );
  } catch (error) {
    console.error("Failed to load admin activity data", error);
  }

  const recentActions = events
    .sort((left, right) => (right.occurredAt?.getTime() ?? 0) - (left.occurredAt?.getTime() ?? 0))
    .slice(0, 10);

  return {
    recentActions,
    writableAssets,
    authEnabled: Boolean(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET),
    editorProtected: true,
    jsonBackedStorage: false,
    databaseConnected,
    activeSessionCount,
    recentUserCount,
  };
}
