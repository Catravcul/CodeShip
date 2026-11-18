import { model } from "./catalog";
import type { Instance, S1Area, S1Layout } from "./layout";
import { ROOM_OWNERS } from "./models/residencia";
import { LOBES, STAFF, WATER_Y, lobeRadius } from "./site";
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
}

/** The work floors (ours, until WorkRoster): kitchen, hospital, vet, cría, labs, workshops, farm and guard. */
export const WORK_FLOORS = ["restaurante", "hospital-urgencias", "hospital-veterinario", "cria", "carne-cultivada", "construccion", "textil", "huerto-vertical-1", "campos-huerto", "informatica", "quimica-sintesis", "biologia-cultivo", "mecanica", "guardia", "garaje-submarino"] as const;
export const TRAINING_FLOORS = ["gimnasio-0", "cardio", "calistenia", "yoga-hatha-1", "yoga-ashtanga-1"] as const;

/** Is (x, z) on ice or land (else it is sea)? */
export function onGround(x: number, z: number): boolean {
  return LOBES.some((l, i) => l.r > 0 && Math.hypot(x - l.x, z - l.z) <= lobeRadius(l, i, x, z));
}

const FLOORISH = /suelo|alfombras|bahia|bancal|zona-/;

/** A spot 0,7 m in front of the n-th thing of an area (its −z side turned by its yaw), facing it. */
function spotAt(list: readonly Instance[], n: number, a: S1Area, pose: Place["pose"]): Place {
  const it = list[n % list.length];
  if (!it) return { area: a.id, x: a.x, y: a.y, z: a.z, yaw: 0, pose: "stand" };
  const d = model(it.model);
  const off = d.size.z / 2 + 0.7;
  const x = it.x - off * Math.sin(it.rot);
  const z = it.z - off * Math.cos(it.rot);
  return { area: a.id, x, y: a.y, z, yaw: Math.atan2(it.x - x, it.z - z), pose };
}

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
    const who = name === "JefeConstruccion" ? "Tote" : name;
    let room = ROOM_OWNERS.findIndex((o) => o.split(/, | y /).includes(who));
    if (room < 0) room = 25 + (i % 5);
    const floor = byFurnish.get(`habitaciones-${Math.floor(room / 7) + 1}`)!;
    const cabin = L.instances.find((q) => q.area === floor.id && q.model.startsWith("res-habitacion") && q.name?.includes(ROOM_OWNERS[room] ?? `libre ${room + 1}`));
    const lane = (ROOM_OWNERS[room]?.split(/, | y /).indexOf(who) ?? 0) * 0.9 - 1.35;
    const bed: Place = cabin
      ? { area: floor.id, x: cabin.x - 2.6 + lane, y: floor.y + 0.85, z: cabin.z + 2.3, yaw: Math.PI, pose: "supine" }
      : { area: floor.id, x: floor.x, y: floor.y, z: floor.z, yaw: 0, pose: "stand" };
    const train = TRAINING_FLOORS[i % TRAINING_FLOORS.length]!;
    const free: Place = i % 2 ? at("residencia-plaza", i, "stand") : { area: hub.id, x: hub.x + Math.cos(i) * 10, y: 0, z: hub.z + Math.sin(i) * 10, yaw: -i, pose: "stand" };
    out.set(name, {
      dormir: bed,
      desayuno: at("restaurante", 1000 + i * 3, "stand"),
      comida: at("restaurante", 1000 + i * 3, "stand"),
      entrenamiento: at(train, i * 5, "stand"),
      tareas: at(WORK_FLOORS[i % WORK_FLOORS.length]!, i * 7 + 3, "stand"),
      libre: free,
    });
  });
  return out;
}

/**
 * The way from one place to another, as Cold Sanctuary's people go (no teleports): out of the floor by its door into
 * the trunk's water, down (or up) the trunk, out by its ground door, across the ice (swimming where the sea is between
 * two caps), in by the other trunk's ground door and up to the floor. Ground stretches are cut in 6 m steps so the
 * swum ones are marked.
 */
export function wayBetween(L: S1Layout, a: Place, b: Place): Waypoint[] {
  const area = new Map(L.areas.map((q) => [q.id, q]));
  const tower = new Map(L.towers.map((t) => [t.id, t]));
  const A = area.get(a.area);
  const B = area.get(b.area);
  const pts: Waypoint[] = [{ x: a.x, y: a.y, z: a.z }];
  const ta = A?.link?.tower;
  const tb = B?.link?.tower;
  if (A?.link && A.entry) pts.push({ x: A.entry.x, y: A.y, z: A.entry.z }, { x: A.link.inner.x, y: A.y + 0.4, z: A.link.inner.z, swim: true });
  if (ta && ta !== tb) {
    const g = tower.get(ta)!.ground;
    pts.push({ x: g.inner.x, y: 0.4, z: g.inner.z, swim: true }, { x: g.out.x, y: 0, z: g.out.z });
  }
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
  if (tb && tb !== ta) {
    const g = tower.get(tb)!.ground;
    ground(g.out.x, g.out.z);
    pts.push({ x: g.inner.x, y: 0.4, z: g.inner.z, swim: true });
  }
  if (B?.link && B.entry) pts.push({ x: B.link.inner.x, y: B.y + 0.4, z: B.link.inner.z, swim: true }, { x: B.entry.x, y: B.y, z: B.entry.z });
  else ground(b.x, b.z);
  pts.push({ x: b.x, y: b.y, z: b.z });
  return pts;
}
