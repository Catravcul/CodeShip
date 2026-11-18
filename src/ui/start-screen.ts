import { levelChoices, type Level, type LevelChoice } from "@modules/levels/domain/level";
import type { SaveSlot } from "@modules/saves/domain/save-slot";
import type { SlotNotice } from "@modules/saves/application/save-book";
import { MapWindow, markPicked, optionsHtml, type MapOption } from "./map-window";
import { MapSelection, nearestPick, orbitProjector, type MapPoint } from "./map-window-model";
import "./start-screen.css";

interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The device's saved games, as the start screen sees them (adapters/storage/saved-games.ts). */
export interface StartSaves {
  list(): { slots: SaveSlot[]; problems: SlotNotice[] };
  /** Why a kept game cannot be resumed now, or undefined. */
  why(s: SaveSlot): string | undefined;
  remove(id: string): void;
  /** The slot a new game would save into, or none when all are taken. */
  freeSlot(): string | undefined;
}

/** What starts: a kept game, or a new one (`fresh`: chosen as «Jugar sin partida guardada»). */
export type StartChoice = { readonly kind: "continuar"; readonly slot: SaveSlot } | { readonly kind: "nueva"; readonly fresh: boolean };

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "fecha desconocida" : d.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const overlaps = (a: Box, o: Box) => a.l < o.r && o.l < a.r && a.t < o.b && o.t < a.b;

/** Half the height of the level axis, in map units (levels.ts `at`). */
const AXIS_R = 3.8;

/**
 * The start screen (Berón, 2026-11-18; docs/design/santuario3-iniciacion.md §5): the map window with the six
 * sanctuaries on Cold Sanctuary's «depth = danger» axis on top, and a card for each under it. It shows on every
 * load, before the game. Only 6 starts (with «Continuar» when there is a kept game); 3 shows its card, being
 * built; the others come later. No tree menu here: there is no game yet.
 */
export class StartScreen {
  private readonly win: MapWindow;
  private readonly list: HTMLElement;
  private choices: readonly LevelChoice[] = [];
  private readonly sel: MapSelection;
  private screen: { id: string; x: number; y: number }[] = [];
  /** The kept game «Continuar» resumes: the newest one that can be resumed. */
  private latest: SaveSlot | undefined;
  /** The slot whose deletion is being confirmed (inside the window, never `window.confirm`). */
  private confirming: string | undefined;

  constructor(
    root: HTMLElement,
    private readonly levels: readonly Level[],
    private readonly saves: StartSaves,
    private readonly play: (level: Level, choice: StartChoice) => void,
  ) {
    this.sel = new MapSelection(() => this.choices);
    this.win = new MapWindow(root, {
      className: "start-screen",
      label: "Codeship · elegir santuario",
      title: "Codeship",
      canvasLabel: "Mapa de los santuarios: arriba el espacio, abajo el núcleo",
      hint: "Arrastra para girar · toca un santuario",
      // Its settings are the saved games (Berón, 2026-11-18): the gear swaps the list for them, the list icon goes back.
      gear: { label: "Partidas guardadas", backLabel: "Volver a los santuarios", settingsClass: "ss-saves" },
      settings: (on) => {
        this.confirming = undefined;
        if (on) this.renderSaves();
        else this.mark(false);
      },
      view: { yaw: 0.5, elevation: 0.32, zoom: 1 },
      limits: { turnPerPx: 0.01, minElevation: 0.05, minZoom: 0.6, maxZoom: 4 },
      side: `<div class="nav-card ss-side"><p class="ss-intro">Elige santuario. Cuanto más hondo, más peligro.</p><div class="mw-list ss-list"></div><p class="ss-src">Del 1 al 5, los santuarios de Cold Sanctuary (docs/world-topology-and-planes.md §3); el 6 es de Codeship. Mundos de ficción.</p></div>`,
      draw: (g, w, h) => this.draw(g, w, h),
      tap: (x, y) => {
        const hit = nearestPick(this.screen, x, y, 32);
        if (hit && this.sel.pick(hit.id)) this.mark(true);
      },
      click: (t) => this.onClick(t),
    });
    this.list = this.win.el.querySelector(".ss-list")!;
    this.renderCards();
    // The playable level highest on the map (space, the game of now) is picked to start with (with a kept game, its level).
    const top = [...this.levels].sort((a, b) => b.at.y - a.at.y).find((l) => !this.choices.find((c) => c.id === l.id)?.locked);
    this.sel.pick(this.choices.find((c) => c.action === "Continuar")?.id ?? top?.id);
    window.addEventListener("resize", this.onResize);
  }

