import { scopeOfNode, type AreaMap, type AreaNode, type AreaScope, type AreaVec } from "@modules/tasks/application/areas";
import type { Vehicle } from "@modules/tasks/application/task-list";
import { settings } from "./settings-store";
import { onCloseRequest, windowState } from "./hud-windows";
import { settingsClick, travelHtml, vehicleHtml, VEHICLE_NAME, wholePlaceName } from "./task-settings";
import type { TaskTravel } from "@modules/settings/domain/settings";
import { asteroidDecor, baseRings, MapWindow, markPicked, optionsHtml, outlinePath, type MapOption } from "./map-window";
import { MapSelection, nearestPick, orbitProjector, type MapView } from "./map-window-model";
import type { HudWindow } from "./hud-windows";
import "./task-board.css";
import "./areas-window.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface AreasDeps {
  /** The vehicle she is in now («Automático»). */
  here(): Vehicle;
  /** The schematic of a vehicle (undefined: not there, e.g. no Starship). */
  map(v: Vehicle): AreaMap | undefined;
  /** The node she is in now, to mark it «Aquí». */
  at?(): string | undefined;
  /** Take her there, by the real way or by teleport (the shared setting). */
  go(node: AreaNode, map: AreaMap): void;
  /** The window's own names and HUD id: Áreas by default; the workday's Misiones reuses it (Berón 2026-11-18). */
  readonly kind?: { readonly title: string; readonly window: HudWindow; readonly bodyClass: string; readonly className: string };
  /**
   * A level that is one place: the name of the whole («Todo el santuario»). Its gear holds only Viaje/Teletransporte
   * and the list shows all of it (no vehicle, island or building filter; the category chips stay). By default the
   * level's own (task-settings.ts `wholePlace`: sanctuaries 1 and 3); the ships leave it out: the gear lists the
   * vehicles and their modules or decks, as in Tareas.
   */
  readonly whole?: string;
  /**
   * Where she is, as a scope option («Automático»), when the place says it better than her node (sanctuary 1: the cap
   * she stands on outdoors). By default, her node's broadest level of the map's hierarchy (`AreaMap.scopes`).
   */
  scopeAt?(): { readonly kind: string; readonly id: string } | undefined;
  /** The first view: «su modo más visible» (sanctuary 1 from the side, its tree-buildings standing). */
  readonly view?: MapView;
  /** A row's own action, lock and lines (Misiones: «Hacer», locked until its hour, its reward). */
  row?(n: AreaNode): Partial<Pick<MapOption, "action" | "actionLabel" | "locked" | "sub" | "tag" | "desc">>;
  /** What the list says when nothing is shown. */
  readonly empty?: string;
  /**
   * Its own «Viaje o teletransporte» instead of the shared one (each carpet station keeps its own, Berón 2026-11-20):
   * what it reads now, how to change it, the heading and what the gear says of it.
   */
  readonly travel?: { get(): TaskTravel; set(v: TaskTravel): void; readonly heading: string; readonly help: string };
}

interface Pt {
  x: number;
  y: number;
}

