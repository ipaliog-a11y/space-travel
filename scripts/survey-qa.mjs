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
const emptyLog = await page.locator(".survey-empty").count();
await page.getByRole("button", { name: "Fly" }).click();
await page.waitForTimeout(700);

const wild = await page.evaluate(() => window.__starwake?.getWild?.() ?? []);
const first = wild[0];
let scanned = false;
let surveyed = false;
let prospect = "";
let hangarLogged = 0;
let dossierText = "";
let mapLabel = "";

if (first) {
  await page.evaluate((id) => window.__starwake?.goToBody?.({ kind: "planet", id }), first.id);
  await page.waitForTimeout(500);
  await page.evaluate((id) => window.__starwake?.scanPlanet?.(id), first.id);
  scanned = true;
  const scanBtn = page.getByRole("button", { name: "Dossier" });
  if (await scanBtn.count()) await scanBtn.click();
  else await page.getByRole("button", { name: "Scan" }).click();
  await page.waitForTimeout(250);
  dossierText = await page.locator(".dossier").innerText().catch(() => "");
  await page.screenshot({ path: "/workspace/screenshots/survey-scan.png" });
  await page.locator(".dossier .icon-btn").click().catch(() => {});
  await page.waitForTimeout(150);

  await page.evaluate(() => window.__starwake?.requestSurvey?.());
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/screenshots/survey-progress.png" });
  for (let i = 0; i < 24; i++) {
    const t = await page.evaluate(() => window.__starwake?.getSurvey?.()?.t ?? 0);
    if (t >= 1) break;
    await page.waitForTimeout(250);
  }
  surveyed = await page.evaluate((id) => window.__starwake?.getSurvey?.()?.logged || window.__starwake?.completeSurvey?.() || false, first.id);
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Dossier" }).click();
  await page.waitForTimeout(200);
  dossierText = await page.locator(".dossier").innerText();
  prospect = dossierText;
  await page.screenshot({ path: "/workspace/screenshots/survey-logged.png" });
  await page.locator(".dossier .icon-btn").click();
  await page.waitForTimeout(150);
}

await page.keyboard.press("Escape");
await page.waitForTimeout(250);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Hangar" }).click();
await page.waitForTimeout(250);
hangarLogged = await page.locator(".survey-list li").count();
await page.screenshot({ path: "/workspace/screenshots/survey-hangar.png" });
await page.getByRole("button", { name: "Fly" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(250);
mapLabel = await page.locator(".map-port").last().innerText();
await page.screenshot({ path: "/workspace/screenshots/survey-map.png" });

const ok =
  emptyLog === 1 &&
  wild.length >= 1 &&
  scanned &&
  surveyed &&
  /Mining|Research/i.test(prospect) &&
  hangarLogged >= 1 &&
  /logged/i.test(mapLabel) &&
  errors.length === 0;

console.log(JSON.stringify({
  ok, emptyLog, wild, scanned, surveyed, hangarLogged, mapLabel,
  dossier: prospect.slice(0, 280), errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
