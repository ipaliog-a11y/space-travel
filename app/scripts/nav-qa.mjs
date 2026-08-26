import { chromium } from "playwright";
import { appendFile, mkdir } from "node:fs/promises";

const log = async (m) => { await appendFile("/tmp/nav-qa.log", Date.now() + " " + m + "\n"); console.log(m); };
await mkdir("/workspace/screenshots", { recursive: true });
await log("start");
const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
await log("launched");
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
await log("goto");
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
await log("loaded");
await page.getByRole("button", { name: /Engage|New|Continue/ }).first().waitFor({ timeout: 15000 });
await log("engage visible");
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((el) => /Engage|New|Continue/.test(el.textContent || ""));
  b?.click();
});
await log("engaged");
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await log("map click");
await page.getByRole("button", { name: "System", exact: true }).waitFor({ timeout: 10000 });
await log("system visible");
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((el) => el.textContent === "System");
  b?.click();
});
await page.waitForTimeout(250);
await log("system on");
const split = await page.evaluate(() => {
  const body = document.querySelector(".map-body");
  const view = document.querySelector(".map-view");
  const rail = document.querySelector(".map-rail");
  if (!body || !view || !rail) return null;
  const vr = view.getBoundingClientRect();
  const rr = rail.getBoundingClientRect();
  return {
    cols: getComputedStyle(body).gridTemplateColumns,
    viewRight: Math.round(vr.right),
    railLeft: Math.round(rr.left),
    overlap: vr.right > rr.left + 2,
    listRows: document.querySelectorAll(".map-list .map-row").length,
    zoom: document.querySelector(".zoom-tools")?.textContent ?? "",
    slider: Boolean(document.querySelector(".zoom-rail input[type=range]")),
  };
});
await log("split " + JSON.stringify(split));
await page.screenshot({ path: "/workspace/screenshots/nav-system.png" });
await log("shot system");
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((el) => el.textContent === "Galaxy");
  b?.click();
});
await page.waitForTimeout(400);
await log("galaxy");
const gal = await page.evaluate(() => ({
  stars: document.querySelectorAll(".gal-star").length,
  stems: document.querySelectorAll(".gal-stem").length,
  grids: document.querySelectorAll(".gal-grid").length,
  hud: document.querySelector(".map-hud")?.textContent ?? "",
  list: document.querySelectorAll(".map-list .map-row").length,
}));
await log("gal " + JSON.stringify(gal));
await page.screenshot({ path: "/workspace/screenshots/nav-galaxy.png" });
const farName = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".map-list button.map-row")];
  const last = rows[rows.length - 1];
  const name = last?.innerText.split("\n")[0] ?? "";
  last?.click();
  return name;
});
await log("far " + farName);
await page.waitForTimeout(300);
const plot = await page.evaluate(() => {
  const cap = document.querySelector(".map-caption")?.innerText ?? "";
  const route = document.querySelector(".nav-route")?.innerText ?? "";
  const path = document.querySelector(".gal-route");
  const d = path?.getAttribute("d") ?? "";
  const hops = document.querySelectorAll(".gal-hop").length;
  const jump = document.querySelector(".act-btn.jump")?.textContent ?? "";
  return { cap, route: route.slice(0, 280), pathLen: d.length, hops, jump };
});
await log("plot " + JSON.stringify(plot));
await page.screenshot({ path: "/workspace/screenshots/nav-route.png" });
await log("shot route");
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (e) => errors.push(String(e)));
await mobile.addInitScript(() => {
  try {
    localStorage.setItem("starwake-v2", JSON.stringify({
      state: { version: 2, shipId: "courier", systemId: "helion", visited: { helion: true }, hasSave: true, lastSaveAt: Date.now(), boostCharges: 5 },
      version: 0,
    }));
  } catch {}
});
await mobile.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
await mobile.getByRole("button", { name: /Engage|New|Continue/ }).first().waitFor({ timeout: 15000 });
await mobile.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((el) => /Engage|New|Continue/.test(el.textContent || ""));
  b?.click();
});
await mobile.waitForTimeout(500);
await mobile.evaluate(() => document.querySelector('[aria-label="Map"]')?.click());
await mobile.getByRole("button", { name: "System", exact: true }).waitFor({ timeout: 10000 });
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: "/workspace/screenshots/nav-system-mobile.png" });
await mobile.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((el) => el.textContent === "Galaxy");
  b?.click();
});
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: "/workspace/screenshots/nav-galaxy-mobile.png" });
const ok = Boolean(split && !split.overlap && split.slider && gal.stars >= 40 && plot.pathLen > 20 && plot.hops >= 2);
await log("ok " + ok + " errors " + errors.join(" | "));
console.log(JSON.stringify({ ok, split, gal, farName, plot, errors }, null, 2));
await browser.close();
process.exit(ok && errors.length === 0 ? 0 : 1);
