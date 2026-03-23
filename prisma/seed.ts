import { config } from "dotenv";
config(); // Load .env before anything else

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type JsonStop = {
  id: string;
  name_th: string;
  name_en?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  direction: string;
  icon?: string;
  color?: string;
};

type JsonDirection = {
  direction: string;
  geometry: { coordinates: [number, number][] };
  stops?: { id: string; sequence: number }[];
};

type JsonRoute = {
  id: string;
  name: string;
  directions: JsonDirection[];
};

type JsonShuttleData = {
  routes: JsonRoute[];
  stops: JsonStop[];
};

type JsonCampusConfig = {
  polygon: [number, number][];
  mapStyle: string;
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  maskOpacity: number;
  maskColor: string;
  initialBearing: number;
};

async function main() {
  console.log("🌱 Seeding shuttle data...");

  const dataDir = join(process.cwd(), "src", "data");
  const shuttleData: JsonShuttleData = JSON.parse(
    readFileSync(join(dataDir, "shuttle-data.json"), "utf8")
  );
  const campusConfig: JsonCampusConfig = JSON.parse(
    readFileSync(join(dataDir, "campus-config.json"), "utf8")
  );

  // ── Seed routes ────────────────────────────────────────────────────
  const existingRoute = await prisma.shuttleRoute.findFirst();
  if (existingRoute) {
    console.log("  Routes already seeded, skipping...");
  } else {
    for (const route of shuttleData.routes) {
      await prisma.shuttleRoute.create({
        data: {
          name: route.name,
          directions: {
            create: route.directions.map((d) => ({
              direction: d.direction,
              coordinates: d.geometry.coordinates,
              stopReferences: d.stops ?? [],
            })),
          },
        },
      });
      console.log(`  ✅ Route: ${route.name}`);
    }
  }

  // ── Seed stops ─────────────────────────────────────────────────────
  const existingStops = await prisma.stop.count();
  if (existingStops > 0) {
    console.log("  Stops already seeded, skipping...");
  } else {
    for (const stop of shuttleData.stops) {
      await prisma.stop.create({
        data: {
          id: stop.id,
          nameTh: stop.name_th,
          nameEn: stop.name_en,
          latitude: stop.latitude,
          longitude: stop.longitude,
          sequence: stop.sequence,
          direction: stop.direction,
          icon: stop.icon,
          color: stop.color,
        },
      });
    }
    console.log(`  ✅ ${shuttleData.stops.length} stops seeded`);
  }

  // ── Seed map config ────────────────────────────────────────────────
  const existingConfig = await prisma.mapConfig.findUnique({
    where: { id: "default" },
  });
  if (existingConfig) {
    console.log("  Map config already seeded, skipping...");
  } else {
    await prisma.mapConfig.create({
      data: {
        id: "default",
        polygon: campusConfig.polygon,
        mapStyle: campusConfig.mapStyle,
        initialZoom: campusConfig.initialZoom,
        minZoom: campusConfig.minZoom,
        maxZoom: campusConfig.maxZoom,
        maskOpacity: campusConfig.maskOpacity,
        maskColor: campusConfig.maskColor,
        initialBearing: campusConfig.initialBearing,
      },
    });
    console.log("  ✅ Map config seeded");
  }

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
