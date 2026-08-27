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
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Engage|New|Fly/ }).click();
await page.waitForTimeout(900);

const want = ["wheel", "cylinder", "sphere", "truss", "yard"];
const shots = [];
for (const kind of want) {
  const found = await page.evaluate((k) => window.__starwake?.findStationKind?.(k), kind);
  if (!found) {
    shots.push({ kind, missing: true });
    continue;
  }
  await page.evaluate((sys) => window.__starwake?.arriveAt?.(sys), found.systemId);
  await page.waitForTimeout(350);
  await page.evaluate((id) => window.__starwake?.goToBody?.({ kind: "station", id }), found.id);
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__starwake?.setThrottle?.(0));
  await page.waitForTimeout(450);
  const path = `/workspace/screenshots/station-${kind}.png`;
  await page.screenshot({ path });
  shots.push({ ...found, path });
}

await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/station-map-kinds.png" });

const kinds = shots.filter((s) => !s.missing).map((s) => s.kind);
const ok = errors.length === 0 && kinds.length === 5;
console.log(JSON.stringify({ ok, kinds, shots, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