const inside = (h: Pt[], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
    const a = h[i]!;
    const b = h[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

/** «Harmony (Nodo 2)» → name «Harmony», what it is «Nodo 2». */
const split = (label: string) => {
  const m = /^(.*?)\s*\((.*)\)$/.exec(label);
  return { name: m ? m[1]! : label, sub: m?.[2] };
};

/**
 * «Áreas» of the tree menu (Berón, 2026-11-18; reglas.md §5.8, docs/design/areas.md): the map window
 * (map-window.ts), the same as Navigation. On top, a 3D map of the vehicle she is in (Starship, the station or
 * the LM), each area a box of the real plan and the hatches as lines; a finger drags to turn it and pinches to
 * zoom (reglas.md §5.7, its one exception; no joystick or buttons on it). Under it, the areas
 * with what is there and «Ir», which takes her there walking the real way unless she chose teleport. Its gear
 * swaps both for the shared settings (Viaje/Teletransporte and the vehicle, the same as the task list's) and
 * turns into a list icon that goes back. It covers the screen, so the tree menu hides while it is open.
 */
export class AreasWindow {
  private readonly win: MapWindow;
  private readonly el: HTMLElement;
  private readonly side: HTMLElement;
  private shown: AreaMap | undefined;
  private readonly sel = new MapSelection(() => this.shown?.nodes.map((n) => ({ id: n.id })) ?? []);
  private screen: { id: string; hull: Pt[]; c: Pt; depth: number }[] = [];
  /** The gear's scope: "auto" is where she is, "" the whole place; else a kind with its chosen option. */
  private scopeKind = "auto";
  private scopeId = "";
  /** The category chip on («» = Todas). */
  private category = "";
  private readonly k: NonNullable<AreasDeps["kind"]>;

  constructor(
    root: HTMLElement,
    private readonly d: AreasDeps,
  ) {
    this.k = d.kind ?? { title: "Áreas", window: "areas", bodyClass: "in-areas", className: "" };
    const t = this.k.title.toLowerCase();
    this.win = new MapWindow(root, {
      className: `areas-window ${this.k.className}`,
      label: this.k.title,
      canvasLabel: "Mapa del vehículo",
      hint: "Arrastra para girar · toca un área",
      view: d.view ?? { yaw: 0.6, elevation: 0.75, zoom: 1 },
      limits: { turnPerPx: 0.01, minElevation: 0.02, minZoom: 0.5, maxZoom: 12 },
      gear: { className: "ar-view", label: `Ajustes de ${t}`, backLabel: `Volver al mapa de ${t}`, settingsClass: "ar-settings tb-settings" },
      closeLabel: `Cerrar ${t}`,
      side: `<div class="nav-card ar-side"></div>`,
      draw: (g, w, h) => this.draw(g, w, h),
      tap: (x, y) => this.pickAt(x, y),
      click: (t) => this.onClick(t),
      onClose: () => this.close(),
      settings: () => this.render(),
    });
    this.el = this.win.el;
    this.side = this.el.querySelector(".ar-side")!;
    window.addEventListener("keydown", (e) => this.visible && e.code === "Escape" && this.close());
    window.addEventListener("resize", () => this.visible && this.win.draw());
    onCloseRequest(this.k.window, () => this.close());
  }

  get visible(): boolean {
    return this.win.visible;
  }

  /** How the map is seen and what is picked (read by the journeys, tools/experiencia/tareas-ajustes.mjs). */
  get yaw(): number {
    return this.win.view.yaw;
  }
  get elevation(): number {
    return this.win.view.elevation;
  }
  get zoom(): number {
    return this.win.view.zoom;
  }
  get picked(): string | undefined {
    return this.sel.picked;
  }

  open(): void {
    this.win.showSettings(false);
    this.sel.clear();
    const at = this.d.at?.();
    this.win.view.zoom = 1;
    this.win.show(true);
    document.body.classList.add(this.k.bodyClass);
    windowState(this.k.window, true);
    this.render();
    // Where she is, picked (once the map is known).
    if (at) {
      this.sel.pick(at);
      this.renderSide(false);
    }
  }

  close(): void {
    if (!this.visible) return;
    this.win.show(false);
    document.body.classList.remove(this.k.bodyClass);
    windowState(this.k.window, false);
  }

  /** The vehicle shown: the setting, «Automático» (and «Todos», which one map cannot show) where she is. */
  private vehicle(): Vehicle {
    if (this.whole) return this.d.here();
    const f = settings.value.taskVehicle;
    return f === "auto" || f === "todos" ? this.d.here() : f;
  }

  /**
   * The gear's scope (Berón 2026-11-19, the same in every level, like the magic carpets' choice): the place's own
   * hierarchy under the vehicle or island (`AreaMap.scopes`: sanctuary 1's buildings and caps, sanctuary 3's buildings
   * and floors, the ships' modules and decks). «Todo» shows everything; an option, only its areas.
   */
  /** The whole place, when it is one (no filters in the gear). */
  private get whole(): string | undefined {
    return this.d.whole ?? wholePlaceName();
  }
  private scopes(map = this.shown): readonly AreaScope[] {
    if (this.whole) return [];
    return map?.scopes ?? [];
  }
  /** Where she is as a scope, in the place shown (another island or vehicle has no «where she is»). */
  private scopeHere(map = this.shown): { kind: string; id: string } | undefined {
    if (!map || map.vehicle !== this.d.here()) return undefined;
    return this.d.scopeAt?.() ?? scopeOfNode(map, this.d.at?.());
  }
  /** The scope in force: the chosen one, or where she is («Automático»). */
  private scope(): { kind: string; id: string } | undefined {
    if (this.whole) return undefined;
    if (this.scopeKind === "auto") return this.scopeHere();
    return this.scopeKind && this.scopeId ? { kind: this.scopeKind, id: this.scopeId } : undefined;
  }
  private scopeLabel(sc = this.scope(), map = this.shown): string | undefined {
    return sc && this.scopes(map).find((s) => s.kind === sc.kind)?.options.find((o) => o.id === sc.id)?.label;
  }
  private fits(scope: Readonly<Record<string, string>> | undefined): boolean {
    const sc = this.scope();
    return !sc || scope?.[sc.kind] === sc.id;
  }
  /** The nodes shown: those of the chosen scope and category. */
  private inScope(): AreaNode[] {
    return (this.shown?.nodes ?? []).filter((n) => this.fits(n.scope));
  }
  private visibleNodes(): AreaNode[] {
    return this.inScope().filter((n) => !this.category || n.category === this.category);
  }

  private onClick(t: HTMLElement): void {
    const own = this.d.travel && t.closest<HTMLElement>("[data-travel]");
    if (own) {
      this.d.travel!.set(own.dataset.travel as TaskTravel);
      return this.render();
    }
    if (settingsClick(t)) {
      // Another island or vehicle: its own hierarchy, from where she is (or the whole of it).
      if (t.closest("[data-vehicle]")) {
        this.scopeKind = "auto";
        this.scopeId = "";
        this.category = "";
      }
      return this.render();
    }
    const sk = t.closest<HTMLElement>("[data-scope-kind]");
    if (sk) {
      this.scopeKind = sk.dataset.scopeKind ?? "";
      this.scopeId = sk.dataset.scopeId ?? "";
      this.category = "";
      this.win.view.zoom = 1;
      return this.render();
    }
    const cat = t.closest<HTMLElement>("[data-cat]");
    if (cat) {
      this.category = cat.dataset.cat ?? "";
      this.sel.clear();
      return this.renderSide(true);
    }
    const pick = t.closest<HTMLElement>("[data-pick]");
    if (pick) {
      this.sel.pick(pick.dataset.pick);
      return this.renderSide(false);
    }
    const area = t.closest<HTMLElement>("[data-area]");
    const node = area && this.shown?.nodes.find((n) => n.id === area.dataset.area);
    if (node && this.shown) {
      const map = this.shown;
      this.close();
      this.d.go(node, map);
    }
  }

  private render(): void {
    const settingsView = this.win.settingsShown;
    const t = this.k.title.toLowerCase();
    this.el.setAttribute("aria-label", settingsView ? `Ajustes de ${t}` : this.k.title);
    this.el.classList.toggle("ar-in-settings", settingsView);
    if (settingsView) {
      const map = this.d.map(this.vehicle());
      this.win.settingsBox!.innerHTML = `<h2 class="ar-title">Ajustes de ${t}</h2>${this.whole ? "" : vehicleHtml("ar-s-vehicle", this.d.here(), undefined, false)}${this.scopeHtml(map)}${this.d.travel ? `${travelHtml("ar-s-travel", this.d.travel.get(), this.d.travel.heading)}<small class="tb-travel-help">${esc(this.d.travel.help)}</small>` : `${travelHtml("ar-s-travel")}<small class="tb-travel-help">Los mismos ajustes que en Tareas.</small>`}`;
      return;
    }
    this.shown = this.d.map(this.vehicle());
    this.sel.keep();
    this.renderSide(true);
    this.win.draw();
  }

  /**
   * The gear's scope, laid out like the vehicle list of Codeship's Áreas (Automático, then each vehicle): here
   * Automático (where she is), the whole sanctuary, then each building by its own name and each cap. One choice.
   */
  private scopeHtml(map: AreaMap | undefined): string {
    const scopes = this.scopes(map);
    if (!scopes.length) return "";
    const btn = (kind: string, id: string, html: string, cls = "") => {
      const on = this.scopeKind === kind && (kind === "auto" || kind === "" || this.scopeId === id);
      return `<button role="radio" data-scope-kind="${esc(kind)}" data-scope-id="${esc(id)}" aria-checked="${on}" class="${on ? "on" : ""}${cls}">${html}</button>`;
    };
    const whole = `Todo: ${map ? VEHICLE_NAME[map.vehicle] : ""}`;
    const here = this.scopeLabel(this.scopeHere(map), map);
    const top = `${btn("auto", "", `Automático: donde está ella <small>${esc(here ?? whole)}</small>`, " auto")}${btn("", "", whole)}`;
    const groups = scopes.map((g, k) => `<h3 class="tb-group" id="ar-s-scope-${k}">${esc(g.label)}</h3><div class="tb-vehicles ar-scope-opts" role="radiogroup" aria-labelledby="ar-s-scope-${k}">${g.options.map((o) => btn(g.kind, o.id, esc(o.label))).join("")}</div>`).join("");
    return `<h3 class="tb-group" id="ar-s-scope">Mostrar</h3><div class="tb-vehicles three ar-scope" role="radiogroup" aria-labelledby="ar-s-scope">${top}</div>${groups}`;
  }

  /** The list under the map: what the map shows, then each area with what is there and «Ir». */
  private renderSide(rebuild: boolean): void {
    const v = this.vehicle();
    const map = this.shown;
    const auto = settings.value.taskVehicle === "auto" || settings.value.taskVehicle === "todos";
    const travel = (this.d.travel?.get() ?? settings.value.taskTravel) === "viaje" ? "Viaje: el camino real" : "Teletransporte";
    const at = this.d.at?.();
    if (rebuild) {
      const named = this.scopeLabel();
      const where = named ? ` · ${named}${this.scopeKind === "auto" ? " (donde está ella)" : ""}` : "";
      const scope = `<p class="tb-scope">${this.whole ?? `${VEHICLE_NAME[v]}${auto ? " (automático)" : ""}`}${where} · ${travel}</p>`;
      if (!map?.nodes.length) {
        this.side.innerHTML = `${scope}<p class="tb-empty">${this.d.empty ?? `No hay plano de ${VEHICLE_NAME[v].toLowerCase()} ahora.`}</p>`;
        return;
      }
      // The category chips (Berón 2026-11-19: «en la lista de áreas nos faltan los filtros de categoría»).
      const scoped = this.inScope();
      const cats = [...new Set(scoped.map((n) => n.category).filter((c): c is string => !!c))];
      if (this.category && !cats.includes(this.category)) this.category = "";
      const chip = (c: string, text: string, k: number) => `<button class="chip ${this.category === c ? "on" : ""}" data-cat="${esc(c)}" aria-pressed="${this.category === c}">${esc(text)} <small>${k}</small></button>`;
      const chips = cats.length > 1 ? `<div class="chips tb-chips ar-chips">${chip("", "Todas", scoped.length)}${cats.map((c) => chip(c, c, scoped.filter((n) => n.category === c).length)).join("")}</div>` : "";
      const options: MapOption[] = this.visibleNodes().map((n) => {
        const { name, sub } = split(n.label);
        const here = n.id === at;
        const own = this.d.row?.(n) ?? {};
        return {
          ...own,
          id: n.id,
          name,
          tag: here ? "Aquí" : undefined,
          sub: [sub, n.code].filter(Boolean).join(" · ") || undefined,
          desc: n.desc,
          action: "Ir",
          actionLabel: `Ir a ${n.label}${here ? " (aquí)" : ""}`,
          pickLabel: `Ver ${n.label} en el mapa`,
          ...own,
        } as MapOption;
      });
      this.side.innerHTML = `${scope}${chips}<div class="ar-list mw-list">${options.length ? optionsHtml(options, { cls: "ar", goAttr: "area" }) : `<p class="tb-empty">${this.d.empty ?? "Nada aquí"}</p>`}</div>`;
    }
    markPicked(this.side, this.sel.picked);
    this.win.draw();
  }

  private pickAt(px: number, py: number): void {
    // The nearest box under the finger, else the nearest centre within a fingertip.
    const under = this.screen.filter((s) => inside(s.hull, px, py)).sort((a, b) => b.depth - a.depth)[0];
    const near = nearestPick(this.screen.map((s) => ({ s, x: s.c.x, y: s.c.y })), px, py, 28)?.s;
    const hit = near ?? under;
    if (!hit) return;
    this.sel.pick(hit.id);
    this.renderSide(false);
    this.side.querySelector(`[data-row="${CSS.escape(hit.id)}"]`)?.scrollIntoView({ block: "nearest" });
  }

  /**
   * The map (Berón 2026-11-19: «cada área es una esfera en el espacio y lo único que representan es su
   * posición», like the start screen; 2026-11-20: a closed piece, made of lines and spheres): a sphere at each
   * area's middle, the passages as dashed lines, base rings under it all, the trunks as lines with their floors
   * joined to them, the caps as outlines. Her area in green, the picked one in gold; names where they do not overlap.
   */
  private draw(g: CanvasRenderingContext2D, w: number, h: number): void {
    const map = this.shown;
    this.screen = [];
    const nodes = this.visibleNodes();
    if (!this.visible || !map || !nodes.length) return;
    const chosen = this.sel.picked;
    // The map turns round the middle of what is shown and fits it at zoom 1.
    const lo = { x: Infinity, y: Infinity, z: Infinity };
    const hi = { x: -Infinity, y: -Infinity, z: -Infinity };
    // The place's own shape in scope (the chosen building's trunk, floors and rings; the caps).
    const shape = (map.structure ?? []).filter((b) => this.fits(b.scope));
    for (const n of [...nodes, ...shape])
      for (const k of ["x", "y", "z"] as const) {
        lo[k] = Math.min(lo[k], n.centre[k] - n.half[k]);
        hi[k] = Math.max(hi[k], n.centre[k] + n.half[k]);
      }
    const o = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 };
    const R = Math.max(0.5, Math.hypot(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) / 2);
    const s = ((0.48 * Math.min(w, h)) / R) * this.win.view.zoom;
    const P: (p: AreaVec) => Pt & { depth: number } = orbitProjector(this.win.view, s, w / 2, h / 2, o);
    asteroidDecor(g, P, o, R);
    // A closed piece, like the start screen (Berón, 2026-11-20: no grid, no boxes that look cut from a bigger map).
    baseRings(g, P, { x: o.x, y: lo.y, z: o.z }, Math.max(hi.x - lo.x, hi.z - lo.z) / 2 + 0.6);
    const outline = (c: AreaVec, rx: number, rz: number) => outlinePath(g, P, c, rx, rz);
    // The place's shape as lines: the caps as outlines, each trunk a vertical line (calm at its foot, sky at its
    // top), its rings round it and each floor joined to its trunk, so it reads as a tree.
    for (const b of shape.filter((b) => b.kind === "hielo" || b.kind === "tierra")) {
      outline({ x: b.centre.x, y: b.centre.y + b.half.y, z: b.centre.z }, b.half.x, b.half.z);
      g.strokeStyle = b.kind === "hielo" ? "#e8f4ff55" : "#b8c98a55";
      g.stroke();
    }
    const trunks = shape.filter((b) => b.kind === "tronco");
    for (const t of trunks) {
      const a = P({ x: t.centre.x, y: t.centre.y - t.half.y, z: t.centre.z });
      const b = P({ x: t.centre.x, y: t.centre.y + t.half.y, z: t.centre.z });
      const grad = g.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, "#9fe8c4");
      grad.addColorStop(1, "#7fdcff");
      g.strokeStyle = grad;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.lineWidth = 1.2;
    for (const b of shape.filter((b) => b.kind === "anillo")) {
      outline(b.centre, b.half.x, b.half.z);
      g.strokeStyle = "#ffd27f66";
      g.stroke();
    }
    const trunkOf = (c: AreaVec) => trunks.reduce<(typeof trunks)[number] | undefined>((best, t) => (!best || Math.hypot(t.centre.x - c.x, t.centre.z - c.z) < Math.hypot(best.centre.x - c.x, best.centre.z - c.z) ? t : best), undefined);
    g.strokeStyle = "#7fdcff99";
    g.lineWidth = 1.5;
    const onTree = new Set<string>();
    for (const n of nodes) {
      const t = trunkOf(n.centre);
      if (!t || Math.abs(n.centre.y - t.centre.y) > t.half.y + 2) continue;
      onTree.add(n.id);
      const a = P({ x: t.centre.x, y: n.centre.y, z: t.centre.z });
      const b = P(n.centre);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    // The passages that join the areas.
    const byId = new Map(nodes.map((n) => [n.id, n]));
    g.strokeStyle = "#7fdcff44";
    g.lineWidth = 1;
    g.setLineDash([4, 5]);
    for (const [a, b] of map.links) {
      const na = byId.get(a);
      const nb = byId.get(b);
      if (!na || !nb) continue;
      const p = P(na.centre);
      const q = P(nb.centre);
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(q.x, q.y);
      g.stroke();
    }
    g.setLineDash([]);
    // The spheres, far ones first: a stalk to the ground shows how high each one is.
    const at = this.d.at?.();
    const balls = nodes.map((n) => ({ n, c: P(n.centre), foot: P({ x: n.centre.x, y: lo.y, z: n.centre.z }) })).sort((a, b) => a.c.depth - b.c.depth);
    // Small, so they stand well apart (Berón 2026-11-20: «las esferas de los mapas hazlas más pequeñas»).
    const r0 = Math.max(2.5, Math.min(6, Math.sqrt((w * h) / Math.max(1, nodes.length)) / 10));
    for (const b of balls) {
      const picked = b.n.id === chosen;
      const here = b.n.id === at;
      const locked = !!this.d.row?.(b.n).locked;
      const r = picked ? r0 * 1.5 : here ? r0 * 1.25 : r0;
      if (!onTree.has(b.n.id)) {
        // Off the tree: a stalk to the ground shows how high it is.
        g.strokeStyle = "#ffffff33";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(b.c.x, b.c.y);
        g.lineTo(b.foot.x, b.foot.y);
        g.stroke();
      }
      const base = picked ? "#ffd23f" : here ? "#9fe8c4" : locked ? "#6c7a86" : "#58d6ff";
      const grad = g.createRadialGradient(b.c.x - r / 3, b.c.y - r / 3, r / 5, b.c.x, b.c.y, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, base);
      grad.addColorStop(1, `${base}55`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(b.c.x, b.c.y, r, 0, Math.PI * 2);
      g.fill();
      const ring: Pt[] = [];
      for (let k = 0; k < 10; k++) ring.push({ x: b.c.x + Math.cos((k / 10) * Math.PI * 2) * (r + 7), y: b.c.y + Math.sin((k / 10) * Math.PI * 2) * (r + 7) });
      this.screen.push({ id: b.n.id, hull: ring, c: b.c, depth: b.c.depth });
    }
    // Names beside the spheres: the picked one and hers first, then the nearest; one that would cover another
    // already written is left out (its sphere and its row in the list still say it).
    g.textAlign = "left";
    g.textBaseline = "middle";
    const written: { l: number; r: number; t: number; b: number }[] = [];
    const rank = (b: (typeof balls)[number]) => (b.n.id === chosen ? 2 : b.n.id === at ? 1 : 0);
    for (const b of [...balls].sort((p, q) => rank(q) - rank(p) || q.c.depth - p.c.depth)) {
      const picked = b.n.id === chosen;
      const here = b.n.id === at;
      const text = split(b.n.label).name + (here ? " · aquí" : "");
      g.font = `${picked ? "700 " : ""}12px system-ui, sans-serif`;
      const x = b.c.x + r0 + 4;
      const box = { l: x, r: x + g.measureText(text).width + 2, t: b.c.y - 8, b: b.c.y + 8 };
      if (written.some((q) => box.l < q.r && q.l < box.r && box.t < q.b && q.t < box.b)) continue;
      written.push(box);
      g.lineWidth = 3;
      g.strokeStyle = "#02060acc";
      g.strokeText(text, x, b.c.y);
      g.fillStyle = picked ? "#ffd23f" : here ? "#c9ffe0" : "#d8f6ff";
      g.fillText(text, x, b.c.y);
    }
  }
}
