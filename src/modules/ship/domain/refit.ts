import type { Propellant, TankSpec, ThrusterModel } from "./components";
import { buildRcsLayout } from "./rcs-layout";
import type { ShipDesign } from "./ship";

/** Where a part goes: the main engine, the RCS set, or one of the tanks by index. */
export type PartSlot = "motor" | "rcs" | `tanque-${number}`;

export interface ThrusterPart {
  readonly kind: "thruster";
  readonly id: string;
  readonly name: string;
  readonly model: ThrusterModel;
}

export interface TankPart {
  readonly kind: "tank";
  readonly id: string;
  readonly name: string;
  readonly spec: TankSpec;
  /** Tanks and hulls are game values until real parts replace them. */
  readonly note: string;
}

export type Part = ThrusterPart | TankPart;

const tankIndex = (slot: PartSlot): number => {
  const m = /^tanque-(\d+)$/.exec(slot);
  if (!m) throw new Error(`Not a tank slot: ${slot}`);
  return Number(m[1]);
};

/** Whether a part fits a slot: engines in the engine bay, RCS thrusters in the RCS set, a tank where a tank of that propellant is. */
export function fits(design: ShipDesign, slot: PartSlot, part: Part): boolean {
  if (slot === "motor") return part.kind === "thruster";
  if (slot === "rcs") return part.kind === "thruster" && part.model.thrustN < 200;
  const t = design.tanks[tankIndex(slot)];
  return part.kind === "tank" && !!t && t.spec.propellant === part.spec.propellant;
}

/** The design with one part swapped. The main engine keeps its mount; RCS are laid out again for the hull. */
export function withPart(design: ShipDesign, slot: PartSlot, part: Part): ShipDesign {
  if (!fits(design, slot, part)) throw new Error(`${part.id} does not fit in ${slot}`);
  if (part.kind === "thruster" && slot === "motor") return { ...design, mainEngines: design.mainEngines.map((e, i) => (i === 0 ? { ...e, model: part.model } : e)) };
  if (part.kind === "thruster") return { ...design, rcs: buildRcsLayout(part.model, design.hull.size) };
  const i = tankIndex(slot);
  return { ...design, tanks: design.tanks.map((t, k) => (k === i ? { spec: (part as TankPart).spec, fillKg: Math.min(t.fillKg, (part as TankPart).spec.capacityKg) } : t)) };
}

/** Id of the part installed in a slot (tanks are matched by propellant and capacity). */
export function installedId(design: ShipDesign, slot: PartSlot, tanks: readonly TankPart[] = []): string | undefined {
  if (slot === "motor") return design.mainEngines[0]?.model.id;
  if (slot === "rcs") return design.rcs[0]?.model.id;
  const t = design.tanks[tankIndex(slot)];
  return tanks.find((p) => t && p.spec.propellant === t.spec.propellant && p.spec.capacityKg === t.spec.capacityKg)?.id;
}

/** Whether any thruster drinks this propellant: a tank nobody uses is dead mass. */
export function feeds(design: ShipDesign, p: Propellant): boolean {
  return [...design.mainEngines, ...design.rcs].some((t) => t.model.propellant === p);
}
