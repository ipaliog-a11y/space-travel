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
await page.waitForTimeout(800);

await page.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await page.waitForTimeout(200);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(120);

const names = await page.locator(".map-name").allInnerTexts();
await page.getByRole("button", { name: "arrive" }).nth(1).click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/scale-close.png" });

const close = await page.evaluate(() => window.__starwake.getScaleDebug());
const here = close.planets.reduce((a, b) => (a.dist < b.dist ? a : b));
const others = close.planets.filter((p) => p.id !== here.id);
const neighbor = others.reduce((a, b) => (a.dist < b.dist ? a : b), others[0]);

await page.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await page.waitForTimeout(200);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(120);
const lookIdx = names.length > 1 ? 1 : 0;
await page.locator(".row-acts button").filter({ hasText: "look" }).nth(lookIdx + 1).click();
await page.waitForTimeout(350);
const lookA = await page.evaluate(() => window.__starwake.getScaleDebug());
await page.waitForTimeout(450);
const lookB = await page.evaluate(() => window.__starwake.getScaleDebug());
await page.screenshot({ path: "/workspace/screenshots/scale-look.png" });

const ndcA = Math.hypot(lookA.ndcX, lookA.ndcY);
const ndcB = Math.hypot(lookB.ndcX, lookB.ndcY);
const flicker = Math.hypot(lookB.ndcX - lookA.ndcX, lookB.ndcY - lookA.ndcY);
const lookOk = lookA.nav != null && ndcA < 0.12 && ndcB < 0.12 && flicker < 0.08;

await page.evaluate(() => window.__starwake.goToBody({ kind: "star" }));
await page.waitForTimeout(700);
const far = await page.evaluate(() => window.__starwake.getScaleDebug());
await page.screenshot({ path: "/workspace/screenshots/scale-star.png" });

const closeOk = here.ang > 38 && close.well != null;
const neighborOk = !neighbor || neighbor.ang < 2.8;
const ok = closeOk && neighborOk && lookOk && errors.length === 0;
console.log(JSON.stringify({
  ok, closeOk, neighborOk, lookOk,
  here, neighbor,
  well: close.well,
  look: { nav: lookA.nav, ndcA, ndcB, flicker, navHold: lookB.nav },
  farSun: far.starR,
  orbits: close.planets.map((p) => ({ name: p.name, r: +p.r.toFixed(1), orbit: Math.round(p.orbit), ang: +p.ang.toFixed(2) })),
  errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
