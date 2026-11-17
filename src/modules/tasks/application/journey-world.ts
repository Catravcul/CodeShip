/**
 * The real places of the game and the transfers between them, with their real durations, for the
 * task list's travel mode (docs/design/viaje-a-una-tarea.md): the ring's floor (walking), the spoke's
 * elevator, the hub and spine (hops, ladders and launchers), the bridge and the lander's cabin
 * (walking), the station (hops) and the flights that join the vehicles. Pure: main.ts gives where she
 * is, how the vehicles are joined and what each flight would take now.
 */
import { Vec3 } from "@core/math/vec3";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { hopSeconds, HopGraph, type LandingPoint } from "@modules/gravity/domain/hops";
import { carRideSeconds, spineFits, spineHandrails, spineLaunchers, spineLayout, type SpineLayout } from "@modules/gravity/data/spine";
import { RING_ELEVATOR, RING_MODULE, RING_STATIONS } from "@modules/habitat/data/ring-module";
import { floorPath, roomAisles, type CabinLayout, type FloorPoint } from "@modules/lander-cabin/domain/cabin";
import { LANDER_CABIN } from "@modules/lander-cabin/data/cabin";
import { BRIDGE } from "@modules/flight-deck/data/bridge";
import { stationHandrails, stationPortals } from "@modules/station/data/handrails";
import type { StationInterior } from "@modules/station/domain/interior";
import { approachSpeed, DOCKING_ASSIST } from "@modules/mothership/domain/docking";
import type { CrewJoins, Transfer } from "../domain/journey";
import type { TaskPlace } from "./task-list";

/** Walking and floating speeds of the rooms (the same the rooms move her at). Game values. */
export const JOURNEY_PACE = {
  /** On the ring, at 1 g (interior.ts walks her to a machine at this speed), m/s. */
  ringMs: 2.2,
  /** In the lander's cabin and on the bridge, m/s (lander-cabin.ts, bridge.ts). */
  cabinMs: 0.55,
  bridgeMs: 0.9,
  /** Body margin from the walls while floating in the spine and in the station, m (zones.ts, station-interior.ts). */
  spineBodyM: 0.45,
  stationBodyM: 0.3,
  /** Going through a hatch: open, float through, close behind, s (game value). */
  hatchS: 3,
  /** Sitting down in the pilot seat and strapping in, s (game value). */
  seatS: 2,
} as const;

/** Where she is now, in the room she is in. */
export type JourneyHere =
  | { readonly room: "anillo"; readonly at: FloorPoint }
  | { readonly room: "radio"; readonly up: boolean }
  /** In the hub or spine: the landing point she holds (or the nearest). */
  | { readonly room: "eje"; readonly point: string }
  | { readonly room: "puente"; readonly at: FloorPoint }
  | { readonly room: "modulo"; readonly at: FloorPoint | "asiento" }
  | { readonly room: "estacion"; readonly point: string }
  /** On Starship's 0 g decks (the real-only mothership): the landing point she holds. */
  | { readonly room: "nave"; readonly point: string };

/** A flight the journey can take now: its real seconds (compressed trip and docking) or why not. */
export interface JourneyFlight {
  readonly seconds: number;
  readonly blocked?: string;
}

export interface JourneyFacts {
  readonly here: JourneyHere;
  readonly joins: CrewJoins;
  /** The ring's floor radius, m (the spoke's height and the spine's layout come from it). */
  readonly ringRadiusM: number;
  readonly station: StationInterior;
  /**
   * Starship's decks (the real-only mothership, src/core/realism.ts), drawn as walked: with them the
   * mothership is the decks, the flight deck above them and its hatches; no ring, spoke or spine.
   */
  readonly ship?: StationInterior;
  readonly flights: {
    /** The lander back to the travel ship's port (from a body, or from wherever it was left). */
    readonly landerToMothership?: JourneyFlight;
    /**
     * The travel ship to her berth in the station's dry dock (docs/design/dique-seco.md), the lander
     * aboard or not: the long trips are hers, the lander is for landing. There is no lander flight to the station.
     */
    readonly carrierToStation?: JourneyFlight;
  };
}

/** Real seconds the docking assist takes from `fromM` out on the port axis to contact (its braking profile). */
export function dockingSeconds(fromM: number, accelMs2: number): number {
  let s = 0;
  const step = 0.05;
  for (let x = fromM; x > 0; x -= step) s += Math.min(step, x) / approachSpeed(x, accelMs2);
  // Centring and turning onto the port first (about one attitude time constant each).
  return s + 2 * DOCKING_ASSIST.attitudeTimeS;
}

