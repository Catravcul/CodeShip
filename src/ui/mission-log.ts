import type { MissionControl } from "@modules/missions/application/mission-control";
import type { MainMission, MissionState } from "@modules/missions/domain/mission";
import type { Mailbox } from "@modules/story/domain/mailbox";
import type { MissionMark } from "./nav-map";
import { portrait } from "./portraits";
import "./mission-log.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const STATE: Record<MissionState, string> = { activa: "Activa", hecha: "Hecha", bloqueada: "Bloqueada" };
const KIND = { asteroide: "asteroide", luna: "luna", planeta: "planeta" } as const;

/**
 * The mission log («Misiones»), reachable on the travel ship: from the flight deck's COMM page, the
 * map and the radio (docs/design/accesos.md). Nevaeh's main missions by chapter (done, active,
 * locked), the side missions (every other asteroid) and her letters. In the lander's cockpit only
 * the notice toast shows (it does not open the log there).
 */
export class MissionLogPanel {
  readonly el: HTMLElement;
  private readonly toast: HTMLButtonElement;
  private toastTimer = 0;
  private openId: string | undefined;
  private letterId: string | undefined;
  /** Set by main: show a target on the map (closes the log). */
  onShowOnMap?: (targetId: string) => void;
  onClose?: () => void;
  /** Set by main: whether the log can open here (a tap on the toast elsewhere only dismisses it). */
  canOpen: () => boolean = () => true;

