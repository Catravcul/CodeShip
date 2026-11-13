import type { Ship } from "@modules/ship/domain/ship";
import type { ChoreSession, Habitat } from "@modules/habitat/application/habitat";
import type { Chore } from "@modules/chores/domain/chore";
import { swapChore } from "@modules/chores/application/catalog";
import { TANK_PARTS, partById } from "@modules/ship/data/parts";
import { installedId, isEmptyPart } from "@modules/ship/domain/refit";
import { bayActions, bayStatus, needingAttention, type BayAction, type BayStore, type PartSupply } from "@modules/ship-bay/application/bay";
import type { ComponentStatus } from "@modules/ship-bay/domain/component";
import type { Attention } from "@modules/ship-bay/domain/attention";
import { SHIP_STORES } from "@modules/ship-bay/data/stores";
import { ITEMS } from "@modules/kitchen/data/items";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { PROCESSES } from "@modules/kitchen/data/processes";
import { ANIMAL_LESSONS } from "@modules/pets/data/family-lessons";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { ShipBayScene, type BayView } from "./adapters/three/ship-bay-scene";
import { MothershipModel } from "./adapters/three/mothership-model";
import type { Mothership, MothershipSpec } from "@modules/mothership/domain/mothership";
import { ELECTRIC_THRUSTERS } from "@modules/mothership/data/thrusters";
import { applyDriveRefit, driveOptions, driveRefitChore, type DriveOption } from "@modules/mothership/application/drive-refit";
import { driveStatus, mountIdOf } from "@modules/ship-bay/application/drive";
import { equipmentSlotOf, mothershipEquipmentStatus } from "@modules/ship-bay/application/mothership-equipment";
import { applyEquipmentRefit, equipmentOptions, equipmentRefitChore, type EquipmentOption } from "@modules/mothership/application/equipment-refit";
import { MOTHERSHIP_EQUIPMENT } from "@modules/mothership/data/equipment";
import type { PartId } from "./adapters/three/ship-model";
import { VirtualStick, curve } from "./adapters/input/stick";
import type { DuelView, SessionText } from "./ui/duel-view";

const CONTEXT = { recipes: RECIPES, yoga: YOGA_SEQUENCES, processes: PROCESSES, lessons: ANIMAL_LESSONS };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DOT: Readonly<Record<Attention, string>> = { ok: "ok", aviso: "aviso", critico: "critico" };

const text = (c: Chore): SessionText => ({
  title: c.title,
  progress: "Pasos",
  lives: "Intentos",
  order: "Ordena el montaje",
  submit: "Hacerlo",
  ok: "Bien hecho",
  bad: "Así no: inténtalo otra vez",
  sheet: true,
});

/** Where the bay was opened from: the station's walkable interior or its task screen (docs/design/accesos.md). */
export type BayOrigin = "estacion" | "pantalla";

/** Where spare parts come from (the space station's hangar): a swap takes the new part and stores the old one. */
export interface PartStore extends PartSupply {
  swap(fitted: string, removed?: string): void;
  take(partId: string): void;
  put(partId: string, n?: number): void;
}

/** A bay action, a refit of one of the mothership's thruster mounts, or a swap of its equipment. */
type Action = BayAction & { readonly drive?: DriveOption; readonly equip?: EquipmentOption };

/** Parts of the probe; everything else in the bay (machines, farm deck, stores) is on the mothership. */
const PROBE_IDS = new Set(["casco", "motor", "rcs", "alas-solares", "bateria", "escudo-mmod", "sistemas-fijos"]);
const PROBE_PART = (id: string) => PROBE_IDS.has(id) || id.startsWith("tanque-");
const viewOf = (id: string): BayView => (PROBE_PART(id) ? "sonda" : "nodriza");

/**
 * The ship bay (engineering station): the ship from outside with an orbit camera, every part
 * selectable, the parts that need a look highlighted and listed, and for each part its real spec
 * sheet and the chores that can be done on it (repairs, care, part swaps), all as code challenges.
 * It opens only at the station: its bay console, the B key inside it, or the hangar tab of its task
 * screen (docs/design/accesos.md).
 */
