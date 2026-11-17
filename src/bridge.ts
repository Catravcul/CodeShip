import * as THREE from "three";
import type { BridgeStationId } from "@modules/flight-deck/data/bridge";
import type { Alert, PanelId } from "@modules/flight-deck/application/panels";
import { bridgeHatch, buildBridge, DECK_LAYOUT, starshipHatch, type BridgeModel, type DeckShape } from "./adapters/three/interior/bridge-model";
import { STARSHIP_DECK_BASIS } from "@modules/flight-deck/data/starship-deck";
import { paintScreen, SCREEN_FONT_PX } from "./adapters/three/interior/console-screens";
import { worldScale } from "./adapters/three/interior/world-scale";
import type { CabinStation } from "@modules/lander-cabin/domain/cabin";
import type { ChoreRun } from "@modules/chores/domain/chore";
import { WalkRoom, type RoomAction } from "./walk-room";

export interface BridgeDeps {
  /** Open one console's page of the deck. */
  openPanel(id: PanelId): void;
  openMissions(): void;
  openNano(): void;
  openProbe(): void;
  /** The asteroid's mind through the parked probe: its card, its screen lines and the duel. */
  mind(): { html: string; screen: readonly string[]; action: { label: string; enabled: boolean; why?: string } };
  startMind(): void;
  /** Back to the spine of the travel ship. */
  leave(): void;
  alerts(): readonly Alert[];
  openTasks(): void;
  /** Starship's pilot seat (real deck only): fly to any destination, by hand or by challenges. */
  readonly pilot?: PilotDeps;
  /** Starship's docking seat (real deck only): dock at the station by hand or by challenges, and undock. */
  readonly dock?: DockDeps;
}

/** A destination the pilot can pick, with whether the ship can fly there now. */
export interface PilotDestination {
  readonly id: string;
  readonly name: string;
  readonly distance: string;
  readonly why?: string;
}

export interface PilotDeps {
  destinations(): readonly PilotDestination[];
  /** The destination picked now (the navigator's target). */
  current(): string | undefined;
  /** Something flies now (a trip, a docking): the seat says so instead of offering a new flight. */
  busy(): string | undefined;
  /** Why no flight can start from here now (e.g. latched to a port), if so. */
  blocked(): string | undefined;
  flyManual(id: string): { ok: boolean; reason?: string };
  flyAuto(id: string): { ok: boolean; reason?: string };
  openSystems(): void;
}

export type DockSeatState =
  | { readonly kind: "atracada"; readonly where: string }
  | { readonly kind: "espera"; readonly where: string; readonly rangeM: number }
  | { readonly kind: "maniobra"; readonly what: string; readonly manual: boolean }
  | { readonly kind: "lejos"; readonly why: string };

export interface DockDeps {
  state(): DockSeatState;
  /** The lander's belly port, one line (what the seat's screen shows; the lander docks from its own cabin). */
  lander(): string;
  undock(): { ok: boolean; reason?: string };
  dockManual(): { ok: boolean; reason?: string };
  dockAuto(): { ok: boolean; reason?: string };
  stop(): void;
  /** The docking challenge open now (for the QA journeys' answer key). */
  chore(): ChoreRun | undefined;
}

const LEVEL_COLOR: Readonly<Record<string, number>> = { warning: 0xff3b30, caution: 0xffb347, advisory: 0x7fdcff, nominal: 0x37e07a };
const PAGE: Partial<Record<BridgeStationId, PanelId>> = { nav: "nav", prop: "prop", power: "power", life: "life", dock: "dock", comms: "comms" };

/**
 * The travel ship's bridge as a room of consoles (docs/design/habitaculo.md §Puente; designer: «más consolas
 * en un habitáculo… separadas cada una en su máquina»). One console per page of the old all-in-one deck,
 * plus the probe's control station, the asteroid's mind and the nano_net. A light on each console and
 * a short list at the top say what needs attention.
 */
export class BridgeRoom extends WalkRoom<BridgeStationId> {
  private readonly model: BridgeModel;
  private readonly alertBox: HTMLElement;
  private mindKey = "";
  private alertKey = "";

  /** Which deck this is: Starship's nose (real) or the ring ship's forward node (fiction). */
  readonly shape: DeckShape;
  /** The pilot seat's destination, by id. */
  private dest: string | undefined;

