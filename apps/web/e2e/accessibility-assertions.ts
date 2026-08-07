import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

export async function expectZoomEnabled(page: Page): Promise<void> {
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toMatch(/maximum-scale\s*=\s*1/i);
  expect(viewport).not.toMatch(/user-scalable\s*=\s*(?:no|0)/i);
}

export async function expectModalContract(page: Page, dialog: Locator): Promise<void> {
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect.poll(() => page.locator("body").evaluate((body) => body.style.overflow)).toBe("hidden");
  await expect.poll(() => page.locator("[inert]").count()).toBeGreaterThan(0);
  expect(await dialog.evaluate((element) => element.closest("[inert]") === null)).toBe(true);
  await expectModalFocusTrap(page, dialog);
}

export async function expectModalFocusTrap(page: Page, dialog: Locator): Promise<void> {
  const focusable = dialog.locator([
    "a[href]:visible",
    "button:not([disabled]):visible",
    "input:not([disabled]):not([type='hidden']):visible",
    "select:not([disabled]):visible",
    "textarea:not([disabled]):visible",
    "[tabindex]:not([tabindex='-1']):visible"
  ].join(","));
  expect(await focusable.count()).toBeGreaterThan(1);
  const first = focusable.first();
  const last = focusable.last();
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
}

export async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const violations = result.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  const detail = violations.map((violation) =>
    `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  ).join("\n");
  expect(violations, detail).toHaveLength(0);
}
