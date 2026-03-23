import { getAuth } from "@/lib/auth";
import { userCanAccessAdmin } from "@/lib/auth/roles";
import { getShuttleData, getMapConfig } from "@/lib/data/shuttle-data";
import shuttleData from "@/data/shuttle-data.json";

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
    query: { disableRefresh: true },
  });

  if (!session) {
    return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const canAccessAdmin = await userCanAccessAdmin(session.user.id);
  if (!canAccessAdmin) {
    return Response.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }

  const [data, mapConfig] = await Promise.all([
    getShuttleData(),
    getMapConfig(),
  ]);

  const now = new Date();
  const payload = {
    exportedAt: now.toISOString(),
    shuttleData: {
      routes: data.routes.map((r) => ({
        id: r.id,
        name: r.name,
        directions: r.directions.map((d) => ({
          direction: d.direction,
          geometry: { type: "LineString", coordinates: d.coordinates },
          stops: d.stopReferences,
        })),
      })),
      stops: data.stops.map((s) => ({
        id: s.id,
        name_th: s.nameTh,
        name_en: s.nameEn,
        latitude: s.latitude,
        longitude: s.longitude,
        sequence: s.sequence,
        direction: s.direction,
        icon: s.icon,
        color: s.color,
      })),
      vehicles: shuttleData.vehicles,
    },
    campusConfig: mapConfig,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${createSnapshotFilename(now)}"`,
    },
  });
}
