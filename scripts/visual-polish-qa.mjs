import { chromium } from "playwright";
const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.addInitScript(() => { try { localStorage.removeItem("starwake-v2"); } catch {} });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector(".gate.menu", { timeout: 8000 });
await page.screenshot({ path: "/workspace/screenshots/menu-ships.png" });
await page.getByRole("button", { name: "Hangar" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/hangar-courier.png" });
const haulerTab = page.getByRole("button", { name: /Hauler/i }).first();
if (await haulerTab.count()) await haulerTab.click();
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/hangar-hauler.png" });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector(".gate.menu", { timeout: 8000 });
await page.getByRole("button", { name: "Engage" }).click();
await page.waitForTimeout(1000);
const sky = await page.evaluate(() => {
  const s = window.__starwake;
  return {
    err: s?.getJumpDebug?.()?.err ?? null,
    well: s?.getFlightDebug?.()?.well,
    ship: s?.getScaleDebug?.()?.ship,
  };
});
await page.screenshot({ path: "/workspace/screenshots/sky-stars.png" });
await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/map-system.png" });
await page.getByRole("button", { name: "Galaxy" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/map-galaxy.png" });
await page.getByRole("button", { name: "Close map" }).click();
await page.waitForTimeout(200);
const planets = await page.evaluate(() => window.__starwake.getScaleDebug().planets);
const byKind = {};
for (const p of planets) {
  const sys = planets; // placeholder
}
const kinds = await page.evaluate(() => {
  const list = window.__starwake.getScaleDebug().planets;
  return list.map((p) => ({ id: p.id, name: p.name, r: p.r }));
});
const pick = kinds[0];
if (pick) {
  await page.evaluate((id) => window.__starwake.goToBody({ kind: "planet", id }), pick.id);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "/workspace/screenshots/planet-surface.png" });
}
const hud = await page.evaluate(() => {
  const thr = document.querySelector(".throttle");
  const acts = document.querySelector(".flight-actions");
  const tr = thr?.getBoundingClientRect();
  const ar = acts?.getBoundingClientRect();
  const overlap = tr && ar ? !(tr.right < ar.left || tr.left > ar.right || tr.bottom < ar.top || tr.top > ar.bottom) : false;
  const map = document.querySelector(".map-panel");
  return {
    thr: tr ? { x: tr.x, y: tr.y, w: tr.width, h: tr.height } : null,
    acts: ar ? { x: ar.x, y: ar.y, w: ar.width, h: ar.height } : null,
    overlap,
    mapW: map ? map.getBoundingClientRect().width : 0,
  };
});
console.log(JSON.stringify({ ok: errors.length === 0 && !hud.overlap && sky.err == null, sky, hud, errors }, null, 2));
await browser.close();
process.exit(errors.length === 0 && !hud.overlap ? 0 : 1);