  constructor(
    root: HTMLElement,
    private readonly deps: BridgeDeps,
    shipName: string,
    shape: DeckShape = "nodo",
  ) {
    const k = worldScale();
    const model = buildBridge(k, shape);
    const layout = DECK_LAYOUT[shape];
    super(root, {
      layout,
      cls: "puente",
      title: shape === "starship" ? `Cubierta de vuelo · ${shipName}` : `Puente · ${shipName}`,
      geometry: model.group,
      speedMs: 0.9,
      signs: layout.stations.map((s) => s.id),
      cameraBackM: 1.6 * k,
      scale: k,
      hatches: [{ station: "salida", ...(shape === "starship" ? starshipHatch(k) : bridgeHatch(k)) }],
      // Each sign over its machine's top.
      signY: (s) => (model.top.get(s.id) ?? s.look.y) + 0.22 * k,
    });
    this.model = model;
    this.shape = shape;
    this.ui.addEventListener("change", (e) => {
      const el = e.target as HTMLSelectElement;
      if (el.closest(".cm-dest")) this.dest = el.value;
    });
    this.alertBox = document.createElement("div");
    this.alertBox.className = "br-alerts";
    this.ui.appendChild(this.alertBox);
  }

  private get layout() {
    return this.opts.layout;
  }

  /** The pilot seat's destination: the one she picked, else the navigator's, else the first. */
  private pick(): PilotDestination | undefined {
    const list = this.deps.pilot?.destinations() ?? [];
    return list.find((d) => d.id === this.dest) ?? list.find((d) => d.id === this.deps.pilot?.current() && !d.why) ?? list.find((d) => !d.why) ?? list[0];
  }

  private pilotActions(p: PilotDeps): RoomAction[] {
    const busy = p.busy();
    const sys = { id: "sistemas", label: "Pantallas de sistemas", enabled: true };
    if (busy) return [{ id: "manual", label: "Manual", enabled: false, why: busy }, sys];
    const d = this.pick();
    const why = p.blocked() ?? d?.why;
    // The destination is picked in the card (extra); the two flying modes come first.
    return [
      { id: "manual", label: "Manual", enabled: !!d && !why, ...(why ? { why } : {}) },
      { id: "auto", label: "Automático (retos)", enabled: !!d && !d.why },
      sys,
    ];
  }

  private dockActions(d: DockDeps): RoomAction[] {
    const st = d.state();
    if (st.kind === "atracada") return [{ id: "desacoplar", label: "Desacoplar", enabled: true }];
    if (st.kind === "espera")
      return [
        { id: "acoplar-mano", label: "Acoplar a mano (cámara)", enabled: true },
        { id: "acoplar-auto", label: "Acoplar automático (retos)", enabled: true },
      ];
    if (st.kind === "maniobra") return [{ id: "parar", label: st.manual ? "Dejar el acople a mano" : "Parar la maniobra", enabled: true }];
    // Why not is the card's state line (extra).
    return [
      { id: "acoplar-mano", label: "Acoplar a mano (cámara)", enabled: false },
      { id: "acoplar-auto", label: "Acoplar automático (retos)", enabled: false },
    ];
  }

  protected actions(id: BridgeStationId): RoomAction[] {
    const page = PAGE[id];
    const label = this.layout.stations.find((s) => s.id === id)!.label;
    if (id === "prop" && this.deps.pilot) return this.pilotActions(this.deps.pilot);
    if (id === "dock" && this.deps.dock) return this.dockActions(this.deps.dock);
    if (id === "nav" && this.shape === "starship") return [{ id: "abrir", label: "Usar la mesa: mapa y trayectos", enabled: true }];
    if (page === "comms") return [{ id: "abrir", label: "Usar la consola de radio", enabled: true }, { id: "misiones", label: "Registro de misiones", enabled: true }];
    if (page) return [{ id: "abrir", label: `Usar la consola: ${label}`, enabled: true }];
    if (id === "nano") return [{ id: "abrir", label: "Estado de la nano_net", enabled: true }];
    if (id === "sonda") return [{ id: "abrir", label: "Tomar el mando de la sonda", enabled: true }];
    if (id === "mente") {
      const a = this.deps.mind().action;
      return [{ id: "mente", label: a.label, enabled: a.enabled, ...(a.why ? { why: a.why } : {}) }];
    }
    return [{ id: "salir", label: "Bajar de la cubierta de vuelo", enabled: true }];
  }

