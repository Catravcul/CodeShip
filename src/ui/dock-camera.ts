import type { ManualBerthing } from "@modules/mothership/application/berthing";
import { MANUAL_BERTH } from "@modules/mothership/application/berthing";
import { IDSS_CONTACT_LIMITS as L } from "@modules/mothership/data/mothership";
import { num } from "@modules/navigation/application/trip-chore";
import "./dock-camera.css";

export interface DockCameraDeps {
  /** The hand approach flying now, if she is at the docking seat. */
  run(): ManualBerthing | undefined;
  /** The station and port it closes on. */
  portName(): string;
}

/**
 * The docking seat's camera page (docs/design/puente.md §Acople): Crew Dragon shows the docking target's video on
 * the same touchscreen the crew flies the approach from (Demo-2, 2020). Here the nose port's camera looks along the
 * axis at the station's port: its ring grows as it closes and slides off centre with the drift. Under it, the
 * numbers the IDSS hooks judge, each with ✓ or ✗ (shape and colour), and the translation taps.
 */
export class DockCamera {
  private readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly read: HTMLElement;
  private key = "";

  constructor(
    root: HTMLElement,
    private readonly deps: DockCameraDeps,
  ) {
    this.el = document.createElement("div");
    this.el.className = "dock-cam hidden";
    this.el.setAttribute("role", "group");
    this.el.setAttribute("aria-label", "Cámara de acople");
    this.el.innerHTML = `<div class="dc-top"><canvas width="320" height="240" aria-label="Vídeo del puerto"></canvas><div class="dc-read"></div></div>
      <div class="dc-btns">
        <button data-ax="right" data-n="-1" aria-label="Deriva a la izquierda 0,01 m/s">◀</button>
        <button data-ax="up" data-n="1" aria-label="Deriva arriba 0,01 m/s">▲</button>
        <button data-ax="up" data-n="-1" aria-label="Deriva abajo 0,01 m/s">▼</button>
        <button data-ax="right" data-n="1" aria-label="Deriva a la derecha 0,01 m/s">▶</button>
        <button data-ax="closing" data-n="-1" aria-label="Frenar 0,05 m/s">−0,05</button>
        <button data-ax="stop" aria-label="Parar: anular todas las velocidades">Parar</button>
        <button data-ax="closing" data-n="1" aria-label="Acercar 0,05 m/s">+0,05</button>
      </div>
      <div class="dc-note">Modo manual como la Crew Dragon (Demo-2): mandos de la Starship en desarrollo. Ganchos IDSS: ${num(L.closingMinMs, 2)}–${num(L.closingMaxMs, 2)} m/s y menos de ${num(L.lateralMisalignM, 2)} m del eje. Cámara rápida ×${MANUAL_BERTH.lapse}</div>`;
    root.appendChild(this.el);
    this.canvas = this.el.querySelector("canvas")!;
    this.read = this.el.querySelector(".dc-read")!;
    this.el.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-ax]");
      const r = this.deps.run();
      if (!b || !r) return;
      if (b.dataset.ax === "stop") r.hold();
      else r.nudge(b.dataset.ax as "closing" | "right" | "up", Number(b.dataset.n));
    });
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  /** Each frame: shown while the hand approach flies and she is at the docking seat. */
  update(at: boolean): void {
    const r = at ? this.deps.run() : undefined;
    this.el.classList.toggle("hidden", !r);
    document.body.classList.toggle("in-dock-cam", !!r);
    if (!r) return;
    const a = r.alignment();
    const o = r.offset();
    const v = r.rates;
    this.draw(a.axialM, o.right, o.up);
    const ok = (b: boolean) => (b ? `<i class="ok">✓</i>` : `<i class="bad">✗</i>`);
    const closingOk = v.closing >= L.closingMinMs - 1e-9 && v.closing <= L.closingMaxMs + 1e-9;
    const html = `<b>${this.deps.portName()}</b>
      <span>Distancia <em>${num(Math.max(0, a.axialM), a.axialM < 10 ? 1 : 0)} m</em></span>
      <span>${ok(closingOk)} Cierre <em>${num(v.closing, 2)} m/s</em></span>
      <span>${ok(a.lateralM <= L.lateralMisalignM)} Desvío <em>${num(a.lateralM, 2)} m</em></span>
      <span>${ok(Math.hypot(v.right, v.up) <= L.lateralRateMs + 1e-9)} Deriva <em>${num(Math.hypot(v.right, v.up), 2)} m/s</em></span>
      <span class="dc-hint">${hint(a.axialM, a.lateralM, v.closing)}</span>`;
    if (html !== this.key) {
      this.key = html;
      this.read.innerHTML = html;
    }
  }

  /** The port seen along the axis: a ring of its real 0,8 m opening at the distance, the cross on its centre. */
  private draw(axialM: number, rightM: number, upM: number): void {
    const c = this.canvas;
    const g = c.getContext("2d")!;
    const W = c.width, H = c.height;
    g.fillStyle = "#04080c";
    g.fillRect(0, 0, W, H);
    // A narrow 30° centreline camera: pixels per metre at the distance.
    const d = Math.max(0.5, axialM + 1);
    const f = W / 2 / Math.tan((15 * Math.PI) / 180);
    const px = f / d;
    const cx = W / 2 - rightM * px;
    const cy = H / 2 + upM * px;
    // The module round the port (an ISS node is 4,4 m across) and its hull lines.
    g.fillStyle = "#c9ccc6";
    g.beginPath();
    g.arc(cx, cy, Math.min(4000, 2.2 * px), 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#8a8f98";
    g.lineWidth = 1;
    for (const r of [1.6, 2.0]) {
      g.beginPath();
      g.arc(cx, cy, Math.min(4000, r * px), 0, Math.PI * 2);
      g.stroke();
    }
    // The port's face (a 1,6 m plate), its 0,8 m passage and the target cross.
    g.fillStyle = "#3a414b";
    g.beginPath();
    g.arc(cx, cy, Math.min(2000, 0.8 * px), 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#ffd27f";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, Math.min(2000, 0.4 * px), 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2;
    const s = Math.min(1500, Math.max(6, 0.25 * px));
    g.beginPath();
    g.moveTo(cx - s, cy);
    g.lineTo(cx + s, cy);
    g.moveTo(cx, cy - s);
    g.lineTo(cx, cy + s);
    g.stroke();
    // The camera's own reticle: where the nose port points.
    g.font = "16px ui-monospace, monospace";
    g.fillStyle = "#7fdcff";
    g.fillText(`${Math.max(0, axialM).toFixed(axialM < 10 ? 1 : 0).replace(".", ",")} m`, 8, H - 10);
    g.strokeStyle = "#37e07a";
    g.lineWidth = 2;
    g.strokeRect(W / 2 - 14, H / 2 - 14, 28, 28);
    g.beginPath();
    g.moveTo(W / 2 - 30, H / 2);
    g.lineTo(W / 2 - 16, H / 2);
    g.moveTo(W / 2 + 16, H / 2);
    g.lineTo(W / 2 + 30, H / 2);
    g.stroke();
  }

  hide(): void {
    this.el.classList.add("hidden");
    document.body.classList.remove("in-dock-cam");
  }
}

function hint(axialM: number, lateralM: number, closing: number): string {
  if (lateralM > L.lateralMisalignM && axialM < 30) return "Fuera del eje: corrige con ◀ ▲ ▼ ▶ y luego Parar";
  if (closing <= 0) return "Acerca con +0,05 m/s";
  if (axialM < 15 && closing > L.closingMaxMs + 1e-9) return "¡Frena a 0,10 m/s o menos antes del contacto!";
  if (axialM < 15) return "Así: contacto suave";
  return `Contacto en ${Math.round(axialM / Math.max(0.01, closing) / MANUAL_BERTH.lapse)} s reales`;
}