const BRIDGE_CONSOLE: Readonly<Record<"nav" | "sonda" | "mente" | "misiones", string>> = { nav: "nav", sonda: "sonda", mente: "mente", misiones: "comms" };

/** Where a task is done, as a place of the journey graph (undefined: the station has no such machine). */
export function taskGoal(place: TaskPlace, station: StationInterior, ship?: StationInterior): string | undefined {
  switch (place.vehicle) {
    case "nodriza":
      // On Starship a chore's «station» is the fixture of its deck where it is done.
      if (place.spot === "anillo") return ship ? (ship.fixture(place.station) ? `nave:${place.station}` : undefined) : `anillo:${place.station}`;
      return `puente:${BRIDGE_CONSOLE[place.page]}`;
    case "modulo":
      return `modulo:${place.spot}`;
    case "estacion": {
      const fx = station.plan.fixtures;
      if (place.spot === "bahia") {
        const f = fx.find((x) => x.action.kind === "bahia");
        return f && `estacion:${f.id}`;
      }
      if (place.spot === "tripulacion") {
        // A crew area, or a life-support rack (its tasks use the rack's fixture id as their area).
        const f = fx.find((x) => (x.action.kind === "tripulacion" && (x.id === place.area || x.action.area === place.area)) || (x.action.kind === "soporte-vital" && x.id === place.area));
        return f && `estacion:${f.id}`;
      }
      // Each window from its own console (imports: the cargo laptop in Unity); the life window before any bioreactor is installed, from the store's glovebox.
      // Machines in the pressurised modules first: the hangar is at vacuum (a suit and the airlock).
      const inAir = (list: readonly { volume: string }[]) => [...list].sort((a, b) => Number(!station.volume(a.volume)?.pressurised) - Number(!station.volume(b.volume)?.pressurised));
      const f = inAir(station.fixturesFor(place.tab))[0] ?? station.fixturesFor("materiales")[0];
      return f && `estacion:${(f as { id: string }).id}`;
    }
  }
}

const dist = (a: FloorPoint, b: FloorPoint) => Math.hypot(a.x - b.x, a.z - b.z);

/** Walking on the ring between two floor points, through the doorway to the farm deck if one is past it. */
function ringWalk(a: FloorPoint, b: FloorPoint): number {
  const door = { x: 0, z: RING_MODULE.halfL };
  const m = a.z < door.z !== b.z < door.z ? dist(a, door) + dist(door, b) : dist(a, b);
  return m / JOURNEY_PACE.ringMs;
}

/** Walking in a small room (cabin, bridge) along its aisles. */
function roomWalk(L: CabinLayout<string>, a: FloorPoint, b: FloorPoint, speedMs: number): number {
  const path = floorPath(L.floor, a, b, roomAisles(L));
  let m = 0;
  let at = a;
  for (const p of path) {
    m += dist(at, p);
    at = p;
  }
  return m / speedMs;
}

/** Seconds of the quickest chain of hops between two landing points (the aim pause only on the first). */
export function hopChainSeconds(g: HopGraph, from: LandingPoint, toId: string): number | undefined {
  const r = g.route(from, toId);
  return r?.reduce((s, e, i) => s + hopSeconds(e, i > 0), 0);
}

interface Spine {
  readonly L: SpineLayout;
  readonly g: HopGraph;
}
const spines = new Map<number, Spine>();
function spine(radiusM: number): Spine {
  let s = spines.get(radiusM);
  if (!s) {
    const L = spineLayout(radiusM, RING_MODULE.halfL);
    const g = new HopGraph(new RailGraph(spineHandrails(L)), (q) => spineFits(L, q, JOURNEY_PACE.spineBodyM), [], spineLaunchers());
    s = { L, g };
    spines.set(radiusM, s);
  }
  return s;
}

/** The station's fixtures a journey can end at or leave by: machines, the bay, the crew areas, the docking hatches. */
const GOAL_KINDS: ReadonlySet<string> = new Set(["panel", "bahia", "salir", "tripulacion", "hangar", "soporte-vital", "consola"]);

/** Starship's hatch in deck 1's ceiling up to the flight deck (data/starship-interior.ts). */
export const SHIP_FLIGHT_DECK_HATCH = "subir-cubierta-vuelo";

const stationGraphs = new WeakMap<StationInterior, { g: HopGraph; legs: Transfer[] }>();
/**
 * A 0 g interior's hop graph and its hops between hatches and machines (worked out once per layout):
 * the station («estacion») or Starship's decks («nave»), the same engine.
 */
