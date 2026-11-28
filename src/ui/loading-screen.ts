import "./loading-screen.css";

import { PICTURES } from "./loading-pictures";
import type { LevelId } from "@modules/levels/data/levels";

/**
 * While a sanctuary loads (Berón 2026-11-24: «sanctuary1 está tardando en cargar… una imagen mientras carga… un modelo
 * representativo del santuario… la palabra con 3 puntitos donde el último parpadea»; 2026-11-25: «como regla todos
 * los sanctuarys deben ser equivalentes», reglas.md §5.3): the sanctuary's drawing (ui/loading-pictures.ts, one per
 * level) and «Cargando» with its dots, the last one blinking. boot.ts shows it when a level is chosen; each game
 * calls `doneLoading` on its first frame.
 */
let current: HTMLElement | undefined;

/** Shows the loading screen of a sanctuary (until `doneLoading`). */
export function showLoading(id: LevelId, host: HTMLElement = document.body): void {
  const p = PICTURES[id];
  if (!p || current) return;
  const el = document.createElement("div");
  el.className = "cs-loading";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="cs-loading-art">${p.svg}</div><div class="cs-loading-title">${p.title}</div><div class="cs-loading-text">Cargando<span>.</span><span>.</span><span class="cs-loading-last">.</span></div>`;
  host.appendChild(el);
  current = el;
}

/** The sanctuary is up: the loading screen fades out. */
export function doneLoading(): void {
  const el = current;
  if (!el) return;
  current = undefined;
  el.classList.add("cs-loading-out");
  setTimeout(() => el.remove(), 600);
}
