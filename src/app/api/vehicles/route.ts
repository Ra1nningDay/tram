import { NextResponse } from "next/server";

import { getLiveVehicleFeed } from "@/lib/vehicles/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const vehicles = getLiveVehicleFeed();
    return NextResponse.json({
        server_time: new Date().toISOString(),
        vehicles,
    });
}
