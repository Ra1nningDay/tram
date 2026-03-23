import { NextResponse } from "next/server";
import { getShuttleData } from "@/lib/data/shuttle-data";

export async function GET() {
  const data = await getShuttleData();
  const route = data.routes[0];

  if (!route) {
    return NextResponse.json({ error: "No route found" }, { status: 404 });
  }

  // Transform to the legacy format expected by consumers
  return NextResponse.json({
    server_time: new Date().toISOString(),
    route: {
      id: route.id,
      name: route.name,
      directions: route.directions.map((d) => ({
        direction: d.direction,
        geometry: {
          type: "LineString",
          coordinates: d.coordinates,
        },
        stops: d.stopReferences,
      })),
    },
  });
}
