export type ShipId = "courier" | "hauler" | "scout" | "clipper" | "tender" | "tug";

export type FlightMode = "docked" | "local" | "boosting" | "charging" | "hyperspace" | "transit" | "dropping" | "docking" | "berthed";

export function isJumpMode(m: FlightMode) {
  return m === "charging" || m === "hyperspace" || m === "transit" || m === "dropping";
}

export type MapLayer = "system" | "galaxy";

export type PlanetKind = "rocky" | "desert" | "ocean" | "ice" | "volcanic" | "gas" | "ringed" | "icegiant";

export type MoonKind = "ice" | "rocky" | "desert" | "volcanic";

export type SlotId = "thruster" | "drive" | "fsd" | "hold" | "hx" | "tank";

export type StatKey =
  | "mass"
  | "turnRate"
  | "cruiseSpeed"
  | "overdriveSpeed"
  | "overdriveSec"
  | "fsdChargeSec"
  | "jumpRangeLy"
  | "cargoCap"
    | "coolSec"
    | "fuelCap"
    | "fuelCap2";

export type ShipDef = {
  id: ShipId;
  name: string;
  role: string;
  blurb: string;
  detail: string;
  mass: number;
  turnRate: number;
  cruiseSpeed: number;
  overdriveSpeed: number;
  overdriveSec: number;
  boostCapacity: number;
  boostSec: number;
  fsdChargeSec: number;
  jumpRangeLy: number;
  cargoCap: number;
  coolSec: number;
  fuelCap: number;
  fuelCap2: number;
  surveySec: number;
  accent: string;
  audioPitch: number;
};

export type ModuleDef = {
  id: string;
  slot: SlotId;
  hull: ShipId;
  name: string;
  blurb: string;
  stock?: boolean;
  /** Credits to unlock. Stock is always 0. Slot default applies if omitted. */
  cost?: number;
  delta: Partial<Record<StatKey, number>>;
};

export type ShipLoadout = Record<SlotId, string>;
export type Loadout = Record<ShipId, ShipLoadout>;

export type MenuView = "menu" | "hangar" | "profile" | "market";

export type JobKind = "courier" | "hauler" | "tender" | "tug";

export type JobStop = { systemId: string; stationId: string };

export type CargoJob = {
  id: string;
  kind: JobKind;
  title: string;
  cargo: string;
  qty: number;
  from: JobStop;
  to: JobStop;
};

export type Manifest = { job: CargoJob; loaded: boolean };

export type JobLogEntry = {
  id: string;
  kind: JobKind;
  cargo: string;
  qty: number;
  from: JobStop;
  to: JobStop;
  pay: number;
  at: number;
  shipId: ShipId;
};

export type ProspectGrade = 0 | 1 | 2 | 3;

export type WildProspect = {
  research: ProspectGrade;
  mining: ProspectGrade;
  note: string;
};

export type KeplerOrbit = {
  orbit: number;
  ecc: number;
  inc: number;
  lan: number;
  argp: number;
  m0: number;
  meanN: number;
};

export type Moon = {
  id: string;
  name: string;
  planetId: string;
  kind: MoonKind;
  radius: number;
  orbit: number;
  phase: number;
  inc: number;
  meanN: number;
  color: [number, number, number];
  radiusKm: number;
  massEarth: number;
  gravityG: number;
  dayHours: number;
  climate: string;
  composition: string;
  atmosphere: string;
  prospect: WildProspect;
};

export type Planet = {
  id: string;
  name: string;
  kind: PlanetKind;
  radius: number;
  orbit: number;
  phase: number;
  color: [number, number, number];
  rings: boolean;
  ringInner: number;
  ringOuter: number;
  ringTilt: number;
  ringColor: [number, number, number];
  radiusKm: number;
  massEarth: number;
  gravityG: number;
  au: number;
  yearDays: number;
  dayHours: number;
  ecc: number;
  inc: number;
  lan: number;
  argp: number;
  m0: number;
  meanN: number;
  climate: string;
  composition: string;
  atmosphere: string;
  interest: "port" | "wild";
  stationId: string | null;
  prospect: WildProspect | null;
  moons: Moon[];
};

export type StationKind = "wheel" | "cylinder" | "sphere" | "truss" | "yard";

export type Station = {
  id: string;
  name: string;
  planetId: string;
  kind: StationKind;
  radius: number;
  ringR: number;
  phase: number;
  color: [number, number, number];
  accent: [number, number, number];
};

export type Belt = {
  id: string;
  name: string;
  inner: number;
  outer: number;
  icy: boolean;
  seed: number;
  rocks: number;
  n0: number;
  prospect: WildProspect;
};

export type Comet = KeplerOrbit & {
  id: string;
  name: string;
  radius: number;
  color: [number, number, number];
  radiusKm: number;
  au: number;
  yearDays: number;
  climate: string;
  composition: string;
  atmosphere: string;
  prospect: WildProspect;
};

export type NebulaKind = "arm" | "core" | "rift" | "hii" | "reflect" | "snr" | "wr" | "cirrus";

export type Nebula = {
  kind: NebulaKind;
  seed: number;
  intensity: number;
};

export type StarSystem = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  starColor: [number, number, number];
  starRadius: number;
  planets: Planet[];
  stations: Station[];
  belt: Belt | null;
  comets: Comet[];
  nebula: Nebula;
};

export type EngineSnapshot = {
  mode: FlightMode;
  throttle: number;
  boostAmt: number;
  chargeT: number;
  headingYaw: number;
  speed: number;
  systemId: string;
  lockedSystemId: string | null;
  shipId: ShipId;
};
