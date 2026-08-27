import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const errors = [];

async function open(viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.removeItem("starwake-v2"); } catch {} });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".ship-card, .ship-rail-card", { timeout: 20000 });
  await page.waitForTimeout(400);
  return page;
}

const page = await open({ width: 1280, height: 800 });
await page.waitForSelector(".ship-card .hull-art", { timeout: 8000 });
const menuArt = await page.locator(".ship-card .hull-art").evaluateAll((imgs) =>
  imgs.map((i) => ({ src: i.getAttribute("src"), w: i.naturalWidth, h: i.naturalHeight })),
);
await page.screenshot({ path: "/workspace/screenshots/menu.png" });
await page.getByRole("button", { name: "Hangar" }).click({ force: true });
await page.waitForSelector(".hull-bay canvas", { timeout: 8000 });
await page.waitForTimeout(800);
const hardpoints = await page.locator(".slot-tabs button").count();
const canvas = await page.locator(".hull-bay canvas").count();
const plate = await page.locator(".hull-plate").evaluate((i) => ({
  src: i.getAttribute("src"),
  w: i.naturalWidth,
  h: i.naturalHeight,
}));
await page.screenshot({ path: "/workspace/screenshots/hangar.png" });

const box = await page.locator(".hull-bay canvas").boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.42);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.22, box.y + box.height * 0.58, { steps: 14 });
  await page.mouse.up();
}
await page.waitForTimeout(350);
await page.screenshot({ path: "/workspace/screenshots/hangar-orbit.png" });
await page.getByRole("button", { name: "Zoom in" }).click();
await page.getByRole("button", { name: "Zoom in" }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/hangar-zoom.png" });
await page.getByRole("tab", { name: "Hauler" }).click({ force: true });
await page.waitForSelector(".hull-bay.hull-hauler", { timeout: 8000 });
await page.waitForTimeout(700);
const hauler = await page.locator(".hull-bay.hull-hauler").count();
const haulerPlate = await page.locator(".hull-plate").evaluate((i) => ({
  src: i.getAttribute("src"),
  w: i.naturalWidth,
  h: i.naturalHeight,
}));
await page.screenshot({ path: "/workspace/screenshots/hangar-hauler.png" });

await page.getByRole("tab", { name: "Scout" }).click({ force: true });
await page.waitForSelector(".hull-bay.hull-scout", { timeout: 8000 });
await page.waitForTimeout(500);
const scout = await page.locator(".hull-bay.hull-scout").count();
const scoutPlate = await page.locator(".hull-plate").evaluate((i) => ({
  src: i.getAttribute("src"),
  w: i.naturalWidth,
  h: i.naturalHeight,
}));
await page.screenshot({ path: "/workspace/screenshots/hangar-scout.png" });

await page.getByRole("tab", { name: "Clipper" }).click({ force: true });
await page.waitForSelector(".hull-bay.hull-clipper", { timeout: 8000 });
await page.waitForTimeout(500);
const clipper = await page.locator(".hull-bay.hull-clipper").count();
const clipperPlate = await page.locator(".hull-plate").evaluate((i) => ({
  src: i.getAttribute("src"),
  w: i.naturalWidth,
  h: i.naturalHeight,
}));
await page.screenshot({ path: "/workspace/screenshots/hangar-clipper.png" });

await page.getByRole("tab", { name: "Tender" }).click({ force: true });
await page.waitForSelector(".hull-bay.hull-tender", { timeout: 8000 });
await page.waitForTimeout(500);
const tender = await page.locator(".hull-bay.hull-tender").count();
const tenderPlate = await page.locator(".hull-plate").evaluate((i) => ({
  src: i.getAttribute("src"),
  w: i.naturalWidth,
  h: i.naturalHeight,
}));
await page.screenshot({ path: "/workspace/screenshots/hangar-tender.png" });

await page.getByRole("tab", { name: "Tug" }).click({ force: true });
await page.waitForSelector(".hull-bay.hull-tug", { timeout: 8000 });
await page.waitForTimeout(500);
const tug = await page.locator(".hull-bay.hull-tug").count();
const tugPlate = await page.locator(".hull-plate").evaluate((i) => ({
  src: i.getAttribute("src"),
  w: i.naturalWidth,
  h: i.naturalHeight,
}));
await page.screenshot({ path: "/workspace/screenshots/hangar-tug.png" });

const mobile = await open({ width: 390, height: 844 });
await mobile.screenshot({ path: "/workspace/screenshots/menu-mobile.png" });
await mobile.getByRole("button", { name: "Hangar" }).click({ force: true });
await mobile.waitForSelector(".hull-bay canvas", { timeout: 8000 });
await mobile.waitForTimeout(700);
await mobile.screenshot({ path: "/workspace/screenshots/hangar-mobile.png" });
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);

const ok =
  menuArt.length === 6 &&
  menuArt.every((a) => a.w > 200) &&
  hardpoints === 6 &&
  canvas === 1 &&
  /courier\.png/.test(plate.src ?? "") &&
  plate.w > 200 &&
  hauler === 1 &&
  /hauler\.png/.test(haulerPlate.src ?? "") &&
  haulerPlate.w > 200 &&
  scout === 1 &&
  /scout\.png/.test(scoutPlate.src ?? "") &&
  scoutPlate.w > 200 &&
  clipper === 1 &&
  /clipper\.png/.test(clipperPlate.src ?? "") &&
  clipperPlate.w > 200 &&
  tender === 1 &&
  /tender\.png/.test(tenderPlate.src ?? "") &&
  tenderPlate.w > 200 &&
  tug === 1 &&
  /tug\.png/.test(tugPlate.src ?? "") &&
  tugPlate.w > 200 &&
  !overflow &&
  errors.length === 0;

console.log(JSON.stringify({ ok, menuArt, hardpoints, canvas, plate, hauler, haulerPlate, scout, scoutPlate, clipper, clipperPlate, tender, tenderPlate, tug, tugPlate, overflow, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
