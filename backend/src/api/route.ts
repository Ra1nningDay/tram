import type { FastifyInstance } from "fastify";
import { routeData } from "../services/route-data.js";

export function registerRouteEndpoints(app: FastifyInstance) {
  app.get("/api/route", async (_req, reply) => {
    reply.header("Cache-Control", "public, max-age=60");
    return {
      server_time: new Date().toISOString(),
      route: routeData,
    };
  });
}