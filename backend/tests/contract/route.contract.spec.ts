import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../src/server";

describe("route contract", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns route payload with server_time", async () => {
    const res = await app.inject({ method: "GET", url: "/api/route" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.server_time).toBeTruthy();
    expect(body.route).toBeTruthy();
  });
});