  /** The level cards, with «Continuar» on the level of the newest kept game that can be resumed. */
  private renderCards(): void {
    this.latest = this.saves.list().slots.find((s) => !this.saves.why(s));
    this.choices = levelChoices(this.levels, this.latest);
    // The cards in the map's order, from space at the top down to the core: the playable one first.
    const options: MapOption[] = [...this.levels].sort((a, b) => b.at.y - a.at.y).map((l) => {
      const c = this.choices.find((x) => x.id === l.id)!;
      return {
        id: l.id,
        name: `${l.number} · ${l.name}`,
        sub: `Peligro ${l.danger} · ${l.topology}`,
        desc: l.desc,
        action: c.action,
        actionLabel: `${c.action}: ${l.name}${c.locked ? ` (${c.locked})` : ""}`,
        pickLabel: `Ver ${l.name} en el mapa`,
        selectable: c.selectable,
        locked: c.locked,
      };
    });
    this.list.innerHTML = optionsHtml(options, { cls: "ss" });
    markPicked(this.list, this.sel.picked);
  }

  /**
   * The gear's settings: the kept games, newest first, each with «Jugar» and «Borrar» (confirmed here, in the
   * window), the ones that cannot be resumed with why, and «Jugar sin partida guardada».
   */
  private renderSaves(): void {
    const box = this.win.settingsBox;
    if (!box) return;
    const { slots, problems } = this.saves.list();
    const nameOf = (n: number) => this.levels.find((l) => l.number === n)?.name ?? `Santuario ${n}`;
    const confirm = (id: string, what: string) =>
      `<p class="ss-confirm" role="alert"><b aria-hidden="true">⚠</b> ¿Borrar ${esc(what)}? No se puede deshacer.</p><div class="ss-save-acts"><button class="ss-del ss-del-yes" data-del-yes="${esc(id)}" aria-label="Sí, borrar ${esc(what)}">Borrar</button><button class="ss-del-no" data-del-no aria-label="No borrar">Cancelar</button></div>`;
    const rows = slots.map((s) => {
      const what = `la partida ${s.id}`;
      if (this.confirming === s.id) return `<div class="mw-row ss-save confirming" data-slot="${esc(s.id)}">${confirm(s.id, what)}</div>`;
      const why = this.saves.why(s);
      const lock = why ? `<i class="mw-lock"><b aria-hidden="true">⊘</b> ${esc(why)}</i>` : "";
      const newest = s.id === this.latest?.id ? ` <em>Continuar</em>` : "";
      return `<div class="mw-row ss-save${why ? " locked" : ""}" data-slot="${esc(s.id)}"><div class="ss-save-info"><b>Partida ${esc(s.id)} · ${esc(nameOf(s.level))}${newest}</b><small>Día ${s.boardDay} · ${esc(s.summary.vehicle)} · ${esc(s.summary.place)}</small><span>Guardada el ${esc(when(s.savedAt))}</span>${lock}</div><div class="ss-save-acts"><button class="tb-go mw-go" data-load="${esc(s.id)}" aria-label="Jugar ${esc(what)}"${why ? " disabled" : ""}>Jugar</button><button class="ss-del" data-del="${esc(s.id)}" aria-label="Borrar ${esc(what)}">Borrar</button></div></div>`;
    });
    const broken = problems.map((p) => {
      const what = p.id === "antigua" ? "la partida antigua" : `la partida ${p.id}`;
      if (this.confirming === p.id) return `<div class="mw-row ss-save confirming" data-slot="${esc(p.id)}">${confirm(p.id, what)}</div>`;
      return `<div class="mw-row ss-save locked" data-slot="${esc(p.id)}"><div class="ss-save-info"><b>${p.id === "antigua" ? "Partida antigua" : `Partida ${esc(p.id)}`}${p.level ? ` · ${esc(nameOf(p.level))}` : ""}</b>${p.savedAt ? `<span>Guardada el ${esc(when(p.savedAt))}</span>` : ""}<i class="mw-lock"><b aria-hidden="true">⊘</b> ${esc(p.text)}</i></div><div class="ss-save-acts"><button class="ss-del" data-del="${esc(p.id)}" aria-label="Borrar ${esc(what)}">Borrar</button></div></div>`;
    });
    const free = this.saves.freeSlot();
    const fresh = this.freshLevel();
    const freshHelp = free
      ? `Empieza una partida nueva${fresh ? ` del ${esc(fresh.name)}` : ""}, que se guarda sola en la ranura ${esc(free)}; las partidas guardadas no se tocan.`
      : "Las ranuras están llenas: esta partida no se guardará (borra una para guardarla). Las guardadas no se tocan.";
    box.innerHTML = `<h2 class="ss-saves-title">Partidas guardadas</h2><p class="ss-saves-help">Se guarda sola cada minuto, al llegar a un sitio, al acabar un reto, al despertar y al salir del juego.</p><div class="mw-list ss-saves-list">${[...rows, ...broken].join("") || `<p class="ss-saves-none">Todavía no hay ninguna partida guardada en este dispositivo.</p>`}</div><button class="ss-fresh" data-fresh${fresh ? "" : " disabled"}>Jugar sin partida guardada</button><small class="ss-fresh-help">${freshHelp}</small>`;
  }

