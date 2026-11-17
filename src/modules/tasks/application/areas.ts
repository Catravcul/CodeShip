/**
 * The «Áreas» window's schematic of a vehicle (docs/design/areas.md, Berón 2026-11-17): every area she can
 * go to is a node with a place of the journey graph, laid out from the real plan, and the hatches that join
 * them are links. Pure: the window draws it and the journey (or the teleport) takes her there.
 *
 * Reusable on purpose: a node carries only where it is, what it is called and where to go, so a later
 * «mission on the map» can highlight the node of the selected task on the same schematic (not built yet).
 */
import type { StationInterior, InteriorVolume } from "@modules/station/domain/interior";
import type { Vehicle } from "./task-list";
import { GOAL_KINDS } from "./journey-world";

export interface AreaNode {
  readonly id: string;
  readonly label: string;
  /** Short code under the name (NOD2, LAB1…), if any. */
  readonly code?: string;
  /** The journey graph's place: «estacion:<fixture>», «nave:<fixture>», «puente:nav», «modulo:<sitio>». */
  readonly goal: string;
  /** Where to put her when teleporting: a fixture of the interior, or a spot of the LM. */
  readonly fixture: string;
  /** Box of the node in the schematic, 0..1 of its width and height. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface AreaMap {
  readonly vehicle: Vehicle;
  readonly nodes: readonly AreaNode[];
  /** Pairs of node ids joined by a hatch or a passage. */
  readonly links: readonly (readonly [string, string])[];
}

const touches = (a: InteriorVolume, b: InteriorVolume, eps = 0.05) =>
  (["x", "y", "z"] as const).every((k) => Math.abs(a.centre[k] - b.centre[k]) <= a.half[k] + b.half[k] + eps);

/**
 * The schematic of a 0 g interior (the station, or Starship's decks): one node per pressurised compartment
 * that has somewhere to go, laid out on the two axes the plan spreads along most; the hatches join them.
 * `room` is the journey graph's prefix; `hasPoint` says whether the graph can reach a fixture.
 */
export function interiorAreas(vehicle: Vehicle, st: StationInterior, room: "estacion" | "nave", hasPoint: (fixtureId: string) => boolean): AreaMap {
  const rooms = st.plan.volumes.filter((v) => v.kind !== "escotilla" && v.kind !== "hangar");
  const goalIn = (v: InteriorVolume) => st.plan.fixtures.find((f) => f.volume === v.id && GOAL_KINDS.has(f.action.kind) && f.action.kind !== "salir" && hasPoint(f.id)) ?? st.plan.fixtures.find((f) => f.volume === v.id && GOAL_KINDS.has(f.action.kind) && hasPoint(f.id));
  const withGoal = rooms.map((v) => ({ v, f: goalIn(v) })).filter((r): r is { v: InteriorVolume; f: NonNullable<ReturnType<typeof goalIn>> } => !!r.f);
  // The two axes with the widest spread of compartments: the schematic is the plan seen from there.
  const spread = (k: "x" | "y" | "z") => {
    const lo = Math.min(...withGoal.map((r) => r.v.centre[k] - r.v.half[k]));
    const hi = Math.max(...withGoal.map((r) => r.v.centre[k] + r.v.half[k]));
    return { k, lo, hi, d: hi - lo };
  };
  const axes = (["x", "y", "z"] as const).map(spread).sort((a, b) => b.d - a.d);
  const [u, w] = [axes[0]!, axes[1]!];
  // Vertical decks read top to bottom (Starship's deck 1 above deck 3); forward (−z) is up on a flat plan.
  const flipW = w.k !== "y";
  const nodes: AreaNode[] = withGoal.map(({ v, f }) => {
    const x = (v.centre[u.k] - v.half[u.k] - u.lo) / (u.d || 1);
    const y0 = (v.centre[w.k] - v.half[w.k] - w.lo) / (w.d || 1);
    const h = (2 * v.half[w.k]) / (w.d || 1);
    return { id: v.id, label: v.label, code: v.code, goal: `${room}:${f.id}`, fixture: f.id, x, y: flipW ? y0 : 1 - y0 - h, w: (2 * v.half[u.k]) / (u.d || 1), h };
  });
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
  const top = [...decks.nodes].sort((a, b) => a.y - b.y)[0];
  // The decks share the space below a 0,14 band on top for the flight deck.
  const squeeze = (n: AreaNode): AreaNode => ({ ...n, y: 0.18 + n.y * 0.82, h: n.h * 0.82 });
  const nodes = [{ id: "cubierta-vuelo", label: "Cubierta de vuelo", goal: "puente:nav", fixture: "nav", x: 0.15, y: 0, w: 0.7, h: 0.14 }, ...decks.nodes.map(squeeze)];
  return { vehicle: "nodriza", nodes, links: [...decks.links, ...(top ? [["cubierta-vuelo", top.id] as const] : [])] };
}

