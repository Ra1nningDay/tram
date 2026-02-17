import { NextResponse } from "next/server";
import shuttleData from "../../../data/shuttle-data.json";

export async function GET() {
    const vehicles = shuttleData.vehicles.map((v, index) => ({
        ...v,
        direction: v.direction as "outbound" | "inbound",
        last_updated: new Date(Date.now() - index * 120000).toISOString(),
        status: (index === 0 ? "fresh" : index === 1 ? "delayed" : "offline") as
            | "fresh"
            | "delayed"
            | "offline",
    }));

    return NextResponse.json({
        server_time: new Date().toISOString(),
        vehicles,
    });
}