  /** The level a new game starts: the one picked, if it can be played; else the first that can. */
  private freshLevel(): Level | undefined {
    const ok = (id: string | undefined) => this.choices.some((c) => c.id === id && !c.locked);
    const id = ok(this.sel.picked) ? this.sel.picked : this.choices.find((c) => !c.locked)?.id;
    return this.levels.find((l) => l.id === id);
  }

  private readonly onResize = () => this.win.visible && this.win.draw();

  get visible(): boolean {
    return this.win.visible;
  }

  /** How the map is seen, what is picked and where each node is drawn (read by tools/experiencia/inicio.mjs). */
  get state(): { yaw: number; elevation: number; zoom: number; picked: string | undefined; nodes: { id: string; x: number; y: number }[] } {
    const r = this.win.canvas.getBoundingClientRect();
    return { ...this.win.view, picked: this.sel.picked, nodes: this.screen.map((n) => ({ id: n.id, x: r.left + n.x, y: r.top + n.y })) };
  }

  open(): void {
    this.win.show(true);
    document.body.classList.add("in-start");
    this.mark(false);
  }

  /** Gone for good: the game is starting. */
  close(): void {
    window.removeEventListener("resize", this.onResize);
    document.body.classList.remove("in-start");
    this.win.el.remove();
  }

  private onClick(t: HTMLElement): void {
    if (this.win.settingsShown) return this.onSavesClick(t);
    const pick = t.closest<HTMLElement>("[data-pick]");
    if (pick) {
      if (this.sel.pick(pick.dataset.pick)) this.mark(false);
      return;
    }
    const go = t.closest<HTMLElement>("[data-go]");
    if (!go) return;
    const r = this.sel.act(go.dataset.go);
    const level = r.ok ? this.levels.find((l) => l.id === r.id) : undefined;
    if (!level) return;
    const resume = this.latest && this.latest.level === level.number ? this.latest : undefined;
    this.play(level, resume ? { kind: "continuar", slot: resume } : { kind: "nueva", fresh: false });
  }

