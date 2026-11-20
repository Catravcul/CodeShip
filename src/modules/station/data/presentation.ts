import { spreadFactor, type Interactable } from "@core/spacing";
import { scaleInteriorPlan, type StationInteriorPlan } from "../domain/interior";
import { stationHandrails } from "./handrails";

/**
 * The station's interactables as played: each fixture with the bar she holds to use it. The two sides of
 * one hatch are one thing (a door, used from either side): one interactable at the middle of its two sides.
 */
export function stationInteractables(plan: StationInteriorPlan): Interactable[] {
  const rails = stationHandrails(plan);
  const out = new Map<string, Interactable[]>();
  for (const f of plan.fixtures) {
    const r = rails.find((x) => x.poi === f.id);
    const key = f.action.kind === "puerta" ? `escotilla:${f.action.hatch}` : f.id;
    out.set(key, [...(out.get(key) ?? []), { id: key, centre: f.at, anchor: r ? r.a.add(r.b).scale(0.5) : f.at }]);
  }
  const mid = (ps: readonly { x: number; y: number; z: number }[]) => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length, z: ps.reduce((s, p) => s + p.z, 0) / ps.length });
  return [...out.entries()].map(([id, sides]) => ({ id, centre: mid(sides.map((s) => s.centre)), anchor: mid(sides.map((s) => s.anchor)) }));
}

/**
 * The scale the station is drawn at (src/core/presentation.ts): the chosen interior scale, and with
 * «Separación: Amplia» bigger still if, at that scale, two interactables would be closer than 2 m. The ISS
 * stays at its true size in the data (data/iss.ts); a station modelled true to size is spread as a
 * whole, so its modules keep their shape. With the default (Cómoda, 1,5×) it needs no spreading.
 */
export function stationPlayScale(plan: StationInteriorPlan, scale: number, spread: boolean): number {
  if (!spread) return scale;
  return scale * spreadFactor(stationInteractables(scaleInteriorPlan(plan, scale)));
}
