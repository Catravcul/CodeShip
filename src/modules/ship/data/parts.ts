import type { ShipDesign } from "../domain/ship";
import { fits, installedId, type EquipmentPart, type Part, type PartSlot, type TankPart, type ThrusterPart } from "../domain/refit";
import { isEquipmentSlot, type Equipment } from "../domain/equipment";
import { BATTERIES, CABINS, POWER_SOURCES, SHIELDS } from "./equipment";
import { MR104H, MR106L, MR107T, MR111G, R4D } from "./thrusters";

const thruster = (model: ThrusterPart["model"]): ThrusterPart => ({ kind: "thruster", id: model.id, name: model.name, model });
const TANK_NOTE = "Valor de juego: capacidad y masa en vacío a sustituir por un tanque real";

/** Main engines on the shelf (real models). */
export const MAIN_ENGINE_PARTS: readonly ThrusterPart[] = [thruster(R4D), thruster(MR104H)];
/** Attitude thrusters on the shelf (real models). */
export const RCS_PARTS: readonly ThrusterPart[] = [thruster(MR106L), thruster(MR111G), thruster(MR107T)];
/** Tanks on the shelf. Game values: dry mass is about a tenth of the capacity, like the starter tanks. */
export const TANK_PARTS: readonly TankPart[] = [
  { kind: "tank", id: "tanque-mmh-180", name: "Tanque MMH/NTO 180 kg", spec: { propellant: "MMH/NTO", capacityKg: 180, dryMassKg: 18 }, note: TANK_NOTE },
  { kind: "tank", id: "tanque-mmh-300", name: "Tanque MMH/NTO 300 kg", spec: { propellant: "MMH/NTO", capacityKg: 300, dryMassKg: 28 }, note: TANK_NOTE },
  { kind: "tank", id: "tanque-n2h4-40", name: "Tanque de hidracina 40 kg", spec: { propellant: "Hydrazine", capacityKg: 40, dryMassKg: 5 }, note: TANK_NOTE },
  { kind: "tank", id: "tanque-n2h4-80", name: "Tanque de hidracina 80 kg", spec: { propellant: "Hydrazine", capacityKg: 80, dryMassKg: 9 }, note: TANK_NOTE },
  // Only made at the space station (docs/design/estacion.md).
  { kind: "tank", id: "tanque-mmh-450", name: "Tanque MMH/NTO 450 kg", spec: { propellant: "MMH/NTO", capacityKg: 450, dryMassKg: 40 }, note: TANK_NOTE },
  { kind: "tank", id: "tanque-n2h4-120", name: "Tanque de hidracina 120 kg", spec: { propellant: "Hydrazine", capacityKg: 120, dryMassKg: 13 }, note: TANK_NOTE },
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