  private onSavesClick(t: HTMLElement): void {
    const b = t.closest<HTMLElement>("button");
    if (!b || (b as HTMLButtonElement).disabled) return;
    const d = b.dataset;
    if (d.load) {
      const slot = this.saves.list().slots.find((s) => s.id === d.load);
      const level = slot && !this.saves.why(slot) ? this.levels.find((l) => l.number === slot.level) : undefined;
      if (slot && level) this.play(level, { kind: "continuar", slot });
      return;
    }
    if (d.del) this.confirming = d.del;
    else if (d.delYes) {
      this.saves.remove(d.delYes);
      this.confirming = undefined;
      this.renderCards();
    } else if (d.delNo !== undefined) this.confirming = undefined;
    else if (d.fresh !== undefined) {
      const level = this.freshLevel();
      if (level) this.play(level, { kind: "nueva", fresh: true });
      return;
    } else return;
    this.renderSaves();
    // Keep the finger's place: the row's own buttons (or the list) get the focus back.
    this.win.settingsBox?.querySelector<HTMLElement>(this.confirming ? "[data-del-no]" : ".ss-fresh")?.focus({ preventScroll: true });
  }

  /** The saved games are shown (the gear's settings). */
  get savesShown(): boolean {
    return this.win.settingsShown;
  }

  private mark(scroll: boolean): void {
    markPicked(this.list, this.sel.picked);
    if (scroll && this.sel.picked) this.list.querySelector(`[data-row="${CSS.escape(this.sel.picked)}"]`)?.scrollIntoView({ block: "nearest" });
    this.win.draw();
  }

