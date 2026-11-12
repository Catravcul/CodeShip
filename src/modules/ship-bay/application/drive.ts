import type { Mothership } from "@modules/mothership/domain/mothership";
import { maxPerMount, PROPELLANT_NAME, unitMassKg } from "@modules/mothership/domain/propulsion";
import type { ComponentStatus, Issue, Spec } from "../domain/component";
import { worst } from "../domain/attention";

const num = (v: number, digits = 0) => v.toLocaleString("es-ES", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** Bay id of a mothership thruster mount. */
export const mountPartId = (mountId: string): `propulsor:${string}` => `propulsor:${mountId}`;
export const mountIdOf = (partId: string): string | undefined => (partId.startsWith("propulsor:") ? partId.slice(10) : undefined);

/**
 * The mothership's thruster mounts as the bay shows them: what each holds, how many of those the
 * reactor can feed, the real spec of the thruster and what the whole drive does now.
 */
export function driveStatus(m: Mothership): ComponentStatus[] {
  const d = m.drive;
  const idle = d.fittedUnits - d.firingUnits;
  return m.spec.propulsion.mounts.map((mount) => {
    const f = m.fitOf(mount.id);
    const plan = d.mounts.find((x) => x.mountId === mount.id);
    const issues: Issue[] = [];
    if (!f || !f.count) issues.push({ attention: "aviso", text: "Vacío: no empuja" });
    else if (plan && plan.firing < plan.fitted) issues.push({ attention: "aviso", text: `${plan.fitted - plan.firing} de ${plan.fitted} no pueden encenderse: el reactor no da más` });
    const t = f?.thruster;
    const specs: Spec[] = t
      ? [
          { label: "Modelo", value: t.name, source: t.sources[0]!.replace(/^.*?(https:\/\/\S+)$/, "$1") },
          { label: "Montados", value: `${f!.count} de ${maxPerMount(mount, t)} que caben (rejilla: valor de juego)` },
          { label: "Encendidos", value: `${plan?.firing ?? 0}` },
          { label: "Empuje de cada uno", value: `${num(t.thrustN, 3)} N` },
          { label: "Isp", value: `${t.ispS} s` },
          { label: "Potencia de cada uno", value: `${num(t.powerKw, 1)} kW` },
          { label: "Masa de cada uno", value: `${num(unitMassKg(t))} kg (${num(t.thrusterMassKg)} el propulsor + ${num(t.ppuMassKg)} la fuente)` },
          { label: "Propelente", value: t.propellants.map((p) => PROPELLANT_NAME[p]).join(", ") },
          ...(t.note ? [{ label: "Nota", value: t.note }] : []),
        ]
      : [];
    const all: Spec[] = [
      { label: "Toda la nodriza", value: `${d.firingUnits} de ${d.fittedUnits} encendidos${idle ? ` (${idle} parados)` : ""}` },
      { label: "Reactor", value: `${num(d.powerKw)} de ${num(d.availableKw)} kW libres para propulsión (${num(m.spec.power.electricKw.value)} kWe menos ${num(m.spec.propulsion.hotelLoadKw.value)} kW del resto, valor de juego)` },
      { label: "Empuje total", value: `${num(d.thrustN, 1)} N` },
      { label: "Aceleración", value: `${num(m.accelerationMs2 * 1000, 3)} mm/s²` },
      { label: "Δv que queda", value: `${num(m.deltaV())} m/s` },
      { label: "Δv de 1 km/s", value: d.firingUnits ? `${num(m.burnDays(1000))} días y ${num(m.propellantFor(1000) / 1000, 1)} t de ${PROPELLANT_NAME[m.spec.propulsion.propellant]}` : "Imposible: nada enciende" },
    ];
    return {
      id: mountPartId(mount.id),
      kind: "propulsor",
      name: f && f.count ? `${mount.name}: ${f.count} × ${f.thruster.shortName}` : `${mount.name}: vacío`,
      attention: worst(issues.map((i) => i.attention)),
      issues,
      specs: [...specs, ...all],
    };
  });
}
