import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../src/server";

describe("etas integration", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 404 for unknown stop", async () => {
    const res = await app.inject({ method: "GET", url: "/api/stops/unknown/etas" });
    expect(res.statusCode).toBe(404);
  });
});