import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Engage" }).click();
await page.waitForTimeout(700);

await page.evaluate(() => window.__starwake.setThrottle(0.4));
await page.waitForTimeout(120);
const low = await page.evaluate(() => ({
  armed: window.__starwake.getBoostArmed(),
  disabled: document.querySelector(".boost-col .act-btn")?.disabled,
}));

await page.evaluate(() => window.__starwake.setThrottle(0.7));
await page.waitForTimeout(120);
const high = await page.evaluate(() => ({
  armed: window.__starwake.getBoostArmed(),
  disabled: document.querySelector(".boost-col .act-btn")?.disabled,
}));

await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(150);
await page.locator(".map-list button.map-row").nth(1).click();
await page.waitForTimeout(600);
const focus = await page.evaluate(() => window.__starwake.getFocus());
const dbg = await page.evaluate(() => window.__starwake.getFocusDebug?.());
console.log("debug", dbg);
await page.screenshot({ path: "/workspace/screenshots/focus.png" });

const gateOk = low.armed === false && low.disabled === true;
const armOk = high.armed === true && high.disabled === false;
const focusOk = typeof focus === "string" && focus.length > 0;
const ok = gateOk && armOk && focusOk && errors.length === 0;
console.log(JSON.stringify({ ok, low, high, focus, gateOk, armOk, focusOk, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
