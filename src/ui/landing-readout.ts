import type { Level, LandingReadout } from "@modules/flight/domain/landing-frame";
import "./aterrizaje.css";

/** How the player wants to land (docs/design/aterrizaje.md): ask each time, always by hand, or always by program. */
export type LandingMode = "preguntar" | "manual" | "programa";

const MODE_KEY = "codeship.aterrizaje";
const MODES: readonly LandingMode[] = ["preguntar", "manual", "programa"];

/** Player setting «Aterrizaje: preguntar / manual / por programa» (for the general settings modal). */
export function landingMode(): LandingMode {
  try {
    const v = localStorage.getItem(MODE_KEY) as LandingMode | null;
    return v && MODES.includes(v) ? v : "preguntar";
  } catch {
    return "preguntar";
  }
}
export function setLandingMode(mode: LandingMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* private mode: ask each time */
  }
}
/** Labels for a settings control. */
export const LANDING_MODE_LABEL: Readonly<Record<LandingMode, string>> = { preguntar: "Preguntar cada vez", manual: "Manual", programa: "Por programa" };

const fmt = (v: number, d: number) => v.toFixed(d).replace(".", ",").replace(/^-/, "−");
const signed = (v: number, d: number) => (v >= 0 ? "+" : "") + fmt(v, d);
const metres = (m: number) => (Math.abs(m) >= 1000 ? `${fmt(m / 1000, 2)} km` : `${fmt(m, Math.abs(m) < 10 ? 1 : 0)} m`);
const speed = (v: number) => signed(v, Math.abs(v) < 1 ? 2 : 1);

/** Cross-pointer radius in px, and how distances shrink onto it (far things stay on the dial). */
const R = 26;
const squash = (d: number, scale: number) => (R * d) / (d + scale);

/**
 * Compact landing readout (docs/design/aterrizaje.md): a cross-pointer with the site in the centre,
 * the craft, its predicted touchdown and its drift, and four mono lines X/Y/Z with vx/vy/vz and the
 * tilt, each coloured green/amber/red against the contact limits. Plain DOM, reads only the readout.
 */
export class LandingReadoutView {
  readonly el: HTMLElement;
  private readonly dial: SVGSVGElement;
  private readonly lines: HTMLElement;
  private html = "";
  private svg = "";

  constructor(host: HTMLElement, extraClass = "") {
    this.el = document.createElement("div");
    this.el.className = `landing-readout hidden ${extraClass}`.trim();
    this.el.setAttribute("aria-label", "Indicadores de aterrizaje");
    this.el.innerHTML = `<svg class="lr-dial" viewBox="-30 -30 60 60" width="54" height="54" aria-hidden="true"></svg><div class="lr-lines"></div>`;
    host.appendChild(this.el);
    this.dial = this.el.querySelector("svg")!;
    this.lines = this.el.querySelector(".lr-lines")!;
  }

  hide(): void {
    this.el.classList.add("hidden");
  }

  /** `title`: the first line («Aterrizaje», or the program's phase while it flies). */
  render(r: LandingReadout, siteRadiusM: number, title: string): void {
    this.el.classList.remove("hidden");
    this.el.dataset.verdict = r.verdict;
    const L = r.levels;
    const td = r.touchdown;
    // Predicted touchdown: in the site (and when), or how far off it.
    const tdText = td ? (td.inSite ? `toca ${td.inS < 99 ? fmt(td.inS, 0) : ">99"} s ✓` : `toca a ${metres(Math.hypot(td.x, td.y))}`) : r.vz >= 0 ? "no baja" : "";
    const html = `<div class="lr-title">${title}</div>
      <div><span class="${L.site}">X ${signed(r.x, 1)}</span> <span class="${L.vh}">vx ${speed(r.vx)}</span></div>
      <div><span class="${L.site}">Y ${signed(r.y, 1)}</span> <span class="${L.vh}">vy ${speed(r.vy)}</span></div>
      <div><span>Z ${metres(r.z)}</span> <span class="${L.vz}">vz ${speed(r.vz)}</span></div>
      <div><span class="${L.tilt}">∠ ${fmt(r.tiltDeg, 0)}°</span> <span class="${td?.inSite ? "ok" : ""}">${tdText}</span></div>`;
    if (html !== this.html) {
      this.html = html;
      this.lines.innerHTML = html;
    }
    // The dial: site at the centre (its radius as a ring), craft dot, drift line, touchdown cross.
    const scale = Math.max(siteRadiusM * 3, 1);
    const pt = (x: number, y: number) => {
      const d = Math.hypot(x, y);
      if (d < 1e-6) return [0, 0] as const;
      const k = squash(d, scale) / d;
      return [x * k, -y * k] as const;
    };
    const [cx, cy] = pt(r.x, r.y);
    const vh = Math.hypot(r.vx, r.vy);
    const vk = vh < 1e-4 ? 0 : Math.min(12, 40 * vh) / vh;
    const ring = squash(siteRadiusM, scale);
    const colour = (l: Level) => (l === "ok" ? "#7dffb0" : l === "warn" ? "#ffc04d" : "#ff6b6b");
    let svg = `<circle r="${R}" class="lr-rim"/><line x1="-${R}" y1="0" x2="${R}" y2="0" class="lr-axis"/><line x1="0" y1="-${R}" x2="0" y2="${R}" class="lr-axis"/>
      <circle r="${ring.toFixed(1)}" class="lr-site"/>`;
    if (td) {
      const [tx, ty] = pt(td.x, td.y);
      svg += `<path d="M${(tx - 3).toFixed(1)} ${(ty - 3).toFixed(1)}l6 6m0 -6l-6 6" class="lr-td" stroke="${td.inSite ? "#7dffb0" : "#ffc04d"}"/>`;
    }
    svg += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + r.vx * vk).toFixed(1)}" y2="${(cy - r.vy * vk).toFixed(1)}" class="lr-vel" stroke="${colour(r.levels.vh)}"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="${colour(r.verdict)}"/>`;
    if (svg !== this.svg) {
      this.svg = svg;
      this.dial.innerHTML = svg;
    }
  }
}