function stationGraph(st: StationInterior, room: "estacion" | "nave" = "estacion"): { g: HopGraph; legs: Transfer[] } {
  const hit = stationGraphs.get(st);
  if (hit) return hit;
  const g = new HopGraph(new RailGraph(stationHandrails(st.plan)), (q) => st.fits(q, JOURNEY_PACE.stationBodyM, false), stationPortals(st.plan));
  const exits = st.plan.fixtures.filter((f) => f.action.kind === "salir" || f.id === SHIP_FLIGHT_DECK_HATCH);
  const goals = st.plan.fixtures.filter((f) => GOAL_KINDS.has(f.action.kind));
  const legs: Transfer[] = [];
  for (const a of exits)
    for (const b of goals) {
      if (a.id === b.id) continue;
      const pa = g.poiPoint(a.id);
      const pb = g.poiPoint(b.id);
      if (!pa || !pb) continue;
      const there = hopChainSeconds(g, pa, pb.id);
      const back = hopChainSeconds(g, pb, pa.id);
      if (there !== undefined) legs.push({ from: `${room}:${a.id}`, to: `${room}:${b.id}`, kind: "saltos", seconds: there, label: `Saltos hasta: ${b.label}` });
      if (back !== undefined && b.action.kind !== "salir" && b.id !== SHIP_FLIGHT_DECK_HATCH) legs.push({ from: `${room}:${b.id}`, to: `${room}:${a.id}`, kind: "saltos", seconds: back, label: `Saltos hasta: ${a.label}` });
    }
  const out = { g, legs };
  stationGraphs.set(st, out);
  return out;
}

const CABIN_LABEL: Readonly<Record<string, string>> = Object.fromEntries(LANDER_CABIN.stations.map((s) => [s.id, s.label]));
const BRIDGE_LABEL: Readonly<Record<string, string>> = Object.fromEntries(BRIDGE.stations.map((s) => [s.id, s.label]));

