import { STAGES, type Rapport, type Stage } from "@modules/subjugation/domain/rapport";
import { LEVEL_NAME, LEVELS, type Level } from "@modules/subjugation/domain/levels";
import "./rapport.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pct = (f: number) => `${Math.round(f * 100)} %`;

const STAGE_SHORT: Readonly<Record<Stage, string>> = { sonda: "Sonda", nave: "Módulo", traje: "Traje" };

/** What to do next with this asteroid, in one line. */
export function nextStepText(r: Rapport | undefined, angry = false): string {
  if (angry) return "Está furioso: rescata la sonda si puedes, o huye con el módulo";
  switch (r ? r.next : "sonda") {
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

/** What the next step asks, in a few words, for the one-line summary. */
function nextShort(r: Rapport | undefined): string {
  switch (r ? r.next : "sonda") {
    case "sonda":
      return "lanza la sonda";
    case "nave":
      return "aterriza el módulo y entra en su mente";
    case "traje":
      return "sal con el traje";
    default:
      return r?.nextLevel ? `convéncelo del nivel ${r.nextLevel}` : "nivel máximo";
  }
}

/**
 * One clear line about an asteroid's subjugation (designer's request: the old chip with the Sonda /
 * Módulo / Traje markers looked like buttons): «Bennu · fase 2 de 3: aterriza el módulo · confianza 25 %».
 */
export function rapportLine(name: string, r: Rapport | undefined, angry = false): string {
  const trust = `confianza ${pct(r?.trust ?? 0)}`;
  if (angry) return `${name} · furioso · ${trust}`;
  if (r?.subjugated) return `${name} · nivel ${r.level} de 4: ${nextShort(r)} · ${trust}`;
  return `${name} · fase ${Math.min(3, (r?.stagesDone ?? 0) + 1)} de 3: ${nextShort(r)} · ${trust}`;
}

/**
 * The asteroid's mind console (lander cabin and the travel ship's science console): the one line, its
 * steps as plain text (done ✓, now ▸) and the next step. Nothing here is tappable but the console's action.
 */
export function mindConsoleHtml(name: string, r: Rapport | undefined, angry = false, activity = ""): string {
  const done = r?.stagesDone ?? 0;
  const steps = r?.subjugated
    ? LEVELS.map((l) => `<span class="${l <= r.level ? "done" : l === r.nextLevel ? "now" : ""}">${l <= r.level ? "✓" : l === r.nextLevel ? "▸" : "·"} ${l} ${LEVEL_SHORT[l]}</span>`).join(" · ")
    : STAGES.map((s, i) => `<span class="${i < done ? "done" : i === done ? "now" : ""}">${i < done ? "✓" : i === done ? "▸" : "·"} ${i + 1} ${STAGE_SHORT[s]}</span>`).join(" · ");
  return `<div class="mind-line">${esc(rapportLine(name, r, angry))}</div><div class="rp-trust" aria-hidden="true"><i style="width:${((r?.trust ?? 0) * 100).toFixed(0)}%"></i></div><div class="mind-steps">${r?.subjugated ? "Niveles" : "Fases"}: ${steps}</div>${activity ? `<div class="rp-job">${esc(activity)}</div>` : ""}<div class="mind-next">${esc(nextStepText(r, angry))}</div>`;
}

/** The same, as lines for a 3D screen (drawScreen: «+» green, «!» amber). */
export function mindScreenLines(name: string, r: Rapport | undefined, angry = false): string[] {
  const done = r?.stagesDone ?? 0;
  return [
    `${angry ? "!" : "+"}${name}`,
    r?.subjugated ? `nivel ${r.level} de 4` : `fase ${Math.min(3, done + 1)} de 3`,
    `confianza ${pct(r?.trust ?? 0)}`,
    r?.subjugated ? LEVELS.map((l) => (l <= r.level ? `[${l}]` : ` ${l} `)).join("") : STAGES.map((s, i) => (i < done ? `[${STAGE_SHORT[s]}]` : STAGE_SHORT[s])).join(" "),
  ];
}
