import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Engage" }).click();
await page.waitForTimeout(700);

await page.evaluate(() => window.__starwake.setThrottle(0.5));
await page.waitForTimeout(250);
const cruise = await page.evaluate(() => ({
  speed: window.__starwake.getSpeed(),
  throttle: window.__starwake.getThrottle(),
  heat: window.__starwake.getHeat(),
  boosts: window.__starwake.getBoostCharges(),
}));

await page.evaluate(() => window.__starwake.setThrottle(1));
await page.waitForTimeout(300);
const od = await page.evaluate(() => ({
  speed: window.__starwake.getSpeed(),
  throttle: window.__starwake.getThrottle(),
}));

let hot = { speed: 0, throttle: 1, heat: 0 };
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(400);
  hot = await page.evaluate(() => ({
    speed: window.__starwake.getSpeed(),
    throttle: window.__starwake.getThrottle(),
    heat: window.__starwake.getHeat(),
  }));
  if (hot.throttle <= 0.76) break;
}

await page.evaluate(() => window.__starwake.setThrottle(0.4));
await page.waitForTimeout(80);
const beforeBoost = await page.evaluate(() => window.__starwake.getBoostCharges());
await page.evaluate(() => window.__starwake.setBoost(true));
await page.waitForTimeout(250);
const boosting = await page.evaluate(() => ({
  speed: window.__starwake.getSpeed(),
  boosts: window.__starwake.getBoostCharges(),
}));
await page.evaluate(() => window.__starwake.setBoost(false));
await page.waitForTimeout(80);
await page.getByRole("button", { name: "Refill" }).click();
await page.waitForTimeout(120);
const refilled = await page.evaluate(() => window.__starwake.getBoostCharges());

const cruiseOk = cruise.speed > 0.12 && cruise.speed < 0.28;
const odOk = od.speed > 1.6 && od.speed < 2.8;
const hotOk = hot.throttle <= 0.76 && hot.speed < 0.45;
const boostOk = beforeBoost === 5 && boosting.boosts === 4 && boosting.speed > 1.6;
const refillOk = refilled === 5;

const ok = cruiseOk && odOk && hotOk && boostOk && refillOk && errors.length === 0;
console.log(JSON.stringify({
  ok, cruise, od, hot, beforeBoost, boosting, refilled,
  cruiseOk, odOk, hotOk, boostOk, refillOk, errors,
}, null, 2));

await page.screenshot({ path: "/workspace/screenshots/drive.png" });
await browser.close();
process.exit(ok ? 0 : 1);
