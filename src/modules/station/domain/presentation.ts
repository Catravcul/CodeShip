import { Vec3 } from "@core/math/vec3";
import { minSpacing, spreadFactor, type Interactable } from "@core/spacing";
import { FACE_NORMAL, scaleInteriorPlan, type Box, type StationInteriorPlan } from "./interior";

/** How far in front of its wall she holds on to use a fixture, m (the anchor of the 2 m rule). */
const ANCHOR_M = 0.6;

/** A plan's fixtures as interactables, room by room (walls part rooms): the front of each and where she floats to use it. */
export function planInteractables(plan: StationInteriorPlan): Interactable[][] {
  const rooms = new Map<string, Interactable[]>();
  for (const f of plan.fixtures) {
    const list = rooms.get(f.volume) ?? [];
    list.push({ id: f.id, centre: f.at, anchor: f.at.sub(FACE_NORMAL[f.face].scale(ANCHOR_M)) });
    rooms.set(f.volume, list);
  }
  return [...rooms.values()];
}

/** The smallest gap between two interactables of one room, m. */
export function planMinSpacing(plan: StationInteriorPlan): number {
  return Math.min(...planInteractables(plan).map((r) => minSpacing(r)));
}

/**
 * The presentation layer's spacing (src/core/presentation.ts, «Separación: Amplia»), for any interior
 * plan: when two interactables are closer than `minM`, every position and every room is spread by the
 * same factor about the origin (the rooms grow longer and wider, the hatches longer), and the machines
 * keep their true size. Nothing is tuned by hand per room. Returns the plan unchanged when it already complies.
 */
export function spreadInteriorPlan(plan: StationInteriorPlan, minM: number): StationInteriorPlan {
  const factor = (p: StationInteriorPlan) => Math.max(1, ...planInteractables(p).map((r) => spreadFactor(r, minM)));
  // Anchors stand a fixed hand's reach off their walls, so spreading is not linear for them: grow until it complies.
  let k = 1;
  let out = plan;
  for (let i = 0; i < 30; i++) {
    const f = factor(out);
    if (f <= 1 + 1e-9) return out;
    k *= f * 1.001;
    out = spreadBy(plan, k);
  }
  return out;
}

function spreadBy(plan: StationInteriorPlan, k: number): StationInteriorPlan {
  const room = <B extends Box & { readonly through?: "x" | "y" | "z" }>(b: B): B => {
    // A hatch grows only along the way through (to bridge the wider gap); a room in every direction.
    const half = b.through ? new Vec3(b.through === "x" ? b.half.x * k : b.half.x, b.through === "y" ? b.half.y * k : b.half.y, b.through === "z" ? b.half.z * k : b.half.z) : b.half.scale(k);
    return { ...b, centre: b.centre.scale(k), half };
  };
  const e = plan.entries;
  return {
    ...plan,
    volumes: plan.volumes.map(room),
    fixtures: plan.fixtures.map((f) => ({ ...f, at: f.at.scale(k) })),
    solids: plan.solids.map((s) => ({ ...s, centre: s.centre.scale(k) })),
    entries: { sonda: { ...e.sonda, at: e.sonda.at.scale(k) }, nodriza: { ...e.nodriza, at: e.nodriza.at.scale(k) } },
    storage: { ...plan.storage, rackSlots: plan.storage.rackSlots.map((p) => p.scale(k)), cradles: plan.storage.cradles.map((p) => p.scale(k)) },
    ...(plan.landerBerth ? { landerBerth: plan.landerBerth.scale(k) } : {}),
  };
}

/** A true-size plan as the player chose to see it: spread to `spreadM` (0: as the data are), then drawn `scale` times bigger. */
export function presentInteriorPlan(plan: StationInteriorPlan, o: { readonly scale: number; readonly spreadM: number }): StationInteriorPlan {
  const spread = o.spreadM > 0 ? spreadInteriorPlan(plan, o.spreadM) : plan;
  return o.scale === 1 ? spread : scaleInteriorPlan(spread, o.scale);
}
