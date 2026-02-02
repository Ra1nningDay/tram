import type { FastifyInstance } from "fastify";
import { listEtasForStop } from "../services/eta-service.js";
import { stopsData } from "../services/route-data.js";

export function registerEtaEndpoints(app: FastifyInstance) {
  app.get<{ Params: { stop_id: string } }>("/api/stops/:stop_id/etas", async (req, reply) => {
    const serverTime = new Date();
    const stopExists = stopsData.some((stop) => stop.id === req.params.stop_id);
    if (!stopExists) {
      reply.code(404);
      return { error_code: "STOP_NOT_FOUND", message: "Stop not found" };
    }
    const etas = listEtasForStop(req.params.stop_id, serverTime);
    return {
      server_time: serverTime.toISOString(),
      stop_id: req.params.stop_id,
      etas,
    };
  });
}