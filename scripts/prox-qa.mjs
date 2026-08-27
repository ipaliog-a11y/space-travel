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
await page.waitForTimeout(600);

const far = await page.evaluate(() => window.__starwake.getAtPlanet?.() ?? null);

await page.getByRole("button", { name: "Map" }).click();
await page.waitForTimeout(150);
await page.getByRole("button", { name: "System" }).click();
await page.waitForTimeout(120);
await page.locator(".map-list .row-acts button").filter({ hasText: "arrive" }).nth(1).click();
await page.waitForTimeout(700);

const near = await page.evaluate(() => ({
  at: window.__starwake.getAtPlanet?.(),
  focus: window.__starwake.getFocus?.(),
  dbg: window.__starwake.getFocusDebug?.(),
  line: document.querySelector(".lock-line")?.innerText,
}));
await page.screenshot({ path: "/workspace/screenshots/prox.png" });

const farOk = far == null;
const nearOk = typeof near.at === "string" && near.at.length > 0;
const inside = (near.dbg?.dist ?? 99) < (near.dbg?.prox ?? 0) && (near.dbg?.prox ?? 0) > 0;
const ok = farOk && nearOk && inside && errors.length === 0;
console.log(JSON.stringify({ ok, far, near, farOk, nearOk, inside, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
