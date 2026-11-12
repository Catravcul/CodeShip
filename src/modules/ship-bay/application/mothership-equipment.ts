import type { Mothership } from "@modules/mothership/domain/mothership";
import { MOTHERSHIP_SLOTS, type MothershipSlot } from "@modules/mothership/domain/equipment";
import { SLOT_NAME } from "@modules/mothership/application/equipment-refit";
import type { ComponentStatus, Issue, Spec } from "../domain/component";
import { worst } from "../domain/attention";

const num = (v: number, digits = 0) => v.toLocaleString("es-ES", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** Bay id of a mothership equipment slot. */
export const equipmentPartId = (slot: MothershipSlot): `nodriza-equipo:${string}` => `nodriza-equipo:${slot}`;
export const equipmentSlotOf = (partId: string): MothershipSlot | undefined => {
  const s = partId.startsWith("nodriza-equipo:") ? partId.slice(15) : undefined;
  return s && (MOTHERSHIP_SLOTS as readonly string[]).includes(s) ? (s as MothershipSlot) : undefined;
};

/** Game threshold: warn when the crew would reach the career limit in under this many years aboard. */
export const DOSE_TUNING = { warnYears: 2 } as const;

/** The mothership's auxiliary power and radiation shield as the bay shows them. */
export function mothershipEquipmentStatus(m: Mothership): ComponentStatus[] {
  return MOTHERSHIP_SLOTS.map((slot) => {
    const e = m.equipment(slot);
    const issues: Issue[] = [];
    const specs: Spec[] = [];
    if (slot === "energia-auxiliar") {
      const d = m.drive;
      specs.push(
        { label: "Aporta aquí", value: `${num(m.auxiliaryKw)} kW a ${num(m.spec.sunDistanceAu.value, 2)} UA del Sol`, source: m.spec.sunDistanceAu.source },
        { label: "Reactor", value: `${num(m.spec.power.electricKw.value)} kWe` },
        { label: "Libre para propulsión", value: `${num(d.availableKw)} kW · encienden ${d.firingUnits} de ${d.fittedUnits}` },
      );
    } else {
      const years = m.yearsToCareerLimit;
      if (years < DOSE_TUNING.warnYears) issues.push({ attention: "aviso", text: `Límite de carrera en ${num(years, 1)} años a bordo` });
      specs.push(
        { label: "Dosis dentro", value: `${num(m.crewDoseMSvPerYear)} mSv/año (sin blindaje ${num(m.spec.radiation.freeSpaceMSvPerYear.value)})`, source: m.spec.radiation.freeSpaceMSvPerYear.source },
        { label: "Límite de carrera", value: `${num(m.spec.radiation.careerLimitMSv.value)} mSv: se alcanza en ${num(years, 1)} años`, source: m.spec.radiation.careerLimitMSv.source },
        { label: "Nota", value: "Rayos cósmicos en el mínimo solar; una tormenta solar es otra cosa (refugio pendiente)", more: true },
      );
    }
    if (e)
      specs.push(
        { label: "Pieza", value: e.name, ...(e.sources[0] ? { source: e.sources[0] } : {}) },
        { label: "Masa", value: `${num(e.massKg / 1000, 1)} t${slot === "blindaje" ? " (y otro tanto en el anillo gemelo, que debe pesar igual)" : ""}` },
        { label: "Materiales", value: e.materials, more: true },
        { label: "Ha volado", value: e.flight, more: true },
        { label: "Cómo se calcula", value: e.basis, more: true },
      );
    specs.push({ label: "Δv de la nodriza", value: `${num(m.deltaV())} m/s · ${num(m.dryMassKg / 1000)} t en seco` });
    return {
      id: equipmentPartId(slot),
      kind: "equipo-nodriza",
      name: e ? e.name : SLOT_NAME[slot],
      attention: worst(issues.map((i) => i.attention)),
      issues,
      specs,
    };
  });
}
