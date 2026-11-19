import { TREE } from "@modules/aerial-sanctuary/data/facts";
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
  /** The model of the thing she works at here, if any: its challenge's steps are what she is seen doing. */
  readonly work?: string;
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
  return { area: a.id, x, y: a.y, z, yaw: Math.atan2(it.x - x, it.z - z), pose, work: it.model };
}

/**
 * People whose work is their own in Cold Sanctuary: Sadhguru teaches yoga (WorkdayDirector: he meditates in the yoga
 * room), the Magnate is the sanctuary's teacher (Magnate.cs «la maestra del santuario»), Neo is a child: school and play.
 */
const ROLES: Readonly<Record<string, { tareas?: string; entrenamiento?: string }>> = {
  Sadhguru: { tareas: "yoga-hatha-1", entrenamiento: "yoga-hatha-1" },
  Nevaeh: { tareas: "aula-1" },
  Neo: { tareas: "aula-1", entrenamiento: "calistenia" },
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

/** How high over the higher end a carpet flies, and how far out from the building it leaves and arrives, m. */
export const CARPET = { climb: 4, out: 8 } as const;

/**
 * Where a floor's (or a ring's) carpets wait: near its outer edge, away from the trunk (Cold Sanctuary's
 * `CarpetPad` areas: «ya no hay escaleras ni puentes: se va de un piso a otro y de un edificio a otro en alfombra»).
 */
export function padOf(L: S1Layout, areaId: string): { x: number; y: number; z: number; out: { x: number; z: number } } | undefined {
  const a = L.areas.find((q) => q.id === areaId);
  const t = a?.link && L.towers.find((q) => q.id === a.link!.tower);
  if (!a || !t) return undefined;
  const dx = a.x - t.x;
  const dz = a.z - t.z;
  const d = Math.hypot(dx, dz) || 1;
  // The floor's centre is OH + FS/2 from the trunk's axis; the pad is 3 m in from its outer edge.
  const half = Math.max(4, d - (TREE.waterHalf.value + TREE.wall.value));
  const r = d + half - 3;
  return { x: t.x + (dx / d) * r, y: a.y, z: t.z + (dz / d) * r, out: { x: dx / d, z: dz / d } };
}

/**
 * The way from one place to another, as Cold Sanctuary's people go (no teleports): between floors and buildings
 * by flying carpet (`CarpetPad`): she walks to her floor's carpets, flies out from the building, over, and in to the
 * other floor's carpets, and walks to her place. On the ice she walks, swimming where the sea is between two caps;
 * a carpet takes her up from (or down to) the foot of a building. Ground stretches are cut in 6 m steps so the
 * swum ones are marked.
 */
export function wayBetween(L: S1Layout, a: Place, b: Place): Waypoint[] {
  const pts: Waypoint[] = [{ x: a.x, y: a.y, z: a.z }];
  const pa = a.area === b.area ? undefined : padOf(L, a.area);
  const pb = a.area === b.area ? undefined : padOf(L, b.area);
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
  if (!pa && !pb) {
    ground(b.x, b.z);
    pts.push({ x: b.x, y: b.y, z: b.z });
    return pts;
  }
  // From her place to the carpets (or, on the ice, the carpet comes to her).
  const from = pa ?? { x: a.x, y: a.y, z: a.z, out: { x: 0, z: 0 } };
  const to = pb ?? { x: b.x, y: b.y, z: b.z, out: { x: 0, z: 0 } };
  if (pa) pts.push({ x: pa.x, y: pa.y, z: pa.z });
  const top = Math.max(from.y, to.y) + CARPET.climb;
  pts.push(
    { x: from.x, y: from.y + 1, z: from.z, fly: true },
    { x: from.x + from.out.x * CARPET.out, y: from.y + CARPET.climb, z: from.z + from.out.z * CARPET.out, fly: true },
    { x: from.x + from.out.x * CARPET.out, y: top, z: from.z + from.out.z * CARPET.out, fly: true },
    { x: to.x + to.out.x * CARPET.out, y: top, z: to.z + to.out.z * CARPET.out, fly: true },
    { x: to.x + to.out.x * CARPET.out, y: to.y + CARPET.climb, z: to.z + to.out.z * CARPET.out, fly: true },
    { x: to.x, y: to.y + 1, z: to.z, fly: true },
    { x: to.x, y: to.y, z: to.z, fly: true },
  );
  pts.push({ x: b.x, y: b.y, z: b.z });
  return pts;
}
