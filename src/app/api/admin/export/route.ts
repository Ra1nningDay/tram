import { promises as fs } from "node:fs";
import path from "node:path";

import { getAuth } from "@/lib/auth";
import { userCanAccessAdmin } from "@/lib/auth/roles";

export const runtime = "nodejs";

function createSnapshotFilename(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `bu-tram-snapshot-${year}-${month}-${day}.json`;
}

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({
    headers: request.headers,
    query: {
      disableRefresh: true,
    },
  });

  if (!session) {
    return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const canAccessAdmin = await userCanAccessAdmin(session.user.id);

  if (!canAccessAdmin) {
    return Response.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }

  const dataDir = path.join(process.cwd(), "src", "data");
  const [shuttleRaw, campusRaw] = await Promise.all([
    fs.readFile(path.join(dataDir, "shuttle-data.json"), "utf8"),
    fs.readFile(path.join(dataDir, "campus-config.json"), "utf8"),
  ]);

  const now = new Date();
  const payload = {
    exportedAt: now.toISOString(),
    shuttleData: JSON.parse(shuttleRaw),
    campusConfig: JSON.parse(campusRaw),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${createSnapshotFilename(now)}"`,
    },
  });
}
