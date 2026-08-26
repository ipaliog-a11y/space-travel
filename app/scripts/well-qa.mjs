import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.addInitScript(() => {
  try { localStorage.removeItem("starwake-v2"); } catch {}
});
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Engage|New/ }).click();
await page.waitForTimeout(700);

async function tap(sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el instanceof HTMLElement) el.click();
  }, sel);
}

await tap('[aria-label="Map"]');
await page.waitForTimeout(150);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(120);

const firstName = await page.locator(".map-name").first().innerText();
const nameLocked = await page.locator(".map-name").first().isDisabled();
await page.locator(".map-list .row-acts button").filter({ hasText: "arrive" }).nth(1).click();
await page.waitForTimeout(800);

const atWell = await page.evaluate(() => ({
  well: window.__starwake.getWell?.() ?? null,
  at: window.__starwake.getAtPlanet?.() ?? null,
  hud: document.querySelector(".lock-line")?.innerText ?? "",
  spd: window.__starwake.getSpeed?.(),
}));
await page.screenshot({ path: "/workspace/screenshots/well.png" });

await tap(".act-btn.scan");
await page.waitForTimeout(300);
const dossierHud = await page.locator(".dossier h3").innerText().catch(() => null);
await page.screenshot({ path: "/workspace/screenshots/dossier.png" });
await tap(".dossier .icon-btn");
await page.waitForTimeout(150);

await tap('[aria-label="Map"]');
await page.waitForTimeout(180);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(120);
const nameOpen = await page.locator(".map-name").first().isEnabled();
await page.locator(".map-name").first().click({ force: true });
await page.waitForTimeout(300);
const dossierMap = await page.locator(".dossier h3").innerText().catch(() => null);
await page.screenshot({ path: "/workspace/screenshots/map-dossier.png" });
await tap(".dossier .icon-btn");
await page.waitForTimeout(120);

await page.locator(".map-list .row-acts button").filter({ hasText: "arrive" }).first().click();
await page.waitForTimeout(700);
const free = await page.evaluate(() => ({
  well: window.__starwake.getWell?.() ?? null,
  hud: document.querySelector(".lock-line")?.innerText ?? "",
}));
await page.screenshot({ path: "/workspace/screenshots/free.png" });

await tap('[aria-label="Options"]');
await page.waitForTimeout(180);
await page.getByText("Planet orbit lines").click();
await page.waitForTimeout(500);
const orbitsOn = await page.evaluate(() => {
  const raw = localStorage.getItem("starwake-v2");
  try {
    const j = JSON.parse(raw);
    return Boolean(j?.state?.showOrbits ?? j?.showOrbits);
  } catch {
    return false;
  }
});
await page.screenshot({ path: "/workspace/screenshots/orbits.png" });

const wellOk = typeof atWell.well === "string" && atWell.well.length > 0 && /well/i.test(atWell.hud);
const freeOk = free.well == null && /free/i.test(free.hud);
const dossierOk = Boolean(dossierHud) && Boolean(dossierMap) && nameLocked && nameOpen;
const ok = wellOk && freeOk && dossierOk && orbitsOn && errors.length === 0;
console.log(JSON.stringify({
  ok, wellOk, freeOk, dossierOk, orbitsOn, firstName, nameLocked, nameOpen,
  atWell, dossierHud, dossierMap, free, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
