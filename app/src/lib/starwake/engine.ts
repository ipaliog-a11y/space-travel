// @ts-nocheck
import type { Planet, Station, FlightMode } from "./types";
import { createAudio } from "./audio";
import { fittedShip, T1_PER_DIST } from "./catalog";
import { distLy, getCatalog, getSystem, GALAXY, inBelt, moonPark, moonProximity, moonWorld, cometPark, cometProximity, cometWorld, beltRock, planetKeepOut, planetPark, planetProximity, planetWorld, NEBULA_CODE, nextHop } from "./galaxy";
import { gateFrame, occupiedGates, pickApproachGate, stationFrame, stationProximity, stationWorld } from "./stations";
import { circularVelocity, gravityAt, keplerState, orbitPolyline, planetSOI, starMu } from "./orbit";
import { clamp, composeAlongY, composeAlongZ, composeModel, mat4, multiply, perspective, quatFromEuler, quatFromAxisAngle, quatInvert, quatLook, quatMul, quatNormalize, quatSlerp, quatToMat4, rotateVec, translation, viewFromLook, wrapDelta } from "./math";
import { BODY_FS, BODY_VS, DUST_FS, DUST_VS, NEBULA_FS, NEBULA_VS, RING_FS, RING_VS, LINE_FS, LINE_VS, STAR_FS, STAR_VS, STREAK_FS, STREAK_VS, WARP_FS, WARP_VS } from "./shaders";
import { getStarwake } from "./store";
import { DOCK, HULL, layoutStation, makeBoxMesh, makeCone, makeCylinder, makeTorus, makeUnitSphere, stationLod } from "./station-mesh";

export type LocalTarget =
  | { kind: "star" }
  | { kind: "planet"; id: string }
  | { kind: "station"; id: string }
  | { kind: "moon"; id: string }
  | { kind: "comet"; id: string }
  | { kind: "belt" };

export type OverlayEls = {
  canvas: HTMLCanvasElement;
  tunnel: HTMLDivElement;
  vignette: HTMLDivElement;
  flash: HTMLDivElement;
};

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getRoll: () => number;
  getThrottle: () => number;
  setSteer: (v: number) => void;
  setKeys: (codes: string[]) => void;
};

export type DriveHud = {
  throttle: number;
  heat01: number;
  overheated: boolean;
  overdrive: boolean;
  boostCharges: number;
  boostMax: number;
  boosting: boolean;
  boostArmed: boolean;
  focusName: string | null;
  atPlanet: string | null;
  atPlanetId: string | null;
  speed: number;
  navName: string | null;
  navDist: number | null;
  etaSec: number | null;
  canJump: boolean;
  scanned: boolean;
  coasting: boolean;
  well: string | null;
  fuel: number;
  fuelCap: number;
  dry: boolean;
  atStation: string | null;
  atStationId: string | null;
  docking: boolean;
  berthed: boolean;
  gateIndex: number;
  alignOff: number;
  alignHead: number;
  alignSpd: number;
  surveying: boolean;
  surveyPaused: boolean;
  survey01: number;
};

