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
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(500);

const menu = await page.locator(".gate.menu").count();
const menuArt = await page.locator(".ship-card .hull-art").count();
await page.screenshot({ path: "/workspace/screenshots/menu.png" });
await page.getByRole("button", { name: "Hangar" }).click({ force: true });
await page.waitForTimeout(900);

const hangar = await page.locator(".hangar").count();
const hardpoints = await page.locator(".slot-tabs button").count();
const bayCanvas = await page.locator(".hull-bay canvas").count();
const courierBay = await page.locator(".hull-bay.hull-courier").count();
const plateSrc = await page.locator(".hull-plate").getAttribute("src");
const stockJump = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const stockHold = await page.locator(".spec-list div").filter({ hasText: "Hold" }).locator(".spec-val").innerText();
const stockHeat = await page.locator(".spec-list div").filter({ hasText: "Heat" }).locator(".spec-val").innerText();
const stockTank = await page.locator(".spec-list div").filter({ hasText: "Tank" }).locator(".spec-val").innerText();
await page.screenshot({ path: "/workspace/screenshots/hangar.png" });

const box = await page.locator(".hull-bay canvas").boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(250);
}
await page.screenshot({ path: "/workspace/screenshots/hangar-orbit.png" });
await page.getByRole("button", { name: "Zoom in" }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/hangar-zoom.png" });

await page.locator(".slot-tabs").getByRole("button", { name: "Tank" }).click();
await page.waitForTimeout(120);
await page.getByRole("button", { name: /Long Cell/ }).click();
await page.waitForTimeout(150);
const longTank = await page.locator(".spec-list div").filter({ hasText: "Tank" }).locator(".spec-val").innerText();

await page.locator(".hull-bay .hardpoint").nth(0).click({ force: true }).catch(() => {});
await page.locator(".slot-tabs").getByRole("button", { name: "HX" }).click();
await page.waitForTimeout(120);
await page.getByRole("button", { name: /Cold Sink/ }).click();
await page.waitForTimeout(180);
const coldHeat = await page.locator(".spec-list div").filter({ hasText: "Heat" }).locator(".spec-val").innerText();
const coldCool = await page.locator(".spec-list div").filter({ hasText: "Cool" }).locator(".spec-val").innerText();

await page.locator(".slot-tabs").getByRole("button", { name: "FSD" }).click();
await page.waitForTimeout(150);
await page.getByRole("button", { name: /Farleg/ }).click();
await page.waitForTimeout(200);
const farJump = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const farOn = await page.locator(".mod-card.on").innerText();
await page.screenshot({ path: "/workspace/screenshots/hangar-farleg.png" });

await page.getByRole("tab", { name: "Hauler" }).click({ force: true });
await page.waitForTimeout(800);
const haulerJump = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const haulerHold = await page.locator(".spec-list div").filter({ hasText: "Hold" }).locator(".spec-val").innerText();
const haulerShip = await page.locator(".hull-bay.hull-hauler").count();
const haulerPlate = await page.locator(".hull-plate").getAttribute("src");
await page.locator(".slot-tabs").getByRole("button", { name: "Hold" }).click();
await page.waitForTimeout(120);
await page.getByRole("button", { name: /Deep Hold/ }).click();
await page.waitForTimeout(180);
const deepHold = await page.locator(".spec-list div").filter({ hasText: "Hold" }).locator(".spec-val").innerText();
await page.screenshot({ path: "/workspace/screenshots/hangar-hauler.png" });

await page.getByRole("tab", { name: "Scout" }).click({ force: true });
await page.waitForTimeout(700);
const scoutJump = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const scoutHold = await page.locator(".spec-list div").filter({ hasText: "Hold" }).locator(".spec-val").innerText();
const scoutShip = await page.locator(".hull-bay.hull-scout").count();
const scoutPlate = await page.locator(".hull-plate").getAttribute("src");
const scoutRole = await page.locator(".hull-dossier-kicker").innerText();
await page.screenshot({ path: "/workspace/screenshots/hangar-scout.png" });

await page.getByRole("tab", { name: "Clipper" }).click({ force: true });
await page.waitForTimeout(700);
const clipperJump = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const clipperCruise = await page.locator(".spec-list div").filter({ hasText: "Cruise" }).locator(".spec-val").innerText();
const clipperShip = await page.locator(".hull-bay.hull-clipper").count();
const clipperPlate = await page.locator(".hull-plate").getAttribute("src");
await page.screenshot({ path: "/workspace/screenshots/hangar-clipper.png" });

await page.getByRole("tab", { name: "Tender" }).click({ force: true });
await page.waitForTimeout(700);
const tenderJump = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const tenderTank = await page.locator(".spec-list div").filter({ hasText: "Tank" }).locator(".spec-val").innerText();
const tenderShip = await page.locator(".hull-bay.hull-tender").count();
const tenderPlate = await page.locator(".hull-plate").getAttribute("src");
const tenderRole = await page.locator(".hull-dossier-kicker").innerText();
await page.screenshot({ path: "/workspace/screenshots/hangar-tender.png" });

await page.getByRole("tab", { name: "Tug" }).click({ force: true });
await page.waitForTimeout(700);
const tugJump = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const tugTurn = await page.locator(".spec-list div").filter({ hasText: "Turn" }).locator(".spec-val").innerText();
const tugShip = await page.locator(".hull-bay.hull-tug").count();
const tugPlate = await page.locator(".hull-plate").getAttribute("src");
await page.screenshot({ path: "/workspace/screenshots/hangar-tug.png" });

await page.getByRole("tab", { name: "Courier" }).click({ force: true });
await page.waitForTimeout(150);
const courierBack = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
await page.getByRole("button", { name: "Accept" }).first().click();
await page.waitForTimeout(150);
const accepted = await page.locator(".job-card.on").count();

await page.getByRole("button", { name: "Fly" }).click();
await page.waitForTimeout(500);
const fitted = await page.evaluate(() => window.__starwake?.getFitted?.());
const fuel0 = await page.evaluate(() => window.__starwake?.getFuel?.());
await page.evaluate(() => window.__starwake?.setFuel?.(0));
await page.waitForTimeout(120);
const fuelDry = await page.evaluate(() => window.__starwake?.getFuel?.());
await page.evaluate(() => window.__starwake?.refuel?.());
await page.waitForTimeout(120);
const fuelFull = await page.evaluate(() => window.__starwake?.getFuel?.());
const manifest = await page.evaluate(() => window.__starwake?.getManifest?.());
const chip = await page.locator(".job-chip").count();

let delivered = false;
let loaded = false;
let bay = 0;
if (manifest?.from) {
  await Promise.race([
    page.evaluate((id) => window.__starwake?.dockAt?.(id), manifest.from),
    page.waitForTimeout(2500),
  ]);
  await page.waitForTimeout(300);
  bay = await page.locator(".station-bay").count();
  loaded = await page.evaluate(() => window.__starwake?.loadCargo?.());
  await page.waitForTimeout(200);
  if (loaded && manifest.to && manifest.fromSys === manifest.toSys) {
    await Promise.race([
      page.evaluate((id) => window.__starwake?.dockAt?.(id), manifest.to),
      page.waitForTimeout(2500),
    ]);
    await page.waitForTimeout(300);
    delivered = await page.evaluate(() => window.__starwake?.deliverCargo?.());
  }
}

await page.evaluate(() => window.__starwake?.undock?.());
await page.waitForTimeout(250);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
const backMenu = await page.locator(".gate.menu").count();
await page.getByRole("button", { name: "Hangar" }).click({ force: true });
await page.waitForTimeout(250);
const stillFar = await page.locator(".spec-list div").filter({ hasText: "Jump" }).locator(".spec-val").innerText();
const stillHeat = await page.locator(".spec-list div").filter({ hasText: "Heat" }).locator(".spec-val").innerText();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (e) => errors.push(String(e)));
await mobile.addInitScript(() => { try { localStorage.removeItem("starwake-v2"); } catch {} });
await mobile.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await mobile.waitForTimeout(400);
await mobile.getByRole("button", { name: "Hangar" }).click({ force: true });
await mobile.waitForTimeout(700);
await mobile.screenshot({ path: "/workspace/screenshots/hangar-mobile.png" });
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);

