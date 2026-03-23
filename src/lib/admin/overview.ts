import { getShuttleData, getMapConfig } from "@/lib/data/shuttle-data";
import { getPrisma } from "@/lib/prisma";
import {
  getActiveDriverCount,
  getLatestVehicleUpdateAt,
  getLiveVehicleFeed,
} from "@/lib/vehicles/live";

type SnapshotFileSummary = {
  label: string;
  updatedAt: Date | null;
  sizeKb: number | null;
};

export type AdminOverviewData = {
  routeCount: number;
  stopCount: number;
  roleCount: number;
  onlineUserCount: number;
  activeSessionCount: number;
  activeDriverCount: number;
  totalVehicleCount: number;
  lastVehicleUpdateAt: Date | null;
  lastUpdatedAt: Date | null;
  snapshotFiles: SnapshotFileSummary[];
  authEnabled: boolean;
  editorProtected: boolean;
  databaseConnected: boolean;
  polygonPointCount: number;
};

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const [shuttleData, mapConfig] = await Promise.all([
    getShuttleData(),
    getMapConfig(),
  ]);
  const liveVehicles = getLiveVehicleFeed();

  // Snapshot files summary (now DB-backed, show as virtual entries)
  const snapshotFiles: SnapshotFileSummary[] = [
    {
      label: "Shuttle data",
      updatedAt: new Date(),
      sizeKb: null,
    },
    {
      label: "Campus config",
      updatedAt: new Date(),
      sizeKb: null,
    },
  ];

  let roleCount = 0;
  let databaseConnected = false;
  let activeSessionCount = 0;
  let onlineUserCount = 0;

  try {
    const prisma = getPrisma();
    const now = new Date();

    const [resolvedRoleCount, activeSessions] = await Promise.all([
      prisma.role.count(),
      prisma.session.findMany({
        where: {
          expiresAt: {
            gt: now,
          },
        },
        select: {
          userId: true,
        },
      }),
    ]);

    roleCount = resolvedRoleCount;
    activeSessionCount = activeSessions.length;
    onlineUserCount = new Set(activeSessions.map((session) => session.userId)).size;
    databaseConnected = true;
  } catch (error) {
    console.error("Failed to load admin overview role count", error);
  }

  return {
    routeCount: shuttleData.routes.length,
    stopCount: shuttleData.stops.length,
    roleCount,
    onlineUserCount,
    activeSessionCount,
    activeDriverCount: getActiveDriverCount(liveVehicles),
    totalVehicleCount: liveVehicles.length,
    lastVehicleUpdateAt: getLatestVehicleUpdateAt(liveVehicles),
    lastUpdatedAt: new Date(),
    snapshotFiles,
    authEnabled: Boolean(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET),
    editorProtected: true,
    databaseConnected,
    polygonPointCount: mapConfig.polygon.length,
  };
}