export type EngineHandle = {
  destroy: () => void;
  unlockAudio: () => void;
  requestJump: () => void;
  requestDock: () => void;
  cancelDock: () => void;
  undock: () => void;
  requestSurvey: () => void;
  refillBoosts: () => void;
  setBoost: (v: boolean) => void;
  setStick: (x: number, y: number, active: boolean) => void;
  setGyro: (x: number, y: number, ready: boolean) => void;
  subscribeThrottle: (fn: (t: number) => void) => () => void;
  subscribeDrive: (fn: (d: DriveHud) => void) => () => void;
  getFocusDebug: () => {
    name: string | null;
    yaw: number;
    pitch: number;
    ndcX: number;
    ndcY: number;
    visible: boolean;
    at: string | null;
    dist: number;
    prox: number;
    nav: string | null;
    navDist: number;
    speed: number;
  };
  goToBody: (t: LocalTarget) => void;
  lookAtBody: (t: LocalTarget, keepMap?: boolean) => void;
  [key: string]: unknown;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __starwake?: Record<string, any>;
  }
}
var HALF = 180;
var SIZE = 360;
var MAX_STARS = 9e3;
var DUST = 1800;
var STAR_VZ = 420;
var OD_GATE = .75;
var BOOST_GATE = OD_GATE * .8;
var HYPER_SEC = 2.15;
var FOCUS_IN = .16;
var FOCUS_OUT = .3;
var FAR_CLIP = 9e4;
var NEAR_CLIP = .14;
var WELL_HOLD = 1.28;
function compile(gl, type, src) {
	const s = gl.createShader(type);
	if (!s) throw new Error("shader");
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(s);
		gl.deleteShader(s);
		throw new Error(log || "compile");
	}
	return s;
}
function program(gl, vs, fs) {
	const p = gl.createProgram();
	if (!p) throw new Error("program");
	gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
	gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
	return p;
}
function hash(i, salt) {
	const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
	return s - Math.floor(s);
}
function makeSphere(stacks, slices) {
	const pos = [];
	const nrm = [];
	const vert = (phi, th) => {
		const x = Math.sin(phi) * Math.cos(th);
		const y = Math.cos(phi);
		const z = Math.sin(phi) * Math.sin(th);
		pos.push(x, y, z);
		nrm.push(x, y, z);
	};
	for (let i = 0; i < stacks; i++) {
		const phi0 = i / stacks * Math.PI;
		const phi1 = (i + 1) / stacks * Math.PI;
		for (let j = 0; j < slices; j++) {
			const th0 = j / slices * Math.PI * 2;
			const th1 = (j + 1) / slices * Math.PI * 2;
			vert(phi0, th0);
			vert(phi1, th0);
			vert(phi1, th1);
			vert(phi0, th0);
			vert(phi1, th1);
			vert(phi0, th1);
		}
	}
	return {
		pos: new Float32Array(pos),
		nrm: new Float32Array(nrm),
		count: pos.length / 3
	};
}
function wrapCloud(arr, count, qx, qy, qz, qw, dz, dx, dy, layerBase, collapse) {
	const c = Math.max(0, Math.min(1, collapse));
	const c2 = c * c;
	for (let i = 0; i < count; i++) {
		const i3 = i * 3;
		const x = arr[i3], y = arr[i3 + 1], z = arr[i3 + 2];
		const ix = qw * x + qy * z - qz * y;
		const iy = qw * y + qz * x - qx * z;
		const iz = qw * z + qx * y - qy * x;
		const iw = -qx * x - qy * y - qz * z;
		let nx = ix * qw + iw * -qx + iy * -qz - iz * -qy;
		let ny = iy * qw + iw * -qy + iz * -qx - ix * -qz;
		let nz = iz * qw + iw * -qz + ix * -qy - iy * -qx;
		const cruiseW = layerBase * (.1 + .9 * (14 / (14 + Math.max(.35, -nz))));
		const w = cruiseW + (1 - cruiseW) * c2;
		nx += dx * w;
		ny += dy * w;
		nz += dz * w;
		if (nx > HALF) nx -= SIZE;
		else if (nx < -180) nx += SIZE;
		if (ny > HALF) ny -= SIZE;
		else if (ny < -180) ny += SIZE;
		if (nz > HALF) nz -= SIZE;
		else if (nz < -180) nz += SIZE;
		arr[i3] = nx;
		arr[i3 + 1] = ny;
		arr[i3 + 2] = nz;
	}
}
function loc(gl, p, name) {
	return gl.getUniformLocation(p, name);
}
function disableAttribs(gl) {
	for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
}
function lookAnglesTo(local) {
	return {
		yaw: Math.atan2(local[0], -local[2]),
		pitch: clamp(Math.atan2(-local[1], Math.hypot(local[0], local[2])), -1.35, 1.35)
	};
}
export function createEngine(els: OverlayEls): EngineHandle {
	const { canvas, tunnel, vignette, flash } = els;
	const canvasEl = canvas;
	const glMaybe = canvasEl.getContext("webgl", {
		alpha: false,
		antialias: false,
		depth: true,
		stencil: false,
		powerPreference: "high-performance"
	}) || canvasEl.getContext("experimental-webgl", {
		alpha: false,
		antialias: false,
		depth: true,
		stencil: false
	});
	if (!glMaybe) throw new Error("WebGL is required");
	const gl = glMaybe;
	const audio = createAudio();
	const keys = /* @__PURE__ */ new Set();
	let qaSteer = null;
	let qaKeys = null;
	let stickX = 0, stickY = 0, stickActive = false;
	let throttle = .4;
	const throttleSubs = /* @__PURE__ */ new Set();
	const driveSubs = /* @__PURE__ */ new Set();
	let heat01 = 0;
	let overheated = false;
	let boostActive = false;
	let boostLeft = 0;
	let boostWanted = false;
	let lastWorldSpeed = 0;
	let focusId = null;
	let focusName = null;
	let focusNdcX = 0;
	let focusNdcY = 0;
	let focusVisible = false;
	let focusDist = 0;
	let atPlanet = null;
	let atPlanetId = null;
	let atDist = 0;
	let atProx = 0;
	let navTarget = null;
	let navName = null;
	let navDist = 0;
	let boundId = null;
	let boundName = null;
	let fuelLocal = getStarwake().fuel[getStarwake().shipId] ?? 100;
	let fuelShip = getStarwake().shipId;
	let fuelFlush = 0;
	let atStation = null;
	let atStationId = null;
	let dockStationId = null;
	let dockGate = 0;
	let alignOff = 1;
	let alignHead = 0;
	let alignSpd = 0;
	let surveying = false;
	let surveyPaused = false;
	let surveyT = 0;
	let surveyPlanetId = null;
	function tankCap() {
		const st = getStarwake();
		return fittedShip(st.shipId, st.loadout).fuelCap;
	}
	function syncFuelFromStore() {
		const st = getStarwake();
		fuelShip = st.shipId;
		fuelLocal = st.fuel[st.shipId] ?? tankCap();
	}
	function flushFuel(force = false) {
		const st = getStarwake();
		if (force || Math.abs((st.fuel[st.shipId] ?? 0) - fuelLocal) > .05) st.setFuel(fuelLocal);
	}
	function fillTank() {
		fuelLocal = tankCap();
		getStarwake().refuel();
		pushDrive();
	}
	function driveSnap() {
		const st = getStarwake();
		const def = fittedShip(st.shipId, st.loadout);
		return {
			throttle,
			heat01,
			overheated,
			overdrive: throttle > OD_GATE && !overheated,
			boostCharges: st.boostCharges,
			boostMax: def.boostCapacity,
			boosting: boostActive,
			boostArmed: throttle > BOOST_GATE,
			focusName,
			atPlanet,
			atPlanetId,
			speed: lastWorldSpeed * 100,
			navName,
			navDist: navName ? navDist : focusName ? focusDist : null,
			etaSec: hopEta(),
			canJump: canFireJump(),
			scanned: Boolean(atPlanetId && getStarwake().scanned[atPlanetId]),
			coasting: st.entered && throttle <= .03,
			well: boundName,
			fuel: fuelLocal,
			fuelCap: def.fuelCap,
			dry: fuelLocal <= .05,
			atStation,
			atStationId,
			docking: mode === "docking",
			berthed: mode === "berthed",
			gateIndex: dockGate,
			alignOff,
			alignHead,
			alignSpd,
			surveying,
			surveyPaused,
			survey01: surveyT
		};
	}
	function pushDrive() {
		const snap = driveSnap();
		throttleSubs.forEach((fn) => fn(snap.throttle));
		driveSubs.forEach((fn) => fn(snap));
	}
	function applyThrottle(t) {
		throttle = overheated ? Math.min(clamp(t, 0, 1), OD_GATE) : clamp(t, 0, 1);
		pushDrive();
	}
	let boostHeld = false;
	let jumpQueued = false;
	let lookYaw = 0, lookPitch = 0;
	let lookDragging = false, lookLastX = 0, lookLastY = 0;
	let lookDragPx = 0;
	let lookIgnoreUntil = 0;
	let lastLookCmd = 0;
	let steerX = 0, steerY = 0, steerR = 0;
	let boostAmt = 0, jumpAmt = 0;
	let headingYaw = 0;
	let shipRoll = 0;
	let bankRoll = 0;
	let fov = 50 * Math.PI / 180;
	let last = performance.now();
	let punchT = 0, flashT = 0, ringSpawnAcc = 0;
	let warpTime = 0;
	const reduceMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
	let mode = "docked";
	let chargeT = 0;
	let hyperT = 0;
	let dropT = 0;
	let transitTarget = null;
	let transitT = 0;
	let transitDur = 1.6;
	let cruiseAmt = 0;
	const transitFrom = { x: 0, y: 0, z: 0 };
	let lastTickErr = null;
	let lastDt = 0;
	let orientQuat = [
		0,
		0,
		0,
		1
	];
	const shipPos = {
		x: 0,
		y: 0,
		z: 0
	};
	const shipVel = {
		x: 0,
		y: 0,
		z: 0
	};
	let worldTime = 0;
	let gyroX = 0, gyroY = 0, gyroReady = false;
	let gyroBaseBeta = null;
	let gyroBaseGamma = null;
	let pendingDest = null;
	let running = true;
	let raf = 0;
	let lastUiPush = 0;
	const starPos = new Float32Array(MAX_STARS * 3);
	const starColor = new Float32Array(MAX_STARS * 3);
	const starSize = new Float32Array(MAX_STARS);
	for (let i = 0; i < MAX_STARS; i++) {
		starPos[i * 3] = (hash(i, 1) - .5) * SIZE;
		starPos[i * 3 + 1] = (hash(i, 2) - .5) * SIZE;
		starPos[i * 3 + 2] = (hash(i, 3) - .5) * SIZE;
		const roll = hash(i, 4);
		if (roll < .07) {
			starColor[i * 3] = 1;
			starColor[i * 3 + 1] = .88;
			starColor[i * 3 + 2] = .72;
		} else if (roll < .38) {
			starColor[i * 3] = .72;
			starColor[i * 3 + 1] = .86;
			starColor[i * 3 + 2] = 1;
		} else {
			starColor[i * 3] = .96;
			starColor[i * 3 + 1] = .97;
			starColor[i * 3 + 2] = 1;
		}
		starSize[i] = .7 + hash(i, 5) * 1.25;
	}
	const quad = new Float32Array([
		0,
		0,
		1,
		0,
		0,
		1,
		0,
		1,
		1,
		0,
		1,
		1
	]);
	const streakProg = program(gl, STREAK_VS, STREAK_FS);
	const starProg = program(gl, STAR_VS, STAR_FS);
	const dustProg = program(gl, DUST_VS, DUST_FS);
	const nebulaProg = program(gl, NEBULA_VS, NEBULA_FS);
	const bodyProg = program(gl, BODY_VS, BODY_FS);
	let warpProg = null;
	try {
		warpProg = program(gl, WARP_VS, WARP_FS);
	} catch {
		warpProg = null;
	}
	let ringProg = null;
	try {
		ringProg = program(gl, RING_VS, RING_FS);
	} catch {
		ringProg = null;
	}
	let lineProg = null;
	try {
		lineProg = program(gl, LINE_VS, LINE_FS);
	} catch {
		lineProg = null;
	}
	const quadBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
	gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
	const posBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
	gl.bufferData(gl.ARRAY_BUFFER, starPos, gl.DYNAMIC_DRAW);
	const colBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
	gl.bufferData(gl.ARRAY_BUFFER, starColor, gl.STATIC_DRAW);
	const sizeBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
	gl.bufferData(gl.ARRAY_BUFFER, starSize, gl.STATIC_DRAW);
	const dustPos = starPos.slice(0, DUST * 3);
	const dustCol = new Float32Array(DUST * 3);
	const dustSize = new Float32Array(DUST);
	for (let i = 0; i < DUST; i++) {
		const c = .5 + hash(i, 20) * .4;
		dustCol[i * 3] = c * .85;
		dustCol[i * 3 + 1] = c * .9;
		dustCol[i * 3 + 2] = c;
		dustSize[i] = .5 + hash(i, 21);
	}
	const dustPosBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, dustPosBuf);
	gl.bufferData(gl.ARRAY_BUFFER, dustPos, gl.DYNAMIC_DRAW);
	const dustColBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, dustColBuf);
	gl.bufferData(gl.ARRAY_BUFFER, dustCol, gl.STATIC_DRAW);
	const dustSizeBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, dustSizeBuf);
	gl.bufferData(gl.ARRAY_BUFFER, dustSize, gl.STATIC_DRAW);
	const nebVerts = [];
	const stacks = 24, slices = 48, R = 600;
	for (let i = 0; i < stacks; i++) {
		const phi0 = i / stacks * Math.PI;
		const phi1 = (i + 1) / stacks * Math.PI;
		for (let j = 0; j < slices; j++) {
			const th0 = j / slices * Math.PI * 2;
			const th1 = (j + 1) / slices * Math.PI * 2;
			const p = (phi, th) => {
				nebVerts.push(R * Math.sin(phi) * Math.cos(th), R * Math.cos(phi), R * Math.sin(phi) * Math.sin(th));
			};
			p(phi0, th0);
			p(phi1, th0);
			p(phi1, th1);
			p(phi0, th0);
			p(phi1, th1);
			p(phi0, th1);
		}
	}
	const nebulaData = new Float32Array(nebVerts);
	const nebBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nebBuf);
	gl.bufferData(gl.ARRAY_BUFFER, nebulaData, gl.STATIC_DRAW);
	const sphere = makeSphere(36, 52);
	const sphPosBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphPosBuf);
	gl.bufferData(gl.ARRAY_BUFFER, sphere.pos, gl.STATIC_DRAW);
	const sphNrmBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphNrmBuf);
	gl.bufferData(gl.ARRAY_BUFFER, sphere.nrm, gl.STATIC_DRAW);
	function uploadMesh(mesh) {
		const pos = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, pos);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
		const nrm = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, nrm);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.nrm, gl.STATIC_DRAW);
		return { pos, nrm, count: mesh.count };
	}
	const stnSphere = uploadMesh(makeUnitSphere(14, 20));
	const stnCyl = uploadMesh(makeCylinder(14));
	const stnBox = uploadMesh(makeBoxMesh());
	const stnTorus = uploadMesh(makeTorus(36, 10, 0.13));
	const stnThin = uploadMesh(makeTorus(32, 8, 0.038));
	const stnCone = uploadMesh(makeCone(12));
	const MESH = { sphere: stnSphere, cyl: stnCyl, box: stnBox, torus: stnTorus, thin: stnThin, cone: stnCone };
	const RING_N = 128;
	const ringUnit = /* @__PURE__ */ new Float32Array(RING_N * 2);
	for (let i = 0; i < RING_N; i++) {
		const a = i / RING_N * Math.PI * 2;
		ringUnit[i * 2] = Math.cos(a);
		ringUnit[i * 2 + 1] = Math.sin(a);
	}
	const ringBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf);
	gl.bufferData(gl.ARRAY_BUFFER, ringUnit, gl.STATIC_DRAW);
	const lineBuf = gl.createBuffer();
	const orbitCache = /* @__PURE__ */ new Map();
	const ORBIT_N = 192;
	const proj = mat4();
	const view = mat4();
	const nebView = mat4();
	const nebCombined = mat4();
	const worldView = mat4();
	const tmpA = mat4();
	const tmpB = mat4();
	const model = mat4();
	const orientMat = mat4();
	const invOrient = mat4();
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clearColor(.02, .023, .04, 1);
	let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
	function resize() {
		const cssW = window.innerWidth;
		const cssH = window.innerHeight;
		const isMobile = cssW <= 640;
		dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.4 : 1.75);
		canvas.width = Math.max(1, Math.floor(cssW * dpr));
		canvas.height = Math.max(1, Math.floor(cssH * dpr));
		gl.viewport(0, 0, canvas.width, canvas.height);
	}
	window.addEventListener("resize", resize);
	resize();
	const RING_POOL = 20;
	const rings = [];
	for (let i = 0; i < RING_POOL; i++) {
		const el = document.createElement("div");
		el.className = "tunnel-ring";
		tunnel.appendChild(el);
		rings.push({
			el,
			t: -1,
			life: 1.2
		});
	}
	function spawnRing(hot) {
		for (let i = 0; i < RING_POOL; i++) {
			const r = rings[i];
			if (r.t < 0) {
				r.t = 0;
				r.life = hot ? .7 + Math.random() * .25 : .95 + Math.random() * .35;
				r.el.style.borderColor = hot
					? `rgba(230, 240, 255, ${.55 + Math.random() * .25})`
					: `rgba(214, 200, 176, ${.24 + Math.random() * .16})`;
				return;
			}
		}
	}
	function updateRings(dt, speedNorm, jumping, cruise = false) {
		if (!jumping || reduceMotion) {
			for (let i = 0; i < RING_POOL; i++) {
				rings[i].t = -1;
				rings[i].el.style.opacity = "0";
			}
			ringSpawnAcc = 0;
			return;
		}
		const rate = cruise ? 1.8 + cruiseAmt * 4.8 : .55 + speedNorm * 2.2 + 6.4 + jumpAmt * 4;
		ringSpawnAcc += rate * dt;
		while (ringSpawnAcc >= 1) {
			ringSpawnAcc -= 1;
			spawnRing(!cruise);
		}
		for (let i = 0; i < RING_POOL; i++) {
			const r = rings[i];
			if (r.t < 0) continue;
			r.t += dt / r.life;
			if (r.t >= 1) {
				r.t = -1;
				r.el.style.opacity = "0";
				continue;
			}
			const scale = .1 + r.t * r.t * (cruise ? 24 : 34);
			r.el.style.transform = `scale(${scale.toFixed(3)})`;
			r.el.style.opacity = String(Math.max(0, (1 - r.t) * (cruise ? .36 : .4)));
		}
	}
	function shapeAxis(v, dead = .06) {
		const a = Math.abs(v);
		if (a < dead) return 0;
		const t = (a - dead) / (1 - dead);
		return Math.sign(v) * t * t;
	}
	function isUiTarget(t) {
		return !!(t && t instanceof Element && t.closest("[data-ui]"));
	}
	function onUiPointer(e) {
		if (isUiTarget(e.target)) lookIgnoreUntil = performance.now() + 360;
	}
	function onPointerDown(e) {
		if (!getStarwake().entered) return;
		if (isUiTarget(e.target) || performance.now() < lookIgnoreUntil) {
			lookIgnoreUntil = performance.now() + 320;
			return;
		}
		lookDragging = true;
		lookDragPx = 0;
		lookLastX = e.clientX;
		lookLastY = e.clientY;
		try {
			canvas.setPointerCapture(e.pointerId);
		} catch {}
	}
	function onPointerMove(e) {
		if (!lookDragging) return;
		const dx = e.clientX - lookLastX;
		const dy = e.clientY - lookLastY;
		lookLastX = e.clientX;
		lookLastY = e.clientY;
		lookDragPx += Math.hypot(dx, dy);
		if (lookDragPx > 8 && navTarget) {
			navTarget = null;
			navName = null;
			pushDrive();
		}
		const sens = .0045;
		const stLook = getStarwake();
		lookYaw += -dx * sens * (stLook.invertX ? -1 : 1);
		lookPitch += dy * sens * (stLook.invertY ? -1 : 1);
		if (!navTarget) {
			lookYaw = clamp(lookYaw, -1.35, 1.35);
			lookPitch = clamp(lookPitch, -1.05, 1.05);
		} else lookPitch = clamp(lookPitch, -1.35, 1.35);
	}
	function onPointerUp() {
		lookDragging = false;
	}
	function onKeyDown(e) {
		if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
		keys.add(e.code);
		if ([
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"KeyA",
			"KeyZ",
			"KeyY",
			"KeyQ",
			"KeyE",
			"KeyR",
			"KeyF",
			"Escape"
		].includes(e.code)) e.preventDefault();
		if (e.repeat) return;
		if (e.code === "KeyJ") jumpQueued = true;
		if (e.code === "KeyM") getStarwake().toggleMute();
		if (e.code === "KeyI") getStarwake().toggleInvert();
		if (e.code === "KeyN") getStarwake().setMapOpen(!getStarwake().mapOpen);
		if (e.code === "KeyR" && getStarwake().entered) {
			getStarwake().refillBoosts();
			pushDrive();
		}
		if (e.code === "KeyF" && getStarwake().entered) fillTank();
		if (e.code === "Escape") {
			const stEsc = getStarwake();
			if (stEsc.mapOpen) {
				stEsc.setMapOpen(false);
				return;
			}
			if (mode === "docking") {
				cancelDock();
				return;
			}
			if (mode === "berthed") {
				undockFromStation();
				return;
			}
			if (stEsc.entered) {
				stEsc.setEntered(false);
				stEsc.setMode("docked");
				stEsc.markSave();
				mode = "docked";
				halt();
			}
		}
	}
	function onKeyUp(e) {
		keys.delete(e.code);
	}
	function onBlur() {
		keys.clear();
		boostHeld = false;
		stickX = 0;
		stickY = 0;
		stickActive = false;
		lookDragging = false;
	}
	function onOrient(e) {
		if (!getStarwake().gyro) return;
		const beta = e.beta, gamma = e.gamma;
		if (beta == null || gamma == null) return;
		if (gyroBaseBeta == null) {
			gyroBaseBeta = beta;
			gyroBaseGamma = gamma;
		}
		let dy = (beta - gyroBaseBeta) / 28;
		let dx = (gamma - (gyroBaseGamma ?? 0)) / 28;
		if (getStarwake().invertY) dy = -dy;
		if (getStarwake().invertX) dx = -dx;
		gyroX = clamp(dx, -1, 1);
		gyroY = clamp(dy, -1, 1);
		gyroReady = true;
	}
	canvas.addEventListener("pointerdown", onPointerDown);
	window.addEventListener("pointerdown", onUiPointer, true);
	window.addEventListener("pointermove", onPointerMove);
	window.addEventListener("pointerup", onPointerUp);
	window.addEventListener("pointercancel", onPointerUp);
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("blur", onBlur);
	window.addEventListener("deviceorientation", onOrient, true);
	function held(code) {
		if (qaKeys) return qaKeys.has(code);
		return keys.has(code);
	}
	function halt() {
		applyThrottle(0);
		boostHeld = false;
		boostAmt = 0;
		stickX = 0;
		stickY = 0;
		stickActive = false;
		lookYaw = 0;
		lookPitch = 0;
		shipRoll = 0;
		bankRoll = 0;
		steerX = 0;
		steerY = 0;
		steerR = 0;
		boostActive = false;
		boostLeft = 0;
		boostHeld = false;
	}
	function faceWorld(dx, dy, dz) {
		if (Math.hypot(dx, dy, dz) < 1e-6) return;
		const yaw = Math.atan2(-dx, -dz);
		const pitch = Math.atan2(dy, Math.hypot(dx, dz));
		orientQuat = quatFromEuler(pitch, yaw);
		headingYaw = yaw;
		lookYaw = 0;
		lookPitch = 0;
	}
	function thrustDir() {
		return rotateVec(quatMul(orientQuat, quatFromEuler(lookPitch, lookYaw)), [
			0,
			0,
			-1
		]);
	}
	function placeInSystem(systemId) {
		const sys = getSystem(systemId);
		const r = sys.starRadius;
		shipPos.x = r * .55;
		shipPos.y = r * .38;
		shipPos.z = r * 3.55;
		orientQuat = [
			0,
			0,
			0,
			1
		];
		headingYaw = 0;
		shipRoll = 0;
		bankRoll = 0;
		const mu = starMu(sys.starRadius);
		const cv = circularVelocity(shipPos.x, shipPos.y, shipPos.z, mu);
		shipVel.x = cv[0];
		shipVel.y = cv[1];
		shipVel.z = cv[2];
		lastWorldSpeed = Math.hypot(cv[0], cv[1], cv[2]);
		boundId = null;
		boundName = null;
	}
	function placeAtPlanet(planetId) {
		const sys = getSystem(getStarwake().systemId);
		const planet = sys.planets.find((p) => p.id === planetId);
		if (!planet) {
			placeInSystem(sys.id);
			return;
		}
		const [px, py, pz] = planetWorld(planet, worldTime);
		const hold = planet.rings ? planet.ringOuter * 1.16 : planetPark(planet);
		const plen = Math.hypot(px, py, pz) || 1, nx = px / plen;
		py / plen;
		const nz = pz / plen;
		let tx = nz, ty = 0, tz = -nx;
		const tl = Math.hypot(tx, ty, tz) || 1;
		tx /= tl;
		ty /= tl;
		tz /= tl;
		shipPos.x = px + tx * hold * .82 + nx * hold * .12;
		shipPos.y = py + hold * .42;
		shipPos.z = pz + tz * hold * .82 + nz * hold * .12;
		const stt = keplerState(planet, worldTime);
		shipVel.x = stt.vel[0];
		shipVel.y = stt.vel[1];
		shipVel.z = stt.vel[2];
		lastWorldSpeed = Math.hypot(stt.vel[0], stt.vel[1], stt.vel[2]);
		faceWorld(px - shipPos.x, py - shipPos.y, pz - shipPos.z);
		boundId = planet.id;
		boundName = planet.name;
		navTarget = {
			kind: "planet",
			id: planet.id
		};
		navName = planet.name;
		getStarwake().visitPlanet(getStarwake().systemId, planet.id);
	}
	function placeAtMoon(moonId) {
		const sys = getSystem(getStarwake().systemId);
		let host = null;
		let moon = null;
		for (const p of sys.planets) {
			const m = p.moons.find((mo) => mo.id === moonId);
			if (m) {
				host = p;
				moon = m;
				break;
			}
		}
		if (!host || !moon) {
			placeInSystem(sys.id);
			return;
		}
		const [mx, my, mz] = moonWorld(host, moon, worldTime);
		const hold = moonPark(moon);
		const plen = Math.hypot(mx, my, mz) || 1;
		let tx = mz / plen, tz = -mx / plen;
		const tl = Math.hypot(tx, tz) || 1;
		tx /= tl;
		tz /= tl;
		shipPos.x = mx + tx * hold;
		shipPos.y = my + hold * 0.35;
		shipPos.z = mz + tz * hold;
		const stt = keplerState(host, worldTime);
		shipVel.x = stt.vel[0];
		shipVel.y = stt.vel[1];
		shipVel.z = stt.vel[2];
		lastWorldSpeed = Math.hypot(stt.vel[0], stt.vel[1], stt.vel[2]);
		faceWorld(mx - shipPos.x, my - shipPos.y, mz - shipPos.z);
		boundId = moon.id;
		boundName = moon.name;
		navTarget = { kind: "moon", id: moon.id };
		navName = moon.name;
		getStarwake().visitPlanet(sys.id, moon.id);
	}
	function placeAtComet(cometId) {
		const sys = getSystem(getStarwake().systemId);
		const comet = sys.comets.find((c) => c.id === cometId);
		if (!comet) {
			placeInSystem(sys.id);
			return;
		}
		const [cx, cy, cz] = cometWorld(comet, worldTime);
		const hold = cometPark(comet);
		const plen = Math.hypot(cx, cy, cz) || 1;
		shipPos.x = cx + (cz / plen) * hold;
		shipPos.y = cy + hold * 0.4;
		shipPos.z = cz + (-cx / plen) * hold;
		const stt = keplerState(comet, worldTime);
		shipVel.x = stt.vel[0];
		shipVel.y = stt.vel[1];
		shipVel.z = stt.vel[2];
		lastWorldSpeed = Math.hypot(stt.vel[0], stt.vel[1], stt.vel[2]);
		faceWorld(cx - shipPos.x, cy - shipPos.y, cz - shipPos.z);
		boundId = comet.id;
		boundName = comet.name;
		navTarget = { kind: "comet", id: comet.id };
		navName = comet.name;
		getStarwake().visitPlanet(sys.id, comet.id);
	}
	function placeAtBelt() {
		const sys = getSystem(getStarwake().systemId);
		const belt = sys.belt;
		if (!belt) {
			placeInSystem(sys.id);
			return;
		}
		const r = (belt.inner + belt.outer) * 0.5;
		const ang = 0.85;
		shipPos.x = Math.cos(ang) * r;
		shipPos.y = 18;
		shipPos.z = Math.sin(ang) * r;
		const mu = starMu(sys.starRadius);
		const cv = circularVelocity(shipPos.x, shipPos.y, shipPos.z, mu);
		shipVel.x = cv[0];
		shipVel.y = cv[1];
		shipVel.z = cv[2];
		lastWorldSpeed = Math.hypot(cv[0], cv[1], cv[2]);
		faceWorld(-shipPos.x, -shipPos.y, -shipPos.z);
		boundId = belt.id;
		boundName = belt.name;
		navTarget = { kind: "belt" };
		navName = belt.name;
		getStarwake().visitPlanet(sys.id, belt.id);
	}
	function placeAtStation(stationId) {
		const sys = getSystem(getStarwake().systemId);
		const stn = sys.stations.find((s) => s.id === stationId);
		const planet = stn ? sys.planets.find((p) => p.id === stn.planetId) : null;
		if (!stn || !planet) {
			placeInSystem(sys.id);
			return;
		}
		const g = gateFrame(stn, planet, worldTime, 0);
		shipPos.x = g.pos[0] + g.out[0] * 18;
		shipPos.y = g.pos[1] + g.out[1] * 18;
		shipPos.z = g.pos[2] + g.out[2] * 18;
		const stt = keplerState(planet, worldTime);
		shipVel.x = stt.vel[0];
		shipVel.y = stt.vel[1];
		shipVel.z = stt.vel[2];
		lastWorldSpeed = Math.hypot(stt.vel[0], stt.vel[1], stt.vel[2]);
		orientQuat = quatLook(-g.out[0], -g.out[1], -g.out[2]);
		headingYaw = Math.atan2(g.out[0], g.out[2]);
		lookYaw = 0;
		lookPitch = 0;
		boundId = planet.id;
		boundName = planet.name;
		navTarget = {
			kind: "station",
			id: stn.id
		};
		navName = stn.name;
		atStation = stn.name;
		atStationId = stn.id;
	}
	placeInSystem(getStarwake().systemId);
	function arrive(id) {
		const st = getStarwake();
		const lock = st.lockedSystemId;
		st.setSystemId(id);
		if (lock && lock !== id) {
			const range = fittedShip(st.shipId, st.loadout).jumpRangeLy;
			if (!nextHop(getSystem(id), getSystem(lock), range)) st.setLocked(null);
		} else {
			st.setLocked(null);
		}
		placeInSystem(id);
		halt();
		heat01 = 0;
		overheated = false;
		punchT = 1;
		flashT = 1;
		navTarget = null;
		navName = null;
		audio.fireDrop(fittedShip(getStarwake().shipId, getStarwake().loadout).audioPitch);
		getStarwake().visitSystem(id);
	}
	function faceQuat(dx, dy, dz) {
		const len = Math.hypot(dx, dy, dz);
		if (len < 1e-6) return orientQuat;
		const yaw = Math.atan2(-dx, -dz);
		const pitch = Math.atan2(dy, Math.hypot(dx, dz));
		return quatFromEuler(pitch, yaw);
	}
	function parkPose(target) {
		const sys = getSystem(getStarwake().systemId);
		if (!target || target.kind === "star") {
			const r = sys.starRadius;
			return { x: r * .55, y: r * .38, z: r * 3.55, lx: 0, ly: 0, lz: 0 };
		}
		if (target.kind === "planet") {
			const planet = sys.planets.find((p) => p.id === target.id);
			if (!planet) return null;
			const [px, py, pz] = planetWorld(planet, worldTime);
			const hold = planet.rings ? planet.ringOuter * 1.16 : planetPark(planet);
			const plen = Math.hypot(px, py, pz) || 1;
			const nx = px / plen, nz = pz / plen;
			let tx = nz, tz = -nx;
			const tl = Math.hypot(tx, tz) || 1;
			tx /= tl;
			tz /= tl;
			return {
				x: px + tx * hold * .82 + nx * hold * .12,
				y: py + hold * .42,
				z: pz + tz * hold * .82 + nz * hold * .12,
				lx: px, ly: py, lz: pz,
			};
		}
		if (target.kind === "moon") {
			for (const p of sys.planets) {
				const moon = p.moons.find((m) => m.id === target.id);
				if (!moon) continue;
				const [mx, my, mz] = moonWorld(p, moon, worldTime);
				const hold = moonPark(moon);
				const plen = Math.hypot(mx, my, mz) || 1;
				let tx = mz / plen, tz = -mx / plen;
				const tl = Math.hypot(tx, tz) || 1;
				tx /= tl;
				tz /= tl;
				return { x: mx + tx * hold, y: my + hold * 0.35, z: mz + tz * hold, lx: mx, ly: my, lz: mz };
			}
			return null;
		}
		if (target.kind === "comet") {
			const comet = sys.comets.find((c) => c.id === target.id);
			if (!comet) return null;
			const [cx, cy, cz] = cometWorld(comet, worldTime);
			const hold = cometPark(comet);
			const plen = Math.hypot(cx, cy, cz) || 1;
			return {
				x: cx + (cz / plen) * hold,
				y: cy + hold * 0.4,
				z: cz + (-cx / plen) * hold,
				lx: cx, ly: cy, lz: cz,
			};
		}
		if (target.kind === "belt") {
			const belt = sys.belt;
			if (!belt) return null;
			const r = (belt.inner + belt.outer) * 0.5;
			const ang = Math.atan2(shipPos.z, shipPos.x) || 0.85;
			return { x: Math.cos(ang) * r, y: 18, z: Math.sin(ang) * r, lx: 0, ly: 0, lz: 0 };
		}
		if (target.kind === "station") {
			const stn = sys.stations.find((s) => s.id === target.id);
			const planet = stn ? sys.planets.find((p) => p.id === stn.planetId) : null;
			if (!stn || !planet) return null;
			const g = gateFrame(stn, planet, worldTime, 0);
			return {
				x: g.pos[0] + g.out[0] * 18,
				y: g.pos[1] + g.out[1] * 18,
				z: g.pos[2] + g.out[2] * 18,
				lx: g.pos[0], ly: g.pos[1], lz: g.pos[2],
			};
		}
		return null;
	}
	function commitBody(target) {
		navTarget = null;
		navName = null;
		if (target.kind === "planet") placeAtPlanet(target.id);
		else if (target.kind === "station") placeAtStation(target.id);
		else if (target.kind === "moon") placeAtMoon(target.id);
		else if (target.kind === "comet") placeAtComet(target.id);
		else if (target.kind === "belt") placeAtBelt();
		else placeInSystem(getStarwake().systemId);
	}
	function goToBody(target) {
		const st = getStarwake();
		if (!st.entered) return;
		if (mode === "charging" || mode === "hyperspace" || mode === "dropping" || mode === "docking" || mode === "berthed" || mode === "transit") return;
		if (alreadyThere(target)) {
			getStarwake().setMapOpen(false);
			return;
		}
		const body = bodyWorld(target, worldTime);
		navTarget = target;
		navName = body?.name ?? null;
		halt();
		getStarwake().setMapOpen(false);
		const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (reduce) {
			commitBody(target);
			punchT = .45;
			flashT = .4;
			return;
		}
		const park = parkPose(target);
		if (!park) {
			commitBody(target);
			return;
		}
		transitTarget = target;
		transitFrom.x = shipPos.x;
		transitFrom.y = shipPos.y;
		transitFrom.z = shipPos.z;
		const dist = Math.hypot(park.x - shipPos.x, park.y - shipPos.y, park.z - shipPos.z);
		transitDur = 0.92 + Math.min(1.55, Math.sqrt(Math.max(80, dist) / 2800) * 1.05);
		transitT = 0;
		cruiseAmt = 0;
		mode = "transit";
		getStarwake().setMode("transit");
		getStarwake().setCharge01(0);
		punchT = .5;
		flashT = .4;
		const def = fittedShip(st.shipId, st.loadout);
		audio.fireEngage(def.audioPitch * 1.06);
	}
	function lookAtBody(target, keepMap = false) {
		if (!getStarwake().entered) return;
		if (mode === "charging" || mode === "hyperspace" || mode === "dropping" || mode === "docking" || mode === "berthed" || mode === "transit") return;
		const now = performance.now();
		if (!keepMap && now - lastLookCmd < 180) return;
		if (!keepMap) {
			lastLookCmd = now;
			lookIgnoreUntil = now + 360;
		}
		lookDragging = false;
		if (navTarget && (target.kind === navTarget.kind && (target.kind === "star" || target.kind === "belt" || ("id" in target && "id" in navTarget && target.id === navTarget.id)))) {
			navTarget = null;
			navName = null;
			if (!keepMap) getStarwake().setMapOpen(false);
			pushDrive();
			return;
		}
		navTarget = target;
		const body = bodyWorld(target, worldTime);
		navName = body?.name ?? null;
		navDist = body ? Math.hypot(body.pos[0] - shipPos.x, body.pos[1] - shipPos.y, body.pos[2] - shipPos.z) : 0;
		if (body) faceWorld(body.pos[0] - shipPos.x, body.pos[1] - shipPos.y, body.pos[2] - shipPos.z);
		if (!keepMap) getStarwake().setMapOpen(false);
		pushDrive();
	}
	function hopTarget() {
		if (navTarget) return alreadyThere(navTarget) ? null : navTarget;
		if (!focusId) return null;
		const sysNow = getSystem(getStarwake().systemId);
		let target;
		if (focusId === "star") target = { kind: "star" };
		else if (focusId === "belt" && sysNow.belt) target = { kind: "belt" };
		else if (sysNow.stations.find((s) => s.id === focusId)) target = { kind: "station", id: focusId };
		else if (sysNow.planets.find((pl) => pl.id === focusId)) target = { kind: "planet", id: focusId };
		else if (sysNow.comets.find((c) => c.id === focusId)) target = { kind: "comet", id: focusId };
		else if (sysNow.planets.some((pl) => pl.moons.some((m) => m.id === focusId))) target = { kind: "moon", id: focusId };
		else return null;
		return alreadyThere(target) ? null : target;
	}
	function alreadyThere(target) {
		const body = bodyWorld(target, worldTime);
		if (!body) return true;
		const dist = Math.hypot(body.pos[0] - shipPos.x, body.pos[1] - shipPos.y, body.pos[2] - shipPos.z);
		if (target.kind === "star") {
			const sysNow = getSystem(getStarwake().systemId);
			return dist < Math.max(240, sysNow.starRadius * 3.1);
		}
		if (target.kind === "station") return dist < 28;
		if (target.kind === "belt") {
			const belt = getSystem(getStarwake().systemId).belt;
			return belt ? inBelt(belt, shipPos.x, shipPos.y, shipPos.z) : false;
		}
		if (target.kind === "comet") {
			const c = getSystem(getStarwake().systemId).comets.find((co) => co.id === target.id);
			return dist < (c ? cometPark(c) * 1.5 : 24);
		}
		if (target.kind === "moon") {
			for (const pl of getSystem(getStarwake().systemId).planets) {
				const m = pl.moons.find((mo) => mo.id === target.id);
				if (m) return dist < moonPark(m) * 1.7;
			}
			return dist < 22;
		}
		const p = getSystem(getStarwake().systemId).planets.find((pl) => pl.id === target.id);
		return dist < (p ? (p.rings ? p.ringOuter * 1.08 : planetPark(p) * 1.85) : 42);
	}
	function hopEta() {
		const d = navName ? navDist : focusName ? focusDist : 0;
		if (!(d > 1) || lastWorldSpeed < 0.08) return null;
		return d / lastWorldSpeed;
	}
	function canFireJump() {
		const st = getStarwake();
		if (!st.entered) return false;
		if (mode === "charging" || mode === "hyperspace" || mode === "dropping" || mode === "docking" || mode === "berthed" || mode === "transit") return false;
		const lock = st.lockedSystemId;
		if (lock && lock !== st.systemId) {
			const def = fittedShip(st.shipId, st.loadout);
			return Boolean(nextHop(getSystem(st.systemId), getSystem(lock), def.jumpRangeLy));
		}
		return Boolean(hopTarget());
	}
	function bodyWorld(target, t) {
		const sysNow = getSystem(getStarwake().systemId);
		if (target.kind === "star") return {
			pos: [
				0,
				0,
				0
			],
			name: sysNow.name
		};
		if (target.kind === "station") {
			const stn = sysNow.stations.find((s) => s.id === target.id);
			const planet = stn ? sysNow.planets.find((p) => p.id === stn.planetId) : null;
			if (!stn || !planet) return null;
			return {
				pos: stationWorld(stn, planet, t),
				name: stn.name
			};
		}
		if (target.kind === "belt") {
			const belt = sysNow.belt;
			if (!belt) return null;
			const r = (belt.inner + belt.outer) * 0.5;
			const ang = Math.atan2(shipPos.z, shipPos.x);
			return {
				pos: [Math.cos(ang) * r, 0, Math.sin(ang) * r],
				name: belt.name
			};
		}
		if (target.kind === "comet") {
			const c = sysNow.comets.find((co) => co.id === target.id);
			if (!c) return null;
			return { pos: cometWorld(c, t), name: c.name };
		}
		if (target.kind === "moon") {
			for (const pl of sysNow.planets) {
				const m = pl.moons.find((mo) => mo.id === target.id);
				if (m) return { pos: moonWorld(pl, m, t), name: m.name };
			}
			return null;
		}
		const p = sysNow.planets.find((pl) => pl.id === target.id);
		if (!p) return null;
		return {
			pos: planetWorld(p, t),
			name: p.name
		};
	}
	function buildWorldView() {
		quatToMat4(invOrient, quatInvert(orientQuat));
		translation(tmpA, -shipPos.x, -shipPos.y, -shipPos.z);
		multiply(tmpB, invOrient, tmpA);
		multiply(worldView, view, tmpB);
	}
	function projectWorld(px, py, pz) {
		const vx = worldView[0] * px + worldView[4] * py + worldView[8] * pz + worldView[12];
		const vy = worldView[1] * px + worldView[5] * py + worldView[9] * pz + worldView[13];
		const vz = worldView[2] * px + worldView[6] * py + worldView[10] * pz + worldView[14];
		if (vz >= -.25) return null;
		return {
			ndcX: proj[0] * vx / -vz,
			ndcY: proj[5] * vy / -vz,
			vz
		};
	}
	function updateFocus(dt, jumping, steering = false) {
		if (!getStarwake().entered || jumping) {
			focusId = null;
			focusName = null;
			focusVisible = false;
			focusDist = 0;
			atPlanet = null;
			atPlanetId = null;
			return;
		}
		const sysNow = getSystem(getStarwake().systemId);
		let bestId = null;
		let bestName = null;
		let bestR = 99;
		let bestPos = null;
		let bestDist = 0;
		let nearName = null;
		let nearId = null;
		let nearDist = Infinity;
		let nearProx = 0;
		atStation = null;
		atStationId = null;
		let nearStDist = Infinity;
		const consider = (id, name, x, y, z, radius) => {
			const dist = Math.hypot(x - shipPos.x, y - shipPos.y, z - shipPos.z);
			const pr = projectWorld(x, y, z);
			if (!pr) return;
			const ndcR = Math.hypot(pr.ndcX, pr.ndcY);
			const ang = Math.atan2(Math.max(radius, 1), Math.max(dist, 1));
			const disk = Math.max(0.04, Math.min(0.24, ang * 2.6));
			const held = focusId === id && ndcR < FOCUS_OUT + disk;
			const hit = ndcR < FOCUS_IN + disk;
			if (!hit && !held) return;
			const score = ndcR / Math.max(0.05, disk);
			if (score < bestR) {
				bestR = score;
				bestId = id;
				bestName = name;
				bestPos = [x, y, z];
				bestDist = dist;
			}
		};
		consider("star", sysNow.name, 0, 0, 0, sysNow.starRadius);
		for (const p of sysNow.planets) {
			const [x, y, z] = planetWorld(p, worldTime);
			const dist = Math.hypot(x - shipPos.x, y - shipPos.y, z - shipPos.z);
			const prox = planetProximity(p);
			if (dist < prox && dist < nearDist) {
				nearDist = dist;
				nearName = p.name;
				nearId = p.id;
				nearProx = prox;
			}
			consider(p.id, p.name, x, y, z, p.radius);
			for (const m of p.moons) {
				const [mx, my, mz] = moonWorld(p, m, worldTime);
				const md = Math.hypot(mx - shipPos.x, my - shipPos.y, mz - shipPos.z);
				const mprox = moonProximity(m);
				if (md < mprox && md < nearDist) {
					nearDist = md;
					nearName = m.name;
					nearId = m.id;
					nearProx = mprox;
				}
				consider(m.id, m.name, mx, my, mz, m.radius);
			}
		}
		for (const c of sysNow.comets) {
			const [x, y, z] = cometWorld(c, worldTime);
			const dist = Math.hypot(x - shipPos.x, y - shipPos.y, z - shipPos.z);
			const prox = cometProximity(c);
			if (dist < prox && dist < nearDist) {
				nearDist = dist;
				nearName = c.name;
				nearId = c.id;
				nearProx = prox;
			}
			consider(c.id, c.name, x, y, z, c.radius * 1.8);
		}
		if (sysNow.belt && inBelt(sysNow.belt, shipPos.x, shipPos.y, shipPos.z)) {
			if (40 < nearDist) {
				nearDist = 40;
				nearName = sysNow.belt.name;
				nearId = sysNow.belt.id;
				nearProx = (sysNow.belt.outer - sysNow.belt.inner) * 0.5;
			}
		}
		if (sysNow.belt) {
			const r = (sysNow.belt.inner + sysNow.belt.outer) * 0.5;
			const ang = Math.atan2(shipPos.z, shipPos.x);
			consider("belt", sysNow.belt.name, Math.cos(ang) * r, 0, Math.sin(ang) * r, 40);
		}
		for (const stn of sysNow.stations) {
			const planet = sysNow.planets.find((p) => p.id === stn.planetId);
			if (!planet) continue;
			const [x, y, z] = stationWorld(stn, planet, worldTime);
			const dist = Math.hypot(x - shipPos.x, y - shipPos.y, z - shipPos.z);
			const prox = stationProximity(stn);
			if (dist < prox && dist < nearStDist) {
				nearStDist = dist;
				atStation = stn.name;
				atStationId = stn.id;
			} else if (navTarget?.kind === "station" && navTarget.id === stn.id && dist < prox * 2.2 && dist < nearStDist) {
				nearStDist = dist;
				atStation = stn.name;
				atStationId = stn.id;
			}
			consider(stn.id, stn.name, x, y, z, stn.radius);
		}
		atPlanet = nearName;
		atPlanetId = nearId;
		atDist = nearName ? nearDist : 0;
		atProx = nearProx;
		if (nearId) getStarwake().visitPlanet(sysNow.id, nearId);
		if (navTarget) {
			const body = bodyWorld(navTarget, worldTime);
			if (!body) {
				navTarget = null;
				navName = null;
			} else {
				navName = body.name;
				navDist = Math.hypot(body.pos[0] - shipPos.x, body.pos[1] - shipPos.y, body.pos[2] - shipPos.z);
				focusId = navTarget.kind === "star" ? "star" : navTarget.id;
				focusName = body.name;
				focusDist = navDist;
				if (mode === "docking") {
					const rec = 1 - Math.exp(-5.5 * dt);
					lookYaw *= 1 - rec;
					lookPitch *= 1 - rec;
				}
				buildWorldView();
				const pr = projectWorld(body.pos[0], body.pos[1], body.pos[2]);
				focusVisible = Boolean(pr);
				focusNdcX = pr ? pr.ndcX : 0;
				focusNdcY = pr ? pr.ndcY : 0;
				return;
			}
		}
		if (bestId && bestName && bestPos) {
			focusId = bestId;
			focusName = bestName;
			focusDist = bestDist;
			const pr = projectWorld(bestPos[0], bestPos[1], bestPos[2]);
			focusVisible = Boolean(pr);
			focusNdcX = pr ? pr.ndcX : 0;
			focusNdcY = pr ? pr.ndcY : 0;
		} else {
			focusId = null;
			focusName = null;
			focusDist = 0;
			focusVisible = false;
		}
	}
	function tryJump() {
		const st = getStarwake();
		if (!st.entered) return;
		if (mode === "charging" || mode === "hyperspace" || mode === "dropping" || mode === "docking" || mode === "berthed" || mode === "transit") return;
		const lock = st.lockedSystemId;
		const here = getSystem(st.systemId);
		if (lock && lock !== here.id) {
		const dest = getSystem(lock);
		const def = fittedShip(st.shipId, st.loadout);
		const hop = nextHop(here, dest, def.jumpRangeLy);
		if (!hop) return;
		pendingDest = hop.id;
		mode = "charging";
		chargeT = 0;
		navTarget = null;
		navName = null;
		getStarwake().setMode("charging");
		getStarwake().setMapOpen(false);
		return;
		}
		const hop = hopTarget();
		if (hop) goToBody(hop);
	}
	function stationPair(id) {
		const sysNow = getSystem(getStarwake().systemId);
		const stn = sysNow.stations.find((s) => s.id === id);
		const planet = stn ? sysNow.planets.find((p) => p.id === stn.planetId) : null;
		if (!stn || !planet) return null;
		return {
			stn,
			planet
		};
	}
	function requestDock() {
		if (!getStarwake().entered) return;
		if (mode === "charging" || mode === "hyperspace" || mode === "dropping" || mode === "berthed" || mode === "docking" || mode === "transit") return;
		if (mode === "docked") {
			mode = "local";
			getStarwake().setMode("local");
		}
		let id = atStationId;
		if (!id && navTarget?.kind === "station") id = navTarget.id;
		if (!id) {
			const sysNow = getSystem(getStarwake().systemId);
			let best = Infinity;
			for (const stn of sysNow.stations) {
				const planet = sysNow.planets.find((p) => p.id === stn.planetId);
				if (!planet) continue;
				const [x, y, z] = stationWorld(stn, planet, worldTime);
				const dist = Math.hypot(x - shipPos.x, y - shipPos.y, z - shipPos.z);
				if (dist < stationProximity(stn) * 1.8 && dist < best) {
					best = dist;
					id = stn.id;
				}
			}
		}
		if (!id) return;
		const pair = stationPair(id);
		if (!pair) return;
		dockStationId = id;
		dockGate = pickApproachGate(pair.stn, pair.planet, worldTime, shipPos.x, shipPos.y, shipPos.z);
		mode = "docking";
		getStarwake().setMode("docking");
		navTarget = {
			kind: "station",
			id
		};
		navName = pair.stn.name;
		boundId = pair.planet.id;
		boundName = pair.planet.name;
		lookYaw = 0;
		lookPitch = 0;
		applyThrottle(Math.min(throttle, .26));
		pushDrive();
	}
	function requestSurvey() {
		if (!getStarwake().entered) return;
		if (mode !== "local") return;
		const sysNow = getSystem(getStarwake().systemId);
		let id = atPlanetId;
		if (!id && navTarget) {
			if (navTarget.kind === "belt") id = sysNow.belt?.id;
			else if (navTarget.kind !== "star" && navTarget.kind !== "station") id = navTarget.id;
		}
		if (!id) return;
		const e = getCatalog(sysNow.id, id);
		if (!e || !e.wild || !e.prospect) return;
		const st = getStarwake();
		if (st.surveys[id]) return;
		if (boundId !== id && atPlanetId !== id) return;
		st.scanPlanet(id);
		if (surveyPlanetId !== id) {
			surveyPlanetId = id;
			surveyT = 0;
		}
		surveying = true;
		surveyPaused = false;
		pushDrive();
	}
	function completeSurveyQa() {
		const sysNow = getSystem(getStarwake().systemId);
		let id = atPlanetId ?? surveyPlanetId;
		if (!id && navTarget) {
			if (navTarget.kind === "belt") id = sysNow.belt?.id;
			else if (navTarget.kind !== "star" && navTarget.kind !== "station") id = navTarget.id;
		}
		if (!id) return false;
		const e = getCatalog(sysNow.id, id);
		if (!e || !e.wild) return false;
		getStarwake().scanPlanet(id);
		getStarwake().logSurvey(id);
		surveying = false;
		surveyPaused = false;
		surveyT = 1;
		surveyPlanetId = id;
		punchT = .35;
		flashT = .4;
		pushDrive();
		return true;
	}
	function cancelDock() {
		if (mode !== "docking") return;
		mode = "local";
		getStarwake().setMode("local");
		dockStationId = null;
		lookYaw = 0;
		lookPitch = 0;
		pushDrive();
	}
	function berthNow() {
		const id = dockStationId ?? atStationId;
		if (!id) return;
		const pair = stationPair(id);
		if (!pair) return;
		const g = gateFrame(pair.stn, pair.planet, worldTime, dockGate);
		shipPos.x = g.pos[0] - g.out[0] * 1.1;
		shipPos.y = g.pos[1] - g.out[1] * 1.1;
		shipPos.z = g.pos[2] - g.out[2] * 1.1;
		const stt = keplerState(pair.planet, worldTime);
		shipVel.x = stt.vel[0];
		shipVel.y = stt.vel[1];
		shipVel.z = stt.vel[2];
		orientQuat = quatLook(-g.out[0], -g.out[1], -g.out[2]);
		halt();
		applyThrottle(0);
		dockStationId = id;
		atStationId = id;
		atStation = pair.stn.name;
		boundId = pair.planet.id;
		boundName = pair.planet.name;
		mode = "berthed";
		getStarwake().setMode("berthed");
		getStarwake().setMapOpen(false);
		punchT = .35;
		flashT = .4;
		pushDrive();
	}
	function undockFromStation() {
		if (mode !== "berthed" && mode !== "docking") return;
		const id = dockStationId ?? atStationId;
		const pair = id ? stationPair(id) : null;
		if (pair) {
			const g = gateFrame(pair.stn, pair.planet, worldTime, dockGate);
			const ox = g.out[0], oy = g.out[1], oz = g.out[2];
			shipPos.x = g.pos[0] + ox * 16;
			shipPos.y = g.pos[1] + oy * 16;
			shipPos.z = g.pos[2] + oz * 16;
			const stt = keplerState(pair.planet, worldTime);
			const leave = 3.4;
			shipVel.x = stt.vel[0] + ox * leave;
			shipVel.y = stt.vel[1] + oy * leave;
			shipVel.z = stt.vel[2] + oz * leave;
			lastWorldSpeed = leave;
			orientQuat = quatLook(ox, oy, oz);
			headingYaw = Math.atan2(-ox, -oz);
			shipRoll = 0;
			bankRoll = 0;
			lookYaw = 0;
			lookPitch = 0;
			boundId = pair.planet.id;
			boundName = pair.planet.name;
			atStationId = pair.stn.id;
			atStation = pair.stn.name;
		}
		navTarget = null;
		navName = null;
		mode = "local";
		getStarwake().setMode("local");
		dockStationId = null;
		applyThrottle(.2);
		pushDrive();
	}
	function dockAtQa(id) {
		const pair = stationPair(id);
		if (!pair) return;
		atStationId = id;
		atStation = pair.stn.name;
		dockStationId = id;
		dockGate = 0;
		placeAtStation(id);
		berthNow();
	}
	const ext = gl.getExtension("ANGLE_instanced_arrays");
	const countStars = () => window.innerWidth <= 640 ? 2600 : 4200;
	const KIND_CODE = {
		rocky: 1,
		desert: 2,
		ocean: 3,
		ice: 4,
		volcanic: 5,
		gas: 6,
		ringed: 7,
		icegiant: 9,
		comet: 10
	};
	function seedOf(id) {
		let h = 2166136261;
		for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
		return (h >>> 0) / 4294967296;
	}
	function warpOverlayAmt() {
		if (reduceMotion) return 0;
		if (mode === "transit") return Math.min(1, cruiseAmt * 0.88);
		return jumpAmt;
	}
	function drawWarp(amt, cruise) {
		if (!warpProg || amt < 0.012) return;
		gl.disable(gl.DEPTH_TEST);
		gl.depthMask(false);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		gl.useProgram(warpProg);
		gl.uniform1f(loc(gl, warpProg, "uAmt"), amt);
		gl.uniform1f(loc(gl, warpProg, "uTime"), warpTime);
		gl.uniform1f(loc(gl, warpProg, "uCruise"), cruise ? 1 : 0);
		gl.uniform2f(loc(gl, warpProg, "uRes"), canvas.width, canvas.height);
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
		const uv = gl.getAttribLocation(warpProg, "aUv");
		gl.enableVertexAttribArray(uv);
		gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
		if (ext) ext.vertexAttribDivisorANGLE(uv, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		disableAttribs(gl);
		gl.depthMask(true);
	}
	function drawBody(px, py, pz, radius, color, emissive, cam, kind = 8, seed = .37) {
		composeModel(model, px, py, pz, radius);
		gl.useProgram(bodyProg);
		gl.uniformMatrix4fv(loc(gl, bodyProg, "uProj"), false, proj);
		gl.uniformMatrix4fv(loc(gl, bodyProg, "uView"), false, worldView);
		gl.uniformMatrix4fv(loc(gl, bodyProg, "uModel"), false, model);
		gl.uniform3f(loc(gl, bodyProg, "uColor"), color[0], color[1], color[2]);
		gl.uniform3f(loc(gl, bodyProg, "uSunPos"), 0, 0, 0);
		gl.uniform3f(loc(gl, bodyProg, "uCamPos"), cam[0], cam[1], cam[2]);
		gl.uniform1f(loc(gl, bodyProg, "uEmissive"), emissive);
		gl.uniform1f(loc(gl, bodyProg, "uKind"), kind);
		gl.uniform1f(loc(gl, bodyProg, "uSeed"), seed);
		gl.bindBuffer(gl.ARRAY_BUFFER, sphPosBuf);
		const ap = gl.getAttribLocation(bodyProg, "aPosition");
		gl.enableVertexAttribArray(ap);
		gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, sphNrmBuf);
		const an = gl.getAttribLocation(bodyProg, "aNormal");
		gl.enableVertexAttribArray(an);
		gl.vertexAttribPointer(an, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, sphere.count);
		disableAttribs(gl);
	}
	function drawPrim(mesh, color, emissive, cam, kind, seed) {
		gl.useProgram(bodyProg);
		gl.uniformMatrix4fv(loc(gl, bodyProg, "uProj"), false, proj);
		gl.uniformMatrix4fv(loc(gl, bodyProg, "uView"), false, worldView);
		gl.uniformMatrix4fv(loc(gl, bodyProg, "uModel"), false, model);
		gl.uniform3f(loc(gl, bodyProg, "uColor"), color[0], color[1], color[2]);
		gl.uniform3f(loc(gl, bodyProg, "uSunPos"), 0, 0, 0);
		gl.uniform3f(loc(gl, bodyProg, "uCamPos"), cam[0], cam[1], cam[2]);
		gl.uniform1f(loc(gl, bodyProg, "uEmissive"), emissive);
		gl.uniform1f(loc(gl, bodyProg, "uKind"), kind);
		gl.uniform1f(loc(gl, bodyProg, "uSeed"), seed);
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
		const ap = gl.getAttribLocation(bodyProg, "aPosition");
		gl.enableVertexAttribArray(ap);
		gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nrm);
		const an = gl.getAttribLocation(bodyProg, "aNormal");
		gl.enableVertexAttribArray(an);
		gl.vertexAttribPointer(an, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
		disableAttribs(gl);
	}
	function stnWorld(f, r, u, o) {
		return [
			f.hub[0] + f.right[0] * r + f.up[0] * u + f.out[0] * o,
			f.hub[1] + f.right[1] * r + f.up[1] * u + f.out[1] * o,
			f.hub[2] + f.right[2] * r + f.up[2] * u + f.out[2] * o
		];
	}
	function stnAxis(f, r, u, o) {
		return [
			f.right[0] * r + f.up[0] * u + f.out[0] * o,
			f.right[1] * r + f.up[1] * u + f.out[1] * o,
			f.right[2] * r + f.up[2] * u + f.out[2] * o
		];
	}
	function drawStation(stn, planet, cam) {
		const f = stationFrame(stn, planet, worldTime);
		const [hx, hy, hz] = f.hub;
		const dist = Math.hypot(hx - cam[0], hy - cam[1], hz - cam[2]);
		const lod = stationLod(dist, stn.ringR);
		const seed = seedOf(stn.id);
		const parts = layoutStation(stn, lod);
		for (let i = 0; i < parts.length; i++) {
			const p = parts[i];
			const pos = stnWorld(f, p.p[0], p.p[1], p.p[2]);
			const ax = stnAxis(f, p.ax[0], p.ax[1], p.ax[2]);
			if (p.along === "z") composeAlongZ(model, pos[0], pos[1], pos[2], ax[0], ax[1], ax[2], p.s[0], p.s[1], p.s[2]);
			else composeAlongY(model, pos[0], pos[1], pos[2], ax[0], ax[1], ax[2], p.s[0], p.s[1], p.s[2]);
			drawPrim(MESH[p.mesh] || stnSphere, p.color, p.emit, cam, p.shade, seed + i * 0.017);
		}
		const occ = occupiedGates(stn);
		const docking = mode === "docking" && dockStationId === stn.id;
		if (lod > 0) {
			for (let i = 0; i < 10; i++) {
				const g = gateFrame(stn, planet, worldTime, i);
				const lit = docking && i === dockGate;
				const col = lit ? [0.92, 0.94, 0.98] : occ[i] ? [0.34, 0.36, 0.4] : stn.accent;
				composeAlongY(model, g.pos[0], g.pos[1], g.pos[2], g.out[0], g.out[1], g.out[2], lit ? 1.05 : 0.82, 2.4, lit ? 1.05 : 0.82);
				drawPrim(stnCyl, col, lit ? 0.55 : occ[i] ? 0.04 : 0.16, cam, lit ? DOCK : HULL, seed);
				drawBody(g.pos[0] + g.out[0] * 1.15, g.pos[1] + g.out[1] * 1.15, g.pos[2] + g.out[2] * 1.15, lit ? 0.72 : 0.48, col, lit ? 0.7 : occ[i] ? 0.04 : 0.22, cam, DOCK, seed);
				if (occ[i] && lod > 1) {
					const sx = g.pos[0] - g.out[0] * 2.35;
					const sy = g.pos[1] - g.out[1] * 2.35;
					const sz = g.pos[2] - g.out[2] * 2.35;
					composeAlongY(model, sx, sy, sz, g.out[0], g.out[1], g.out[2], 0.38, 2.1, 0.38);
					drawPrim(stnCyl, [0.28, 0.3, 0.34], 0.02, cam, HULL, seed);
					drawBody(sx - g.out[0] * 1.05, sy - g.out[1] * 1.05, sz - g.out[2] * 1.05, 0.38, [0.32, 0.34, 0.38], 0.03, cam, HULL, seed);
				}
			}
		}
		if (ringProg) drawRing(hx, hy, hz, stn.ringR, cam, docking ? 0.55 : 0.22);
	}
	function drawRing(cx, cy, cz, radius, cam, alpha) {
		if (!ringProg) return;
		let fx = cx - cam[0], fy = cy - cam[1], fz = cz - cam[2];
		const fl = Math.hypot(fx, fy, fz) || 1;
		fx /= fl;
		fy /= fl;
		fz /= fl;
		let ux = 0, uy = 1, uz = 0;
		if (Math.abs(fy) > .92) {
			ux = 1;
			uy = 0;
		}
		let xx = uy * fz - uz * fy;
		let xy = uz * fx - ux * fz;
		let xz = ux * fy - uy * fx;
		const xl = Math.hypot(xx, xy, xz) || 1;
		xx /= xl;
		xy /= xl;
		xz /= xl;
		const yx = fy * xz - fz * xy;
		const yy = fz * xx - fx * xz;
		const yz = fx * xy - fy * xx;
		gl.useProgram(ringProg);
		gl.uniformMatrix4fv(loc(gl, ringProg, "uProj"), false, proj);
		gl.uniformMatrix4fv(loc(gl, ringProg, "uView"), false, worldView);
		gl.uniform3f(loc(gl, ringProg, "uCenter"), cx, cy, cz);
		gl.uniform3f(loc(gl, ringProg, "uAxisX"), xx, xy, xz);
		gl.uniform3f(loc(gl, ringProg, "uAxisY"), yx, yy, yz);
		gl.uniform1f(loc(gl, ringProg, "uRadius"), radius);
		gl.uniform3f(loc(gl, ringProg, "uColor"), .82, .84, .88);
		gl.uniform1f(loc(gl, ringProg, "uAlpha"), alpha);
		gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf);
		const au = gl.getAttribLocation(ringProg, "aUnit");
		if (au < 0) return;
		gl.enableVertexAttribArray(au);
		gl.vertexAttribPointer(au, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINE_LOOP, 0, RING_N);
		disableAttribs(gl);
	}
	function drawEqRing(cx, cy, cz, radius, tilt, color, alpha) {
		if (!ringProg) return;
		const c = Math.cos(tilt);
		const s = Math.sin(tilt);
		gl.useProgram(ringProg);
		gl.uniformMatrix4fv(loc(gl, ringProg, "uProj"), false, proj);
		gl.uniformMatrix4fv(loc(gl, ringProg, "uView"), false, worldView);
		gl.uniform3f(loc(gl, ringProg, "uCenter"), cx, cy, cz);
		gl.uniform3f(loc(gl, ringProg, "uAxisX"), 1, 0, 0);
		gl.uniform3f(loc(gl, ringProg, "uAxisY"), 0, s, c);
		gl.uniform1f(loc(gl, ringProg, "uRadius"), radius);
		gl.uniform3f(loc(gl, ringProg, "uColor"), color[0], color[1], color[2]);
		gl.uniform1f(loc(gl, ringProg, "uAlpha"), alpha);
		gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf);
		const au = gl.getAttribLocation(ringProg, "aUnit");
		if (au < 0) return;
		gl.enableVertexAttribArray(au);
		gl.vertexAttribPointer(au, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINE_LOOP, 0, RING_N);
		disableAttribs(gl);
	}
	function tick(now) {
		if (!running) return;
		try {
			const rawDt = (now - last) / 1e3;
			const dt = Math.min(Math.max(rawDt, 0), .1);
			const clockDt = Math.min(Math.max(rawDt, 0), .25);
			last = now;
			lastDt = dt;
			worldTime += dt;
			const st = getStarwake();
			audio.setMuted(st.muted);
			const def = fittedShip(st.shipId, st.loadout);
			const entered = st.entered;
			if (entered && st.shipId !== fuelShip) syncFuelFromStore();
			if (!entered) {
				flushFuel();
				fuelShip = st.shipId;
				fuelLocal = st.fuel[st.shipId] ?? tankCap();
			}
			if (entered && mode === "docked") {
				mode = "local";
				getStarwake().setMode("local");
			}
			if (jumpQueued) {
				jumpQueued = false;
				tryJump();
			}
			let yawInput = 0, pitchInput = 0, rollInput = 0;
			const invX = st.invertX ? -1 : 1;
			const invY = st.invertY ? -1 : 1;
			if (held("ArrowLeft")) yawInput += 1 * invX;
			if (held("ArrowRight")) yawInput -= 1 * invX;
			if (held("KeyW") || held("ArrowUp")) pitchInput -= 1 * invY;
			if (held("KeyS") || held("ArrowDown")) pitchInput += 1 * invY;
			if (held("KeyQ")) rollInput += 1;
			if (held("KeyE")) rollInput -= 1;
			if (qaSteer != null) yawInput = qaSteer;
			yawInput += -shapeAxis(stickX, .08) * invX;
			pitchInput += shapeAxis(stickY, .08) * invY;
			if (entered && st.gyro && gyroReady && !stickActive) {
				yawInput += -shapeAxis(gyroX, .1) * .9;
				pitchInput += shapeAxis(gyroY, .1) * .9;
			}
			if (!entered) {
				const t = now * .001;
				yawInput += Math.sin(t * .22) * .18;
				pitchInput += Math.sin(t * .16 + 1.1) * .09;
			}
			const inJump = mode === "charging" || mode === "hyperspace" || mode === "dropping" || mode === "transit";
			const inPort = mode === "docking" || mode === "berthed";
			const dry = fuelLocal <= .05;
			if (entered && !inJump && mode !== "berthed") {
				const thrRate = .72;
				let thrDelta = 0;
				if (held("KeyA")) thrDelta += 1;
				if (held("KeyZ") || held("KeyY")) thrDelta -= 1;
				if (thrDelta) applyThrottle(throttle + thrDelta * thrRate * dt);
			}
			const wantBoost = entered && !inJump && !inPort && !dry && throttle > BOOST_GATE && (boostHeld || held("Space") || held("ShiftLeft") || held("ShiftRight"));
			if (wantBoost && !boostWanted && !boostActive) {
				if (getStarwake().spendBoost()) {
					boostActive = true;
					boostLeft = def.boostSec;
					audio.fireBoost();
					pushDrive();
				}
			}
			if (!wantBoost) boostActive = false;
			boostWanted = wantBoost;
			if (boostActive) {
				boostLeft -= clockDt;
				if (boostLeft <= 0) boostActive = false;
			}
			if (overheated && throttle > OD_GATE) applyThrottle(OD_GATE);
			const inOverdrive = entered && !inJump && !overheated && throttle > OD_GATE;
			if (inOverdrive) {
				heat01 = Math.min(1, heat01 + clockDt / Math.max(1, def.overdriveSec));
				if (heat01 >= 1) {
					heat01 = 1;
					overheated = true;
					applyThrottle(OD_GATE);
					punchT = Math.max(punchT, .45);
				}
			} else {
				heat01 = Math.max(0, heat01 - clockDt / Math.max(2.2, def.coolSec));
				if (overheated && heat01 <= .12) overheated = false;
			}
			if (mode === "charging") {
				chargeT += clockDt / Math.max(.4, def.fsdChargeSec);
				if (chargeT >= 1) {
					mode = "hyperspace";
					hyperT = 0;
					getStarwake().setMode("hyperspace");
					getStarwake().setCharge01(1);
					punchT = 1;
					flashT = 1;
					audio.fireEngage(def.audioPitch);
					for (let k = 0; k < 3; k++) spawnRing(true);
				}
			} else if (mode === "hyperspace") {
				hyperT += clockDt;
				if (hyperT >= HYPER_SEC) {
					const dest = pendingDest ?? st.lockedSystemId ?? st.systemId;
					pendingDest = null;
					arrive(dest);
					mode = "dropping";
					dropT = .55;
					getStarwake().setMode("dropping");
					getStarwake().setCharge01(0);
				}
			} else if (mode === "transit") {
				transitT += clockDt / Math.max(0.45, transitDur);
				const u = clamp(transitT, 0, 1);
				const park = parkPose(transitTarget);
				if (!park || !transitTarget) {
					mode = "local";
					getStarwake().setMode("local");
					cruiseAmt = 0;
				} else {
					let e;
					if (u < 0.12) e = (u / 0.12) * 0.03;
					else if (u > 0.86) {
						const v = (u - 0.86) / 0.14;
						e = 0.9 + 0.1 * (1 - (1 - v) * (1 - v));
					} else {
						const v = (u - 0.12) / 0.74;
						e = 0.03 + 0.87 * (v * v * (3 - 2 * v));
					}
					const ax = transitFrom.x, ay = transitFrom.y, az = transitFrom.z;
					const bx = park.x, by = park.y, bz = park.z;
					const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5, mz = (az + bz) * 0.5;
					const midR = Math.hypot(mx, my, mz);
					const starClear = getSystem(st.systemId).starRadius * 2.6;
					let hx = 0, hy = Math.min(220, Math.hypot(bx - ax, by - ay, bz - az) * 0.045), hz = 0;
					if (midR < starClear) {
						const lift = (starClear - midR) * 1.35;
						let px = az - bz, pz = bx - ax;
						const pl = Math.hypot(px, pz);
						if (pl < 1e-4) { px = 0; pz = 1; }
						else { px /= pl; pz /= pl; }
						hx = px * lift;
						hy = lift * 0.55;
						hz = pz * lift;
					}
					const cx = mx + hx, cy = my + hy, cz = mz + hz;
					const omt = 1 - e;
					const px = omt * omt * ax + 2 * omt * e * cx + e * e * bx;
					const py = omt * omt * ay + 2 * omt * e * cy + e * e * by;
					const pz = omt * omt * az + 2 * omt * e * cz + e * e * bz;
					const ddt = Math.max(1e-4, clockDt);
					shipVel.x = (px - shipPos.x) / ddt;
					shipVel.y = (py - shipPos.y) / ddt;
					shipVel.z = (pz - shipPos.z) / ddt;
					lastWorldSpeed = 7 + cruiseAmt * 26;
					shipPos.x = px;
					shipPos.y = py;
					shipPos.z = pz;
					const want = faceQuat(park.lx - px, park.ly - py, park.lz - pz);
					orientQuat = quatSlerp(orientQuat, want, 1 - Math.exp(-9.5 * dt));
					headingYaw = Math.atan2(-(park.lx - px), -(park.lz - pz));
					lookYaw = 0;
					lookPitch = 0;
					navDist = Math.hypot(park.lx - px, park.ly - py, park.lz - pz);
					const targetCruise = u < 0.1 ? u / 0.1 * 0.55 : u < 0.82 ? 0.82 : Math.max(0, (1 - u) / 0.18) * 0.82;
					cruiseAmt += (targetCruise - cruiseAmt) * (1 - Math.exp(-6.2 * dt));
					if (u >= 1) {
						commitBody(transitTarget);
						transitTarget = null;
						cruiseAmt = 0;
						mode = "dropping";
						dropT = 0.5;
						getStarwake().setMode("dropping");
						getStarwake().setCharge01(0);
						punchT = 1;
						flashT = 1;
						audio.fireDrop(def.audioPitch);
					}
				}
			} else if (mode === "dropping") {
				dropT -= clockDt;
				if (dropT <= 0) {
					mode = "local";
					getStarwake().setMode("local");
				}
			}
			const targetBoost = boostActive || inOverdrive ? 1 : 0;
			const boostLerp = targetBoost ? 5.2 : 7.2;
			boostAmt += (targetBoost - boostAmt) * (1 - Math.exp(-boostLerp * dt));
			const targetJump = mode === "hyperspace" ? 1 : mode === "charging" ? clamp(chargeT, 0, 1) * .35 : 0;
			jumpAmt += (targetJump - jumpAmt) * (1 - Math.exp(-5 * dt));
			if (mode !== "transit") cruiseAmt += (0 - cruiseAmt) * (1 - Math.exp(-6 * dt));
			punchT = Math.max(0, punchT - dt * 3.2);
			flashT = Math.max(0, flashT - dt * 4.5);
			if (!lookDragging && !focusId && !navTarget) {
				const rec = 1 - Math.exp(-1.6 * dt);
				lookYaw *= 1 - rec;
				lookPitch *= 1 - rec;
			}
			const lockedTurn = inJump ? .15 : mode === "docking" ? .78 : 1;
			const targetSteerX = clamp(yawInput, -1, 1);
			const targetSteerY = clamp(pitchInput, -1, 1);
			const targetSteerR = clamp(rollInput, -1, 1);
			const follow = 1 - Math.exp(-11 * dt);
			const rollFollow = 1 - Math.exp(-6.2 * dt);
			steerX += (targetSteerX - steerX) * follow;
			steerY += (targetSteerY - steerY) * follow;
			steerR += (targetSteerR - steerR) * rollFollow;
			const turnRate = def.turnRate * (1 - boostAmt * .2) * lockedTurn;
			const yawDelta = steerX * turnRate * dt;
			const pitchDelta = steerY * turnRate * .85 * dt;
			const rollDelta = steerR * turnRate * .42 * dt;
			headingYaw += yawDelta;
			shipRoll += rollDelta;
			bankRoll += (steerR * .28 - bankRoll) * rollFollow;
			const cyL = Math.cos(lookYaw), syL = Math.sin(lookYaw);
			const cpL = Math.cos(lookPitch), spL = Math.sin(lookPitch);
			const camRight = [
				cyL,
				0,
				syL
			];
			const camUp = [
				spL * syL,
				cpL,
				-spL * cyL
			];
			const camFwd = [
				cpL * syL,
				-spL,
				-cpL * cyL
			];
			let qDelta = [
				0,
				0,
				0,
				1
			];
			if (Math.abs(yawDelta) > 1e-9) qDelta = quatMul(qDelta, quatFromAxisAngle(camUp[0], camUp[1], camUp[2], yawDelta));
			if (Math.abs(pitchDelta) > 1e-9) qDelta = quatMul(qDelta, quatFromAxisAngle(camRight[0], camRight[1], camRight[2], pitchDelta));
			if (Math.abs(rollDelta) > 1e-9) qDelta = quatMul(qDelta, quatFromAxisAngle(camFwd[0], camFwd[1], camFwd[2], rollDelta));
			const qInv = quatInvert(qDelta);
			orientQuat = quatNormalize(quatMul(orientQuat, qDelta));
			let drive = 0;
			if (entered) {
				if (boostActive) drive = def.overdriveSpeed;
				else {
					const t = overheated ? Math.min(throttle, OD_GATE) : throttle;
					if (t <= OD_GATE) drive = t / OD_GATE * def.cruiseSpeed;
					else {
						const k = (t - OD_GATE) / .25;
						drive = def.cruiseSpeed + k * (def.overdriveSpeed - def.cruiseSpeed);
					}
				}
			}
			if (dry) {
				drive = 0;
				boostActive = false;
			}
			if (mode === "docking" && throttle > .26) applyThrottle(.26);
			if (mode === "berthed") drive = 0;
			if (entered && !inJump && drive > .04) {
				const load = drive / Math.max(.8, def.cruiseSpeed);
				const burn = drive * dt * T1_PER_DIST * (load > 1 ? 1.25 : 1);
				fuelLocal = Math.max(0, fuelLocal - burn);
				fuelFlush += dt;
				if (fuelFlush > 1.6 || fuelLocal <= .05) {
					fuelFlush = 0;
					flushFuel();
				}
			}
			if (inPort) {
				const pair = stationPair(dockStationId ?? atStationId ?? "");
				if (!pair) {
					if (mode === "docking") cancelDock();
				} else {
					const g = gateFrame(pair.stn, pair.planet, worldTime, dockGate);
					const stt = keplerState(pair.planet, worldTime);
					if (mode === "berthed") {
						shipPos.x = g.pos[0] - g.out[0] * 1.1;
						shipPos.y = g.pos[1] - g.out[1] * 1.1;
						shipPos.z = g.pos[2] - g.out[2] * 1.1;
						shipVel.x = stt.vel[0];
						shipVel.y = stt.vel[1];
						shipVel.z = stt.vel[2];
						lastWorldSpeed = Math.hypot(stt.vel[0], stt.vel[1], stt.vel[2]);
					} else {
						const fwdv = rotateVec(orientQuat, [
							0,
							0,
							-1
						]);
						let rvx = shipVel.x - stt.vel[0];
						let rvy = shipVel.y - stt.vel[1];
						let rvz = shipVel.z - stt.vel[2];
						const close = throttle > .04 ? 1.4 + drive * 1.6 : 0;
						const k = 1 - Math.exp(-3.4 * dt);
						rvx += (fwdv[0] * close - rvx) * k;
						rvy += (fwdv[1] * close - rvy) * k;
						rvz += (fwdv[2] * close - rvz) * k;
						let rx = shipPos.x - g.pos[0];
						let ry = shipPos.y - g.pos[1];
						let rz = shipPos.z - g.pos[2];
						const along0 = rx * g.out[0] + ry * g.out[1] + rz * g.out[2];
						const lx = rx - g.out[0] * along0;
						const ly = ry - g.out[1] * along0;
						const lz = rz - g.out[2] * along0;
						if (Math.hypot(lx, ly, lz) < 8) {
							const pull = 2.2 * dt;
							rvx -= lx * pull;
							rvy -= ly * pull;
							rvz -= lz * pull;
						}
						shipPos.x += (stt.vel[0] + rvx) * dt;
						shipPos.y += (stt.vel[1] + rvy) * dt;
						shipPos.z += (stt.vel[2] + rvz) * dt;
						shipVel.x = stt.vel[0] + rvx;
						shipVel.y = stt.vel[1] + rvy;
						shipVel.z = stt.vel[2] + rvz;
						lastWorldSpeed = Math.hypot(rvx, rvy, rvz);
						rx = shipPos.x - g.pos[0];
						ry = shipPos.y - g.pos[1];
						rz = shipPos.z - g.pos[2];
						const along = rx * g.out[0] + ry * g.out[1] + rz * g.out[2];
						const lat = Math.hypot(rx - g.out[0] * along, ry - g.out[1] * along, rz - g.out[2] * along);
						alignHead = clamp(-(fwdv[0] * g.out[0] + fwdv[1] * g.out[1] + fwdv[2] * g.out[2]), 0, 1);
						alignOff = lat / 2.2;
						alignSpd = Math.hypot(rvx, rvy, rvz) / 4.6;
						const hubDist = Math.hypot(shipPos.x - g.hub[0], shipPos.y - g.hub[1], shipPos.z - g.hub[2]);
						if (along < 1.2 && along > -2 && lat < 1.8 && alignHead > .78 && alignSpd < 1.35) berthNow();
						else if (along < -3.8 || lat > 9 || hubDist > stationProximity(pair.stn) * 1.4) cancelDock();
					}
				}
			}
			const thrusting = entered && !inJump && !inPort && throttle > .03;
			const fwd = thrustDir();
			const sys = getSystem(st.systemId);
			const mu = starMu(sys.starRadius);
			if (entered && !inJump && !inPort && !boostActive && !boundId) {
				let nearest = Infinity;
				let nR = 8;
				for (const p of sys.planets) {
					const [x, y, z] = planetWorld(p, worldTime);
					const d = Math.hypot(shipPos.x - x, shipPos.y - y, shipPos.z - z);
					if (d < nearest) {
						nearest = d;
						nR = p.radius;
					}
				}
				const radii = nearest / Math.max(nR, .5);
				if (radii < 55) {
					const vPark = Math.max(.4, nR * .026);
					const t = clamp((radii - 1.55) / 48, 0, 1);
					drive = Math.min(drive, vPark + (def.cruiseSpeed - vPark) * t * t);
				}
			}
			if (entered && !inJump && !inPort) {
				let well = null;
				for (const p of sys.planets) {
					const [x, y, z] = planetWorld(p, worldTime);
					const dist = Math.hypot(shipPos.x - x, shipPos.y - y, shipPos.z - z);
					const soi = planetSOI(p);
					if (dist < (boundId === p.id ? soi * WELL_HOLD : soi) && (!well || dist < well.dist)) well = {
						p,
						dist
					};
				}
				if (well) {
					boundId = well.p.id;
					boundName = well.p.name;
				} else {
					boundId = null;
					boundName = null;
				}
				const steps = Math.max(1, Math.min(4, Math.ceil(dt / (1 / 60))));
				const h = dt / steps;
				for (let s = 0; s < steps; s++) if (boundId) {
					const p = sys.planets.find((pl) => pl.id === boundId);
					if (!p) {
						boundId = null;
						boundName = null;
					} else {
						const stt = keplerState(p, worldTime);
						let rx = shipPos.x - stt.pos[0];
						let ry = shipPos.y - stt.pos[1];
						let rz = shipPos.z - stt.pos[2];
						let rvx = shipVel.x - stt.vel[0];
						let rvy = shipVel.y - stt.vel[1];
						let rvz = shipVel.z - stt.vel[2];
						if (thrusting) {
							if (boostActive || throttle > OD_GATE) {
								const k = 1 - Math.exp(-2.6 * h);
								rvx += (fwd[0] * drive - rvx) * k;
								rvy += (fwd[1] * drive - rvy) * k;
								rvz += (fwd[2] * drive - rvz) * k;
							} else {
								const acc = drive * 2.2;
								rvx += fwd[0] * acc * h;
								rvy += fwd[1] * acc * h;
								rvz += fwd[2] * acc * h;
								const d = 1 - Math.exp(-1.15 * h);
								rvx += (0 - rvx) * d * .28;
								rvy += (0 - rvy) * d * .28;
								rvz += (0 - rvz) * d * .28;
							}
						} else {
							const d = 1 - Math.exp(-2.2 * h);
							rvx += (0 - rvx) * d;
							rvy += (0 - rvy) * d;
							rvz += (0 - rvz) * d;
						}
						rx += rvx * h;
						ry += rvy * h;
						rz += rvz * h;
						const rd = Math.hypot(rx, ry, rz) || 1e-4;
						const keep = planetKeepOut(p);
						const punchOut = boostActive || throttle > OD_GATE;
						if (rd < keep) {
							const skeep = keep / rd;
							rx *= skeep;
							ry *= skeep;
							rz *= skeep;
							const vr = (rvx * rx + rvy * ry + rvz * rz) / keep;
							if (vr < 0) {
								rvx -= rx / keep * vr;
								rvy -= ry / keep * vr;
								rvz -= rz / keep * vr;
							}
						} else if (!punchOut && navTarget?.kind !== "station" && !atStationId && !p.stationId) {
							const park = planetPark(p);
							const kR = 1 - Math.exp(-h / 6.2);
							const nd = rd + (park - rd) * kR;
							const s = nd / rd;
							rx *= s;
							ry *= s;
							rz *= s;
							const inv = 1 / nd;
							const vr = (rvx * rx + rvy * ry + rvz * rz) * inv;
							const dampR = 1 - Math.exp(-2.4 * h);
							rvx -= rx * inv * vr * dampR;
							rvy -= ry * inv * vr * dampR;
							rvz -= rz * inv * vr * dampR;
						}
						shipPos.x = stt.pos[0] + rx;
						shipPos.y = stt.pos[1] + ry;
						shipPos.z = stt.pos[2] + rz;
						shipVel.x = stt.vel[0] + rvx;
						shipVel.y = stt.vel[1] + rvy;
						shipVel.z = stt.vel[2] + rvz;
					}
				} else if (thrusting) {
					const n = Math.hypot(shipPos.x, shipPos.y, shipPos.z) || 1;
					const circN = Math.sqrt(mu / (n * n * n));
					const k = 1 - Math.exp(-3.1 * h);
					const tx = -shipPos.z * circN + fwd[0] * drive;
					const ty = fwd[1] * drive;
					const tz = shipPos.x * circN + fwd[2] * drive;
					shipVel.x += (tx - shipVel.x) * k;
					shipVel.y += (ty - shipVel.y) * k;
					shipVel.z += (tz - shipVel.z) * k;
					const [gx, gy, gz] = gravityAt(sys, worldTime, shipPos.x, shipPos.y, shipPos.z, (pl) => planetWorld(pl, worldTime));
					shipVel.x += gx * h * .4;
					shipVel.y += gy * h * .4;
					shipVel.z += gz * h * .4;
					shipPos.x += shipVel.x * h;
					shipPos.y += shipVel.y * h;
					shipPos.z += shipVel.z * h;
				} else {
					const [gx, gy, gz] = gravityAt(sys, worldTime, shipPos.x, shipPos.y, shipPos.z, (pl) => planetWorld(pl, worldTime));
					shipVel.x += gx * h;
					shipVel.y += gy * h;
					shipVel.z += gz * h;
					shipPos.x += shipVel.x * h;
					shipPos.y += shipVel.y * h;
					shipPos.z += shipVel.z * h;
				}
			} else if (!inPort) {
				boundId = null;
				boundName = null;
			}
			if (boundId) {
				const host = sys.planets.find((pl) => pl.id === boundId);
				if (host) {
					const stt = keplerState(host, worldTime);
					lastWorldSpeed = Math.hypot(shipVel.x - stt.vel[0], shipVel.y - stt.vel[1], shipVel.z - stt.vel[2]);
				} else lastWorldSpeed = Math.hypot(shipVel.x, shipVel.y, shipVel.z);
			} else lastWorldSpeed = Math.hypot(shipVel.x, shipVel.y, shipVel.z);
			const skyStream = reduceMotion ? 0 : Math.max(jumpAmt, cruiseAmt);
			const trailAmt = Math.max(boostAmt, inOverdrive ? 1 : 0);
			const vz = skyStream > .08 ? STAR_VZ * skyStream * (2.6 + jumpAmt * 1.6 + cruiseAmt * 0.7) * dt : 0;
			const dx = skyStream > .08 ? -steerX * STAR_VZ * skyStream * dt * .22 : 0;
			const dy = skyStream > .08 ? -steerY * STAR_VZ * skyStream * dt * .14 : 0;
			const collapse = skyStream * (jumpAmt > cruiseAmt ? 1.12 : 0.92);
			const minR = sys.starRadius * 1.55;
			const dSun = Math.hypot(shipPos.x, shipPos.y, shipPos.z);
			if (dSun < minR && dSun > 1e-4) {
				const s = minR / dSun;
				shipPos.x *= s;
				shipPos.y *= s;
				shipPos.z *= s;
				const vr = (shipVel.x * shipPos.x + shipVel.y * shipPos.y + shipVel.z * shipPos.z) / dSun;
				if (vr < 0) {
					const nx = shipPos.x / dSun, ny = shipPos.y / dSun, nz = shipPos.z / dSun;
					shipVel.x -= nx * vr;
					shipVel.y -= ny * vr;
					shipVel.z -= nz * vr;
				}
			}
			if (surveying) {
				const pid = surveyPlanetId;
				const inWell = Boolean(pid && boundId === pid && mode === "local" && !inJump);
				surveyPaused = !inWell;
				if (inWell && pid) {
					const dur = getStarwake().shipId === "hauler" ? 6.4 : 4.4;
					surveyT = Math.min(1, surveyT + dt / dur);
					if (surveyT >= 1) {
						surveying = false;
						surveyPaused = false;
						getStarwake().logSurvey(pid);
						punchT = .4;
						flashT = .5;
					}
				}
			}
			const count = countStars();
			const densityScaleClamped = clamp(Math.pow(1800 / Math.max(count, 800), .45), .28, 1);
			wrapCloud(starPos, count, qInv[0], qInv[1], qInv[2], qInv[3], vz, dx, dy, 1, collapse);
			const dustStream = trailAmt * 55 + skyStream * 220;
			wrapCloud(dustPos, DUST, qInv[0], qInv[1], qInv[2], qInv[3], dustStream * dt, 0, 0, .2, collapse);
			const warpAmt = warpOverlayAmt();
			warpTime += dt * (0.55 + skyStream * 2.8 + warpAmt * 1.4);
			const targetFov = reduceMotion
				? 50 * Math.PI / 180
				: (50 + boostAmt * 7 + jumpAmt * 28 + cruiseAmt * 16) * Math.PI / 180 + punchT * punchT * .16;
			fov += (targetFov - fov) * (1 - Math.exp(-6.5 * dt));
			const roll = 0;
			updateRings(dt, throttle, !reduceMotion && (jumpAmt > .28 || cruiseAmt > .16), cruiseAmt > jumpAmt + 0.05);
			gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, starPos.subarray(0, count * 3));
			gl.bindBuffer(gl.ARRAY_BUFFER, dustPosBuf);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, dustPos);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			disableAttribs(gl);
			perspective(proj, fov, canvas.width / Math.max(canvas.height, 1), NEAR_CLIP, FAR_CLIP);
			viewFromLook(view, roll, lookYaw, lookPitch);
			if (entered && !inJump) {
				buildWorldView();
				updateFocus(dt, inJump, Math.abs(yawInput) > .08 || Math.abs(pitchInput) > .08);
				viewFromLook(view, roll, lookYaw, lookPitch);
				buildWorldView();
				let fx = null, fy = null, fz = null;
				if (navTarget) {
					const body = bodyWorld(navTarget, worldTime);
					if (body) {
						fx = body.pos[0];
						fy = body.pos[1];
						fz = body.pos[2];
					}
				} else if (focusId === "star") {
					fx = 0;
					fy = 0;
					fz = 0;
				} else if (focusId) {
					const sysNow = getSystem(getStarwake().systemId);
					const p = sysNow.planets.find((pl) => pl.id === focusId);
					if (p) {
						const pos = planetWorld(p, worldTime);
						fx = pos[0];
						fy = pos[1];
						fz = pos[2];
					} else {
						const stn = sysNow.stations.find((s) => s.id === focusId);
						const host = stn ? sysNow.planets.find((pl) => pl.id === stn.planetId) : null;
						if (stn && host) {
							const pos = stationWorld(stn, host, worldTime);
							fx = pos[0];
							fy = pos[1];
							fz = pos[2];
						}
					}
				}
				if (fx != null) {
					const pr = projectWorld(fx, fy, fz);
					focusVisible = Boolean(pr);
					focusNdcX = pr ? pr.ndcX : 0;
					focusNdcY = pr ? pr.ndcY : 0;
				}
			} else {
				focusId = null;
				focusName = null;
				focusVisible = false;
				atPlanet = null;
			}
			quatToMat4(nebView, quatMul(quatInvert(orientQuat), quatFromEuler(.58, .35 + (sys.nebula?.seed ?? 0) * 6.283)));
			multiply(nebCombined, view, nebView);
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.BLEND);
			gl.useProgram(nebulaProg);
			gl.uniformMatrix4fv(loc(gl, nebulaProg, "uProj"), false, proj);
			gl.uniformMatrix4fv(loc(gl, nebulaProg, "uView"), false, nebCombined);
			const tint = sys.starColor;
			const neb = sys.nebula;
			gl.uniform3f(loc(gl, nebulaProg, "uTint"), .85 + tint[0] * .25, .9 + tint[1] * .15, 1);
			gl.uniform1f(loc(gl, nebulaProg, "uKind"), NEBULA_CODE[neb?.kind] ?? 0);
			gl.uniform1f(loc(gl, nebulaProg, "uSeed"), neb?.seed ?? .17);
			gl.uniform1f(loc(gl, nebulaProg, "uIntensity"), neb?.intensity ?? 1);
			gl.bindBuffer(gl.ARRAY_BUFFER, nebBuf);
			const nebLoc = gl.getAttribLocation(nebulaProg, "aPosition");
			gl.enableVertexAttribArray(nebLoc);
			gl.vertexAttribPointer(nebLoc, 3, gl.FLOAT, false, 0, 0);
			gl.drawArrays(gl.TRIANGLES, 0, nebulaData.length / 3);
			disableAttribs(gl);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE);
			gl.useProgram(starProg);
			gl.uniformMatrix4fv(loc(gl, starProg, "uProj"), false, proj);
			gl.uniformMatrix4fv(loc(gl, starProg, "uView"), false, view);
			gl.uniform1f(loc(gl, starProg, "uPixelRatio"), dpr);
			gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
			const sp = gl.getAttribLocation(starProg, "aPosition");
			gl.enableVertexAttribArray(sp);
			gl.vertexAttribPointer(sp, 3, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
			const sc = gl.getAttribLocation(starProg, "aColor");
			gl.enableVertexAttribArray(sc);
			gl.vertexAttribPointer(sc, 3, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
			const ss = gl.getAttribLocation(starProg, "aSize");
			gl.enableVertexAttribArray(ss);
			gl.vertexAttribPointer(ss, 1, gl.FLOAT, false, 0, 0);
			gl.drawArrays(gl.POINTS, 0, count);
			disableAttribs(gl);
			if (trailAmt > .05 || skyStream > .08) {
				gl.useProgram(dustProg);
				gl.uniformMatrix4fv(loc(gl, dustProg, "uProj"), false, proj);
				gl.uniformMatrix4fv(loc(gl, dustProg, "uView"), false, view);
				gl.uniform1f(loc(gl, dustProg, "uPixelRatio"), dpr);
				gl.bindBuffer(gl.ARRAY_BUFFER, dustPosBuf);
				const dp = gl.getAttribLocation(dustProg, "aPosition");
				gl.enableVertexAttribArray(dp);
				gl.vertexAttribPointer(dp, 3, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, dustColBuf);
				const dc = gl.getAttribLocation(dustProg, "aColor");
				gl.enableVertexAttribArray(dc);
				gl.vertexAttribPointer(dc, 3, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, dustSizeBuf);
				const ds = gl.getAttribLocation(dustProg, "aSize");
				gl.enableVertexAttribArray(ds);
				gl.vertexAttribPointer(ds, 1, gl.FLOAT, false, 0, 0);
				gl.drawArrays(gl.POINTS, 0, DUST);
				disableAttribs(gl);
			}
			const streakLen = skyStream > .08 ? 12 + skyStream * (jumpAmt > .45 ? 78 : 58) : trailAmt > .05 ? 3.5 + trailAmt * 7 : 0;
			if (streakLen > .2) {
			gl.useProgram(streakProg);
			gl.uniformMatrix4fv(loc(gl, streakProg, "uProj"), false, proj);
			gl.uniformMatrix4fv(loc(gl, streakProg, "uView"), false, view);
			gl.uniform1f(loc(gl, streakProg, "uStreak"), streakLen);
			gl.uniform2f(loc(gl, streakProg, "uResolution"), canvas.width, canvas.height);
			gl.uniform1f(loc(gl, streakProg, "uDensityScale"), densityScaleClamped);
			gl.uniform1f(loc(gl, streakProg, "uBoost"), Math.max(trailAmt * .35, skyStream));
			gl.uniform1f(loc(gl, streakProg, "uWarp"), skyStream);
			gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
			const uvLoc = gl.getAttribLocation(streakProg, "aUv");
			gl.enableVertexAttribArray(uvLoc);
			gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
			if (ext) ext.vertexAttribDivisorANGLE(uvLoc, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
			const pLoc = gl.getAttribLocation(streakProg, "aPosition");
			gl.enableVertexAttribArray(pLoc);
			gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 0, 0);
			if (ext) ext.vertexAttribDivisorANGLE(pLoc, 1);
			gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
			const cLoc = gl.getAttribLocation(streakProg, "aColor");
			gl.enableVertexAttribArray(cLoc);
			gl.vertexAttribPointer(cLoc, 3, gl.FLOAT, false, 0, 0);
			if (ext) ext.vertexAttribDivisorANGLE(cLoc, 1);
			gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
			const sLoc = gl.getAttribLocation(streakProg, "aSize");
			gl.enableVertexAttribArray(sLoc);
			gl.vertexAttribPointer(sLoc, 1, gl.FLOAT, false, 0, 0);
			if (ext) ext.vertexAttribDivisorANGLE(sLoc, 1);
			if (ext) {
				ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, count);
				ext.vertexAttribDivisorANGLE(pLoc, 0);
				ext.vertexAttribDivisorANGLE(cLoc, 0);
				ext.vertexAttribDivisorANGLE(sLoc, 0);
			} else gl.drawArrays(gl.TRIANGLES, 0, 6);
			disableAttribs(gl);
			}
			if (mode !== "transit") drawWarp(warpAmt, false);
			if (jumpAmt < .55) {
				gl.disable(gl.BLEND);
				gl.enable(gl.DEPTH_TEST);
				gl.depthMask(true);
				quatToMat4(orientMat, orientQuat);
				quatToMat4(invOrient, quatInvert(orientQuat));
				translation(tmpA, -shipPos.x, -shipPos.y, -shipPos.z);
				multiply(tmpB, invOrient, tmpA);
				multiply(worldView, view, tmpB);
				const cam = [
					shipPos.x,
					shipPos.y,
					shipPos.z
				];
				for (const p of sys.planets) {
					const [x, y, z] = planetWorld(p, worldTime);
					drawBody(x, y, z, p.radius, p.color, 0, cam, KIND_CODE[p.kind] ?? 1, seedOf(p.id));
					for (const m of p.moons) {
						const [mx, my, mz] = moonWorld(p, m, worldTime);
						const md = Math.hypot(mx - cam[0], my - cam[1], mz - cam[2]);
						if (md > 2400) continue;
						drawBody(mx, my, mz, m.radius, m.color, 0, cam, KIND_CODE[m.kind] ?? 1, seedOf(m.id));
					}
				}
				for (const c of sys.comets) {
					const [x, y, z] = cometWorld(c, worldTime);
					drawBody(x, y, z, c.radius, c.color, 0.22, cam, 10, seedOf(c.id));
					const r = Math.hypot(x, y, z) || 1;
					const near = clamp(1.15 - r / (2800 * 3.2), 0, 1);
					const tail = 16 + near * 88;
					const ux = -x / r, uy = -y / r, uz = -z / r;
					for (let k = 1; k <= 5; k++) {
						const u = k / 5;
						drawBody(x + ux * tail * u, y + uy * tail * u, z + uz * tail * u, c.radius * (1.1 - u * 0.7), c.color, 0.12 * (1 - u) * (0.35 + near), cam, 10, seedOf(c.id));
					}
				}
				if (sys.belt) {
					const icy = sys.belt.icy;
					const col = icy ? [0.7, 0.76, 0.84] : [0.52, 0.48, 0.42];
					const n = sys.belt.rocks;
					for (let i = 0; i < n; i++) {
						const rock = beltRock(sys.belt, i, worldTime);
						const d = Math.hypot(rock.pos[0] - cam[0], rock.pos[1] - cam[1], rock.pos[2] - cam[2]);
						if (d > 980 && i % 3) continue;
						drawBody(rock.pos[0], rock.pos[1], rock.pos[2], rock.r, col, 0, cam, icy ? 4 : 1, seedOf(sys.belt.id + i));
					}
				}
				for (const stn of sys.stations) {
					const planet = sys.planets.find((p) => p.id === stn.planetId);
					if (planet) drawStation(stn, planet, cam);
				}
				drawBody(0, 0, 0, sys.starRadius, sys.starColor, 1.35, cam, 0, seedOf(sys.id));
				if (st.showOrbits && lineProg) {
					gl.disable(gl.DEPTH_TEST);
					gl.enable(gl.BLEND);
					gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
					gl.depthMask(false);
					gl.useProgram(lineProg);
					gl.uniformMatrix4fv(loc(gl, lineProg, "uProj"), false, proj);
					gl.uniformMatrix4fv(loc(gl, lineProg, "uView"), false, worldView);
					gl.uniform3f(loc(gl, lineProg, "uColor"), .7, .78, .92);
					const ap = gl.getAttribLocation(lineProg, "aPosition");
					try {
						gl.lineWidth(2);
					} catch {}
					for (const p of sys.planets) {
						let pts = orbitCache.get(p.id);
						if (!pts) {
							pts = orbitPolyline(p, ORBIT_N);
							orbitCache.set(p.id, pts);
						}
						gl.uniform1f(loc(gl, lineProg, "uAlpha"), boundId === p.id ? .9 : .48);
						gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
						gl.bufferData(gl.ARRAY_BUFFER, pts, gl.DYNAMIC_DRAW);
						gl.enableVertexAttribArray(ap);
						gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 0, 0);
						gl.drawArrays(gl.LINE_LOOP, 0, ORBIT_N);
					}
					disableAttribs(gl);
					gl.depthMask(true);
					gl.enable(gl.DEPTH_TEST);
				}
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
				gl.depthMask(false);
				if (sys.belt) {
					const col = sys.belt.icy ? [0.7, 0.76, 0.84] : [0.52, 0.48, 0.42];
					drawEqRing(0, 0, 0, sys.belt.inner, 0.1, col, 0.22);
					drawEqRing(0, 0, 0, sys.belt.outer, 0.1, col, 0.22);
					drawEqRing(0, 0, 0, (sys.belt.inner + sys.belt.outer) * 0.5, 0.1, col, 0.1);
				}
				for (const p of sys.planets) {
					if (!p.rings) continue;
					const [x, y, z] = planetWorld(p, worldTime);
					const span = p.ringOuter - p.ringInner;
					const show = p.kind === "ringed";
					const n = show ? 28 : 10;
					for (let i = 0; i < n; i++) {
						const u = i / Math.max(1, n - 1);
						if (show && u > 0.38 && u < 0.47) continue;
						const rad = p.ringInner + span * u;
						const belt = 1 - Math.abs(u - 0.26) * 1.35;
						const a = (show ? 0.46 : 0.18) + 0.4 * Math.max(0, belt);
						drawEqRing(x, y, z, rad, p.ringTilt, p.ringColor, Math.min(0.88, a));
					}
				}
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
				for (const p of sys.planets) {
					const [x, y, z] = planetWorld(p, worldTime);
					const dist = Math.hypot(x - cam[0], y - cam[1], z - cam[2]);
					const prox = planetProximity(p);
					const inside = dist < prox;
					const fade = clamp(1.15 - dist / (prox * 6), .12, 1);
					drawRing(x, y, z, prox, cam, inside ? .42 : .16 * fade);
				}
				gl.depthMask(true);
				gl.disable(gl.BLEND);
				gl.disable(gl.DEPTH_TEST);
			}
			if (mode === "transit") drawWarp(warpAmt, true);
			vignette.style.opacity = String(.42 + boostAmt * .12 + jumpAmt * .32 + cruiseAmt * .1 + punchT * .12);
			flash.classList.toggle("on", flashT > .15);
			flash.style.opacity = String(Math.min(1, flashT * 1.2));
			tunnel.classList.toggle("cruise", mode === "transit");
			tunnel.classList.toggle("fsd", mode === "hyperspace" || mode === "charging");
			canvas.dataset.warp = warpAmt > 0.05 ? (mode === "transit" ? "cruise" : "fsd") : "";
			audio.update(throttle, boostAmt, Math.max(jumpAmt, cruiseAmt * 0.72));
			if (now - lastUiPush > 80) {
				lastUiPush = now;
				if (getStarwake().mode !== mode) getStarwake().setMode(mode);
				if (mode === "charging") getStarwake().setCharge01(clamp(chargeT, 0, 1));
				if (mode === "transit") getStarwake().setCharge01(clamp(transitT, 0, 1));
				pushDrive();
			}
		} catch (err) {
			lastTickErr = err instanceof Error ? err.message : String(err);
			console.error(err);
		}
		raf = requestAnimationFrame(tick);
	}
	raf = requestAnimationFrame(tick);
	window.__controlsTest = {
		getYaw: () => headingYaw,
		getSpeed: () => lastWorldSpeed,
		getRoll: () => shipRoll,
		getThrottle: () => throttle,
		setSteer: (v) => {
			qaSteer = v;
		},
		setKeys: (codes) => {
			qaKeys = codes.length ? new Set(codes) : null;
		}
	};
	window.__starwake = {
		getMode: () => mode,
		getSpeed: () => lastWorldSpeed,
		getThrottle: () => throttle,
		getRoll: () => shipRoll,
		getEntered: () => getStarwake().entered,
		getFitted: () => {
			const st = getStarwake();
			const d = fittedShip(st.shipId, st.loadout);
			return {
				id: d.id,
				turnRate: d.turnRate,
				cruiseSpeed: d.cruiseSpeed,
				overdriveSpeed: d.overdriveSpeed,
				jumpRangeLy: d.jumpRangeLy,
				fsdChargeSec: d.fsdChargeSec,
				mass: d.mass,
				cargoCap: d.cargoCap,
				overdriveSec: d.overdriveSec,
				coolSec: d.coolSec,
				fuelCap: d.fuelCap
			};
		},
		getFuel: () => ({
			fuel: fuelLocal,
			cap: tankCap()
		}),
		refuel: () => fillTank(),
		setFuel: (v) => {
			fuelLocal = Math.max(0, Math.min(tankCap(), v));
			getStarwake().setFuel(fuelLocal);
			pushDrive();
		},
		requestDock: () => requestDock(),
		cancelDock: () => cancelDock(),
		undock: () => undockFromStation(),
		dockAt: (id) => dockAtQa(id),
		getDock: () => ({
			mode,
			stationId: dockStationId ?? atStationId,
			gate: dockGate,
			alignOff,
			alignHead
		}),
		getStations: () => getSystem(getStarwake().systemId).stations.map((s) => ({
			id: s.id,
			name: s.name,
			planetId: s.planetId,
			kind: s.kind
		})),
		findStationKind: (kind) => {
			for (const sys of GALAXY) {
				const s = sys.stations.find((st) => st.kind === kind);
				if (s) return { systemId: sys.id, id: s.id, name: s.name, kind: s.kind };
			}
			return null;
		},
		getWild: () => getSystem(getStarwake().systemId).planets.filter((p) => !p.stationId).map((p) => ({
			id: p.id,
			name: p.name
		})),
		requestSurvey: () => requestSurvey(),
		completeSurvey: () => completeSurveyQa(),
		getSurvey: () => ({
			surveying,
			paused: surveyPaused,
			t: surveyT,
			planetId: surveyPlanetId,
			logged: Boolean(surveyPlanetId && getStarwake().surveys[surveyPlanetId] || atPlanetId && getStarwake().surveys[atPlanetId])
		}),
		scanPlanet: (id) => getStarwake().scanPlanet(id),
		getManifest: () => {
			const st = getStarwake();
			const man = st.manifests[st.shipId];
			if (!man) return null;
			return {
				title: man.job.title,
				loaded: man.loaded,
				qty: man.job.qty,
				from: man.job.from.stationId,
				to: man.job.to.stationId,
				fromSys: man.job.from.systemId,
				toSys: man.job.to.systemId
			};
		},
		acceptJob: (id) => getStarwake().acceptJob(id),
		loadCargo: () => {
			if (mode !== "berthed" || !atStationId) return false;
			return getStarwake().loadCargo(getStarwake().systemId, atStationId);
		},
		deliverCargo: () => {
			if (mode !== "berthed" || !atStationId) return false;
			return getStarwake().deliverCargo(getStarwake().systemId, atStationId);
		},
		setThrottle: (t) => applyThrottle(t),
		getHeat: () => heat01,
		getBoostCharges: () => getStarwake().boostCharges,
		refillBoosts: () => {
			getStarwake().refillBoosts();
			pushDrive();
		},
		setBoost: (v) => {
			boostHeld = v;
		},
		getFocus: () => focusName,
		getAtPlanet: () => atPlanet,
		getFocusDebug: () => ({
			name: focusName,
			yaw: lookYaw,
			pitch: lookPitch,
			ndcX: focusNdcX,
			ndcY: focusNdcY,
			visible: focusVisible,
			at: atPlanet,
			dist: atDist,
			prox: atProx,
			nav: navName,
			navDist,
			speed: lastWorldSpeed
		}),
		getBoostArmed: () => throttle > BOOST_GATE,
		goToBody,
		lookAtBody,
		arriveAt: (id) => arrive(id),
		requestJump: () => {
			jumpQueued = true;
		},
		getSystemId: () => getStarwake().systemId,
		getLocked: () => getStarwake().lockedSystemId,
		getVel: () => ({
			x: shipVel.x,
			y: shipVel.y,
			z: shipVel.z
		}),
		getWell: () => boundName,
		getNav: () => navName,
		getFlightDebug: () => {
			const fwd = rotateVec(orientQuat, [
				0,
				0,
				-1
			]);
			const left = rotateVec(orientQuat, [
				-1,
				0,
				0
			]);
			const up = rotateVec(orientQuat, [
				0,
				1,
				0
			]);
			const cam = rotateVec(quatMul(orientQuat, quatFromEuler(lookPitch, lookYaw)), [
				0,
				0,
				-1
			]);
			let rx = shipVel.x, ry = shipVel.y, rz = shipVel.z;
			if (boundId) {
				const host = getSystem(getStarwake().systemId).planets.find((pl) => pl.id === boundId);
				if (host) {
					const stt = keplerState(host, worldTime);
					rx -= stt.vel[0];
					ry -= stt.vel[1];
					rz -= stt.vel[2];
				}
			}
			return {
				mode,
				well: boundName,
				nav: navName,
				lookYaw,
				lookPitch,
				headingYaw,
				throttle,
				alongFwd: fwd[0] * rx + fwd[1] * ry + fwd[2] * rz,
				alongCam: cam[0] * rx + cam[1] * ry + cam[2] * rz,
				relSpd: Math.hypot(rx, ry, rz),
				atStation,
				fwd,
				left,
				up,
				roll: shipRoll
			};
		},
		getPlanetPos: (id) => {
			const p = getSystem(getStarwake().systemId).planets.find((pl) => pl.id === id);
			return p ? planetWorld(p, worldTime) : null;
		},
		getJumpDebug: () => ({
			mode,
			hyperT,
			chargeT,
			dropT,
			transitT,
			cruiseAmt,
			jumpAmt,
			warpAmt: warpOverlayAmt(),
			warpProg: Boolean(warpProg),
			reduceMotion,
			transit: transitTarget,
			pending: pendingDest,
			dt: lastDt,
			err: lastTickErr
		}),
		getScaleDebug: () => {
			const sysNow = getSystem(getStarwake().systemId);
			return {
				starR: sysNow.starRadius,
				ship: [
					shipPos.x,
					shipPos.y,
					shipPos.z
				],
				well: boundName,
				nav: navName,
				lookYaw,
				lookPitch,
				ndcX: focusNdcX,
				ndcY: focusNdcY,
				planets: sysNow.planets.map((p) => {
					const pos = planetWorld(p, worldTime);
					const dist = Math.hypot(pos[0] - shipPos.x, pos[1] - shipPos.y, pos[2] - shipPos.z);
					return {
						id: p.id,
						name: p.name,
						kind: p.kind,
						rings: p.rings,
						moons: p.moons.length,
						r: p.radius,
						dist,
						ang: 2 * Math.atan(p.radius / Math.max(dist, .05)) * 180 / Math.PI,
						orbit: p.orbit
					};
				}),
				belt: sysNow.belt ? { id: sysNow.belt.id, name: sysNow.belt.name, inner: sysNow.belt.inner, outer: sysNow.belt.outer } : null,
				comets: sysNow.comets.map((c) => ({ id: c.id, name: c.name })),
				nebula: sysNow.nebula,
			};
		}
	};
	return {
		destroy() {
			running = false;
			flushFuel(true);
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
			canvas.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("pointerdown", onUiPointer, true);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("deviceorientation", onOrient, true);
			audio.dispose();
			rings.forEach((r) => r.el.remove());
			delete window.__controlsTest;
		},
		setStick(x, y) {
			stickX = x;
			stickY = y;
			stickActive = Math.hypot(x, y) > .02;
		},
		setThrottle(t) {
			applyThrottle(t);
		},
		setBoost(v) {
			boostHeld = v;
		},
		refillBoosts() {
			getStarwake().refillBoosts();
			pushDrive();
		},
		refuel() {
			fillTank();
		},
		requestDock() {
			requestDock();
		},
		cancelDock() {
			cancelDock();
		},
		undock() {
			undockFromStation();
		},
		requestSurvey() {
			requestSurvey();
		},
		requestJump() {
			jumpQueued = true;
		},
		goToBody,
		lookAtBody,
		unlockAudio() {
			audio.unlock();
		},
		getThrottle() {
			return throttle;
		},
		subscribeThrottle(fn) {
			throttleSubs.add(fn);
			fn(throttle);
			return () => {
				throttleSubs.delete(fn);
			};
		},
		subscribeDrive(fn) {
			driveSubs.add(fn);
			fn(driveSnap());
			return () => {
				driveSubs.delete(fn);
			};
		},
		getFocusDebug() {
			return {
				name: focusName,
				yaw: lookYaw,
				pitch: lookPitch,
				ndcX: focusNdcX,
				ndcY: focusNdcY,
				visible: focusVisible,
				at: atPlanet,
				dist: atDist,
				prox: atProx,
				nav: navName,
				navDist,
				speed: lastWorldSpeed
			};
		}
	};
}
