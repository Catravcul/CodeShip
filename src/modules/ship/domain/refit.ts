import { feedSystemOf, type Propellant, type TankSpec, type ThrusterModel } from "./components";
import { isEquipmentSlot, type Equipment, type EquipmentSlot } from "./equipment";
import { buildRcsLayout } from "./rcs-layout";
import type { ShipDesign } from "./ship";

/** Where a part goes: the main engine, the RCS set, one of the tanks by index, or an equipment slot. */
export type PartSlot = "motor" | "rcs" | `tanque-${number}` | EquipmentSlot;

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
}

/** Cabin, power source, battery or shield. */
export interface EquipmentPart {
  readonly kind: "equipment";
  readonly id: string;
  readonly name: string;
  readonly equipment: Equipment;
}

export type Part = ThrusterPart | TankPart | EquipmentPart;

/** «Nothing» in a slot (no shield, no power source): taking the old part off needs nothing from the hangar. */
export const isEmptyPart = (p: Part): boolean => p.kind === "equipment" && p.equipment.massKg === 0;

const tankIndex = (slot: PartSlot): number => {
  const m = /^tanque-(\d+)$/.exec(slot);
  if (!m) throw new Error(`Not a tank slot: ${slot}`);
  return Number(m[1]);
};

/**
 * Whether a part fits a slot: engines in the engine bay, RCS thrusters in the RCS set, and a tank where
 * a tank of the same feed system is (a helium-fed pair for a pair; a blowdown tank of hydrazine or
 * LMP-103S for a blowdown tank: the diaphragm tanks are the same family).
 */
export function fits(design: ShipDesign, slot: PartSlot, part: Part): boolean {
  if (slot === "motor") return part.kind === "thruster";
  if (slot === "rcs") return part.kind === "thruster" && part.model.thrustN < 200;
  if (isEquipmentSlot(slot)) return part.kind === "equipment" && part.equipment.kind === slot;
  const t = design.tanks[tankIndex(slot)];
  return part.kind === "tank" && !!t && feedSystemOf(t.spec.propellant) === feedSystemOf(part.spec.propellant);
}

/** The design with one part swapped. The main engine keeps its mount; RCS are laid out again for the hull. */
export function withPart(design: ShipDesign, slot: PartSlot, part: Part): ShipDesign {
  if (!fits(design, slot, part)) throw new Error(`${part.id} does not fit in ${slot}`);
  if (part.kind === "thruster" && slot === "motor") return { ...design, mainEngines: design.mainEngines.map((e, i) => (i === 0 ? { ...e, model: part.model } : e)) };
  if (part.kind === "thruster") return { ...design, rcs: buildRcsLayout(part.model, design.hull.size) };
  if (part.kind === "equipment") {
    const had = design.equipment.some((e) => e.kind === part.equipment.kind);
    const equipment = had ? design.equipment.map((e) => (e.kind === part.equipment.kind ? part.equipment : e)) : [...design.equipment, part.equipment];
    return { ...design, equipment };
  }
  const i = tankIndex(slot);
  return { ...design, tanks: design.tanks.map((t, k) => (k === i ? { spec: (part as TankPart).spec, fillKg: Math.min(t.fillKg, (part as TankPart).spec.capacityKg) } : t)) };
}

/** Id of the part installed in a slot (tanks are matched by their real tanks, or by propellant and capacity). */
export function installedId(design: ShipDesign, slot: PartSlot, tanks: readonly TankPart[] = []): string | undefined {
  if (slot === "motor") return design.mainEngines[0]?.model.id;
  if (slot === "rcs") return design.rcs[0]?.model.id;
  if (isEquipmentSlot(slot)) return design.equipment.find((e) => e.kind === slot)?.id;
  const t = design.tanks[tankIndex(slot)];
  if (!t) return undefined;
  const same = (p: TankPart) =>
    p.spec.propellant === t.spec.propellant && (p.spec.build && t.spec.build ? p.spec.build.tank.id === t.spec.build.tank.id && p.spec.build.count === t.spec.build.count : p.spec.capacityKg === t.spec.capacityKg);
  return tanks.find(same)?.id;
}

/** Whether any thruster drinks this propellant: a tank nobody uses is dead mass. */
export function feeds(design: ShipDesign, p: Propellant): boolean {
  return [...design.mainEngines, ...design.rcs].some((t) => t.model.propellant === p);
}