  constructor(
    root: HTMLElement,
    private readonly control: MissionControl,
    private readonly mailbox: Mailbox,
  ) {
    this.el = document.createElement("div");
    this.el.className = "mission-log hidden";
    root.appendChild(this.el);
    this.toast = document.createElement("button");
    this.toast.className = "ml-toast";
    this.toast.addEventListener("click", () => {
      this.toast.classList.remove("on");
      if (this.canOpen()) this.open();
    });
    root.appendChild(this.toast);
    this.el.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
      if (!t) return;
      const id = t.dataset.id;
      switch (t.dataset.act) {
        case "close":
          this.close();
          return this.onClose?.();
        case "toggle":
          this.openId = this.openId === id ? undefined : id;
          return this.render();
        case "letter":
          this.letterId = id;
          if (id) this.mailbox.read(id);
          return this.render();
        case "back":
          this.letterId = undefined;
          return this.render();
        case "map":
          this.close();
          if (id) this.onShowOnMap?.(id);
      }
    });
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && this.visible) this.close();
    });
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  /** A mission notice on top of whatever is showing; tapping it opens the log. */
  notify(text: string, kind: string): void {
    this.toast.textContent = text;
    this.toast.className = `ml-toast on ${kind}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove("on"), 7000);
  }

  /** Nevaeh's letters about missions not read yet (for the cockpit button). */
  get unread(): number {
    const ids = new Set(this.control.log.main.map((m) => m.letterId));
    return this.mailbox.received.filter((r) => ids.has(r.letter.id) && !r.read).length;
  }

  open(): void {
    this.letterId = undefined;
    this.openId ??= this.control.log.active?.id;
    this.el.classList.remove("hidden");
    document.body.classList.add("in-missions");
    this.render();
  }

  close(): void {
    this.el.classList.add("hidden");
    document.body.classList.remove("in-missions");
  }

  /** The mark the map draws for a target. */
  mark(targetId: string): MissionMark | undefined {
    const log = this.control.log;
    const m = log.mainFor(targetId);
    if (m) {
      // Only what Nevaeh has asked for is marked: later targets look like any other until their letter.
      if (!log.isAnnounced(m.id)) return undefined;
      const s = log.state(m.id);
      return { kind: "principal", state: s, title: m.title, why: m.why, ...(m.reward ? { reward: `${m.reward.text} (valor de juego)` } : {}) };
    }
    if (log.sides.some((t) => t.id === targetId)) return { kind: "secundaria", state: log.isSideDone(targetId) ? "hecha" : "pendiente" };
    return undefined;
  }

  render(): void {
    if (!this.visible) return;
    this.el.innerHTML = `<div class="ml-sheet">${this.letterId ? this.letterHtml(this.letterId) : this.listHtml()}</div>`;
  }

  private listHtml(): string {
    const log = this.control.log;
    const chapters = new Map<number, MainMission[]>();
    for (const m of log.main) chapters.set(m.chapter, [...(chapters.get(m.chapter) ?? []), m]);
    const main = [...chapters.values()]
      .map((ms) => `<h3>Capítulo ${ms[0]!.chapter} · ${esc(ms[0]!.chapterTitle)}</h3>${ms.map((m) => this.missionHtml(m)).join("")}`)
      .join("");
    const c = log.sideCount;
    const sides = log.sides
      .map((t) => {
        const done = log.isSideDone(t.id);
        return `<button class="ml-side ${done ? "done" : ""}" data-act="map" data-id="${esc(t.id)}">${done ? "✓ " : ""}${esc(t.name)}</button>`;
      })
      .join("");
    const playable = log.main.filter((m) => m.playable).length;
    return `
      <div class="ml-head"><b>Misiones</b><span>${log.mainDone}/${playable} de Nevaeh · ${c.done}/${c.total} secundarias</span><button class="x" data-act="close" aria-label="Cerrar misiones">×</button></div>
      <p class="ml-intro"><i class="ml-n"><span>N</span></i> Misiones principales: te las pide Nevaeh por radio y están marcadas en el mapa.</p>
      ${main}
      <h3>Secundarias · subyuga todos los demás</h3>
      <p class="ml-intro">Ninguna es obligatoria. Toca una para verla en el mapa.</p>
      <div class="ml-sides">${sides}</div>`;
  }

  private missionHtml(m: MainMission): string {
    const log = this.control.log;
    const s = log.state(m.id);
    const announced = log.isAnnounced(m.id);
    const open = this.openId === m.id;
    const letter = this.control.letterFor(m);
    const unread = letter && !this.mailbox.received.find((r) => r.letter.id === letter.id)?.read;
    const inRegion = m.playable && s !== "hecha" && announced;
    const details = open
      ? `<div class="ml-body">
          <p>${announced ? esc(m.why) : "Nevaeh todavía no te lo ha pedido."}</p>
          ${m.lockedNote && s === "bloqueada" ? `<p class="ml-locked">${esc(m.lockedNote)}</p>` : ""}
          ${announced ? `<dl>${m.facts.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(f.value)}${f.note ? ` <small>${esc(f.note)}</small>` : ""} <a href="${esc(f.source)}" target="_blank" rel="noopener">fuente</a></dd>`).join("")}</dl>` : ""}
          ${m.reward ? `<p class="ml-reward">Recompensa: ${esc(m.reward.text)} para la estación <small>(valor de juego)</small></p>` : ""}
          <div class="ml-actions">
            ${letter ? `<button data-act="letter" data-id="${esc(letter.id)}">Leer la carta${unread ? " •" : ""}</button>` : ""}
            ${inRegion ? `<button class="primary" data-act="map" data-id="${esc(m.target.id)}">Ver en el mapa</button>` : ""}
          </div>
        </div>`
      : "";
    const name = announced || m.playable ? m.title : `${KIND[m.target.kind][0]!.toUpperCase()}${KIND[m.target.kind].slice(1)}: ${m.target.name}`;
    return `<div class="ml-mission ${s} ${open ? "open" : ""}">
      <button class="ml-row" data-act="toggle" data-id="${esc(m.id)}"><i class="ml-n"><span>${s === "hecha" ? "✓" : s === "bloqueada" ? "–" : "N"}</span></i><b>${esc(name)}${unread && s !== "hecha" ? " •" : ""}</b><span class="pill">${STATE[s]}</span></button>
      ${details}
    </div>`;
  }

  private letterHtml(id: string): string {
    const l = this.mailbox.received.find((r) => r.letter.id === id)?.letter;
    if (!l) return "";
    return `
      <div class="ml-head"><button data-act="back">‹ Misiones</button><span></span><button class="x" data-act="close" aria-label="Cerrar misiones">×</button></div>
      <div class="ml-letter">
        <div class="ml-from">${portrait(l.from)}<div><b>${esc(l.subject)}</b><small>De ${esc(l.from)} para ${esc(l.to)} · por la radio</small></div></div>
        ${l.body.map((p) => `<p>${esc(p)}</p>`).join("")}
        ${l.postscripts.map((p) => `<p class="ps">P. D.: ${esc(p)}</p>`).join("")}
        ${l.mission ? `<div class="ml-locked"><b>${esc(l.mission.title)}</b><br>${esc(l.mission.where)}</div>` : ""}
      </div>`;
  }
}
