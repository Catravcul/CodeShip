import { Vec3 } from "@core/math/vec3";
import { aisleRails, gridRails, hatchRails, RAIL_LAYOUT, type Handrail } from "@modules/gravity/domain/handrails";
import type { Portal } from "@modules/gravity/domain/hops";
import { IVA } from "@modules/gravity/domain/iva";
import { FACE_NORMAL, StationInterior, type StationInteriorPlan } from "../domain/interior";

/** CBM hatchway half-width (1,27 m square), as in data/interior.ts. */
const CBM_HALF = 1.27 / 2;
/** Game value: spacing of the bars on the hangar's walls (EVA-like handrail grid), m. */
const HANGAR_PITCH_M = 2.5;

/**
 * The station's handrails (docs/design/ingravidez.md): four rows along every module's aisle, generated
 * modules included (one bar per rack bay), bars beside the hatches on the end bulkheads, two beside each docking hatch,
 * and a grid on the hangar's walls. Bars where her body would not fit (behind the hangar's racks or
 * the airlock's shell) are left out.
 */
export function stationHandrails(plan: StationInteriorPlan): Handrail[] {
  const interior = new StationInterior(plan);
  const rails: Handrail[] = [];
  for (const v of plan.volumes) {
    if (v.kind === "escotilla") continue;
    const box = { id: v.id, centre: v.centre, half: v.half };
    if (v.kind === "hangar") {
      rails.push(...gridRails(box, ["-y", "+y", "-x", "+x", "-z"], HANGAR_PITCH_M));
      continue;
    }
    // The aisle runs along the module's long axis: z on the main stack, x in the radial modules.
    const [along, side] = v.half.x > v.half.z ? (["x", "z"] as const) : (["z", "x"] as const);
    rails.push(...aisleRails(box, along, side));
    for (const end of [-1, 1] as const) rails.push(...hatchRails(box, along, side, end, CBM_HALF));
  }
  // Two bars beside each docking hatch, on its wall.
  for (const f of plan.fixtures.filter((x) => x.action.kind === "salir")) {
    const n = FACE_NORMAL[f.face].scale(-1);
    const across = Math.abs(n.x) > 0.5 ? new Vec3(0, 0, 1) : new Vec3(1, 0, 0);
    const runs = Math.abs(n.z) > 0.5 ? new Vec3(0, 1, 0) : new Vec3(0, 0, 1);
    const off = Math.max(f.size.x, f.size.z) / 2 + 0.2;
    for (const s of [-1, 1]) {
      const c = f.at.add(n.scale(RAIL_LAYOUT.standoffM)).add(across.scale(s * off));
      const h = runs.scale(RAIL_LAYOUT.lengthM / 2);
      // The second bar (away from the bay console) is the hatch's grab point (its action shows while she holds it).
      rails.push({ id: `${f.id}:${s < 0 ? "i" : "d"}`, a: c.sub(h), b: c.add(h), normal: n, ...(s > 0 ? { poi: f.id } : {}) });
    }
  }
  // A bar at each thing one can use (machines, consoles, the airlock's suits, the galley, the cabins…),
  // in front of it a little below its middle: the handhold by a foot restraint, between waist and
  // shoulder (NASA-STD-3000 §11.7.2.3.2). It is the thing's grab point: hopping there lands her facing
  // it and shows its action (docs/design/ingravidez.md, «Fase D»).
  for (const f of plan.fixtures) {
    const k = f.action.kind;
    if (k === "salir") continue;
    if (plan.volumes.find((v) => v.id === f.volume)?.kind === "hangar") continue;
    const n = FACE_NORMAL[f.face].scale(-1);
    const wall = Math.abs(n.y) < 0.5;
    const runs = wall ? (Math.abs(n.x) > 0.5 ? new Vec3(0, 0, 1) : new Vec3(1, 0, 0)) : new Vec3(0, 0, 1);
    const c = f.at.add(n.scale(RAIL_LAYOUT.standoffM)).add(wall ? new Vec3(0, -0.35, 0) : Vec3.ZERO);
    const h = runs.scale(RAIL_LAYOUT.lengthM / 2);
    rails.push({ id: `${f.id}:puesto`, a: c.sub(h), b: c.add(h), normal: n, poi: f.id });
  }
  const body = (r: Handrail) => r.a.add(r.b).scale(0.5).add(r.normal.scale(IVA.holdM));
  return rails.filter((r) => interior.fits(body(r), 0.3, false) || interior.fits(body(r), 0.3, true));
}

/** The hatches between modules, for hopping through them (gravity/domain/hops.ts). */
export function stationPortals(plan: StationInteriorPlan): Portal[] {
  return plan.volumes
    .filter((v) => v.kind === "escotilla" && v.through)
    .map((v) => {
      const k = v.through!;
      return { centre: v.centre, axis: new Vec3(k === "x" ? 1 : 0, k === "y" ? 1 : 0, k === "z" ? 1 : 0), halfDepth: v.half[k] };
    });
}