  private draw(g: CanvasRenderingContext2D, w: number, h: number): void {
    this.screen = [];
    const view = this.win.view;
    const s = ((0.4 * Math.min(w * 1.1, h)) / AXIS_R) * view.zoom;
    const P = orbitProjector(view, s, w / 2, h * 0.47);
    // The ground (sea level) as rings: the land's plane, with the axis through it.
    g.lineWidth = 1;
    for (const r of [1, 2, 3]) {
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = P({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r });
        if (i) g.lineTo(p.x, p.y);
        else g.moveTo(p.x, p.y);
      }
      g.strokeStyle = r === 3 ? "#9fe8c455" : "#7fdcff22";
      g.setLineDash(r === 3 ? [] : [4, 6]);
      g.stroke();
    }
    g.setLineDash([]);
    // The «depth = danger» axis: from the core to space, its colour from calm to danger.
    const top = P({ x: 0, y: AXIS_R, z: 0 });
    const bottom = P({ x: 0, y: -AXIS_R, z: 0 });
    const grad = g.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
    grad.addColorStop(0, "#7fdcff");
    grad.addColorStop(0.5, "#9fe8c4");
    grad.addColorStop(1, "#ff6b5a");
    g.strokeStyle = grad;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(top.x, top.y);
    g.lineTo(bottom.x, bottom.y);
    g.stroke();
    g.font = "11px ui-monospace, Menlo, monospace";
    g.fillStyle = "#ff8a7a";
    g.textAlign = "right";
    // The hint's corner is taken: no text over it.
    const hint = this.win.el.querySelector(".nav-hint")?.getBoundingClientRect();
    const box = this.win.canvas.getBoundingClientRect();
    const taken: Box[] = hint?.width ? [{ l: hint.left - box.left, r: hint.right - box.left, t: hint.top - box.top - 2, b: hint.bottom - box.top }] : [];
    const danger: Box = { l: bottom.x - 8 - g.measureText("más peligro ▼").width, r: bottom.x - 8, t: bottom.y - 10, b: bottom.y + 3 };
    if (!taken.some((o) => overlaps(danger, o))) {
      g.fillText("más peligro ▼", bottom.x - 8, bottom.y);
      taken.push(danger);
    }
    // The launch: from the air (3) up to space (6).
    const byId = new Map(this.levels.map((l) => [l.id, l]));
    const a3 = byId.get("aereo");
    const a6 = byId.get("espacio");
    if (a3 && a6) {
      const p = P(a3.at);
      const q = P(a6.at);
      g.setLineDash([5, 5]);
      g.strokeStyle = "#ffd27f99";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(q.x, q.y);
      g.stroke();
      g.setLineDash([]);
    }
    // Each sanctuary on its stalk from the ground, far ones first.
    const nodes = this.levels.map((l, i) => ({ l, c: this.choices[i]!, p: P(l.at) })).sort((a, b) => a.p.depth - b.p.depth);
    for (const { l, c, p } of nodes) this.drawNode(g, l, c.locked, c.selectable, p, l.id === this.sel.picked);
    this.drawLabels(g, nodes, taken);
  }

  private drawNode(g: CanvasRenderingContext2D, l: Level, locked: string | undefined, selectable: boolean, p: MapPoint, picked: boolean): void {
    // The stalk to the ground, and its foot.
    g.strokeStyle = "#ffffff33";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(p.x, p.gy);
    g.lineTo(p.x, p.y);
    g.stroke();
    const r = l.state === "jugable" ? 11 : 9;
    const fill = l.state === "jugable" ? "#58d6ff" : l.state === "en-construccion" ? "#ffd27f" : "#5d6b73";
    g.beginPath();
    if (l.id === "espacio") {
      // Space: a ring for the orbit round its node.
      g.ellipse(p.x, p.y, r + 7, (r + 7) * 0.4, -0.3, 0, Math.PI * 2);
      g.strokeStyle = "#58d6ff88";
      g.stroke();
      g.beginPath();
    }
    g.arc(p.x, p.y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    if (!selectable) {
      // Later: a struck-through ring (shape, not only colour: reglas.md §5.6).
      g.strokeStyle = "#c9d4da";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(p.x - r * 0.7, p.y + r * 0.7);
      g.lineTo(p.x + r * 0.7, p.y - r * 0.7);
      g.stroke();
    } else if (locked) {
      // Being built: a dashed ring.
      g.setLineDash([3, 3]);
      g.strokeStyle = "#ffd27f";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    if (picked) {
      g.beginPath();
      g.arc(p.x, p.y, r + 7, 0, Math.PI * 2);
      g.strokeStyle = "#ffd23f";
      g.lineWidth = 2;
      g.stroke();
    }
    g.fillStyle = "#001018";
    g.font = "bold 11px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(l.number), p.x, p.y + 0.5);
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    this.screen.push({ id: l.id, x: p.x, y: p.y });
  }

  /**
   * The names beside the nodes: the picked one first, then the playable one, then the nearest; a name that would
   * cover one already written, or the hint, is left out (its node's number and its card still say it).
   */
  private drawLabels(g: CanvasRenderingContext2D, nodes: readonly { l: Level; c: LevelChoice; p: MapPoint }[], taken: Box[]): void {
    const rank = (n: { l: Level }) => (n.l.id === this.sel.picked ? 2 : n.l.state === "jugable" ? 1 : 0);
    g.textBaseline = "middle";
    g.textAlign = "left";
    for (const n of [...nodes].sort((a, b) => rank(b) - rank(a) || b.p.depth - a.p.depth)) {
      const picked = n.l.id === this.sel.picked;
      const r = n.l.state === "jugable" ? 11 : 9;
      const text = n.l.name.replace(/^Santuario /, "");
      g.font = `${picked ? "700 " : ""}12px system-ui, sans-serif`;
      const x = n.p.x + r + 8;
      const box = { l: x - 2, r: x + g.measureText(text).width + 2, t: n.p.y - 8, b: n.p.y + 8 };
      if (taken.some((o) => overlaps(box, o))) continue;
      taken.push(box);
      g.lineWidth = 3;
      g.strokeStyle = "#02060acc";
      g.strokeText(text, x, n.p.y);
      g.fillStyle = picked ? "#ffd23f" : n.c.selectable ? "#e6f6ff" : "#9fb3bd";
      g.fillText(text, x, n.p.y);
    }
    g.textBaseline = "alphabetic";
  }
}
