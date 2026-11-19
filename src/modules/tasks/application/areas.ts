/**
 * The «Áreas» window's schematic of a vehicle (docs/design/areas.md, Berón 2026-11-17): every area she can
 * go to is a box of the real plan (metres, the vehicle's frame) with a place of the journey graph and a line
 * on what is there, and the hatches that join them are links.
 * Pure: the window draws it as a 3D map and the journey (or the teleport) takes her there.
 *
 * Reusable on purpose: a node carries only where it is, what it is called and where to go, so a later
 * «mission on the map» can highlight the node of the selected task on the same schematic (not built yet).
 */
import type { StationInterior, InteriorVolume } from "@modules/station/domain/interior";
import type { Vehicle } from "./task-list";
import { GOAL_KINDS } from "./journey-world";

/** A point or a size in metres, in the vehicle's own frame (y up). */
export interface AreaVec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AreaNode {
  readonly id: string;
  readonly label: string;
  /** Short code (NOD2, LAB1…), if any. */
  readonly code?: string;
  /** One line on what is there, for the list under the map. */
  readonly desc: string;
  /** The journey graph's place: «estacion:<fixture>», «nave:<fixture>», «puente:nav», «modulo:<sitio>». */
  readonly goal: string;
  /** Where to put her when teleporting: a fixture of the interior, or a spot of the LM. */
  readonly fixture: string;
  /** The area as a box of the vehicle, metres: the 3D map draws it there. */
  readonly centre: AreaVec;
  readonly half: AreaVec;
  /** Its kind, for the category chips of the list (Hábitat, Laboratorio; Gimnasio, Cocina…). */
  readonly category?: string;
  /** Where it belongs, for the window's scope setting: e.g. `{ edificio: "entrenamiento" }` or `{ casquete: "norte" }`. */
  readonly scope?: Readonly<Record<string, string>>;
}

export interface AreaMap {
  readonly vehicle: Vehicle;
  readonly nodes: readonly AreaNode[];
  /** Pairs of node ids joined by a hatch or a passage. */
  readonly links: readonly (readonly [string, string])[];
  /**
   * The place's own shape under the areas (sanctuary 1: each tree-building's trunk, floors and rings; the caps of
   * ice), drawn faint so the chosen building is seen as itself (Berón 2026-11-19). Same scope keys as the nodes.
   */
  readonly structure?: readonly { readonly centre: AreaVec; readonly half: AreaVec; readonly scope?: Readonly<Record<string, string>>; readonly kind: "tronco" | "piso" | "anillo" | "hielo" | "tierra" }[];
}

const xyz = (v: AreaVec): AreaVec => ({ x: v.x, y: v.y, z: v.z });

const KIND: Readonly<Record<InteriorVolume["kind"], string>> = { nodo: "Nodo", habitat: "Hábitat", fabrica: "Fábrica", laboratorio: "Laboratorio", agricola: "Módulo agrícola", planta: "Planta", esclusa: "Esclusa", hangar: "Hangar", escotilla: "Escotilla", compartimento: "Compartimento" };

/** «Laboratorio: Panel de experimentos, Guantera…»: what kind of space and what she can use in it. */
function describe(v: InteriorVolume, st: StationInterior): string {
  const things = [...new Set(st.plan.fixtures.filter((f) => f.volume === v.id && GOAL_KINDS.has(f.action.kind)).map((f) => f.label))];
  const shown = things.slice(0, 4).join(", ") + (things.length > 4 ? "…" : "");
  return shown ? `${KIND[v.kind]}: ${shown}` : KIND[v.kind];
}

const touches = (a: InteriorVolume, b: InteriorVolume, eps = 0.05) =>
  (["x", "y", "z"] as const).every((k) => Math.abs(a.centre[k] - b.centre[k]) <= a.half[k] + b.half[k] + eps);

/**
 * The schematic of a 0 g interior (the station, or Starship's decks): one node per pressurised compartment
 * that has somewhere to go, as its box of the plan; the hatches join them.
 * `room` is the journey graph's prefix; `hasPoint` says whether the graph can reach a fixture.
 */
