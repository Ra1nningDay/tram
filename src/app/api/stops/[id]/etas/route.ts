import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildVehicleEtaSnapshot } from "@/lib/vehicles/eta";
import { getAllVehicleTelemetryStates } from "@/lib/vehicles/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: stopId } = await params;
  const telemetryStates = await getAllVehicleTelemetryStates();
  const { etasByStopId } = await buildVehicleEtaSnapshot(telemetryStates);

  return NextResponse.json({
    server_time: new Date().toISOString(),
    stop_id: stopId,
    etas: etasByStopId[stopId] ?? [],
  });
}
