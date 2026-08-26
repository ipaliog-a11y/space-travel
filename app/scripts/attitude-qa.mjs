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
await page.getByRole("button", { name: /Engage|New|Fly/ }).click();
await page.waitForTimeout(700);

const snap = () => page.evaluate(() => window.__starwake?.getFlightDebug?.());
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

await page.evaluate(() => {
  window.__starwake?.setThrottle?.(0.25);
  window.__controlsTest?.setSteer?.(0);
  window.__controlsTest?.setKeys?.([]);
});
await page.waitForTimeout(200);

const yaw0 = await snap();
await page.evaluate(() => window.__controlsTest?.setSteer?.(1));
await page.waitForTimeout(400);
const yaw1 = await snap();
await page.evaluate(() => window.__controlsTest?.setSteer?.(0));
const yawLeftUpright = dot(sub(yaw1.fwd, yaw0.fwd), yaw0.left) > 0.004;

const pitch0 = await snap();
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyW"]));
await page.waitForTimeout(400);
const pitch1 = await snap();
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
const dPitch = sub(pitch1.fwd, pitch0.fwd);
const pitchDotUp = dot(dPitch, pitch0.up);
const pitchDotLeft = dot(dPitch, pitch0.left);
const pitchUpUpright = Math.abs(pitchDotUp) > 0.004 && Math.abs(pitchDotLeft) < Math.abs(pitchDotUp) * 0.4;

const rollA = await snap();
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyQ"]));
await page.waitForTimeout(400);
const rollB = await snap();
await page.waitForTimeout(5200);
const rolled = await snap();
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.waitForTimeout(150);
const rollRate = Math.abs((rollB.roll ?? 0) - (rollA.roll ?? 0));
const inverted = Math.abs(dot(rolled.up, [0, 1, 0])) < 0.55;

const yaw2 = await snap();
await page.evaluate(() => window.__controlsTest?.setSteer?.(1));
await page.waitForTimeout(400);
const yaw3 = await snap();
await page.evaluate(() => window.__controlsTest?.setSteer?.(0));
const yawLeftRolled = dot(sub(yaw3.fwd, yaw2.fwd), yaw2.left) > 0.004;

const pitch2 = await snap();
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyW"]));
await page.waitForTimeout(400);
const pitch3 = await snap();
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
const dPitchR = sub(pitch3.fwd, pitch2.fwd);
const pitchUpRolled = Math.abs(dot(dPitchR, pitch2.up)) > 0.004 && Math.abs(dot(dPitchR, pitch2.left)) < Math.abs(dot(dPitchR, pitch2.up)) * 0.4;

const stations = await page.evaluate(() => window.__starwake?.getStations?.() ?? []);
const first = stations[0];
let dockYawLeft = false;
let dockLook = 99;
if (first) {
  await page.evaluate((id) => window.__starwake?.goToBody?.({ kind: "station", id }), first.id);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__starwake?.requestDock?.());
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyQ"]));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
  const d0 = await snap();
  await page.evaluate(() => window.__controlsTest?.setSteer?.(1));
  await page.waitForTimeout(400);
  const d1 = await snap();
  await page.evaluate(() => window.__controlsTest?.setSteer?.(0));
  dockYawLeft = dot(sub(d1.fwd, d0.fwd), d0.left) > 0.003;
  dockLook = Math.abs(d1.lookYaw ?? 9);
  await page.screenshot({ path: "/workspace/screenshots/attitude-dock.png" });
}

await page.screenshot({ path: "/workspace/screenshots/attitude-rolled.png" });

const rollCalm = rollRate > 0.05 && rollRate < 0.42;
const ok =
  yawLeftUpright &&
  pitchUpUpright &&
  yawLeftRolled &&
  pitchUpRolled &&
  rollCalm &&
  dockYawLeft &&
  dockLook < 0.35 &&
  errors.length === 0;

console.log(JSON.stringify({
  ok, yawLeftUpright, pitchUpUpright, yawLeftRolled, pitchUpRolled, rollCalm, inverted, dockYawLeft, dockLook,
  rollRate, rollA: rollA?.roll, rollB: rollB?.roll, rolled: rolled?.roll,
  pitchDotUp, pitchDotLeft, dPitch, up0: pitch0?.up, fwd0: pitch0?.fwd, fwd1: pitch1?.fwd,
  errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
