import { STATION_SLOTS, type StationOutfit, type StationSlot } from "@modules/station/domain/outfit";
import { STATION_SLOT_NAME } from "@modules/station/application/station-refit";
import type { ComponentStatus, Issue, Spec } from "../domain/component";
import { worst } from "../domain/attention";

/**
 * The station itself as the bay's «Estación» tab shows it: its wings, radiators and shield as parts
 * that can be swapped (same pattern as the mothership's equipment), with the station's power, mass,
 * modules and equipment on their sheets.
 */

const num = (v: number, digits = 0) => v.toLocaleString("es-ES", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** Bay id of a station slot. */
export const stationPartId = (slot: StationSlot): `estacion:${string}` => `estacion:${slot}`;
export const stationSlotOf = (partId: string): StationSlot | undefined => {
  const s = partId.startsWith("estacion:") ? partId.slice(9) : undefined;
  return s && (STATION_SLOTS as readonly string[]).includes(s) ? (s as StationSlot) : undefined;
};

/** Game threshold: warn when less than this share of the station's power is free. */
export const STATION_POWER_WARN = 0.1;

export function stationEquipmentStatus(o: StationOutfit): ComponentStatus[] {
  const free = o.capacityKw - o.drawKw;
  const power: Spec[] = [
    { label: "Energía", value: `${num(o.drawKw, 1)} kW de ${num(o.capacityKw, 1)} kW (alas ${num(o.supplyKw)} kW, radiadores ${num(o.rejectKw)} kW)` },
    { label: "Masa de la estación", value: `${num(o.massKg / 1000, 1)} t` },
  ];
  const modules: Spec[] = o.modules
    .filter((m) => m.racksPerSide > 0 || m.spec)
    .map((m) => ({
      label: `${m.code} · ${m.label}`,
      value: m.racksPerSide ? `${o.equipmentIn(m.id).map((e) => e.spec.name).join(", ") || "vacío"} · ${o.freeRacks(m.id)} de ${2 * m.racksPerSide} bastidores libres` : (m.spec?.basis.value ?? ""),
      ...(m.spec ? { source: m.spec.basis.source } : {}),
      more: true,
    }));
  return STATION_SLOTS.map((slot) => {
    const c = o.component(slot);
    const issues: Issue[] = [];
    if (slot !== "escudo" && free < STATION_POWER_WARN * o.capacityKw) issues.push({ attention: "aviso", text: `Quedan ${num(Math.max(0, free), 1)} kW libres: no cabe más equipo` });
    const limit = slot === "alas" ? o.supplyKw <= o.rejectKw : slot === "radiadores" ? o.rejectKw < o.supplyKw : false;
    const specs: Spec[] = [
      ...(c ? [{ label: "Pieza", value: c.name, source: c.basis.source }, { label: "Hace", value: c.effect }, { label: "Masa", value: `${num(c.massKg / 1000, 1)} t` }] : []),
      ...(slot !== "escudo" ? [{ label: "Manda", value: limit ? "Esta pieza limita la energía de la estación" : "La otra pieza limita la energía" }] : []),
      ...power,
      ...(c ? [{ label: "Cómo se calcula", value: `${c.basis.value}${c.basis.note ? `. ${c.basis.note}` : ""}`, more: true }] : []),
      ...modules,
    ];
    return { id: stationPartId(slot), kind: "equipo-estacion", name: c ? c.name : STATION_SLOT_NAME[slot], attention: worst(issues.map((i) => i.attention)), issues, specs };
  });
}
