import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.addInitScript(() => { try { localStorage.removeItem("starwake-v2"); } catch {} });
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(400);

await page.getByRole("button", { name: "Hangar" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Accept" }).first().click();
await page.getByRole("button", { name: "Fly" }).click();
await page.waitForTimeout(600);

const stations = await page.evaluate(() => window.__starwake?.getStations?.() ?? []);
const wild = await page.evaluate(() => window.__starwake?.getWild?.() ?? []);
const first = stations[0];

let dockHud = 0;
let threaded = false;
if (first) {
  await page.evaluate((id) => window.__starwake?.goToBody?.({ kind: "station", id }), first.id);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/screenshots/station-approach.png" });
  await page.evaluate(() => window.__starwake?.requestDock?.());
  await page.waitForTimeout(250);
  dockHud = await page.locator(".dock-hud").count();
  await page.screenshot({ path: "/workspace/screenshots/dock-hud.png" });
  await page.evaluate(() => window.__starwake?.setThrottle?.(0.22));
  for (let i = 0; i < 40 && !threaded; i++) {
    await page.waitForTimeout(250);
    const d = await page.evaluate(() => window.__starwake?.getDock?.());
    if (d?.mode === "berthed") threaded = true;
  }
}

if (!threaded && first) {
  await page.evaluate((id) => window.__starwake?.dockAt?.(id), first.id);
  await page.waitForTimeout(400);
}

const dock = await page.evaluate(() => window.__starwake?.getDock?.());
const bay = await page.locator(".station-bay").count();
await page.screenshot({ path: "/workspace/screenshots/station-bay.png" });

const fuelBefore = await page.evaluate(() => window.__starwake?.getFuel?.());
await page.evaluate(() => window.__starwake?.setFuel?.(12));
await page.waitForTimeout(80);
await page.getByRole("button", { name: "Refuel" }).click();
await page.waitForTimeout(150);
const fuelAfter = await page.evaluate(() => window.__starwake?.getFuel?.());

const loaded = await page.evaluate(() => window.__starwake?.loadCargo?.());
await page.waitForTimeout(150);
const man = await page.evaluate(() => window.__starwake?.getManifest?.());

await page.getByRole("button", { name: "Undock" }).click();
await page.waitForTimeout(350);
const afterUndock = await page.evaluate(() => window.__starwake?.getDock?.());
await page.screenshot({ path: "/workspace/screenshots/undock.png" });

const ok =
  stations.length >= 2 &&
  wild.length >= 1 &&
  dockHud === 1 &&
  dock?.mode === "berthed" &&
  bay === 1 &&
  (fuelBefore?.cap ?? 0) >= 90 &&
  (fuelAfter?.fuel ?? 0) >= (fuelAfter?.cap ?? 1) - 1 &&
  loaded === true &&
  man?.loaded === true &&
  afterUndock?.mode === "local" &&
  errors.length === 0;

console.log(JSON.stringify({
  ok, stations: stations.map((s) => s.name), wild: wild.map((w) => w.name),
  dockHud, threaded, dock, bay, fuelBefore, fuelAfter, loaded, man, afterUndock, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
