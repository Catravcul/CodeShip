import { TREE } from "@modules/aerial-sanctuary/data/facts";
import type { S1Area, S1Layout, TowerShape } from "./layout";
import type { Waypoint } from "../domain/motion";

/**
 * The flying-carpet stations (Cold Sanctuary's `CarpetPad` areas, csx docs/alfombras-plan.md; Berón 2026-11-20: «en
 * cold-sanctuary… existe una estación de alfombras por cada piso… no requiere retos de código… las alfombras vuelan
 * automático»): one on every floor and ring, where its carpets wait, one on each crown and one at each foot. Stepping
 * on one offers «Volar» (the orange button, or Y on the pad); it opens the carpets' map, the same window as Áreas, with
 * only the places its carpets reach: a floor's and the foot's, the floors of its own building and its crown and foot
 * (the building's carpets); the crown's also the other buildings' crowns and feet (the sanctuary's carpets). Each
 * station keeps its own «viaje o teletransporte».
 */
export interface CarpetStation {
  /** `<area>:alfombras`. */
  readonly id: string;
  /** The area it stands in: a floor, a ring, the crown (`<tower>:techo`) or the trunk at its foot. */
  readonly area: string;
  readonly tower: string;
  readonly building: string;
  readonly kind: "piso" | "copa" | "pie";
  /** «Gimnasio», «Copa», «Pie». */
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The way its carpets leave, away from the trunk (level). */
  readonly out: { readonly x: number; readonly z: number };
  /** Where its carpets reach: the building, or the whole sanctuary (the crown's). */
  readonly reach: "edificio" | "santuario";
}

/** How high over the higher end a carpet flies, and how far out from the building it leaves and arrives, m. */
export const CARPET = { climb: 4, out: 8 } as const;

/**
 * Where a floor's (or a ring's) carpets wait: near its outer edge, away from the trunk (Cold Sanctuary's
 * `CarpetPad` areas: «ya no hay escaleras ni puentes: se va de un piso a otro y de un edificio a otro en alfombra»).
 */
export function padOf(L: Pick<S1Layout, "areas" | "towers">, areaId: string): { x: number; y: number; z: number; out: { x: number; z: number } } | undefined {
  const a = L.areas.find((q) => q.id === areaId);
  const t = a?.link && L.towers.find((q) => q.id === a.link!.tower);
  if (!a || !t) return undefined;
  const dx = a.x - t.x;
  const dz = a.z - t.z;
  const d = Math.hypot(dx, dz) || 1;
  // A floor at the end of a branch says where its carpets wait; they leave straight out from the trunk's face.
  if (a.pad) {
    const ox = Math.abs(a.entry!.x - t.x) > Math.abs(a.entry!.z - t.z) ? Math.sign(a.entry!.x - t.x) : 0;
    const oz = ox ? 0 : Math.sign(a.entry!.z - t.z);
    return { x: a.pad.x, y: a.y, z: a.pad.z, out: { x: ox, z: oz } };
  }
  // The floor's centre is OH + FS/2 from the trunk's axis; the pad is 3 m in from its outer edge.
  const half = Math.max(4, d - (TREE.waterHalf.value + TREE.wall.value));
  const r = d + half - 3;
  return { x: t.x + (dx / d) * r, y: a.y, z: t.z + (dz / d) * r, out: { x: dx / d, z: dz / d } };
}

/** The station's pad (Cold Sanctuary's carpet area: ~7 × 4 m with two carpets), m. */
export const STATION_PAD = { x: 7.6, z: 4.4 } as const;

/** Every station: each floor's and ring's where its carpets wait (`padOf`), each crown's and each foot's. */
export function carpetStations(L: { readonly areas: readonly S1Area[]; readonly towers: readonly TowerShape[] }, parks: (tower: string) => { crown: { x: number; y: number; z: number }; foot: { x: number; y: number; z: number } }): CarpetStation[] {
  const out: CarpetStation[] = [];
  for (const t of L.towers) {
    for (const a of L.areas) {
      if (a.link?.tower !== t.id) continue;
      const p = padOf(L, a.id);
      if (!p) continue;
      out.push({ id: `${a.id}:alfombras`, area: a.id, tower: t.id, building: t.building, kind: "piso", label: a.label, x: p.x, y: p.y, z: p.z, out: p.out, reach: "edificio" });
    }
    const { crown, foot } = parks(t.id);
    const away = (p: { x: number; z: number }) => {
      const d = Math.hypot(p.x - t.x, p.z - t.z) || 1;
      return { x: (p.x - t.x) / d, z: (p.z - t.z) / d };
    };
    out.push({ id: `${t.id}:techo:alfombras`, area: `${t.id}:techo`, tower: t.id, building: t.building, kind: "copa", label: "Copa", ...crown, out: { x: 0, z: 0 }, reach: "santuario" });
    out.push({ id: `${t.id}:pie:alfombras`, area: `${t.id}:tronco`, tower: t.id, building: t.building, kind: "pie", label: "Pie", ...foot, out: away(foot), reach: "edificio" });
  }
  return out;
}

/** Where a station's carpets go: its building's other stations, and from a crown also the other crowns and feet. */
export function carpetDestinations(all: readonly CarpetStation[], from: CarpetStation): CarpetStation[] {
  return all.filter((s) => s.id !== from.id && (s.tower === from.tower || (from.reach === "santuario" && s.kind !== "piso")));
}

/** The station she stands on, if any (on its pad, at its height). */
export function stationAt(all: readonly CarpetStation[], x: number, y: number, z: number): CarpetStation | undefined {
  return all.find((s) => Math.abs(y - s.y) < 1.2 && Math.abs(x - s.x) <= STATION_PAD.x / 2 + 0.3 && Math.abs(z - s.z) <= STATION_PAD.x / 2 + 0.3);
}

/**
 * The flight from one station's pad to another's (automatic, no challenge): up off the pad, out from the building,
 * up (or down) to over the higher one, across, and down onto the other pad.
 */
export function carpetFlight(from: Pick<CarpetStation, "x" | "y" | "z" | "out">, to: Pick<CarpetStation, "x" | "y" | "z" | "out">): Waypoint[] {
  const top = Math.max(from.y, to.y) + CARPET.climb;
  return [
    { x: from.x, y: from.y, z: from.z },
    { x: from.x, y: from.y + 1, z: from.z, fly: true },
    { x: from.x + from.out.x * CARPET.out, y: from.y + CARPET.climb, z: from.z + from.out.z * CARPET.out, fly: true },
    { x: from.x + from.out.x * CARPET.out, y: top, z: from.z + from.out.z * CARPET.out, fly: true },
    { x: to.x + to.out.x * CARPET.out, y: top, z: to.z + to.out.z * CARPET.out, fly: true },
    { x: to.x + to.out.x * CARPET.out, y: to.y + CARPET.climb, z: to.z + to.out.z * CARPET.out, fly: true },
    { x: to.x, y: to.y + 1, z: to.z, fly: true },
    { x: to.x, y: to.y, z: to.z, fly: true },
  ];
}
