import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../src/server";

describe("etas contract", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns etas payload for valid stop", async () => {
    const res = await app.inject({ method: "GET", url: "/api/stops/stop-1/etas" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.server_time).toBeTruthy();
    expect(body.stop_id).toBe("stop-1");
    expect(Array.isArray(body.etas)).toBe(true);
  });
});