import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });

function vis(box, vh, vw) {
  if (!box) return { ok: false, h: 0 };
  return {
    ok: box.height > 6 && box.top >= -4 && box.bottom <= vh + 4 && box.left >= -4 && box.right <= vw + 4,
    top: Math.round(box.top),
    bottom: Math.round(box.bottom),
    h: Math.round(box.height),
    w: Math.round(box.width),
  };
}

async function run(viewport, tag) {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Engage|New/ }).click();
  await page.waitForTimeout(800);

  const wild = await page.evaluate(() => window.__starwake?.getWild?.() ?? []);
  const first = wild[0];
  if (first) {
    await page.evaluate((id) => {
      window.__starwake?.goToBody?.({ kind: "planet", id });
      window.__starwake?.scanPlanet?.(id);
    }, first.id);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__starwake?.completeSurvey?.());
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Dossier" }).click();
    await page.waitForTimeout(250);
  }

  const dossier = await page.evaluate(() => {
    const card = document.querySelector(".dossier");
    const lead = document.querySelector(".dossier-v");
    const note = document.querySelector(".dossier-note");
    const k = document.querySelector(".dossier-k");
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width };
    };
    return {
      text: card?.innerText ?? "",
      card: box(card),
      lead: box(lead),
      note: box(note),
      k: box(k),
      kText: k?.textContent ?? "",
      leadText: lead?.textContent ?? "",
      noteText: note?.textContent ?? "",
      vh: window.innerHeight,
      vw: window.innerWidth,
    };
  });
  await page.screenshot({ path: `/workspace/screenshots/layout-dossier-${tag}.png` });
  await page.locator(".dossier .icon-btn").click().catch(() => {});
  await page.waitForTimeout(150);

  await page.getByRole("button", { name: "Map" }).click();
  await page.waitForTimeout(250);

  const systemMap = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height, width: r.width };
    };
    const rows = [...document.querySelectorAll(".map-list .map-row")];
    const panel = document.querySelector(".map-panel");
    const p = panel.getBoundingClientRect();
    const visibleRows = rows.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 8 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
    }).length;
    return {
      rows: rows.length,
      visibleRows,
      list: box(document.querySelector(".map-list")),
      panel: box(panel),
    };
  });
  await page.screenshot({ path: `/workspace/screenshots/layout-system-${tag}.png` });

  await page.getByRole("button", { name: "Galaxy" }).click();
  await page.waitForTimeout(400);

  const galaxy = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width };
    };
    const panel = document.querySelector(".map-panel");
    const list = document.querySelector(".map-list");
    const inset = document.querySelector(".map-inset");
    const pair = document.querySelector(".map-galaxy-pair");
    const rows = [...document.querySelectorAll(".map-list .map-row")];
    const pb = box(panel);
    const lb = box(list);
    const ib = box(inset);
    const visibleRows = rows.filter((el) => {
      const r = el.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      return r.height > 8 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1 && r.bottom > p.top + 8;
    }).length;
    const overlap = lb && ib
      ? Math.max(0, Math.min(lb.bottom, ib.bottom) - Math.max(lb.top, ib.top))
      : 0;
    return {
      stars: rows.length,
      visibleRows,
      panel: pb,
      list: lb,
      inset: ib,
      pair: box(pair),
      overlap,
      names: rows.slice(0, 6).map((el) => el.textContent?.trim()),
      vh: window.innerHeight,
      vw: window.innerWidth,
    };
  });
  await page.screenshot({ path: `/workspace/screenshots/layout-galaxy-${tag}.png` });

  await browser.close();
  return { wild, dossier, galaxy, systemMap, errors };
}

const desktop = await run({ width: 1280, height: 720 }, "desk");
const short = await run({ width: 1100, height: 620 }, "short");
const mobile = await run({ width: 390, height: 720 }, "mob");

function verdict(run, name) {
  const d = run.dossier;
  const g = run.galaxy;
  const prospectOn = vis(d.lead, d.vh, d.vw);
  const noteOn = d.note ? vis(d.note, d.vh, d.vw) : { ok: true, h: 0 };
  const listOn = vis(g.list, g.vh, g.vw);
  const listTall = (g.list?.height ?? 0) >= 140;
  const noCover = g.overlap < 8;
  const rowsOk = g.visibleRows >= 4;
  const hasProspect = /prospect/i.test(d.kText) && (d.leadText || "").length > 4;
  const sys = run.systemMap;
  const sysOk = (sys.rows ?? 0) >= 4 && (sys.list?.height ?? 0) >= 100;

  const ok =
    prospectOn.ok &&
    noteOn.ok &&
    listTall &&
    noCover &&
    rowsOk &&
    hasProspect &&
    sysOk &&
    run.errors.length === 0;
  return {
    name,
    ok,
    prospectOn,
    noteOn,
    listOn,
    listH: Math.round(g.list?.height ?? 0),
    overlap: g.overlap,
    visibleRows: g.visibleRows,
    stars: g.stars,
    names: g.names,
    sysRows: sys.rows,
    sysVisible: sys.visibleRows,
    sysListH: Math.round(sys.list?.height ?? 0),
    lead: d.leadText,
    note: d.noteText,
    errors: run.errors,
  };
}

const results = [verdict(desktop, "desk"), verdict(short, "short"), verdict(mobile, "mob")];
const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, results }, null, 2));
process.exit(ok ? 0 : 1);
