import { test, expect } from "@playwright/test";

test("hidden vehicle not shown", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Hidden")).toHaveCount(0);
});