export function interiorAreas(vehicle: Vehicle, st: StationInterior, room: "estacion" | "nave", hasPoint: (fixtureId: string) => boolean): AreaMap {
  const rooms = st.plan.volumes.filter((v) => v.kind !== "escotilla" && v.kind !== "hangar");
  const goalIn = (v: InteriorVolume) => st.plan.fixtures.find((f) => f.volume === v.id && GOAL_KINDS.has(f.action.kind) && f.action.kind !== "salir" && hasPoint(f.id)) ?? st.plan.fixtures.find((f) => f.volume === v.id && GOAL_KINDS.has(f.action.kind) && hasPoint(f.id));
  const withGoal = rooms.map((v) => ({ v, f: goalIn(v) })).filter((r): r is { v: InteriorVolume; f: NonNullable<ReturnType<typeof goalIn>> } => !!r.f);
  const nodes: AreaNode[] = withGoal.map(({ v, f }) => ({ id: v.id, label: v.label, code: v.code, desc: describe(v, st), goal: `${room}:${f.id}`, fixture: f.id, centre: xyz(v.centre), half: xyz(v.half), category: KIND[v.kind] }));
  const hatches = st.plan.volumes.filter((v) => v.kind === "escotilla");
  const links: [string, string][] = [];
  const add = (a: string, b: string) => a !== b && !links.some(([p, q]) => (p === a && q === b) || (p === b && q === a)) && links.push([a, b]);
  for (const h of hatches) {
    const near = withGoal.filter((r) => touches(r.v, h)).map((r) => r.v.id);
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) add(near[i]!, near[j]!);
  }
  for (let i = 0; i < withGoal.length; i++) for (let j = i + 1; j < withGoal.length; j++) if (touches(withGoal[i]!.v, withGoal[j]!.v, 0.01)) add(withGoal[i]!.v.id, withGoal[j]!.v.id);
  return { vehicle, nodes, links };
}

/** Starship: its decks, plus the flight deck above deck 1 (the bridge, through the ceiling hatch). */
export function starshipAreas(st: StationInterior, hasPoint: (fixtureId: string) => boolean): AreaMap {
  const decks = interiorAreas("nodriza", st, "nave", hasPoint);
  const top = [...decks.nodes].sort((a, b) => b.centre.y + b.half.y - (a.centre.y + a.half.y))[0];
  const deck: AreaNode | undefined = top && {
    id: "cubierta-vuelo",
    label: "Cubierta de vuelo",
    desc: "El puente: navegación, pilotaje y la sonda",
    goal: "puente:nav",
    fixture: "nav",
    centre: { x: top.centre.x, y: top.centre.y + top.half.y + 1.2, z: top.centre.z },
    half: { x: top.half.x * 0.8, y: 1, z: top.half.z * 0.8 },
    category: "Mando",
  };
  return { vehicle: "nodriza", nodes: deck ? [deck, ...decks.nodes] : decks.nodes, links: [...decks.links, ...(top ? [["cubierta-vuelo", top.id] as const] : [])] };
}

/** The Apollo LM's cabin: its stations where they are on the floor, each a few steps from the docking hatch. */
export function landerAreas(stations: readonly { id: string; label: string; what: string; stand: { x: number; z: number } }[]): AreaMap {
  const nodes: AreaNode[] = stations.map((s) => ({ id: s.id, label: s.label, desc: s.what, goal: `modulo:${s.id}`, fixture: s.id, centre: { x: s.stand.x, y: 0.3, z: s.stand.z }, half: { x: 0.18, y: 0.3, z: 0.18 }, category: "Puesto" }));
  // In the cabin every station is a few steps from the docking hatch's spot (the journey walks from there).
  const links = nodes.filter((n) => n.id !== "acople").map((n) => ["acople", n.id] as const);
  return { vehicle: "modulo", nodes, links };
}
