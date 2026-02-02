import { test, expect } from "@playwright/test";

test("stop ETA view shows placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=No ETA")).toBeVisible();
});