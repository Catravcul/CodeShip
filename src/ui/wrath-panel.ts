import "./wrath.css";

/** What the wrath card shows; built by the wiring from the domain. Plain data, Spanish text. */
export interface WrathPanelModel {
  readonly asteroid: string;
  readonly tier: number;
  readonly tierName: string;
  /** 0..1 */
  readonly level: number;
  readonly calmInS: number;
  /** Lines like «2 rocas → módulo de aterrizaje · llega en 6 s». */
  readonly threats: readonly string[];
  /** Escape guidance for the craft you fly: screen angle of the arrow (deg, 0 = up), metres left, and whether it is behind. */
  readonly flee?: { readonly angleDeg: number; readonly behind: boolean; readonly distanceM: number; readonly trapped: boolean };
  /** One line per other asset (mothership, station): hull, dose. */
  readonly status: readonly string[];
  /** Survival mode line, when the station is fleeing. */
  readonly survival?: string;
  /** Short warning flashed after a hit or a burst. */
  readonly alert?: string;
}

const dist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${m.toFixed(0)} m`);
export const timeText = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.ceil(s)} s`);

/** The anger card: meter, time to calm, threats, «huir» guidance and survival mode. Mobile first. */
export class WrathPanel {
  private readonly el: HTMLElement;
  private last = "";

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "wrath-card hidden";
    root.appendChild(this.el);
  }

  render(m: WrathPanelModel | null): void {
    const html = m ? this.html(m) : "";
    document.body.classList.toggle("wrath-on", !!m);
    if (html === this.last) return;
    this.last = html;
    this.el.classList.toggle("hidden", !m);
    this.el.classList.toggle("survival", !!m?.survival);
    this.el.innerHTML = html;
  }

  private html(m: WrathPanelModel): string {
    if (!m.tier) return m.alert ? `<div class="wrath-alert calm">${m.alert}</div>` : "";
    const pct = Math.round(m.level * 100);
    const flee = m.flee
      ? m.flee.distanceM > 0
        ? `<div class="wrath-flee ${m.flee.trapped ? "trapped" : ""}"><span class="arrow" style="transform:rotate(${m.flee.angleDeg.toFixed(0)}deg)">↑</span><span>${m.flee.trapped ? "Su gravedad te atrapa: el motor no basta. " : ""}Huye ${dist(m.flee.distanceM)}${m.flee.behind ? " · hacia atrás" : ""}</span></div>`
        : `<div class="wrath-flee safe">Fuera de su alcance · espera a que se calme</div>`
      : "";
    return `
      <div class="wrath-head"><b>Ira · ${m.asteroid}</b><span>Poder ${m.tier}: ${m.tierName}</span></div>
      <div class="wrath-meter"><i style="width:${pct}%"></i><span>${pct} % · calma en ${timeText(m.calmInS)}</span></div>
      ${m.survival ? `<div class="wrath-survival">${m.survival}</div>` : ""}
      ${m.alert ? `<div class="wrath-alert">${m.alert}</div>` : ""}
      ${m.threats.map((t) => `<div class="wrath-threat">⚠ ${t}</div>`).join("")}
      ${flee}
      ${m.status.map((s) => `<div class="wrath-status">${s}</div>`).join("")}`;
  }
}
