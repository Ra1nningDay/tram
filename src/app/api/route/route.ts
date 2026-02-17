import { NextResponse } from "next/server";
import shuttleData from "../../../data/shuttle-data.json";

export async function GET() {
    return NextResponse.json({
        server_time: new Date().toISOString(),
        route: shuttleData.routes[0],
    });
}
