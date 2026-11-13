import type { ShipDesign } from "../domain/ship";
import { fits, installedId, type EquipmentPart, type Part, type PartSlot, type TankPart, type ThrusterPart } from "../domain/refit";
import { isEquipmentSlot, type Equipment } from "../domain/equipment";
import type { TankSpec } from "../domain/components";
import { BATTERIES, CABINS, POWER_SOURCES, SHIELDS } from "./equipment";
import { MAIN_ENGINES, RCS_THRUSTERS } from "./thrusters";
import { LMP_80498_X2, LMP_80498_X4, N2H4_80274, N2H4_80325, N2H4_80397, N2H4_80407, N2H4_80428, PAIR_80433, PAIR_80546, PAIR_80599, PAIR_OST25 } from "./tanks";

const thruster = (model: ThrusterPart["model"]): ThrusterPart => ({ kind: "thruster", id: model.id, name: model.name, model });

/** Main engines on the shelf (real models). */
export const MAIN_ENGINE_PARTS: readonly ThrusterPart[] = MAIN_ENGINES.map(thruster);
/** Attitude thrusters on the shelf (real models). */
export const RCS_PARTS: readonly ThrusterPart[] = RCS_THRUSTERS.map(thruster);

const NAME: Readonly<Record<TankSpec["propellant"], string>> = { "MMH/NTO": "Par MMH/NTO", Hydrazine: "Tanque de hidracina", "LMP-103S": "Tanque de LMP-103S" };
function tank(id: string, spec: TankSpec): TankPart {
  const b = spec.build!;
  const what = b.count > 1 ? `${b.count} × ${b.tank.maker} ${b.tank.id}` : `${b.tank.maker} ${b.tank.id}`;
  return { kind: "tank", id, name: `${NAME[spec.propellant]} ${spec.capacityKg} kg (${what})`, spec };
}

/** Tanks on the shelf: real titanium tanks, capacity and mass worked out from their data sheets (tanks.ts). */
export const TANK_PARTS: readonly TankPart[] = [
  tank("par-mmh-80599", PAIR_80599),
  tank("par-mmh-80546", PAIR_80546),
  tank("par-mmh-80433", PAIR_80433),
  tank("par-mmh-ost25", PAIR_OST25),
  tank("tanque-n2h4-80397", N2H4_80397),
  tank("tanque-n2h4-80274", N2H4_80274),
  tank("tanque-n2h4-80428", N2H4_80428),
  tank("tanque-n2h4-80325", N2H4_80325),
  tank("tanque-n2h4-80407", N2H4_80407),
  tank("tanque-lmp-80498x2", LMP_80498_X2),
  tank("tanque-lmp-80498x4", LMP_80498_X4),
];

const equipmentPart = (equipment: Equipment): EquipmentPart => ({ kind: "equipment", id: equipment.id, name: equipment.name, equipment });
/** Cabins, power sources, batteries and shields on the shelf (real components, see equipment.ts). */
export const EQUIPMENT_PARTS: readonly EquipmentPart[] = [...CABINS, ...POWER_SOURCES, ...BATTERIES, ...SHIELDS].map(equipmentPart);

export const ALL_PARTS: readonly Part[] = [...MAIN_ENGINE_PARTS, ...RCS_PARTS, ...TANK_PARTS, ...EQUIPMENT_PARTS];

export const partById = (id: string): Part | undefined => ALL_PARTS.find((p) => p.id === id);

/** Parts that could replace what is in a slot now. */
export function partOptions(design: ShipDesign, slot: PartSlot): Part[] {
  const shelf: readonly Part[] = slot === "motor" ? MAIN_ENGINE_PARTS : slot === "rcs" ? RCS_PARTS : isEquipmentSlot(slot) ? EQUIPMENT_PARTS : TANK_PARTS;
  const current = installedId(design, slot, TANK_PARTS);
  return shelf.filter((p) => p.id !== current && fits(design, slot, p));
}
