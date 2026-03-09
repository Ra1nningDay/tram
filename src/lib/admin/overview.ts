import { promises as fs } from "node:fs";
import path from "node:path";

import campusConfig from "@/data/campus-config.json";
import shuttleData from "@/data/shuttle-data.json";
import { getPrisma } from "@/lib/prisma";

type SnapshotFileSummary = {
  label: string;
  updatedAt: Date | null;
  sizeKb: number | null;
};

export type AdminOverviewData = {
  routeCount: number;
  stopCount: number;
  roleCount: number;
  lastUpdatedAt: Date | null;
  snapshotFiles: SnapshotFileSummary[];
  authEnabled: boolean;
  editorProtected: boolean;
  databaseConnected: boolean;
  polygonPointCount: number;
};

function formatKilobytes(bytes: number) {
  return Math.max(1, Math.round(bytes / 1024));
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const dataDir = path.join(process.cwd(), "src", "data");
  const shuttlePath = path.join(dataDir, "shuttle-data.json");
  const campusPath = path.join(dataDir, "campus-config.json");

  const snapshotFiles = await Promise.all(
    [
      { label: "Shuttle data", filePath: shuttlePath },
      { label: "Campus config", filePath: campusPath },
    ].map(async ({ label, filePath }) => {
      try {
        const stats = await fs.stat(filePath);

        return {
          label,
          updatedAt: stats.mtime,
          sizeKb: formatKilobytes(stats.size),
        };
      } catch {
        return {
          label,
          updatedAt: null,
          sizeKb: null,
        };
      }
    })
  );

  const lastUpdatedAt = snapshotFiles.reduce<Date | null>((latest, file) => {
    if (!file.updatedAt) {
      return latest;
    }

    if (!latest || file.updatedAt > latest) {
      return file.updatedAt;
    }

    return latest;
  }, null);

  let roleCount = 0;
  let databaseConnected = false;

  try {
    roleCount = await getPrisma().role.count();
    databaseConnected = true;
  } catch (error) {
    console.error("Failed to load admin overview role count", error);
  }

  return {
    routeCount: shuttleData.routes.length,
    stopCount: shuttleData.stops.length,
    roleCount,
    lastUpdatedAt,
    snapshotFiles,
    authEnabled: Boolean(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET),
    editorProtected: true,
    databaseConnected,
    polygonPointCount: campusConfig.polygon.length,
  };
}
