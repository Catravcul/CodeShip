import { STAGES, type Rapport, type Stage } from "@modules/subjugation/domain/rapport";
import { LEVEL_NAME, LEVELS, type Level } from "@modules/subjugation/domain/levels";
import "./rapport.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pct = (f: number) => `${Math.round(f * 100)} %`;

const STAGE_SHORT: Readonly<Record<Stage, string>> = { sonda: "Sonda", nave: "Módulo", traje: "Traje" };

/** What to do next with this asteroid, in one line. */
export function nextStepText(r: Rapport | undefined, angry = false): string {
  if (angry) return "Está furioso: rescata la sonda si puedes, o huye con el módulo";
  switch (r?.next ?? "sonda") {
    case "sonda":
      return "No te conoce: lanza la sonda desde el puente de la nodriza y pósala en él";
    case "nave":
      return "Confía un poco: posa el módulo de aterrizaje y entra en su mente";
    case "traje":
      return "Sal con el traje y túmbate sobre él para el último duelo";
    default: {
      const l = r?.nextLevel;
      if (!l) return "Nivel máximo: va a la estación para que la extraigan entero";
      const block = r!.levelBlock();
      return block ? `Nivel ${l} (${LEVEL_NAME[l]}): ${block}; sube sirviendo tranquilo` : `Obedece · convéncelo del nivel ${l}: ${LEVEL_NAME[l]} (posa el módulo o la sonda y entra en su mente)`;
    }
  }
}

const LEVEL_SHORT: Readonly<Record<Level, string>> = { 1: "Red", 2: "Nave", 3: "Estación", 4: "Viaje" };

/** Four dots for the four levels after the stages: reached, on offer, locked. */
export function levelDots(r: Rapport | undefined): string {
  if (!r?.subjugated) return "";
  return `<div class="rp-dots rp-levels">${LEVELS.map((l) => `<span class="rp-dot lv ${l <= r.level ? "done" : l === r.nextLevel ? "next" : ""}" title="Nivel ${l}: ${LEVEL_NAME[l]}">${l} ${LEVEL_SHORT[l]}</span>`).join("")}</div>`;
}

/** Three dots for the three stages: done, on offer, locked. */
export function stageDots(r: Rapport | undefined): string {
  const done = r?.stagesDone ?? 0;
  return STAGES.map((s, i) => `<span class="rp-dot ${i < done ? "done" : i === done ? "next" : ""}" title="${STAGE_SHORT[s]}">${STAGE_SHORT[s]}</span>`).join("");
}

/** The map card's block: stages, trust and the next step. */
export function rapportCardHtml(r: Rapport | undefined, angry = false, activity = ""): string {
  const trust = r?.trust ?? 0;
  const head = r?.subjugated ? `nivel ${r.level}/4` : `fase ${Math.min(3, (r?.stagesDone ?? 0) + 1)}/3`;
  return `<div class="card-rapport${angry ? " angry" : ""}">
    <div class="rp-head"><b>Subyugación</b> · ${head} · confianza ${pct(trust)}</div>
    <div class="rp-dots">${stageDots(r)}</div>${levelDots(r)}
    <div class="rp-trust"><i style="width:${(trust * 100).toFixed(0)}%"></i></div>
    ${activity ? `<div class="rp-job">${esc(activity)}</div>` : ""}
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

  update(show: boolean, name: string, r: Rapport | undefined, angry: boolean, activity = ""): void {
    this.el.classList.toggle("hidden", !show);
    if (!show) return;
    const html = `<div class="rp-line"><b>${esc(name)}</b>${r?.subjugated ? ` · nivel ${r.level}/4` : ""} · confianza ${pct(r?.trust ?? 0)}</div>${r?.subjugated ? levelDots(r) : `<div class="rp-dots">${stageDots(r)}</div>`}${activity ? `<div class="rp-job">${esc(activity)}</div>` : ""}<small>${esc(nextStepText(r, angry))}</small>`;
    if (html !== this.html) {
      this.el.innerHTML = html;
      this.html = html;
    }
    this.el.classList.toggle("angry", angry);
  }
}