/** The Apollo LM's cabin: its stations as the real layout (forward at the top), joined across the floor. */
export function landerAreas(stations: readonly { id: string; label: string; stand: { x: number; z: number } }[]): AreaMap {
  const xs = stations.map((s) => s.stand.x);
  const zs = stations.map((s) => s.stand.z);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const W = 0.3;
  const H = 0.2;
  const nodes: AreaNode[] = stations.map((s) => ({ id: s.id, label: s.label, goal: `modulo:${s.id}`, fixture: s.id, x: ((s.stand.x - x0) / (x1 - x0 || 1)) * (1 - W), y: ((s.stand.z - z0) / (z1 - z0 || 1)) * (1 - H), w: W, h: H }));
  // In the cabin every station is a few steps from the docking hatch's spot (the journey walks from there).
  const links = nodes.filter((n) => n.id !== "acople").map((n) => ["acople", n.id] as const);
  return { vehicle: "modulo", nodes, links };
}

export interface PlacedNode {
  readonly node: AreaNode;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The schematic in pixels for a finger: each node at least `minPx` square (and `minWidthPx` wide, for its name) (44 px on a phone, reglas.md §5.5) and
 * none over another (pushed apart along the shorter overlap, keeping the plan's order); the drawing grows taller
 * if it has to. Returns the nodes and the height used.
 */
export function placeNodes(map: AreaMap, widthPx: number, heightPx: number, minPx = 44, gapPx = 6, minWidthPx = minPx): { nodes: PlacedNode[]; height: number } {
  const r = map.nodes.map((n) => {
    const w = Math.min(widthPx, Math.max(minWidthPx, n.w * widthPx));
    const h = Math.max(minPx, n.h * heightPx);
    const cx = (n.x + n.w / 2) * widthPx;
    const cy = (n.y + n.h / 2) * heightPx;
    return { node: n, left: cx - w / 2, top: cy - h / 2, width: w, height: h };
  });
  const clampX = (b: (typeof r)[number]) => (b.left = Math.max(0, Math.min(widthPx - b.width, b.left)));
  for (const b of r) clampX(b);
  for (let it = 0; it < 300; it++) {
    let moved = false;
    for (let i = 0; i < r.length; i++)
      for (let j = i + 1; j < r.length; j++) {
        const a = r[i]!;
        const b = r[j]!;
        const ox = Math.min(a.left + a.width, b.left + b.width) + gapPx - Math.max(a.left, b.left);
        const oy = Math.min(a.top + a.height, b.top + b.height) + gapPx - Math.max(a.top, b.top);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Apart along the axis that needs the shorter push (sideways only if it fits), in the plan's order.
        const sideways = ox < oy && a.width + b.width + gapPx <= widthPx;
        if (sideways) {
          const s = a.left + a.width / 2 <= b.left + b.width / 2 ? 1 : -1;
          a.left -= (s * ox) / 2;
          b.left += (s * ox) / 2;
          clampX(a);
          clampX(b);
        } else {
          const s = a.top + a.height / 2 <= b.top + b.height / 2 ? 1 : -1;
          a.top -= (s * oy) / 2;
          b.top += (s * oy) / 2;
        }
      }
    if (!moved) break;
  }
  const minTop = Math.min(0, ...r.map((b) => b.top));
  for (const b of r) b.top -= minTop;
  return { nodes: r, height: Math.max(heightPx, ...r.map((b) => b.top + b.height)) };
}
