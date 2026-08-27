import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Engage" }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/flight.png" });

const probe = await page.evaluate(() => {
  const p = window.__controlsTest;
  if (!p) return { ok: false, reason: "no probe" };
  return { ok: true, yaw: p.getYaw(), speed: p.getSpeed() };
});
if (!probe.ok) {
  console.log(JSON.stringify({ ok: false, probe, errors }, null, 2));
  await browser.close();
  process.exit(1);
}

await page.evaluate(() => {
  window.__controlsTest.setSteer(1);
});
await page.waitForTimeout(550);
const afterA = await page.evaluate(() => window.__controlsTest.getYaw());
await page.evaluate(() => window.__controlsTest.setSteer(0));
await page.waitForTimeout(80);
const mid = await page.evaluate(() => window.__controlsTest.getYaw());
await page.evaluate(() => window.__controlsTest.setSteer(-1));
await page.waitForTimeout(550);
const afterD = await page.evaluate(() => window.__controlsTest.getYaw());
await page.evaluate(() => window.__controlsTest.setSteer(0));

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const dA = wrap(afterA - probe.yaw);
const dD = wrap(afterD - mid);
const leftOk = dA > 0.05;
const rightOk = dD < -0.05;

await page.evaluate(() => window.__starwake.setThrottle(0.8));
await page.waitForTimeout(80);
await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Close map" }).click();
await page.waitForTimeout(200);
const thrAfterMap = await page.evaluate(() => window.__starwake.getThrottle());

await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: "/workspace/screenshots/map.png" });
const planetBtn = page.locator(".map-list .row-acts button").filter({ hasText: "arrive" }).nth(1);
await planetBtn.click();
await page.waitForTimeout(400);
const thrAfterPlanet = await page.evaluate(() => window.__starwake.getThrottle());
await page.screenshot({ path: "/workspace/screenshots/arrive.png" });

await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Galaxy" }).click();
await page.waitForTimeout(150);
const firstStar = page.locator(".map-list button.map-row:not(.oor)").first();
const starCount = await page.locator(".map-list button.map-row:not(.oor)").count();
const modes = [];
if (starCount > 0) {
  await firstStar.click();
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => window.__starwake?.getMode?.() ?? "?");
    modes.push(m);
    if (m === "local" && i > 3) break;
  }
}
const after = await page.evaluate(() => ({
  mode: window.__starwake?.getMode?.(),
  throttle: window.__starwake?.getThrottle?.(),
  systemId: window.__starwake?.getSystemId?.(),
  locked: window.__starwake?.getLocked?.(),
  lockText: document.querySelector(".lock-line")?.innerText,
}));
console.log("after", after);
console.log("modes", modes);

const throttleOk = Math.abs(thrAfterMap - 0.8) < 0.02 && thrAfterPlanet < 0.02 && (after.throttle ?? 1) < 0.02;
const jumpOk = modes.includes("hyperspace") && after.mode === "local";

console.log(
  JSON.stringify(
    {
      ok: leftOk && rightOk && throttleOk && jumpOk && errors.length === 0,
      yaw0: probe.yaw,
      afterA,
      dA,
      afterD,
      dD,
      leftOk,
      rightOk,
      thrAfterMap,
      thrAfterPlanet,
      throttleOk,
      jumpOk,
      starCount,
      errors,
    },
    null,
    2,
  ),
);

await browser.close();
process.exit(leftOk && rightOk && throttleOk && jumpOk && errors.length === 0 ? 0 : 1);
