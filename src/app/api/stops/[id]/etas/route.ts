import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Static ETAs — will be replaced with real calculation later
const MOCK_ETAS: Record<string, Array<{ vehicle_id: string; eta_minutes: number; status: string }>> = {
    "stop-1": [{ vehicle_id: "vehicle-1", eta_minutes: 5, status: "fresh" }],
    "stop-2": [{ vehicle_id: "vehicle-1", eta_minutes: 2, status: "fresh" }],
    "stop-3": [
        { vehicle_id: "vehicle-1", eta_minutes: 1, status: "fresh" },
        { vehicle_id: "vehicle-2", eta_minutes: 8, status: "delayed" },
    ],
    "stop-4": [{ vehicle_id: "vehicle-2", eta_minutes: 1, status: "delayed" }],
    "stop-5": [{ vehicle_id: "vehicle-1", eta_minutes: 6, status: "fresh" }],
};

const VEHICLE_LABELS: Record<string, string> = {
    "vehicle-1": "BUS_1",
    "vehicle-2": "BUS_2",
    "vehicle-3": "BUS_3",
};

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: stopId } = await params;
    const entries = MOCK_ETAS[stopId] ?? [];

    const etas = entries.map((e) => ({
        stop_id: stopId,
        vehicle_id: e.vehicle_id,
        vehicle_label: VEHICLE_LABELS[e.vehicle_id],
        line_name: VEHICLE_LABELS[e.vehicle_id],
        eta_minutes: e.eta_minutes,
        last_updated: new Date().toISOString(),
        status: e.status,
    }));

    return NextResponse.json({
        server_time: new Date().toISOString(),
        stop_id: stopId,
        etas,
    });
}