  protected act(id: BridgeStationId, action: string): void {
    const page = PAGE[id];
    const p = this.deps.pilot;
    if (id === "prop" && p) {
      const d = this.pick();
      if (action === "destino") {
        const list = p.destinations();
        const i = list.findIndex((x) => x.id === d?.id);
        this.dest = list[(i + 1) % list.length]?.id;
        return;
      }
      if (action === "sistemas") return p.openSystems();
      if (!d) return;
      const r = action === "manual" ? p.flyManual(d.id) : action === "auto" ? p.flyAuto(d.id) : { ok: true };
      if (!r.ok && r.reason) this.say(r.reason, 6);
      return;
    }
    const dk = this.deps.dock;
    if (id === "dock" && dk) {
      const r = action === "desacoplar" ? dk.undock() : action === "acoplar-mano" ? dk.dockManual() : action === "acoplar-auto" ? dk.dockAuto() : (dk.stop(), { ok: true });
      if (!r.ok && r.reason) this.say(r.reason, 6);
      return;
    }
    if (action === "misiones") return this.deps.openMissions();
    if (page) return this.deps.openPanel(page);
    if (id === "nano") return this.deps.openNano();
    if (id === "sonda") return this.deps.openProbe();
    if (id === "mente") return this.deps.startMind();
    // Down through the aft hatch: it opens, then the decks below come in.
    this.passHatch("salida", () => this.deps.leave());
  }

  protected openTasks(): void {
    this.deps.openTasks();
  }

  protected override extra(id: BridgeStationId): string {
    if (id === "mente") return `<div class="cm-mind">${this.deps.mind().html}</div>`;
    const basis = this.shape === "starship" ? STARSHIP_DECK_BASIS[id] : undefined;
    const tag = basis ? `<p class="cm-basis">${basis.tag === "ficción" ? "Ficción" : basis.tag === "nuestra" ? "Distribución nuestra" : basis.tag === "real" ? "Real" : "En desarrollo"}: ${basis.note}</p>` : "";
    if (id === "prop" && this.deps.pilot && !this.deps.pilot.busy()) {
      const d = this.pick();
      // The destination: a picker of every place the Starship can fly to (the station first), with its distance.
      const list = this.deps.pilot.destinations();
      const opts = list.map((x) => `<option value="${x.id}" ${x.id === d?.id ? "selected" : ""}>${x.name} · ${x.distance}${x.why ? " (no)" : ""}</option>`).join("");
      return d ? `<label class="cm-dest">Destino <select aria-label="Destino del vuelo">${opts}</select></label>${tag}` : tag;
    }
    if (id === "dock" && this.deps.dock) {
      const st = this.deps.dock.state();
      const line = st.kind === "atracada" ? `Atracada en ${st.where}` : st.kind === "espera" ? `En el punto de espera de ${st.where}, a ${Math.round(st.rangeM)} m del puerto` : st.kind === "maniobra" ? st.what : st.why;
      return `<p class="cm-state">${line}</p><p class="cm-state">${this.deps.dock.lander()}</p>${tag}`;
    }
    return tag;
  }

  /** The docking challenge open now, if any (Starship's docking seat). */
  get dockChore(): ChoreRun | undefined {
    return this.deps.dock?.chore();
  }

  /** Walk to a console and use it (the task list's «Ir»). */
  useConsole(id: BridgeStationId, action = "abrir", then?: () => void): void {
    this.goTo(id, () => {
      this.act(id, action);
      then?.();
    });
  }

  /** Look at the machine's main screen (the plot table's glass, the pilot's middle screen). */
  protected override aim(s: CabinStation<BridgeStationId>): { x: number; y: number; z: number } {
    return this.model.aim.get(s.id) ?? super.aim(s);
  }

