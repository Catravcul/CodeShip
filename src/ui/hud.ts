import type { Telemetry } from "@modules/flight/application/flight-computer";

const fmt = (v: number, d = 1) => v.toFixed(d);
const dist = (m: number) => (Math.abs(m) >= 1000 ? `${fmt(m / 1000, 2)} km` : `${fmt(m, 0)} m`);

/** Plain DOM HUD. Reads telemetry; never touches the simulation. */
export class Hud {
  private readonly el: HTMLElement;
  constructor(root: HTMLElement, private readonly info: { ship: string; target: string; propellants: { label: string; capacity: number }[] }) {
    this.el = document.createElement("div");
    this.el.className = "hud";
    root.appendChild(this.el);
    const help = document.createElement("div");
    help.className = "help";
    help.innerHTML = `<b>Controles</b><br>W/S avanzar/retroceder · A/D lateral · R/F subir/bajar<br>Flechas cabeceo/guiñada · Q/E alabeo<br>Espacio motor principal · T asistente de rotación`;
    root.appendChild(help);
  }

  render(t: Telemetry, assist: boolean, propellantKg: number[]): void {
    const v = t.relativeVelocityBody;
    const w = t.angularVelocityBody;
    const closing = t.closingSpeed;
    this.el.innerHTML = `
      <div class="row title">${this.info.ship} → ${this.info.target}</div>
      <div class="row big">${dist(t.distanceToSurface)} <span class="lbl">a la superficie</span></div>
      <div class="row ${closing > 1 ? "warn" : ""}">${fmt(closing, 2)} m/s <span class="lbl">${Math.abs(closing) < 0.01 ? "en reposo relativo" : closing > 0 ? "acercándose" : "alejándose"}</span></div>
      <div class="row small">vel. nave x ${fmt(v.x, 2)} · y ${fmt(v.y, 2)} · z ${fmt(-v.z, 2)} m/s</div>
      <div class="row small">giro ${fmt((w.length() * 180) / Math.PI, 2)} °/s</div>
      <div class="row">Δv ${fmt(t.deltaV, 0)} m/s · masa ${fmt(t.massKg, 0)} kg</div>
      ${this.info.propellants
        .map((p, i) => `<div class="row small">${p.label} ${fmt(((propellantKg[i] ?? 0) / p.capacity) * 100, 0)}%</div>`)
        .join("")}
      <div class="row ${t.hullIntegrity < 0.5 ? "warn" : ""}">Casco ${fmt(t.hullIntegrity * 100, 0)}%${t.landed ? " · anclada" : ""}</div>
      <div class="row ${assist ? "ok" : "warn"}">Asistente de rotación ${assist ? "ON" : "OFF"}</div>`;
  }
}
