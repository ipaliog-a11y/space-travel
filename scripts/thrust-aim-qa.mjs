import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.addInitScript(() => { try { localStorage.removeItem("starwake-v2"); } catch {} });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector(".gate.menu", { timeout: 8000 });
await page.getByRole("button", { name: "Engage" }).click();
await page.waitForTimeout(800);

async function snap(tag) {
  return page.evaluate((tag) => {
    const s = window.__starwake;
    const ship = s.getScaleDebug();
    const flight = s.getFlightDebug();
    const focus = s.getFocusDebug();
    const r = Math.hypot(ship.ship[0], ship.ship[1], ship.ship[2]);
    const toStar = [-ship.ship[0] / r, -ship.ship[1] / r, -ship.ship[2] / r];
    const fwd = flight.fwd;
    const alongStar = fwd[0] * toStar[0] + fwd[1] * toStar[1] + fwd[2] * toStar[2];
    return {
      tag,
      r,
      starR: ship.starR,
      well: flight.well,
      nav: flight.nav,
      lookYaw: flight.lookYaw,
      lookPitch: flight.lookPitch,
      throttle: flight.throttle,
      alongFwd: flight.alongFwd,
      alongCam: flight.alongCam,
      alongStar,
      fwd,
      speed: s.getSpeed(),
      focus: focus.name,
      navDist: focus.navDist,
      ndc: [focus.ndcX, focus.ndcY],
    };
  }, tag);
}

const arrive = await snap("arrive");
await page.evaluate(() => {
  window.__starwake.setThrottle(1);
  window.__starwake.setBoost(true);
});
await page.waitForTimeout(1200);
const boostNose = await snap("boost-nose");

await page.evaluate(() => {
  window.__starwake.setBoost(false);
  window.__starwake.setThrottle(0.2);
  window.__starwake.lookAtBody({ kind: "star" });
});
await page.waitForTimeout(400);
const locked = await snap("lock-star");
await page.evaluate(() => {
  window.__starwake.setThrottle(1);
  window.__starwake.refillBoosts();
  window.__starwake.setBoost(true);
});
await page.waitForTimeout(1200);
const boostLock = await snap("boost-lock");
await page.evaluate(() => {
  window.__starwake.setBoost(false);
  window.__starwake.setThrottle(0.15);
});

const planets = await page.evaluate(() => window.__starwake.getScaleDebug().planets);
const inner = planets.slice().sort((a, b) => a.orbit - b.orbit)[0];
await page.evaluate((id) => window.__starwake.goToBody({ kind: "planet", id }), inner.id);
await page.waitForTimeout(500);
const atPlanet = await snap("at-planet");

await page.evaluate(() => {
  window.__starwake.refillBoosts();
  window.__starwake.setThrottle(1);
  window.__starwake.setBoost(true);
});
await page.waitForTimeout(1200);
const planetBoostPlanet = await snap("planet-boost-planet");
await page.evaluate(() => {
  window.__starwake.setBoost(false);
  window.__starwake.setThrottle(0);
});

await page.evaluate((id) => window.__starwake.goToBody({ kind: "planet", id }), inner.id);
await page.waitForTimeout(400);
await page.evaluate(() => window.__starwake.lookAtBody({ kind: "star" }));
await page.waitForTimeout(300);
const fromPlanetLookStar = await snap("planet-look-star");
await page.evaluate(() => {
  window.__starwake.refillBoosts();
  window.__starwake.setThrottle(1);
  window.__starwake.setBoost(true);
});
await page.waitForTimeout(1200);
const planetBoostStar = await snap("planet-boost-star");

await page.screenshot({ path: "/workspace/screenshots/thrust-aim.png" });

const dArrive = boostNose.r - arrive.r;
const dLock = boostLock.r - locked.r;
const dPlanetStar = planetBoostStar.r - fromPlanetLookStar.r;
const dPlanet = (planetBoostPlanet.navDist ?? 99) - (atPlanet.navDist ?? 0);
const onScreen = Math.abs(atPlanet.ndc[0]) < 1.2 && Math.abs(atPlanet.ndc[1]) < 1.2;
const facedStar = fromPlanetLookStar.alongStar > 0.85;

const ok =
  dArrive < -2 &&
  dLock < -2 &&
  dPlanetStar < -2 &&
  dPlanet < 8 &&
  onScreen &&
  facedStar &&
  errors.length === 0;

console.log(JSON.stringify({
  ok, dArrive, dLock, dPlanetStar, dPlanet, onScreen, facedStar,
  arrive, boostNose, locked, boostLock, atPlanet, planetBoostPlanet, fromPlanetLookStar, planetBoostStar, errors,
}, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
