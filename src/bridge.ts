import * as THREE from "three";
import { BRIDGE, type BridgeStationId } from "@modules/flight-deck/data/bridge";
import type { Alert, PanelId } from "@modules/flight-deck/application/panels";
import { buildBridge, type BridgeModel } from "./adapters/three/interior/bridge-model";
import { paintScreen, SCREEN_FONT_PX } from "./adapters/three/interior/console-screens";
import { worldScale } from "./adapters/three/interior/world-scale";
import type { CabinStation } from "@modules/lander-cabin/domain/cabin";
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

  constructor(
    root: HTMLElement,
    private readonly deps: BridgeDeps,
    shipName: string,
  ) {
    const k = worldScale();
    const model = buildBridge(k);
    super(root, {
      layout: BRIDGE,
      cls: "puente",
      title: `Puente · ${shipName}`,
      geometry: model.group,
      speedMs: 0.9,
      signs: ["nav", "prop", "power", "life", "dock", "sonda", "mente", "comms", "nano", "salida"],
      cameraBackM: 1.6 * k,
      scale: k,
      // Each sign over its machine's top.
      signY: (s) => (model.top.get(s.id) ?? s.look.y) + 0.22 * k,
    });
    this.model = model;
    this.alertBox = document.createElement("div");
    this.alertBox.className = "br-alerts";
    this.ui.appendChild(this.alertBox);
  }

  protected actions(id: BridgeStationId): RoomAction[] {
    const page = PAGE[id];
    const label = BRIDGE.stations.find((s) => s.id === id)!.label;
    if (page === "comms") return [{ id: "abrir", label: "Usar la consola de radio", enabled: true }, { id: "misiones", label: "Registro de misiones", enabled: true }];
    if (page) return [{ id: "abrir", label: `Usar la consola: ${label}`, enabled: true }];
    if (id === "nano") return [{ id: "abrir", label: "Estado de la nano_net", enabled: true }];
    if (id === "sonda") return [{ id: "abrir", label: "Tomar el mando de la sonda", enabled: true }];
    if (id === "mente") {
      const a = this.deps.mind().action;
      return [{ id: "mente", label: a.label, enabled: a.enabled, ...(a.why ? { why: a.why } : {}) }];
    }
    return [{ id: "salir", label: "Volver a la espina", enabled: true }];
  }

  protected act(id: BridgeStationId, action: string): void {
    const page = PAGE[id];
    if (action === "misiones") return this.deps.openMissions();
    if (page) return this.deps.openPanel(page);
    if (id === "nano") return this.deps.openNano();
    if (id === "sonda") return this.deps.openProbe();
    if (id === "mente") return this.deps.startMind();
    this.deps.leave();
  }

  protected openTasks(): void {
    this.deps.openTasks();
  }

  protected override extra(id: BridgeStationId): string {
    return id === "mente" ? `<div class="cm-mind">${this.deps.mind().html}</div>` : "";
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
      if (screens[sc.station]) continue;
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
    const main = this.model.screens.find((s) => s.station === near);
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

  protected override tick(): void {
    // The dollhouse camera looks over an end wall it is outside of: that wall goes, as a whole.
    const z = this.camera.position.z;
    const L = 8 * this.k;
    this.model.ends.bow.visible = z > -L / 4;
    this.model.ends.aft.visible = z < L / 4;
    const mind = this.deps.mind();
    const alerts = this.deps.alerts();
    const key = mind.screen.join("|") + "#" + alerts.map((a) => a.level + a.panel + a.text).join("|");
    if (key === this.mindKey) return;
    this.mindKey = key;
    // Screens: each console's page shape, with its worst alert (or the mind's lines) at the bottom.
    const ctx = this.model.atlas.ctx;
    for (const sc of this.model.screens) {
      const page = PAGE[sc.station];
      const lines = sc.station === "mente" ? mind.screen.slice(0, 3) : page ? alerts.filter((a) => a.panel === page).map((a) => (a.level === "warning" || a.level === "caution" ? "!" : "") + a.text) : [];
      paintScreen(ctx, sc.rect, sc.kind, sc.title, lines);
    }
    this.model.atlas.refresh();
    const akey = alerts.map((a) => a.level + a.panel + a.text).join("|");
    if (akey === this.alertKey) return;
    this.alertKey = akey;
    const color = new THREE.Color();
    for (const [id, i] of this.model.lampIndex) {
      const page = PAGE[id];
      const level = page ? (alerts.find((a) => a.panel === page)?.level ?? "nominal") : "nominal";
      this.model.lamps.setColorAt(i, color.setHex(LEVEL_COLOR[level] ?? 0x37e07a));
    }
    this.model.lamps.instanceColor!.needsUpdate = true;
    const label = (p: PanelId) => BRIDGE.stations.find((s) => s.id === p)?.label ?? p;
    this.alertBox.innerHTML = alerts.length ? alerts.slice(0, 3).map((a) => `<div class="br-alert ${a.level}">${a.level === "warning" ? "⚠" : "●"} ${label(a.panel)}: ${a.text}</div>`).join("") : "";
  }
}
