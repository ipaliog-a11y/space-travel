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
await page.waitForTimeout(800);

const pick = await page.evaluate(() => {
  const dbg = window.__starwake?.getScaleDebug?.();
  if (!dbg?.planets?.length) return null;
  const ranked = [...dbg.planets].sort((a, b) => b.dist - a.dist);
  const planet = ranked[Math.min(2, ranked.length - 1)] ?? ranked[0];
  window.__starwake.lookAtBody({ kind: "planet", id: planet.id });
  return planet;
});
await page.waitForTimeout(250);

const afterLook = await page.evaluate(() => {
  const d = window.__starwake?.getFocusDebug?.();
  const tag = document.querySelector(".planet-tag");
  const r = tag?.getBoundingClientRect();
  return {
    d,
    tag: tag ? { text: tag.textContent, opacity: getComputedStyle(tag).opacity, left: tag.style.left, top: tag.style.top, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } : null,
  };
});
await page.screenshot({ path: "/workspace/screenshots/look-aim.png" });

const ndc0 = afterLook.d ?? {};
await page.evaluate(() => window.__controlsTest?.setKeys?.(["ArrowUp"]));
await page.waitForTimeout(550);
const afterUp = await page.evaluate(() => window.__starwake?.getFocusDebug?.());
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.waitForTimeout(80);

await page.evaluate(() => window.__controlsTest?.setKeys?.(["ArrowDown"]));
await page.waitForTimeout(550);
const afterDown = await page.evaluate(() => {
  const d = window.__starwake?.getFocusDebug?.();
  const tag = document.querySelector(".planet-tag");
  const r = tag?.getBoundingClientRect();
  return {
    d,
    tag: tag ? { text: tag.textContent, opacity: getComputedStyle(tag).opacity, left: tag.style.left, top: tag.style.top, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } : null,
  };
});
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.screenshot({ path: "/workspace/screenshots/look-pitch.png" });

await page.evaluate(() => window.__controlsTest?.setKeys?.(["ArrowLeft"]));
await page.waitForTimeout(450);
const afterLeft = await page.evaluate(() => window.__starwake?.getFocusDebug?.());
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));

const tagAfter = afterDown.tag;
const ndc1 = afterUp ?? {};
const ndc2 = afterDown.d ?? {};
const ndc3 = afterLeft ?? {};
const centered = Math.hypot(ndc0.ndcX ?? 99, ndc0.ndcY ?? 99) < 0.22;
const visible = ndc0.visible === true && (ndc0.nav || ndc0.name);
const pitchMoves = Math.abs((ndc1.ndcY ?? 0) - (ndc0.ndcY ?? 0)) > 0.06;
const pitchOpposite = Math.abs((ndc2.ndcY ?? 0) - (ndc1.ndcY ?? 0)) > 0.06;
const yawMoves = Math.abs((ndc3.ndcX ?? 0) - (ndc2.ndcX ?? 0)) > 0.05;
const tagOn = tagAfter && Number(tagAfter.opacity) > 0.5;
const expX = ((ndc2.ndcX ?? 0) * 0.5 + 0.5) * 1280;
const expY = ((-(ndc2.ndcY ?? 0)) * 0.5 + 0.5) * 800;
const tagFollows = tagOn && Math.abs(tagAfter.cx - expX) < 90 && Math.abs(tagAfter.cy - (expY - 18)) < 90;
const tagNotGlued = !tagOn || Math.hypot(ndc2.ndcX ?? 0, ndc2.ndcY ?? 0) < 0.08 || Math.hypot(tagAfter.cx - 640, tagAfter.cy - 400) > 36;
const ok = Boolean(pick) && centered && visible && pitchMoves && pitchOpposite && yawMoves && tagFollows && tagNotGlued && errors.length === 0;

console.log(JSON.stringify({
  ok, pick, centered, visible, pitchMoves, pitchOpposite, yawMoves, tagFollows, tagNotGlued,
  afterLook: ndc0, afterUp: ndc1, afterDown: ndc2, afterLeft: ndc3, tagAfter, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
