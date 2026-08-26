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
        scanned: { "helion-0": true, "helion-2": true },
        visited: { helion: true },
        hasSave: true,
        lastSaveAt: Date.now(),
        boostCharges: 5,
      },
      version: 0,
    }));
  } catch {}
});
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.getByRole("button", { name: /Engage|New|Continue/ }).first().waitFor({ timeout: 15000 });
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((el) => /Engage|New|Continue/.test(el.textContent || ""));
  b?.click();
});
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await page.getByRole("button", { name: "System", exact: true }).waitFor({ timeout: 8000 });
await page.waitForTimeout(200);
const start = await page.evaluate(() => window.__starwake?.getScaleDebug?.()?.ship ?? null);
await page.evaluate(() => {
  const row = [...document.querySelectorAll(".map-row")].find((r) => {
    const name = r.querySelector(".map-name")?.textContent ?? "";
    return name.includes("Helion III") && !r.classList.contains("moon");
  });
  const btn = [...(row?.querySelectorAll("button") ?? [])].find((b) => (b.textContent || "") === "arrive");
  btn?.click();
});
await page.waitForTimeout(280);
const mid = await page.evaluate(() => {
  const j = window.__starwake?.getJumpDebug?.() ?? {};
  const s = window.__starwake?.getScaleDebug?.() ?? {};
  return { mode: j.mode, transitT: j.transitT, cruiseAmt: j.cruiseAmt, ship: s.ship, nav: s.nav };
});
await page.screenshot({ path: "/workspace/screenshots/transit-mid.png" });
let end = mid;
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(200);
  end = await page.evaluate(() => {
    const j = window.__starwake?.getJumpDebug?.() ?? {};
    const s = window.__starwake?.getScaleDebug?.() ?? {};
    return { mode: j.mode, transitT: j.transitT, cruiseAmt: j.cruiseAmt, ship: s.ship, nav: s.nav, well: s.well };
  });
  if (end.mode === "local" || end.mode === "dropping") {
    if (end.mode === "dropping") await page.waitForTimeout(200);
    break;
  }
}
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/transit-arrive.png" });
const moved = start && end.ship
  ? Math.hypot(end.ship[0] - start[0], end.ship[1] - start[1], end.ship[2] - start[2])
  : 0;
const ok = mid.mode === "transit" && moved > 80 && (end.mode === "local" || end.mode === "dropping") && errors.length === 0;
console.log(JSON.stringify({ ok, start, mid, end, moved, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
