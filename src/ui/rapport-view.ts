import { STAGES, type Rapport, type Stage } from "@modules/subjugation/domain/rapport";
import "./rapport.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pct = (f: number) => `${Math.round(f * 100)} %`;

const STAGE_SHORT: Readonly<Record<Stage, string>> = { sonda: "Sonda", nave: "Nave", traje: "Traje" };

/** What to do next with this asteroid, in one line. */
export function nextStepText(r: Rapport | undefined, angry = false): string {
  if (angry) return "Está furioso: rescata la sonda si puedes, o huye con la nave";
  switch (r?.next ?? "sonda") {
    case "sonda":
      return "No te conoce: lanza la sonda desde el puente de la nodriza y pósala en él";
    case "nave":
      return "Confía un poco: posa el módulo de aterrizaje y entra en su mente";
    case "traje":
      return "Sal con el traje y túmbate sobre él para el último duelo";
    default:
      return "Subyugado: obedece, puede ser núcleo de la nano_net";
  }
}

/** Three dots for the three stages: done, on offer, locked. */
export function stageDots(r: Rapport | undefined): string {
  const done = r?.stagesDone ?? 0;
  return STAGES.map((s, i) => `<span class="rp-dot ${i < done ? "done" : i === done ? "next" : ""}" title="${STAGE_SHORT[s]}">${STAGE_SHORT[s]}</span>`).join("");
}

/** The map card's block: stages, trust and the next step. */
export function rapportCardHtml(r: Rapport | undefined, angry = false): string {
  const trust = r?.trust ?? 0;
  return `<div class="card-rapport${angry ? " angry" : ""}">
    <div class="rp-head"><b>Subyugación</b> · fase ${Math.min(3, (r?.stagesDone ?? 0) + (r?.subjugated ? 0 : 1))}/3 · confianza ${pct(trust)}</div>
    <div class="rp-dots">${stageDots(r)}</div>
    <div class="rp-trust"><i style="width:${(trust * 100).toFixed(0)}%"></i></div>
    <small>${esc(nextStepText(r, angry))}</small>
  </div>`;
}

/**
 * The HUD chip near an asteroid: its stages, its trust and the next step, so the player always knows
 * how deep into its mind they are and what comes next. Mobile first: one compact line plus the dots.
 */
export class RapportChip {
  private readonly el: HTMLElement;
  private html = "";

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "rapport-chip hidden";
    root.appendChild(this.el);
  }

  update(show: boolean, name: string, r: Rapport | undefined, angry: boolean): void {
    this.el.classList.toggle("hidden", !show);
    if (!show) return;
    const html = `<div class="rp-line"><b>${esc(name)}</b> · confianza ${pct(r?.trust ?? 0)}</div><div class="rp-dots">${stageDots(r)}</div><small>${esc(nextStepText(r, angry))}</small>`;
    if (html !== this.html) {
      this.el.innerHTML = html;
      this.html = html;
    }
    this.el.classList.toggle("angry", angry);
  }
}
