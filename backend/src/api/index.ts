import type { FastifyInstance } from "fastify";
import { registerRouteEndpoints } from "./route.js";
import { registerStopsEndpoints } from "./stops.js";
import { registerVehiclesEndpoints } from "./vehicles.js";
import { registerEtaEndpoints } from "./etas.js";

export function registerApiRoutes(app: FastifyInstance) {
  registerRouteEndpoints(app);
  registerStopsEndpoints(app);
  registerVehiclesEndpoints(app);
  registerEtaEndpoints(app);
}