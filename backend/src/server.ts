import Fastify from "fastify";
import { env, assertEnv } from "./config/env.js";
import { log } from "./config/logger.js";
import { registerApiRoutes } from "./api/index.js";

export async function buildServer() {
  assertEnv();
  const app = Fastify();

  app.addHook("onRequest", async (request) => {
    log("info", "request", { method: request.method, url: request.url });
  });

  registerApiRoutes(app);
  return app;
}

if (process.env.NODE_ENV !== "test") {
  buildServer()
    .then((app) => app.listen({ port: env.port, host: "0.0.0.0" }))
    .then((address) => log("info", `server started at ${address}`))
    .catch((err) => {
      log("error", "server failed to start", { err: String(err) });
      process.exit(1);
    });
}