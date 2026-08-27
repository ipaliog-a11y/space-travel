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
await page.getByRole("button", { name: /Engage|New/ }).click();
await page.waitForTimeout(700);

await page.evaluate(() => {
  window.__starwake?.setThrottle?.(0.4);
  window.__controlsTest?.setKeys?.([]);
});
await page.waitForTimeout(120);

const yaw0 = await page.evaluate(() => window.__controlsTest?.getYaw?.() ?? 0);
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyA"]));
await page.waitForTimeout(500);
const afterA = await page.evaluate(() => ({
  thr: window.__controlsTest?.getThrottle?.() ?? window.__starwake?.getThrottle?.(),
  yaw: window.__controlsTest?.getYaw?.() ?? 0,
}));
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.waitForTimeout(80);

await page.evaluate(() => window.__starwake?.setThrottle?.(0.7));
await page.waitForTimeout(80);
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyZ"]));
await page.waitForTimeout(500);
const afterZ = await page.evaluate(() => window.__controlsTest?.getThrottle?.() ?? window.__starwake?.getThrottle?.());
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));

const roll0 = await page.evaluate(() => window.__controlsTest?.getRoll?.() ?? 0);
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyQ"]));
await page.waitForTimeout(700);
const afterQ = await page.evaluate(() => window.__controlsTest?.getRoll?.() ?? 0);
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyE"]));
await page.waitForTimeout(900);
const afterE = await page.evaluate(() => window.__controlsTest?.getRoll?.() ?? 0);
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));

await page.evaluate(() => {
  window.__starwake?.setThrottle?.(0.7);
  window.__starwake?.setBoost?.(true);
});
await page.waitForTimeout(200);
await page.evaluate(() => window.__starwake?.setBoost?.(false));
const spent = await page.evaluate(() => window.__starwake?.getBoostCharges?.());
await page.keyboard.press("KeyR");
await page.waitForTimeout(150);
const refilled = await page.evaluate(() => window.__starwake?.getBoostCharges?.());

await page.screenshot({ path: "/workspace/screenshots/keys-flight.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
const menu = await page.evaluate(() => ({
  entered: window.__starwake?.getEntered?.(),
  gate: Boolean(document.querySelector(".gate")),
}));
await page.screenshot({ path: "/workspace/screenshots/keys-menu.png" });

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const thrUp = afterA.thr > 0.55;
const noYawFromA = Math.abs(wrap(afterA.yaw - yaw0)) < 0.08;
const thrDown = afterZ < 0.55;
const qLeft = wrap(afterQ - roll0) > 0.05;
const eRight = wrap(afterE - afterQ) < -0.05;
const refillOk = spent === 4 && refilled === 5;
const escOk = menu.entered === false && menu.gate === true;
const ok = thrUp && noYawFromA && thrDown && qLeft && eRight && refillOk && escOk && errors.length === 0;

console.log(JSON.stringify({
  ok, thrUp, noYawFromA, thrDown, qLeft, eRight, refillOk, escOk,
  afterA, afterZ, roll0, afterQ, afterE, spent, refilled, menu, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
