import type { DockDestinationInfo } from "@modules/navigation/application/navigator";
import { DOCK_TRIP } from "@modules/navigation/application/dock-trip";
import { duration, num } from "@modules/navigation/application/trip-chore";
import { IDSS_CONTACT_LIMITS } from "@modules/mothership/data/mothership";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const km = (m: number) => (Math.abs(m) >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);

/** What the «program» button says for a structure. */
export const dockActionLabel = (i: DockDestinationInfo): string => (i.target.carrierPort ? `Ir a la ${i.target.what.toLowerCase()}` : "Volver a la nodriza");

/** Map card of a station or the mothership: distance to its port, the IDSS port and how the trip ends. */
export function dockCardHtml(i: DockDestinationInfo, note: string): string {
  const t = i.target;
  const trip = i.trip;
  const c = trip.carrier;
  const p = trip.plan;
  const lim = IDSS_CONTACT_LIMITS;
  const badges = `${i.selected ? `<span class="badge target">Destino actual</span>` : ""}${i.docked ? `<span class="badge ok">Acoplada</span>` : ""}${i.carrierDocked ? `<span class="badge ok">Nodriza atracada</span>` : ""}`;
  const travel = c
    ? `nodriza ${km(c.plan.distanceM)} · Δv ${num(c.plan.deltaVMS, c.plan.deltaVMS < 10 ? 2 : 0)} m/s · ${num(c.facts.propellantKg)} kg de xenón · ${duration(c.plan.totalS)}<br><small>para a ${km(DOCK_TRIP.berthStandoffM)} en el eje del puerto y acopla sola a ${num(DOCK_TRIP.contactMs, 2)} m/s, con el módulo acoplado</small>`
    : p.feasible
      ? `módulo ${km(p.distanceM)}${trip.waypoints.length > 1 ? ` (${trip.waypoints.length - 1} desvío${trip.waypoints.length > 2 ? "s" : ""})` : ""} · crucero ${num(p.cruiseMS)} m/s · Δv ${num(p.deltaVMS)} m/s · ${duration(p.totalS)}<br><small>para a ${km(DOCK_TRIP.handoverM)} en el eje del puerto; el asistente de acople hace el resto</small>`
      : "sin combustible para el viaje";
  const ports = t.carrierPort ? "Dos puertos IDSS: uno para el módulo de aterrizaje (abajo) y otro para la nodriza (delante)" : "Puerto IDSS bajo el nodo delantero";
  const can = !i.docked;
  return `
    <div class="card-name">${esc(t.name)} ${badges}</div>
    <dl>
      <dt>Qué es</dt><dd>${esc(t.what)}</dd>
      <dt>Distancia</dt><dd>${km(i.distanceM)} al puerto del módulo</dd>
      <dt>Atraque</dt><dd>${ports} <small>paso de 800 mm, como los adaptadores IDA de la ISS</small></dd>
      <dt>Contacto</dt><dd>${num(lim.closingMinMs, 2)}–${num(lim.closingMaxMs, 2)} m/s · lateral ≤ ${num(lim.lateralMisalignM, 2)} m · inclinación ≤ ${num(lim.angularMisalignDeg)}° <small>límites IDSS</small></dd>
      <dt>Viaje</dt><dd>${i.docked ? "ya estás acoplada aquí" : travel}</dd>
    </dl>
    <a class="card-src" href="https://ntrs.nasa.gov/citations/20220011643" target="_blank" rel="noopener">Norma IDSS (NASA)</a>
    ${note ? `<div class="card-note">${esc(note)}</div>` : ""}
    <div class="card-actions">
      ${i.selected ? "" : `<button data-act="select">Fijar destino</button>`}
      <button class="primary" data-act="program"${can ? "" : " disabled"}>${esc(dockActionLabel(i))}</button>
    </div>`;
}
