import type { TripStatus } from "./trip-chip";
import { onCloseRequest, windowState } from "./hud-windows";
import "./trip-window.css";

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return t < 60 ? `${t} s` : `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, "0")} s`;
};
const dist = (m: number) => (m >= 10000 ? `${Math.round(m / 1000).toLocaleString("es-ES")} km` : m >= 1000 ? `${(m / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} km` : `${Math.round(m).toLocaleString("es-ES")} m`);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * «Trayecto», the tree menu's window while a trip or a remote operation runs (docs/design/reglas.md §5.8–5.9,
 * viajes.md §Trayecto en el menú): status only, wherever she is. Who goes where, the phase, the distance left,
 * the real time left and a progress bar. No «Ver trayecto» and no «Mando»: those live at the vehicle's console.
 * It closes by itself when the trip ends, so no window stays on screen.
 */
export class TripWindow {
  private readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private readonly bar: HTMLElement;
  private last = "";

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "trip-window hidden";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", "Trayecto");
    this.el.innerHTML = `<div class="tw-head"><b>Trayecto</b><button data-close aria-label="Cerrar trayecto">✕</button></div><dl class="tw-body"></dl><div class="tw-bar" role="progressbar" aria-label="Avance del trayecto" aria-valuemin="0" aria-valuemax="100"><i></i></div>`;
    root.appendChild(this.el);
    this.body = this.el.querySelector(".tw-body")!;
    this.bar = this.el.querySelector(".tw-bar i")!;
    this.el.querySelector("[data-close]")!.addEventListener("click", () => this.close());
    onCloseRequest("trayecto", () => this.close());
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(): void {
    if (this.visible) return;
    this.last = "";
    this.el.classList.remove("hidden");
    windowState("trayecto", true);
  }

  close(): void {
    if (!this.visible) return;
    this.el.classList.add("hidden");
    windowState("trayecto", false);
  }

  /** Each frame with the trip running now anywhere (main.ts `tripStatus`; undefined: none, and the window closes). */
  update(d: TripStatus | undefined): void {
    if (!d) return this.close();
    if (!this.visible) return;
    const rows: [string, string][] = [
      ["Destino", `${d.vehicle} → ${d.destination}`],
      ["Fase", d.phase],
      ...(d.distanceM !== undefined ? [["Distancia", dist(d.distanceM)] as [string, string]] : []),
      ["Llega en", `${clock(d.etaRealS)} reales`],
    ];
    const html = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    if (html !== this.last) {
      this.last = html;
      this.body.innerHTML = html;
    }
    const pct = Math.max(0, Math.min(1, d.fraction)) * 100;
    this.bar.style.width = `${pct.toFixed(1)}%`;
    this.bar.parentElement!.setAttribute("aria-valuenow", pct.toFixed(0));
  }
}
