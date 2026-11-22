import { STATIONS, stationWorld } from "./estaciones";
import { carpetRoute, type CarpetStation } from "./alfombras";
import { model } from "./catalog";
import type { Instance, S1Area, S1Layout } from "./layout";
import { ROOM_OWNERS } from "./models/residencia";
import { BASE, LOBES, STAFF, TOWERS, WATER_Y, lobeRadius } from "./site";
import { TRUNK_HALF } from "./paso";
import { TREE } from "@modules/aerial-sanctuary/data/facts";
import type { Activity, Waypoint } from "../domain/motion";

/**
 * WHERE EACH ONE GOES during the workday (domain/motion.ts WORKDAY) and the way there. Cold Sanctuary hands out the
 * day's missions with its WorkRoster; until the missions are ported here (misiones-y-jornada.md §3), each person has a
 * fixed workplace (round robin over the work floors, ours), trains in turn on the training floors, eats in the
 * restaurant, spends the free hours in the Residencia's plaza or on the hub, and sleeps in their own room.
 */
export interface Place {
  readonly area: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pose: "stand" | "sit" | "supine";
  /** The model of the thing she works at here, if any: its challenge's steps are what she is seen doing. */
  readonly work?: string;
}

/** The work floors (ours, until WorkRoster): kitchen, hospital, vet, cría, labs, workshops, farm and guard. */
export const WORK_FLOORS = ["restaurante", "hospital", "hospital-veterinario", "cria-carne-cultivada", "construccion", "mecanica-garaje", "textil-huerto", "campos-huerto", "informatica", "laboratorios", "asambleas-guardia"] as const;
export const TRAINING_FLOORS = ["gimnasio", "funcional", "combate", "salas"] as const;

/** Is (x, z) on ice or land (else it is sea)? */
export function onGround(x: number, z: number): boolean {
  return LOBES.some((l, i) => l.r > 0 && Math.hypot(x - l.x, z - l.z) <= lobeRadius(l, i, x, z)) || onBase(x, z);
}

/** Is (x, z) on a tree's base at sea (site.ts BASE: its deck round the trunk, not its hole)? */
function onBase(x: number, z: number): boolean {
  const OH = TRUNK_HALF + TREE.wall.value;
  const BH = OH + BASE.walk;
  return TOWERS.some((t) => Math.abs(x - t.x) <= BH && Math.abs(z - t.z) <= BH && (Math.abs(x - t.x) >= OH || Math.abs(z - t.z) >= OH));
}

const FLOORISH = /suelo|alfombras|bahia|bancal|zona-/;

/** A spot 0,7 m in front of the n-th thing of an area (its −z side turned by its yaw), facing it. */
function spotAt(list: readonly Instance[], n: number, a: S1Area, pose: Place["pose"]): Place {
  const it = list[n % list.length];
  if (!it) return { area: a.id, x: a.x, y: a.y, z: a.z, yaw: 0, pose: "stand" };
  // On a machine with a station (a gym seat, a treadmill's belt) they work on it, not in front of it.
  const st = STATIONS[it.model];
  if (st) {
    const w = stationWorld(st, it);
    return { area: a.id, x: w.x, y: it.y + (st.y ?? 0), z: w.z, yaw: w.yaw, pose, work: it.model };
  }
  const d = model(it.model);
  const off = d.size.z / 2 + 0.7;
  const x = it.x - off * Math.sin(it.rot);
  const z = it.z - off * Math.cos(it.rot);
  return { area: a.id, x, y: a.y, z, yaw: Math.atan2(it.x - x, it.z - z), pose, work: it.model };
}

/**
 * People whose work is their own in Cold Sanctuary: Sadhguru teaches yoga (WorkdayDirector: he meditates in the yoga
 * room), the Magnate is the sanctuary's teacher (Magnate.cs «la maestra del santuario»), Neo is a child: school and play.
 */
const ROLES: Readonly<Record<string, { tareas?: string; entrenamiento?: string }>> = {
  Sadhguru: { tareas: "salas", entrenamiento: "salas" },
  Nevaeh: { tareas: "residencia-plaza" },
  Neo: { tareas: "residencia-plaza", entrenamiento: "funcional" },
};