/** Every transfer of the game as it stands now, from where she is. */
export function journeyTransfers(f: JourneyFacts): Transfer[] {
  const out: Transfer[] = [];
  const both = (a: string, b: string, kind: Transfer["kind"], seconds: number, there: string, back: string, extra: Partial<Transfer> = {}) => {
    out.push({ from: a, to: b, kind, seconds, label: there, ...extra });
    out.push({ from: b, to: a, kind, seconds, label: back, ...extra });
  };
  const exit = BRIDGE.stations.find((s) => s.id === "salida")!;
  const sp = f.ship ? undefined : spine(f.ringRadiusM);
  if (sp) {
    // The ring: the elevator's door and every machine.
    const lift = RING_ELEVATOR.anchor;
    for (const s of RING_STATIONS) both("anillo:ascensor", `anillo:${s.id}`, "andar", ringWalk(lift, s.stand), `Andar hasta: ${s.label}`, "Andar hasta el ascensor del radio");
    // The spoke.
    out.push({ from: "anillo:ascensor", to: "eje:ascensor", kind: "ascensor", seconds: carRideSeconds(sp.L.topY), label: "Subir al eje por el radio" });
    out.push({ from: "eje:ascensor", to: "anillo:ascensor", kind: "ascensor", seconds: carRideSeconds(sp.L.topY), label: "Bajar al anillo por el radio" });
    // The hub and spine: hops between the elevator, the bridge's hatch and the docking hatch.
    const POI_LABEL: Readonly<Record<string, string>> = { ascensor: "el ascensor", atraque: "la escotilla de atraque", puente: "la escotilla del puente" };
    const pois = ["ascensor", "atraque", "puente"];
    for (const a of pois)
      for (const b of pois) {
        if (a === b) continue;
        const s = hopChainSeconds(sp.g, sp.g.poiPoint(a)!, sp.g.poiPoint(b)!.id);
        if (s !== undefined) out.push({ from: `eje:${a}`, to: `eje:${b}`, kind: "saltos", seconds: s, label: `Saltos por la espina hasta ${POI_LABEL[b]}` });
      }
    // The bridge's hatch from the spine.
    both("eje:puente", "puente:salida", "escotilla", JOURNEY_PACE.hatchS, "Por la escotilla al puente", "Por la escotilla a la espina");
  }
  // The bridge (on Starship, the flight deck above deck 1).
  for (const s of BRIDGE.stations) if (s.id !== "salida") both("puente:salida", `puente:${s.id}`, "andar", roomWalk(BRIDGE, exit.stand, s.stand, JOURNEY_PACE.bridgeMs), `Andar hasta la consola: ${s.label}`, "Andar hasta la escotilla del puente");
  // The lander's cabin: everything from its docking console under the roof hatch.
  const acople = LANDER_CABIN.stations.find((s) => s.id === "acople")!;
  for (const s of LANDER_CABIN.stations) if (s.id !== "acople") both("modulo:acople", `modulo:${s.id}`, "andar", roomWalk(LANDER_CABIN, acople.stand, s.stand, JOURNEY_PACE.cabinMs) + (s.id === "asiento" ? JOURNEY_PACE.seatS : 0), `Andar hasta: ${CABIN_LABEL[s.id]}`, `Andar hasta: ${CABIN_LABEL.acople}`);
  // The station's hops, and its two docking hatches.
  const st = stationGraph(f.station);
  out.push(...st.legs);
  const exitTo = (to: "sonda" | "nodriza") => f.station.plan.fixtures.find((x) => x.action.kind === "salir" && x.action.to === to);
  const sonda = exitTo("sonda");
  const nodriza = exitTo("nodriza");
  const landerHere = (j: CrewJoins) => j.lander === "estacion";
  const shipHere = (j: CrewJoins) => j.mothershipAtStation;
  const landerAboard = (j: CrewJoins) => j.lander === "nodriza";
  if (sonda) both("modulo:acople", `estacion:${sonda.id}`, "escotilla", JOURNEY_PACE.hatchS, "Por la escotilla del techo a la estación", "Por la escotilla al módulo de aterrizaje", { open: landerHere, shut: "El módulo de aterrizaje no está acoplado a la estación" });
  const shipShut = "La nodriza no está atracada en la estación";
  const landerShut = "El módulo de aterrizaje no está acoplado a la nodriza";
  if (sp) {
    if (nodriza) both("eje:atraque", `estacion:${nodriza.id}`, "escotilla", JOURNEY_PACE.hatchS, "Por la escotilla de atraque a la estación", "Por la escotilla a la espina de la nodriza", { open: shipHere, shut: shipShut });
    both("eje:atraque", "modulo:acople", "escotilla", JOURNEY_PACE.hatchS, "Por la escotilla de atraque al módulo", "Por la escotilla del techo a la nodriza", { open: landerAboard, shut: landerShut });
  }
  // Starship's decks: hops between their hatches and machines, the hatch up to the flight deck and its two docking hatches.
  const sh = f.ship ? stationGraph(f.ship, "nave") : undefined;
  if (f.ship && sh) {
    out.push(...sh.legs);
    const shipExit = (to: "sonda" | "nodriza") => f.ship!.plan.fixtures.find((x) => x.action.kind === "salir" && x.action.to === to);
    const toLander = shipExit("sonda");
    const toStation = shipExit("nodriza");
    if (f.ship.fixture(SHIP_FLIGHT_DECK_HATCH)) both(`nave:${SHIP_FLIGHT_DECK_HATCH}`, "puente:salida", "escotilla", JOURNEY_PACE.hatchS, "Por la escotilla del techo a la cubierta de vuelo", "Por la escotilla a la cubierta 1");
    if (toLander) both(`nave:${toLander.id}`, "modulo:acople", "escotilla", JOURNEY_PACE.hatchS, "Por la escotilla de la cubierta 3 al módulo", "Por la escotilla del techo a la Starship", { open: landerAboard, shut: landerShut });
    if (toStation && nodriza) both(`nave:${toStation.id}`, `estacion:${nodriza.id}`, "escotilla", JOURNEY_PACE.hatchS, "Por el túnel de proa a la estación", "Por la escotilla a la Starship", { open: shipHere, shut: shipShut });
  }
  // The flights: the lander home to the travel ship from its pilot seat; the travel ship to the station from a navigation console.
  const fl = f.flights;
  if (fl.landerToMothership) out.push({ from: "modulo:asiento", to: "modulo:asiento", kind: "vuelo", seconds: fl.landerToMothership.seconds, label: "Volar y acoplar en la nodriza", open: (j) => j.lander !== "nodriza", then: (j) => ({ ...j, lander: "nodriza" }), ...(fl.landerToMothership.blocked ? { blocked: fl.landerToMothership.blocked } : {}) });
  if (fl.carrierToStation)
    for (const at of f.ship ? ["puente:nav"] : ["puente:nav", "anillo:navegacion"])
      out.push({ from: at, to: at, kind: "vuelo", seconds: fl.carrierToStation.seconds, label: f.ship ? "La Starship vuela a la estación y atraca" : "La nodriza vuela a la estación y entra en el dique seco", open: (j) => !j.mothershipAtStation, shut: "La nodriza ya está en el dique seco", then: (j) => ({ ...j, mothershipAtStation: true }), ...(fl.carrierToStation.blocked ? { blocked: fl.carrierToStation.blocked } : {}) });
  // From where she is now.
  out.push(...fromHere(f, sp, st.g, sh?.g));
  return out;
}

