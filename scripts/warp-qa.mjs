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
await page.waitForTimeout(160);
await page.evaluate(() => {
  const row = [...document.querySelectorAll(".map-row")].find((r) => {
    const name = r.querySelector(".map-name")?.textContent ?? "";
    return name.includes("Helion III") && !r.classList.contains("moon");
  });
  const btn = [...(row?.querySelectorAll("button") ?? [])].find((b) => (b.textContent || "") === "arrive");
  btn?.click();
});

let transit = null;
for (let i = 0; i < 28; i++) {
  await page.waitForTimeout(70);
  transit = await page.evaluate(() => window.__starwake?.getJumpDebug?.() ?? {});
  if (transit.mode === "transit" && (transit.transitT ?? 0) > 0.22 && (transit.cruiseAmt ?? 0) > 0.5) break;
}
await page.screenshot({ path: "/workspace/screenshots/warp-transit.png" });
await page.screenshot({ path: "/workspace/screenshots/warp-transit.png" });

for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(180);
  const j = await page.evaluate(() => window.__starwake?.getJumpDebug?.()?.mode);
  if (j === "local" || j === "dropping") break;
}
await page.waitForTimeout(500);

await page.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await page.getByRole("button", { name: "Galaxy", exact: true }).waitFor({ timeout: 8000 });
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((el) => el.textContent === "Galaxy");
  b?.click();
});
await page.waitForTimeout(280);
const lock = await page.evaluate(() => {
  const row = [...document.querySelectorAll(".map-list button.map-row")].find((r) => {
    return !r.classList.contains("here") && !r.classList.contains("oor");
  });
  const name = row?.querySelector("span")?.textContent?.trim() ?? row?.textContent?.trim() ?? "";
  row?.click();
  return name;
});
await page.waitForTimeout(180);
await page.evaluate(() => document.querySelector(".act-btn.jump")?.click());

let fsd = null;
for (let i = 0; i < 36; i++) {
  await page.waitForTimeout(100);
  fsd = await page.evaluate(() => window.__starwake?.getJumpDebug?.() ?? {});
  if (fsd.mode === "hyperspace" && (fsd.hyperT ?? 0) > 0.75 && (fsd.jumpAmt ?? 0) > 0.8) break;
}
await page.screenshot({ path: "/workspace/screenshots/warp-fsd.png" });
await page.waitForTimeout(50);
const tunnel = await page.evaluate(() => {
  const el = document.querySelector(".tunnel");
  const canvas = document.querySelector("canvas");
  return {
    cruise: el?.classList.contains("cruise") ?? false,
    fsd: el?.classList.contains("fsd") ?? false,
    className: el?.className ?? "",
    warp: canvas?.dataset?.warp ?? "",
  };
});

const ok = Boolean(
  transit?.mode === "transit"
  && (transit?.cruiseAmt ?? 0) > 0.2
  && (transit?.warpAmt ?? 0) > 0.08
  && transit?.warpProg
  && fsd?.mode === "hyperspace"
  && (fsd?.jumpAmt ?? 0) > 0.5
  && (fsd?.warpAmt ?? 0) > 0.5
  && fsd?.warpProg
  && (tunnel.warp === "fsd" || tunnel.fsd)
  && errors.length === 0
  && !transit?.err
  && !fsd?.err
);
console.log(JSON.stringify({ ok, lock, transit, fsd, tunnel, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