  /** For the scale study: each console's main screen and its text on screen, and the small controls. */
  protected override measureExtra(px: (v: THREE.Vector3) => { x: number; y: number; z: number }): unknown {
    const screens: Record<string, { w: number; h: number; titlePx: number; bodyPx: number }> = {};
    for (const sc of this.model.screens) {
      if (!sc.main) continue;
      const c = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([a, b]) => px(new THREE.Vector3((a! * sc.w) / 2, (b! * sc.h) / 2, 0).applyMatrix4(sc.matrix)));
      if (c.some((p) => p.z > 1)) continue;
      const w = Math.max(...c.map((p) => p.x)) - Math.min(...c.map((p) => p.x));
      const h = Math.max(...c.map((p) => p.y)) - Math.min(...c.map((p) => p.y));
      // Cap height ≈ 0,72 of the font size; the screen's height on the phone over its atlas pixels.
      const per = Math.hypot(c[3]!.x - c[0]!.x, c[3]!.y - c[0]!.y) / sc.pxTall;
      screens[sc.station] = { w: Math.round(w), h: Math.round(h), titlePx: +(SCREEN_FONT_PX.title * 0.72 * per).toFixed(1), bodyPx: +(SCREEN_FONT_PX.body * 0.72 * per).toFixed(1) };
    }
    const near = this.near();
    const controls = this.model.controls
      .filter((c) => c.station === near)
      .map((c) => {
        const a = px(c.at);
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const b = px(c.at.clone().addScaledVector(right, c.size));
        return { what: c.what, px: +Math.hypot(b.x - a.x, b.y - a.y).toFixed(1), dist: +this.camera.position.distanceTo(c.at).toFixed(2) };
      });
    const eye = this.camera.position;
    const main = this.model.screens.find((s) => s.station === near && s.main);
    let eyeToScreen: number | undefined;
    let offNormalDeg: number | undefined;
    if (main) {
      const centre = new THREE.Vector3().applyMatrix4(main.matrix);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(main.matrix);
      eyeToScreen = +eye.distanceTo(centre).toFixed(2);
      offNormalDeg = Math.round(THREE.MathUtils.radToDeg(normal.angleTo(eye.clone().sub(centre))));
    }
    return { scale: this.k, screens, controls, eyeToScreen, offNormalDeg };
  }

  /** The deck pages a console's screens show: on Starship the pilot's touchscreens page through propulsion, power and life. */
  private pagesOf(id: BridgeStationId): readonly PanelId[] {
    if (this.shape === "starship" && id === "prop") return ["prop", "power", "life"];
    const p = PAGE[id];
    return p ? [p] : [];
  }

  protected override tick(): void {
    // The dollhouse camera looks over an end wall it is outside of: that wall goes, as a whole.
    // In first person (the camera inside, under the ceiling) both stay.
    const z = this.camera.position.z;
    const f = this.layout.floor;
    const L = (f.maxZ - f.minZ) * this.k;
    const outside = this.camera.position.y > this.layout.heightM * this.k;
    this.model.ends.bow.visible = !outside || z > -L / 4;
    this.model.ends.aft.visible = !outside || z < L / 4;
    const mind = this.deps.mind();
    const alerts = this.deps.alerts();
    const key = mind.screen.join("|") + "#" + alerts.map((a) => a.level + a.panel + a.text).join("|");
    if (key === this.mindKey) return;
    this.mindKey = key;
    // Screens: each console's page shape, with its worst alert (or the mind's lines) at the bottom.
    const ctx = this.model.atlas.ctx;
    for (const sc of this.model.screens) {
      const pages = this.pagesOf(sc.station);
      const lines = sc.station === "mente" ? mind.screen.slice(0, 3) : alerts.filter((a) => pages.includes(a.panel)).map((a) => (a.level === "warning" || a.level === "caution" ? "!" : "") + a.text);
      paintScreen(ctx, sc.rect, sc.kind, sc.title, lines);
    }
    this.model.atlas.refresh();
    const akey = alerts.map((a) => a.level + a.panel + a.text).join("|");
    if (akey === this.alertKey) return;
    this.alertKey = akey;
    const color = new THREE.Color();
    for (const [id, i] of this.model.lampIndex) {
      const pages = this.pagesOf(id);
      const level = alerts.find((a) => pages.includes(a.panel))?.level ?? "nominal";
      this.model.lamps.setColorAt(i, color.setHex(LEVEL_COLOR[level] ?? 0x37e07a));
    }
    this.model.lamps.instanceColor!.needsUpdate = true;
    const label = (p: PanelId) => this.layout.stations.find((s) => s.id === p)?.label ?? (p === "life" ? "Vida y hábitat" : p === "power" ? "Energía y calor" : p);
    this.alertBox.innerHTML = alerts.length ? alerts.slice(0, 3).map((a) => `<div class="br-alert ${a.level}">${a.level === "warning" ? "⚠" : "●"} ${label(a.panel)}: ${a.text}</div>`).join("") : "";
  }
}
