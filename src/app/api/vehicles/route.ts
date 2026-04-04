import { NextResponse } from "next/server";

import { getLiveVehicleFeedSnapshot } from "@/lib/vehicles/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getLiveVehicleFeedSnapshot();
  return NextResponse.json(snapshot);
}
