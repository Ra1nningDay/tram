import type { FastifyInstance } from "fastify";
import { listVehicles } from "../services/vehicle-service.js";

export function registerVehiclesEndpoints(app: FastifyInstance) {
  app.get("/api/vehicles", async () => {
    const serverTime = new Date();
    return {
      server_time: serverTime.toISOString(),
      vehicles: listVehicles(serverTime),
    };
  });
}