export class ShipBay {
  readonly view: ShipBayScene;
  private readonly ui: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly sum: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly stick: VirtualStick;
  private selected: PartId | null = null;
  private list: ComponentStatus[] = [];
  private actions: Action[] = [];
  private attention = new Map<PartId, Attention>();
  private panelKey = "";
  private refreshAt = 0;
  private toastUntil = 0;
  private working = false;
  /** The chore open in the sheet, if any (exposed for automated checks). */
  session: ChoreSession | null = null;
  private drag: { id: number; x: number; y: number; moved: boolean } | null = null;
  active = false;
  from: BayOrigin = "estacion";
  /** Called after leaving, with where the player came from. */
  onExit?: (from: BayOrigin) => void;
  /** Whether the mothership is berthed at the station: work on its systems needs it here. */
  docked: () => boolean = () => true;
  private readonly tabs: HTMLElement;
  private mothershipModel?: MothershipModel;
  /** The live mothership: its thruster mounts appear in the Nodriza tab and can be refitted while docked. */
  nodriza?: Mothership;
  /** Called after a thruster refit of the mothership (to update its model in the flight scene). */
  onDriveRefit?: () => void;

  constructor(
    root: HTMLElement,
    private readonly ship: Ship,
    private readonly habitat: Habitat,
    private readonly duel: DuelView,
    private readonly mothership?: MothershipSpec,
    /** Without it every part on the shelf is free (as before the station). */
    private readonly parts?: PartStore,
  ) {
    this.view = new ShipBayScene(ship.design);
    const systems = [...habitat.machines.map((m) => ({ id: `maquina:${m.id}` as PartId, label: m.spec.name })), { id: "cubierta-cultivo" as PartId, label: "Cubierta de cultivo" }, { id: "despensa" as PartId, label: "Bodega y despensa" }];
    if (mothership) this.view.addMothership((this.mothershipModel = new MothershipModel(mothership, systems)));
    // Without a mothership the systems stay as beacons on the probe, as before.
    else this.view.model.setSystems(systems, true);
    this.ui = document.createElement("div");
    this.ui.className = "bay-ui hidden";
    this.ui.innerHTML = `<div class="bay-head"><b>Bahía de la nave</b><span class="bay-sum"></span></div><div class="bay-tabs${mothership ? "" : " hidden"}"><button data-view="sonda" class="on">Módulo</button><button data-view="nodriza">Nodriza</button></div><button class="bay-back">Volver</button><div class="bay-panel"></div><div class="bay-toast"></div>`;
    root.appendChild(this.ui);
    this.panel = this.ui.querySelector(".bay-panel")!;
    this.sum = this.ui.querySelector(".bay-sum")!;
    this.toast = this.ui.querySelector(".bay-toast")!;
    this.ui.querySelector(".bay-back")!.addEventListener("click", () => this.exit());
    this.panel.addEventListener("click", (e) => this.onPanelClick(e));
    this.tabs = this.ui.querySelector(".bay-tabs")!;
    this.tabs.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-view]");
      if (b) this.setView(b.dataset.view as BayView);
    });
    this.stick = new VirtualStick(root, "bay-look", "Orbitar");

    // Drag the empty screen to orbit, tap a part to select it, wheel to zoom.
    root.addEventListener("pointerdown", (e) => {
      if (!this.active || this.duel.visible || (e.target as HTMLElement).closest("button, .bay-panel, .vstick, .duel")) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    });
    window.addEventListener("pointermove", (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      this.view.orbit(-dx * 0.006, -dy * 0.006);
      d.x = e.clientX;
      d.y = e.clientY;
    });
    window.addEventListener("pointerup", (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      if (!d.moved) this.select(this.view.pick(e.clientX, e.clientY));
    });
    window.addEventListener("pointercancel", () => (this.drag = null));
    root.addEventListener("wheel", (e) => this.active && !this.duel.visible && this.view.zoom(e.deltaY > 0 ? 1.1 : 0.9), { passive: true });
    window.addEventListener("keydown", (e) => {
      if (!this.active || this.duel.visible) return;
      if (e.code === "Escape") this.selected ? this.select(null) : this.exit();
      const k = 0.08;
      if (e.code === "ArrowLeft") this.view.orbit(k, 0);
      if (e.code === "ArrowRight") this.view.orbit(-k, 0);
      if (e.code === "ArrowUp") this.view.orbit(0, k);
      if (e.code === "ArrowDown") this.view.orbit(0, -k);
    });
  }

  enter(from: BayOrigin): void {
    this.from = from;
    this.active = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-bay");
    this.panelKey = "";
    this.refresh();
    this.layout();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.ui.classList.add("hidden");
    document.body.classList.remove("in-bay");
    this.onExit?.(this.from);
  }

  get scene() {
    return this.view.scene;
  }
  get camera() {
    return this.view.camera;
  }

  resize(): void {
    this.layout();
  }

  /** Statuses of every part, recomputed from the live ship, machines, beds and stores. */
  status(): ComponentStatus[] {
    const stores: BayStore[] = SHIP_STORES.map((s) => {
      const item = ITEMS.find((i) => i.id === s.id);
      return { id: s.id, name: item?.name ?? s.id, amount: this.habitat.larder(s.id), capacity: s.capacity, unit: item?.unit === "día" ? "días" : item?.unit === "lote" ? "lotes" : (item?.unit ?? "") };
    });
    const list = bayStatus({ ship: this.ship, machines: this.habitat.machines, beds: this.habitat.plants.filter((p) => p.isBed), sustainability: this.habitat.sustainability, stores });
    return this.nodriza && this.mothership ? [...list, ...driveStatus(this.nodriza), ...mothershipEquipmentStatus(this.nodriza)] : list;
  }

  private chores(): Chore[] {
    return this.habitat.chores(RECIPES, YOGA_SEQUENCES, CONTEXT);
  }

  /** Show the probe or the mothership, with their own parts in the list. */
  setView(v: BayView): void {
    if (!this.mothership) return;
    this.view.setView(v);
    for (const b of this.tabs.querySelectorAll<HTMLElement>("[data-view]")) b.classList.toggle("on", b.dataset.view === v);
    this.selected = null;
    this.panelKey = "";
    this.refresh();
  }

  /** Parts of the ship on show (all of them without a mothership). */
  private shown(list: ComponentStatus[]): ComponentStatus[] {
    return this.mothership ? list.filter((c) => viewOf(c.id) === this.view.view) : list;
  }

  select(id: PartId | null): void {
    if (id && this.mothership && viewOf(id) !== this.view.view) this.setView(viewOf(id));
    this.selected = id;
    this.view.select(id);
    this.panelKey = "";
    this.renderPanel();
  }

  update(dt: number): void {
    if (!this.active) return;
    const s = this.stick.value;
    this.view.orbit(-curve(s.x) * 2 * dt, -curve(s.y) * 1.5 * dt);
    if (performance.now() > this.refreshAt) this.refresh();
    this.view.update(dt, this.ship.design, this.attention, this.selected);
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  private refresh(): void {
    this.refreshAt = performance.now() + 500;
    this.list = this.status();
    this.attention = new Map(this.list.map((c) => [c.id as PartId, c.attention]));
    const urgent = needingAttention(this.shown(this.list));
    const crit = urgent.filter((c) => c.attention === "critico").length;
    this.sum.textContent = urgent.length ? `${urgent.length} ${urgent.length === 1 ? "pieza necesita" : "piezas necesitan"} revisión${crit ? ` · ${crit} crítica${crit === 1 ? "" : "s"}` : ""}` : "Todo en orden";
    this.renderPanel();
  }

  /** The panel sits on the right in landscape and at the bottom in portrait; the 3D view keeps the rest. */
  private layout(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const landscape = w > h;
    if (this.duel.visible) this.view.setInset(landscape ? { right: Math.min(480, w * 0.46), bottom: 0 } : { right: 0, bottom: h * 0.62 });
    else this.view.setInset(landscape ? { right: Math.min(400, w * 0.4), bottom: 0 } : { right: 0, bottom: Math.round(h * 0.46) });
  }

  private row(c: ComponentStatus): string {
    const bar = c.health !== undefined ? c.health : c.level ? c.level.amount / Math.max(1e-9, c.level.capacity) : undefined;
    return `<button class="bay-item ${c.id === this.selected ? "sel" : ""}" data-part="${esc(c.id)}"><i class="dot ${DOT[c.attention]}"></i><b>${esc(c.name)}</b>${
      bar !== undefined ? `<span class="mini"><i style="width:${Math.round(Math.max(0, Math.min(1, bar)) * 100)}%"></i></span>` : ""
    }${c.issues[0] ? `<small>${esc(c.issues[0].text)}</small>` : ""}</button>`;
  }

  private renderPanel(): void {
    if (!this.active) return;
    const c = this.selected ? this.list.find((x) => x.id === this.selected) : undefined;
    // Mothership systems need the mothership berthed at the station: away, the bay only shows them.
    const away = !!c && !!this.mothership && viewOf(c.id) === "nodriza" && !this.docked();
    const actions = c && !away ? this.actionsFor(c) : [];
    const key = JSON.stringify([this.view.view, away, this.selected, this.list.map((x) => [x.attention, x.issues, x.level, x.health && Math.round(x.health * 100), x.name]), actions.map((a) => a.label + a.detail)]);
    if (key === this.panelKey) return;
    this.panelKey = key;
    if (!c) {
      const list = this.shown(this.list);
      const urgent = needingAttention(list);
      const rest = list.filter((x) => x.attention === "ok");
      this.panel.innerHTML = `
        ${urgent.length ? `<div class="bay-sec">Necesitan revisión</div>${urgent.map((x) => this.row(x)).join("")}` : `<div class="bay-sec ok">Nada que revisar</div>`}
        <div class="bay-sec">Todas las piezas · toca una en la nave o aquí</div>${rest.map((x) => this.row(x)).join("")}`;
      return;
    }
    const bar = (label: string, v: number, extra = "") => `<div class="bay-bar ${v < 0.5 ? "low" : ""}"><span>${label} ${Math.round(v * 100)} %${extra}</span><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></div>`;
    const tr = (s: ComponentStatus["specs"][number]) => `<tr><th>${esc(cap(s.label))}</th><td>${esc(s.value)}${s.source ? ` <a href="${esc(s.source)}" target="_blank" rel="noopener">fuente</a>` : ""}</td></tr>`;
    const specs = c.specs.filter((s) => !s.more).map(tr).join("");
    // The long detail (materials, flight history, how each number was reached) folds under the actions.
    const more = c.specs.filter((s) => s.more);
    const sheet = more.length ? `<details class="bay-more"><summary>Ficha completa y fuentes</summary><table class="bay-specs">${more.map(tr).join("")}</table></details>` : "";
    const acts = actions.map((a, i) => `<button class="bay-act ${a.kind}${a.locked ? " locked" : ""}" data-act="${i}"><b>${esc(a.label)}</b><span>${esc(a.detail)}</span></button>`).join("");
    this.panel.innerHTML = `
      <div class="bay-detail-head"><button data-back>‹ Piezas</button><i class="dot ${DOT[c.attention]}"></i></div>
      <div class="bay-name">${esc(c.name)}</div>
      ${c.health !== undefined ? bar(c.kind === "casco" ? "Integridad" : "Estado", c.health) : ""}
      ${c.level ? bar("Nivel", c.level.amount / Math.max(1e-9, c.level.capacity), ` · ${c.level.amount.toLocaleString("es-ES")} de ${c.level.capacity.toLocaleString("es-ES")} ${c.level.unit}`) : ""}
      ${c.issues.map((i) => `<div class="bay-issue ${i.attention}">${esc(i.text)}</div>`).join("")}
      <table class="bay-specs">${specs}</table>
      <div class="bay-sec">Acciones · cada una es una cadena de retos</div>
      ${away ? `<p class="bay-none">Está en la nodriza: atrácala en la estación para trabajar aquí</p>` : acts || `<p class="bay-none">Nada que hacer aquí ahora</p>`}
      ${sheet}`;
    this.actions = actions;
  }

  private actionsFor(c: ComponentStatus): Action[] {
    const slot = equipmentSlotOf(c.id);
    if (slot && this.nodriza)
      return equipmentOptions(this.nodriza, slot, MOTHERSHIP_EQUIPMENT, this.parts).map((o) => ({
        kind: "cambiar",
        label: o.label,
        detail: o.locked ? `${o.detail} · ${o.locked}` : o.detail,
        ...(o.locked ? { locked: true } : {}),
        equip: o,
      }));
    const mountId = mountIdOf(c.id);
    if (!mountId || !this.nodriza) return bayActions(c, this.chores(), this.ship.design, this.parts);
    return driveOptions(this.nodriza, mountId, ELECTRIC_THRUSTERS, this.parts).map((o) => ({
      kind: "cambiar",
      label: o.label,
      detail: o.locked ? `${o.detail} · ${o.locked}` : o.detail,
      ...(o.locked ? { locked: true } : {}),
      drive: o,
    }));
  }

  private onPanelClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (t.closest("a")) return;
    if (t.closest("[data-back]")) return this.select(null);
    const part = t.closest<HTMLElement>("[data-part]");
    if (part) return this.select(part.dataset.part as PartId);
    const act = t.closest<HTMLElement>("[data-act]");
    if (act) {
      const a = this.actions[Number(act.dataset.act)];
      if (a) this.run(a);
    }
  }

  /** Start the action's chore in the challenge sheet; its effect lands on the real ship/habitat when done. */
  run(a: Action): void {
    if (a.drive) return this.runDrive(a.drive);
    if (a.equip) return this.runEquipment(a.equip);
    if (a.locked) return this.say("No está en el hangar: fabrícala en la estación (Planos)");
    let chore: Chore | undefined;
    const fittedNow = a.slot ? installedId(this.ship.design, a.slot, TANK_PARTS) : undefined;
    const old = fittedNow ? partById(fittedNow) : undefined;
    // Taking «nothing» off puts nothing in the hangar.
    const removed = old && isEmptyPart(old) ? undefined : fittedNow;
    if (a.kind === "tarea") chore = this.chores().find((c) => c.id === a.choreId);
    else {
      const part = a.partId ? partById(a.partId) : undefined;
      if (part && a.slot) chore = swapChore(this.ship.design, a.slot, part);
    }
    if (!chore) return;
    this.openChore(chore, (status) => {
      if (status === "done" && chore.kind === "cambiar-pieza" && a.partId && this.parts) {
        const part = partById(a.partId);
        // «Nothing» (no shield, no source) is not a part: only the old one goes to the hangar.
        if (part && isEmptyPart(part)) {
          if (removed) this.parts.put(removed);
        } else this.parts.swap(a.partId, removed);
      }
      if (status === "done") this.say(chore.kind === "cambiar-pieza" ? `Pieza montada: la nave ha cambiado${this.parts && removed ? " · la vieja va al hangar" : ""}` : "Tarea hecha");
      else if (status === "failed") this.say("No salió: la pieza sigue como estaba");
    });
  }

  /** Refit one of the mothership's thruster mounts: only docked, only with parts in the hangar. */
  private runDrive(o: DriveOption): void {
    const m = this.nodriza;
    if (!m) return;
    if (o.locked) return this.say(o.locked);
    if (!this.docked()) return this.say("Atraca la nodriza en la estación para trabajar en ella");
    const chore = driveRefitChore(m, o);
    this.openChore(chore, (status) => {
      if (status === "failed") return this.say("No salió: los propulsores siguen como estaban");
      if (status !== "done") return;
      try {
        applyDriveRefit(m, o, this.parts);
      } catch {
        return this.say("Faltan piezas en el hangar: no se ha cambiado nada");
      }
      this.mothershipModel?.setThrusters(m.fitted);
      this.onDriveRefit?.();
      this.say(`Propulsores cambiados: ${m.thrustN.toLocaleString("es-ES", { maximumFractionDigits: 1 })} N en total${this.parts ? " · los viejos van al hangar" : ""}`);
    });
  }

  /** Swap the mothership's auxiliary power or radiation shield: only docked, only with the part in the hangar. */
  private runEquipment(o: EquipmentOption): void {
    const m = this.nodriza;
    if (!m) return;
    if (o.locked) return this.say(o.locked);
    if (!this.docked()) return this.say("Atraca la nodriza en la estación para trabajar en ella");
    this.openChore(equipmentRefitChore(m, o.equipment), (status) => {
      if (status === "failed") return this.say("No salió: la nodriza sigue como estaba");
      if (status !== "done") return;
      try {
        applyEquipmentRefit(m, o.equipment, this.parts);
      } catch {
        return this.say("Falta la pieza en el hangar: no se ha cambiado nada");
      }
      this.onDriveRefit?.();
      this.say(`Montado: ${o.equipment.name}${this.parts ? " · lo viejo va al hangar" : ""}`);
    });
  }

  /** Open a chore in the challenge sheet; `done` gets how it ended. */
  private openChore(chore: Chore, done: (status: "done" | "failed" | "doing") => void): void {
    const session = this.habitat.start(chore, CONTEXT);
    const run = session.run;
    this.session = session;
    const prevClose = this.duel.onClose;
    this.working = true;
    this.duel.onClose = () => {
      this.duel.onClose = prevClose;
      this.working = false;
      this.session = null;
      this.layout();
      done(run.status);
      this.panelKey = "";
      this.refresh();
    };
    this.duel.show(
      {
        get current() {
          return run.current;
        },
        get progress() {
          return run.step;
        },
        goal: run.steps,
        get lives() {
          return run.mistakesLeft;
        },
        maxLives: run.maxMistakes,
      },
      text(chore),
      (ans) => ({ ok: session.answer(ans) }),
    );
    this.layout();
  }

  /** True while a bay chore is open in the challenge sheet. */
  get busy(): boolean {
    return this.working;
  }

  private say(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + 3000;
  }
}