/** Each person's place for each activity. */
export function staffPlaces(L: S1Layout): Map<string, Record<Activity, Place>> {
  const byFurnish = new Map(L.areas.filter((a) => a.furnish).map((a) => [a.furnish!, a]));
  const things = new Map<string, Instance[]>();
  for (const i of L.instances) if (!FLOORISH.test(i.model) && model(i.model).shape !== "figura" && !i.wander) things.set(i.area, [...(things.get(i.area) ?? []), i]);
  const at = (furnish: string, n: number, pose: Place["pose"]): Place => {
    const a = byFurnish.get(furnish)!;
    return spotAt(things.get(a.id) ?? [], n, a, pose);
  };
  const hub = L.areas.find((a) => a.id === "hielo:Centro")!;
  const out = new Map<string, Record<Activity, Place>>();
  STAFF.forEach((name, i) => {
    // Their room: the one whose owners include them (Tote is JefeConstruccion), else a free one.
    const who = name === "JefeConstruccion" ? "Tote" : name === "Nevaeh" ? "la Magnate" : name;
    let room = ROOM_OWNERS.findIndex((o) => o.split(/, | y /).includes(who));
    if (room < 0) room = 25 + (i % 5);
    const floor = byFurnish.get(`habitaciones-${Math.floor(room / 7) + 1}`)!;
    const cabin = L.instances.find((q) => q.area === floor.id && q.model.startsWith("res-habitacion") && q.name?.includes(ROOM_OWNERS[room] ?? `libre ${room + 1}`));
    const lane = (ROOM_OWNERS[room]?.split(/, | y /).indexOf(who) ?? 0) * 0.9 - 1.35;
    const bed: Place = cabin
      ? { area: floor.id, x: cabin.x - 2.6 + lane, y: floor.y + 0.85, z: cabin.z + 2.3, yaw: Math.PI, pose: "supine" }
      : { area: floor.id, x: floor.x, y: floor.y, z: floor.z, yaw: 0, pose: "stand" };
    const role = ROLES[name];
    const train = role?.entrenamiento ?? TRAINING_FLOORS[i % TRAINING_FLOORS.length]!;
    const free: Place = i % 2 ? at("residencia-plaza", i, "stand") : { area: hub.id, x: hub.x + Math.cos(i) * 10, y: 0, z: hub.z + Math.sin(i) * 10, yaw: -i, pose: "stand" };
    out.set(name, {
      dormir: bed,
      desayuno: at("restaurante", 1000 + i * 3, "stand"),
      comida: at("restaurante", 1000 + i * 3, "stand"),
      entrenamiento: at(train, i * 5, "stand"),
      tareas: at(role?.tareas ?? WORK_FLOORS[i % WORK_FLOORS.length]!, i * 7 + 3, "stand"),
      libre: free,
    });
  });
  return out;
}

/**
 * The way from one place to another, as Cold Sanctuary's people go (no teleports): between floors and buildings
 * by flying carpet: she walks to her floor's station, flies by its lanes (alfombras.ts) to the other floor's, and walks
 * to her place; to another building by the crowns (or from the ice by the feet). On the ice she walks, swimming where
 * the sea is between two caps. Ground stretches are cut in 6 m steps so the swum ones are marked.
 */
export function wayBetween(L: S1Layout, a: Place, b: Place): Waypoint[] {
  const pts: Waypoint[] = [{ x: a.x, y: a.y, z: a.z }];
  const ground = (x: number, z: number) => {
    const p = pts[pts.length - 1]!;
    const d = Math.hypot(x - p.x, z - p.z);
    const n = Math.ceil(d / 6);
    for (let k = 1; k <= n; k++) {
      const qx = p.x + ((x - p.x) * k) / n;
      const qz = p.z + ((z - p.z) * k) / n;
      const sea = !onGround(qx, qz);
      pts.push({ x: qx, y: sea ? WATER_Y - 1 : 0, z: qz, ...(sea ? { swim: true } : {}) });
    }
  };
  const own = (p: Place) => L.carpets.find((s) => s.kind === "piso" && s.area === p.area);
  const foot = (p: Place) => L.carpets.filter((s) => s.kind === "pie").reduce<CarpetStation | undefined>((m, s) => (!m || Math.hypot(s.x - p.x, s.z - p.z) < Math.hypot(m.x - p.x, m.z - p.z) ? s : m), undefined);
  const sa = a.area === b.area ? undefined : own(a);
  const sb = a.area === b.area ? undefined : own(b);
  if (!sa && !sb) {
    ground(b.x, b.z);
    pts.push({ x: b.x, y: b.y, z: b.z });
    return pts;
  }
  const from = sa ?? foot(a)!;
  const to = sb ?? foot(b)!;
  // On the ice she walks to the foot's station first.
  if (!sa) ground(from.x, from.z);
  else pts.push({ x: from.x, y: from.y, z: from.z });
  const hop = (x: CarpetStation, y: CarpetStation) => {
    if (x.id !== y.id) pts.push(...carpetRoute({ ...L.world, towers: L.towers }, x, y).slice(1));
  };
  if (from.tower === to.tower) hop(from, to);
  else {
    // Between buildings: by the crowns (from and to the ice, by the feet).
    const kind = !sa || !sb ? "pie" : "copa";
    const ga = L.carpets.find((s) => s.tower === from.tower && s.kind === kind)!;
    const gb = L.carpets.find((s) => s.tower === to.tower && s.kind === kind)!;
    hop(from, ga);
    hop(ga, gb);
    hop(gb, to);
  }
  if (!sb) ground(b.x, b.z);
  pts.push({ x: b.x, y: b.y, z: b.z });
  return pts;
}
