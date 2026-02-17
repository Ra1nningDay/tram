import { NextResponse } from "next/server";
import shuttleData from "../../../data/shuttle-data.json";

export async function GET() {
    const stops = shuttleData.stops.map((stop) => ({
        ...stop,
        direction: stop.direction as "outbound" | "inbound",
    }));

    return NextResponse.json({
        server_time: new Date().toISOString(),
        stops,
    });
}