/** The place she starts from, as a graph place. */
export function herePlace(h: JourneyHere): string {
  if (h.room === "modulo" && h.at === "asiento") return "modulo:asiento";
  if (h.room === "radio") return h.up ? "eje:ascensor" : "anillo:ascensor";
  return `${h.room}:aqui`;
}

function fromHere(f: JourneyFacts, sp: Spine | undefined, stG: HopGraph, shipG?: HopGraph): Transfer[] {
  const h = f.here;
  const out: Transfer[] = [];
  const from = herePlace(h);
  if (h.room === "anillo") {
    out.push({ from, to: "anillo:ascensor", kind: "andar", seconds: ringWalk(h.at, RING_ELEVATOR.anchor), label: "Andar hasta el ascensor del radio" });
    for (const s of RING_STATIONS) out.push({ from, to: `anillo:${s.id}`, kind: "andar", seconds: ringWalk(h.at, s.stand), label: `Andar hasta: ${s.label}` });
  } else if (h.room === "eje" && sp) {
    const p = sp.g.points.find((q) => q.id === h.point);
    for (const poi of ["ascensor", "atraque", "puente"]) {
      const s = p && hopChainSeconds(sp.g, p, sp.g.poiPoint(poi)!.id);
      if (s !== undefined) out.push({ from, to: `eje:${poi}`, kind: "saltos", seconds: s, label: `Saltos por la espina hasta ${poi === "ascensor" ? "el ascensor" : poi === "atraque" ? "la escotilla de atraque" : "la escotilla del puente"}` });
    }
  } else if (h.room === "puente") {
    for (const s of BRIDGE.stations) out.push({ from, to: `puente:${s.id}`, kind: "andar", seconds: roomWalk(BRIDGE, h.at, s.stand, JOURNEY_PACE.bridgeMs), label: `Andar hasta: ${BRIDGE_LABEL[s.id]}` });
  } else if (h.room === "modulo" && h.at !== "asiento") {
    const at = h.at;
    for (const s of LANDER_CABIN.stations) out.push({ from, to: `modulo:${s.id}`, kind: "andar", seconds: roomWalk(LANDER_CABIN, at, s.stand, JOURNEY_PACE.cabinMs) + (s.id === "asiento" ? JOURNEY_PACE.seatS : 0), label: `Andar hasta: ${CABIN_LABEL[s.id]}` });
  } else if (h.room === "estacion" || (h.room === "nave" && f.ship && shipG)) {
    const g = h.room === "nave" ? shipG! : stG;
    const plan = h.room === "nave" ? f.ship!.plan : f.station.plan;
    const p = g.points.find((q) => q.id === h.point);
    for (const fx of plan.fixtures) {
      if (!GOAL_KINDS.has(fx.action.kind) && fx.id !== SHIP_FLIGHT_DECK_HATCH) continue;
      const to = g.poiPoint(fx.id);
      const s = p && to && (to.id === p.id ? 0 : hopChainSeconds(g, p, to.id));
      if (s !== undefined) out.push({ from, to: `${h.room}:${fx.id}`, kind: "saltos", seconds: s, label: `Saltos hasta: ${fx.label}` });
    }
  }
  return out;
}

/** The landing point of the spine nearest to a position (where she starts when she is mid-hop). */
export function spinePointNear(ringRadiusM: number, p: Vec3): string | undefined {
  return spine(ringRadiusM).g.nearest(p)?.id;
}

/** The landing point of a station fixture (its grab point), for starting a journey there. */
export function stationPointOf(st: StationInterior, fixtureId: string): string | undefined {
  return stationGraph(st).g.poiPoint(fixtureId)?.id;
}

/** The landing point of the station nearest to a position (where she starts when she is mid-hop). */
export function stationPointNear(st: StationInterior, p: Vec3): string | undefined {
  return stationGraph(st).g.nearest(p)?.id;
}

/** The landing point of a fixture of Starship's decks (its grab point), for starting a journey there. */
export function shipPointOf(ship: StationInterior, fixtureId: string): string | undefined {
  return stationGraph(ship, "nave").g.poiPoint(fixtureId)?.id;
}
