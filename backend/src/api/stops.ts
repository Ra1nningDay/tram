import type { FastifyInstance } from "fastify";
import { stopsData } from "../services/route-data.js";

export function registerStopsEndpoints(app: FastifyInstance) {
  app.get("/api/stops", async (_req, reply) => {
    reply.header("Cache-Control", "public, max-age=60");
    return {
      server_time: new Date().toISOString(),
      stops: stopsData,
    };
  });
}