import { NextResponse } from "next/server";
import { getShuttleData } from "@/lib/data/shuttle-data";

export async function GET() {
  const data = await getShuttleData();

  const stops = data.stops.map((s) => ({
    id: s.id,
    name_th: s.nameTh,
    name_en: s.nameEn,
    latitude: s.latitude,
    longitude: s.longitude,
    sequence: s.sequence,
    direction: s.direction as "outbound" | "inbound",
    icon: s.icon,
    color: s.color,
  }));

  return NextResponse.json({
    server_time: new Date().toISOString(),
    stops,
  });
}
