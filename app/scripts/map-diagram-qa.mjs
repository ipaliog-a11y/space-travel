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
  try {
    localStorage.setItem("starwake-v2", JSON.stringify({
      state: {
        version: 2,
        shipId: "courier",
        systemId: "helion",
        scanned: { "helion-0": true },
        visited: { helion: true },
        hasSave: true,
        lastSaveAt: Date.now(),
        boostCharges: 5,
      },
      version: 0,
    }));
  } catch {}
});
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Engage|New/ }).click();
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await page.waitForTimeout(250);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(400);
const orbits = await page.locator(".sys-orbit").count();
const planets = await page.locator(".sys-diagram .sys-body").count();
const periods = await page.locator(".sys-period").count();
const listPeriods = await page.locator(".map-period").count();
const periodText = await page.locator(".map-period").first().innerText();
const eccOnChart = await page.locator(".sys-period tspan").count();
await page.screenshot({ path: "/workspace/screenshots/map-system.png" });
await page.getByRole("button", { name: /^Helion I,/ }).click({ force: true });
await page.waitForTimeout(400);
const nav = await page.evaluate(() => window.__starwake?.getNav?.() ?? window.__starwake?.getScaleDebug?.()?.nav);
const selected = await page.locator(".sys-body.on").count();
const periMark = await page.locator(".sys-peri").count();
const caption = await page.locator(".map-caption").innerText();
await page.screenshot({ path: "/workspace/screenshots/map-system-pick.png" });
await page.getByRole("button", { name: /Helion I dossier/ }).click();
await page.waitForTimeout(300);
const dossierPeriod = await page.locator(".dossier dt", { hasText: /^Period$/ }).count();
const dossierVal = await page.locator(".dossier dt", { hasText: /^Period$/ }).locator("xpath=../dd").innerText().catch(() => "");
const dossierPeri = await page.locator(".dossier dt", { hasText: /^Peri$/ }).locator("xpath=../dd").innerText().catch(() => "");
const dossierApo = await page.locator(".dossier dt", { hasText: /^Apo$/ }).locator("xpath=../dd").innerText().catch(() => "");
await page.screenshot({ path: "/workspace/screenshots/map-dossier-period.png" });
await page.getByRole("button", { name: "Close" }).click().catch(() => {});
await page.getByRole("button", { name: "Galaxy" }).click({ force: true });
await page.waitForTimeout(400);
const galStars = await page.locator(".gal-star").count();
const inset = await page.locator(".map-inset .sys-diagram").count();
const insetPeriods = await page.locator(".map-inset .sys-period").count();
await page.screenshot({ path: "/workspace/screenshots/map-galaxy.png" });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (e) => errors.push(String(e)));
await mobile.addInitScript(() => {
  try { localStorage.removeItem("starwake-v2"); } catch {}
});
await mobile.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await mobile.waitForTimeout(400);
await mobile.getByRole("button", { name: /Engage|New/ }).click();
await mobile.waitForTimeout(600);
await mobile.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: "/workspace/screenshots/map-system-mobile.png" });
const ok =
  orbits >= 3 &&
  planets >= 4 &&
  selected >= 1 &&
  galStars >= 3 &&
  inset === 1 &&
  periods >= 3 &&
  listPeriods >= 3 &&
  insetPeriods === 0 &&
  periMark >= 1 &&
  eccOnChart >= 6 &&
  /e\s/i.test(periodText) &&
  /AU/i.test(caption) &&
  /e\s/i.test(caption) &&
  dossierPeriod >= 1 &&
  /e\s/i.test(dossierVal) &&
  /AU/i.test(dossierPeri) &&
  /AU/i.test(dossierApo) &&
  errors.length === 0;
console.log(JSON.stringify({
  ok, orbits, planets, selected, galStars, inset, periods, listPeriods, insetPeriods,
  periMark, eccOnChart, periodText, caption, dossierPeriod, dossierVal, dossierPeri, dossierApo, nav, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