const ok =
  menu === 1 &&
  menuArt === 6 &&
  hangar === 1 &&
  hardpoints === 6 &&
  bayCanvas === 1 &&
  courierBay === 1 &&
  /courier\.png/.test(plateSrc ?? "") &&
  /hauler\.png/.test(haulerPlate ?? "") &&
  /12/.test(stockJump) &&
  /8/.test(stockHold) &&
  /10/.test(stockHeat) &&
  /100/.test(stockTank) &&
  /140/.test(longTank) &&
  /14/.test(coldHeat) &&
  /6/.test(coldCool) &&
  /16/.test(farJump) &&
  /Farleg/i.test(farOn) &&
  /18/.test(haulerJump) &&
  /48/.test(haulerHold) &&
  /72/.test(deepHold) &&
  haulerShip === 1 &&
  scoutShip === 1 &&
  clipperShip === 1 &&
  /22/.test(scoutJump) &&
  /6/.test(scoutHold) &&
  /Pathfinder/i.test(scoutRole) &&
  /scout\.png/.test(scoutPlate ?? "") &&
  /9/.test(clipperJump) &&
  /7\.8/.test(clipperCruise) &&
  /clipper\.png/.test(clipperPlate ?? "") &&
  tenderShip === 1 &&
  tugShip === 1 &&
  /14/.test(tenderJump) &&
  /200/.test(tenderTank) &&
  /Fuel/i.test(tenderRole) &&
  /tender\.png/.test(tenderPlate ?? "") &&
  /8/.test(tugJump) &&
  /1\.58/.test(tugTurn) &&
  /tug\.png/.test(tugPlate ?? "") &&
  /16/.test(courierBack) &&
  accepted === 1 &&
  fitted?.jumpRangeLy === 16 &&
  fitted?.cargoCap === 8 &&
  fitted?.overdriveSec === 14 &&
  fitted?.coolSec === 6 &&
  fitted?.fuelCap === 140 &&
  (fuel0?.fuel ?? 0) > 90 &&
  (fuelDry?.fuel ?? 1) <= 0.2 &&
  (fuelFull?.fuel ?? 0) >= 139 &&
  Boolean(manifest) &&
  chip === 1 &&
  bay === 1 &&
  loaded === true &&
  delivered === true &&
  backMenu === 1 &&
  /16/.test(stillFar) &&
  /14/.test(stillHeat) &&
  !mobileOverflow &&
  errors.length === 0;

console.log(JSON.stringify({
  ok, menu, menuArt, hangar, hardpoints, bayCanvas, courierBay, plateSrc, haulerPlate, stockJump, stockHold, stockHeat, stockTank, longTank, coldHeat, coldCool,
  farJump, farOn, haulerJump, haulerHold, deepHold, haulerShip, scoutJump, scoutHold, scoutShip, scoutPlate, scoutRole, clipperJump, clipperCruise, clipperShip, clipperPlate, tenderJump, tenderTank, tenderShip, tenderPlate, tenderRole, tugJump, tugTurn, tugShip, tugPlate, courierBack, accepted,
  fitted, fuel0, fuelDry, fuelFull, manifest, chip, bay, loaded, delivered, backMenu, stillFar, stillHeat, mobileOverflow, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
