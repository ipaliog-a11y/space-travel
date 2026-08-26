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

const stations = await page.evaluate(() => window.__starwake?.getStations?.() ?? []);
const first = stations[0];
if (!first) {
  console.log(JSON.stringify({ ok: false, reason: "no station", errors }));
  await browser.close();
  process.exit(1);
}

await page.evaluate((id) => window.__starwake?.goToBody?.({ kind: "station", id }), first.id);
await page.waitForTimeout(500);
const atPort = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.evaluate(() => window.__starwake?.setThrottle?.(0));
await page.waitForTimeout(700);
const parked = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.screenshot({ path: "/workspace/screenshots/well-dock-port.png" });

await page.evaluate((id) => window.__starwake?.dockAt?.(id), first.id);
await page.waitForTimeout(250);
const berthed = await page.evaluate(() => window.__starwake?.getDock?.());
await page.getByRole("button", { name: "Undock" }).click();
await page.waitForTimeout(450);
const afterUndock = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.screenshot({ path: "/workspace/screenshots/well-dock-undock.png" });

await page.evaluate(() => window.__starwake?.setThrottle?.(0.35));
await page.waitForTimeout(500);
const thrusting = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.screenshot({ path: "/workspace/screenshots/well-dock-thrust.png" });

await page.evaluate(() => window.__starwake?.setThrottle?.(0));
await page.waitForTimeout(900);
const yaw0 = await page.evaluate(() => window.__controlsTest?.getYaw?.() ?? 0);
const look0 = await page.evaluate(() => window.__starwake?.getFlightDebug?.()?.lookYaw ?? 0);
await page.evaluate(() => window.__controlsTest?.setSteer?.(1));
await page.waitForTimeout(450);
const afterTurn = await page.evaluate(() => ({
  yaw: window.__controlsTest?.getYaw?.() ?? 0,
  look: window.__starwake?.getFlightDebug?.()?.lookYaw ?? 0,
}));
await page.evaluate(() => window.__controlsTest?.setSteer?.(null));
await page.evaluate(() => window.__starwake?.setThrottle?.(0.3));
await page.waitForTimeout(400);
const afterTurnThrust = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.screenshot({ path: "/workspace/screenshots/well-dock-turn.png" });

await page.evaluate(() => window.__controlsTest?.setSteer?.(0));
await page.evaluate((id) => window.__starwake?.goToBody?.({ kind: "station", id }), first.id);
await page.waitForTimeout(400);
await page.evaluate(() => window.__starwake?.setThrottle?.(0));
await page.waitForTimeout(200);
const lockedIn = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.evaluate(() => window.__controlsTest?.setSteer?.(1));
await page.waitForTimeout(2400);
const swung = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.evaluate(() => window.__controlsTest?.setSteer?.(0));
await page.evaluate(() => window.__starwake?.setThrottle?.(0.32));
await page.waitForTimeout(400);
const swungThrust = await page.evaluate(() => window.__starwake?.getFlightDebug?.());
await page.screenshot({ path: "/workspace/screenshots/well-dock-swing.png" });

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const swingReleased = !swung?.nav && Math.abs(swung?.lookYaw ?? 9) < 1.2;
const swingFwd = (swungThrust?.alongCam ?? -1) > 0.15;
const parkCalm = (parked?.relSpd ?? 99) < 1.6;
const undockFwd = (afterUndock?.alongFwd ?? -1) > 0.4 && (afterUndock?.alongCam ?? -1) > 0.4;
const undockLook = Math.abs(afterUndock?.lookYaw ?? 9) < 0.35 && !afterUndock?.nav;
const undockWell = typeof afterUndock?.well === "string" && afterUndock.well.length > 0;
const thrustFwd = (thrusting?.alongCam ?? -1) > 0.3;
const turnLeft = wrap(afterTurn.yaw - yaw0) > 0.05;
const lookDidNotFight = Math.abs(afterTurn.look - look0) < 0.45;
const turnThenFwd = (afterTurnThrust?.alongFwd ?? -1) > 0;
const berthedOk = berthed?.mode === "berthed";
const ok =
  parkCalm &&
  undockFwd &&
  undockLook &&
  undockWell &&
  thrustFwd &&
  turnLeft &&
  lookDidNotFight &&
  turnThenFwd &&
  swingReleased &&
  swingFwd &&
  berthedOk &&
  errors.length === 0;

console.log(JSON.stringify({
  ok, parkCalm, undockFwd, undockLook, undockWell, thrustFwd, turnLeft, lookDidNotFight, turnThenFwd,
  swingReleased, swingFwd, berthedOk,
  atPort, parked, afterUndock, thrusting, afterTurn, afterTurnThrust, lockedIn, swung, swungThrust, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
