import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const url = process.argv[2] ?? "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(() => { try { localStorage.removeItem("starwake-v2"); } catch {} });
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Engage|New/ }).click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(150);
const rows = page.locator(".map-list .row-acts button");
await page.locator(".map-list .row-acts").nth(1).getByRole("button", { name: "look" }).click();
await page.waitForTimeout(200);
await page.locator(".map-head .icon-btn").click();
await page.waitForTimeout(400);
const after = await page.evaluate(() => {
  const d = window.__starwake.getFocusDebug();
  const tag = document.querySelector(".planet-tag");
  const r = tag?.getBoundingClientRect();
  return {
    d,
    mapOpen: Boolean(document.querySelector(".map-panel")),
    tag: tag ? { text: tag.textContent, op: getComputedStyle(tag).opacity, left: tag.style.left, top: tag.style.top, cx: r.left+r.width/2, cy: r.top+r.height/2 } : null,
  };
});
await page.screenshot({ path: "/workspace/screenshots/look-map.png" });
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(500);
await page.keyboard.up("ArrowUp");
await page.waitForTimeout(80);
const afterUp = await page.evaluate(() => {
  const d = window.__starwake.getFocusDebug();
  const tag = document.querySelector(".planet-tag");
  const r = tag?.getBoundingClientRect();
  return { d, tag: tag ? { text: tag.textContent, op: getComputedStyle(tag).opacity, left: tag.style.left, top: tag.style.top, cx: r.left+r.width/2, cy: r.top+r.height/2 } : null };
});
await page.screenshot({ path: "/workspace/screenshots/look-map-up.png" });
const centered = Math.hypot(after.d?.ndcX ?? 99, after.d?.ndcY ?? 99) < 0.25;
const pitchMoves = Math.abs((afterUp.d?.ndcY ?? 0) - (after.d?.ndcY ?? 0)) > 0.06;
const tagMoved = after.tag && afterUp.tag && (Math.abs(afterUp.tag.cy - after.tag.cy) > 20 || Math.abs(afterUp.tag.cx - after.tag.cx) > 20);
const ok = !after.mapOpen && centered && pitchMoves && after.tag && Number(after.tag.op) > 0.5 && tagMoved && errors.length === 0;
console.log(JSON.stringify({ ok, centered, pitchMoves, tagMoved, after, afterUp, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
