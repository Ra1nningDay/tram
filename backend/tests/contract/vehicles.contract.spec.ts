import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../src/server";

describe("vehicles contract", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns vehicles payload with server_time", async () => {
    const res = await app.inject({ method: "GET", url: "/api/vehicles" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.server_time).toBeTruthy();
    expect(Array.isArray(body.vehicles)).toBe(true);
  });
});