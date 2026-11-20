import type { ManualBerthing } from "@modules/mothership/application/berthing";
import { MANUAL_BERTH } from "@modules/mothership/application/berthing";
import { IDSS_CONTACT_LIMITS as L } from "@modules/mothership/data/mothership";
import { num } from "@modules/navigation/application/trip-chore";
import { VirtualStick, curve } from "../adapters/input/stick";
import "./dock-camera.css";

/**
 * The camera's pan-tilt head (reglas.md §5.3: every camera can be controlled). Crew Dragon's docking camera is
 * fixed on the centreline; the ISS's external cameras sit on pan-tilt units. Ours (nuestra): the nose camera turns
 * ±20° across and ±15° up and down at 15°/s, enough to look round the port without losing it; «Lado» is a
 * second view, from beside the axis, that turns round it and zooms.
 */
export const DOCK_CAM_HEAD = { panDeg: 20, tiltDeg: 15, rateDegS: 15 } as const;
type DockView = "eje" | "lado";

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
  private readonly stick: VirtualStick;
  private readonly viewBtn: HTMLButtonElement;
  private key = "";
  private lastMs = 0;
  /** The camera's aim, rad: pan (right +) and tilt (up +) in «Eje»; round the axis and zoom in «Lado». */
  pan = 0;
  tilt = 0;
  private around = 0;
  private zoom = 1;
  view: DockView = "eje";

  constructor(
    root: HTMLElement,
    private readonly deps: DockCameraDeps,
  ) {
    this.el = document.createElement("div");
    this.el.className = "dock-cam hidden";
    this.el.setAttribute("role", "group");
    this.el.setAttribute("aria-label", "Cámara de acople");
    this.el.innerHTML = `<div class="dc-top"><div class="dc-video"><canvas width="320" height="240" aria-label="Vídeo del puerto"></canvas></div><div class="dc-side"><div class="dc-read"></div><button class="dc-view" aria-label="Cambiar de vista">Vista: eje</button></div></div>
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
    this.stick = new VirtualStick(this.el.querySelector(".dc-video")!, "dc-stick", "Cámara");
    this.viewBtn = this.el.querySelector(".dc-view")!;
    this.viewBtn.addEventListener("click", () => this.toggleView());
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

  /** «Eje» (the nose camera along the port axis) ⇄ «Lado» (from beside the axis). */
  toggleView(): void {
    this.view = this.view === "eje" ? "lado" : "eje";
    this.viewBtn.textContent = `Vista: ${this.view}`;
  }

  /** Turn the camera with the stick's deflection (−1..1 each way) for `dtS` seconds, within the head's range. */
  steer(x: number, y: number, dtS: number): void {
    const rate = (DOCK_CAM_HEAD.rateDegS * Math.PI) / 180;
    if (this.view === "eje") {
      const maxPan = (DOCK_CAM_HEAD.panDeg * Math.PI) / 180;
      const maxTilt = (DOCK_CAM_HEAD.tiltDeg * Math.PI) / 180;
      this.pan = Math.max(-maxPan, Math.min(maxPan, this.pan + x * rate * dtS));
      this.tilt = Math.max(-maxTilt, Math.min(maxTilt, this.tilt - y * rate * dtS));
    } else {
      this.around += x * rate * 4 * dtS;
      this.zoom = Math.max(0.5, Math.min(4, this.zoom * Math.exp(-y * dtS)));
    }
  }

  /** Each frame: shown while the hand approach flies and she is at the docking seat. */
  update(at: boolean): void {
    const r = at ? this.deps.run() : undefined;
    this.el.classList.toggle("hidden", !r);
    document.body.classList.toggle("in-dock-cam", !!r);
    if (!r) return;
    const now = performance.now();
    const dt = this.lastMs ? Math.min(0.1, (now - this.lastMs) / 1000) : 0;
    this.lastMs = now;
    const sv = this.stick.value;
    if (sv.x || sv.y) this.steer(curve(sv.x), curve(sv.y), dt);
    const a = r.alignment();
    const o = r.offset();
    const v = r.rates;
    if (this.view === "eje") this.draw(a.axialM, o.right, o.up);
    else this.drawSide(a.axialM, o.right, o.up);
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
    // The head turned: the whole picture slides the other way (the boresight reticle with it).
    const ox = -Math.tan(this.pan) * f;
    const oy = Math.tan(this.tilt) * f;
    const cx = W / 2 - rightM * px + ox;
    const cy = H / 2 + upM * px + oy;
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
    if (this.pan || this.tilt) g.fillText(`${Math.round((this.pan * 180) / Math.PI)}° · ${Math.round((this.tilt * 180) / Math.PI)}°`, W - 90, 20);
    const bx = W / 2 + ox;
    const by = H / 2 + oy;
    g.strokeStyle = "#37e07a";
    g.lineWidth = 2;
    g.strokeRect(bx - 14, by - 14, 28, 28);
    g.beginPath();
    g.moveTo(bx - 30, by);
    g.lineTo(bx - 16, by);
    g.moveTo(bx + 16, by);
    g.lineTo(bx + 30, by);
    g.stroke();
  }

  /**
   * «Lado»: the approach from beside the axis, to scale: the station's module and port on the left, the Starship's
   * nose (9 m across) at its distance, the off-axis error seen from the angle the stick has turned round the axis.
   */
  private drawSide(axialM: number, rightM: number, upM: number): void {
    const c = this.canvas;
    const g = c.getContext("2d")!;
    const W = c.width, H = c.height;
    g.fillStyle = "#04080c";
    g.fillRect(0, 0, W, H);
    const span = Math.max(12, Math.max(0, axialM) + 14) / this.zoom;
    const m = (W * 0.86) / span;
    const portX = W * 0.1;
    const cy = H / 2;
    const off = rightM * Math.cos(this.around) + upM * Math.sin(this.around);
    // The node (4,4 m across) and its port.
    g.fillStyle = "#c9ccc6";
    g.fillRect(portX - 6 * m, cy - 2.2 * m, 6 * m, 4.4 * m);
    g.fillStyle = "#3a414b";
    g.fillRect(portX - 0.3 * m, cy - 0.8 * m, 0.3 * m, 1.6 * m);
    // The axis.
    g.strokeStyle = "#7fdcff66";
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(portX, cy);
    g.lineTo(W, cy);
    g.stroke();
    g.setLineDash([]);
    // The Starship's nose: an ogive 10 m long, 9 m across, its docking port at the tip.
    const tipX = portX + Math.max(0, axialM) * m;
    const ty = cy - off * m;
    g.fillStyle = "#b9bdc4";
    g.beginPath();
    g.moveTo(tipX, ty);
    g.quadraticCurveTo(tipX + 2 * m, ty - 4.5 * m, tipX + 10 * m, ty - 4.5 * m);
    g.lineTo(W + 10, ty - 4.5 * m);
    g.lineTo(W + 10, ty + 4.5 * m);
    g.lineTo(tipX + 10 * m, ty + 4.5 * m);
    g.quadraticCurveTo(tipX + 2 * m, ty + 4.5 * m, tipX, ty);
    g.fill();
    g.fillStyle = "#ffd27f";
    g.beginPath();
    g.arc(tipX, ty, 3, 0, Math.PI * 2);
    g.fill();
    g.font = "15px ui-monospace, monospace";
    g.fillStyle = "#7fdcff";
    g.fillText(`${num(Math.max(0, axialM), axialM < 10 ? 1 : 0)} m · desvío ${num(Math.abs(off), 2)} m`, 8, H - 10);
    g.fillText(`${Math.round((((this.around * 180) / Math.PI) % 360 + 360) % 360)}° · ×${num(this.zoom, 1)}`, 8, 20);
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
