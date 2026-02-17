import { test, expect } from "@playwright/test";

test("map view loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
});