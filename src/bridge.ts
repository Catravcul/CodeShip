import * as THREE from "three";
import { BRIDGE, type BridgeStationId } from "@modules/flight-deck/data/bridge";
import type { Alert, PanelId } from "@modules/flight-deck/application/panels";
import { drawScreen } from "./adapters/three/interior/room";
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

/** The forward node: deck, curved walls as panels, the bow window and one desk per console. */
function bridgeGeometry(): { group: THREE.Group; screens: Map<BridgeStationId, THREE.Mesh>; lamps: Map<BridgeStationId, THREE.Mesh>; ends: { bow: THREE.Object3D; aft: THREE.Object3D } } {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xd9dcd6, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.5 });
  const desk = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.8, metalness: 0.2 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  const W = 4.0;
  const L = 4.2;
  const H = BRIDGE.heightM;
  box(W, 0.05, L, new THREE.MeshStandardMaterial({ color: 0x3a414b, roughness: 0.7 }), 0, -0.025, 0.05);
  box(W, 0.05, L, wall, 0, H, 0.05);
  for (const sx of [-1, 1]) box(0.05, H, L, wall, (sx * W) / 2, H / 2, 0.05);
  const aft = box(W, H, 0.05, wall, 0, H / 2, 2.15);
  // Bow: a wall with a wide window onto the stars (the real view is the bridge's NAV page and the probe's camera).
  // The bow goes as a whole under the dollhouse cutaway: wall strips, the window and its stars.
  const bow = new THREE.Group();
  g.add(bow);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, H - 1.2), new THREE.MeshBasicMaterial({ color: 0x02040a, side: THREE.DoubleSide }));
  sky.position.set(0, 0.7 + (H - 1.2) / 2, -2.1);
  bow.add(sky);
  for (const [h, y] of [
    [0.7, 0.35],
    [0.5, H - 0.25],
  ] as const) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(W, h, 0.05), wall);
    strip.position.set(0, y, -2.05);
    strip.userData.cutWith = bow;
    bow.add(strip);
  }
  sky.userData.cutWith = bow;
  const stars = new THREE.BufferGeometry();
  const pts: number[] = [];
  // In the sky's own frame, so the cutaway hides them with the window.
  for (let i = 0; i < 160; i++) pts.push((Math.random() - 0.5) * 3.8, (Math.random() - 0.5) * (H - 1.3), 0.01);
  stars.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  sky.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 0.015 })));
  // Hatch to the spine, aft.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 28), dark);
  // On the aft wall, so the dollhouse cutaway hides both together.
  ring.position.set(0, 1.1 - H / 2, -0.05);
  aft.add(ring);
  // Handrails along the walls (zero g).
  for (const sx of [-1, 1]) box(0.03, 0.03, 3.6, new THREE.MeshStandardMaterial({ color: 0xf2c230 }), sx * 1.92, 1.6, 0);
  const screens = new Map<BridgeStationId, THREE.Mesh>();
  const lamps = new Map<BridgeStationId, THREE.Mesh>();
  for (const s of BRIDGE.stations) {
    if (s.id === "salida") continue;
    const dir = new THREE.Vector2(s.look.x - s.stand.x, s.look.z - s.stand.z).normalize();
    const yaw = Math.atan2(-dir.x, -dir.y);
    const d = box(0.7, 0.75, 0.4, desk, s.look.x - dir.x * 0.1, 0.375, s.look.z - dir.y * 0.1);
    d.rotation.y = yaw;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    scr.position.set(s.look.x - dir.x * 0.14, 1.05, s.look.z - dir.y * 0.14);
    scr.rotation.y = yaw;
    scr.rotateX(-0.25);
    g.add(scr);
    screens.set(s.id, scr);
    drawScreen(scr, s.label, [s.what], { w: 512, h: 330 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: 0x37e07a, emissive: 0x37e07a }));
    lamp.position.set(s.look.x - dir.x * 0.14, 1.32, s.look.z - dir.y * 0.14);
    g.add(lamp);
    lamps.set(s.id, lamp);
  }
  const light = new THREE.PointLight(0xdfefff, 10, 8, 1);
  light.position.set(0, H - 0.3, 0);
  g.add(light, new THREE.AmbientLight(0xb8c8d8, 1.0));
  return { group: g, screens, lamps, ends: { bow, aft } };
}

/**
 * The travel ship's bridge as a room of consoles (docs/design/habitaculo.md §Puente; designer: «más consolas
 * en un habitáculo… separadas cada una en su máquina»). One console per page of the old all-in-one deck,
 * plus the probe's control station, the asteroid's mind and the nano_net. A light on each console and
 * a short list at the top say what needs attention.
 */
export class BridgeRoom extends WalkRoom<BridgeStationId> {
  private readonly screens: Map<BridgeStationId, THREE.Mesh>;
  private readonly lamps: Map<BridgeStationId, THREE.Mesh>;
  private readonly ends: { bow: THREE.Object3D; aft: THREE.Object3D };
  private readonly alertBox: HTMLElement;
  private mindKey = "";
  private alertKey = "";

  constructor(
    root: HTMLElement,
    private readonly deps: BridgeDeps,
    shipName: string,
  ) {
    const g = bridgeGeometry();
    super(root, { layout: BRIDGE, cls: "puente", title: `Puente · ${shipName}`, geometry: g.group, speedMs: 0.9, signs: ["nav", "prop", "power", "life", "dock", "sonda", "mente", "comms", "nano", "salida"], cameraBackM: 1.6 });
    this.screens = g.screens;
    this.lamps = g.lamps;
    this.ends = g.ends;
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

  protected override tick(): void {
    // The dollhouse camera looks over an end wall it is outside of: that wall goes, as a whole.
    const z = this.camera.position.z;
    this.ends.bow.visible = z > -2.0;
    this.ends.aft.visible = z < 2.1;
    const mind = this.deps.mind();
    const key = mind.screen.join("|");
    if (key !== this.mindKey) {
      this.mindKey = key;
      drawScreen(this.screens.get("mente")!, "Mente del asteroide", mind.screen, { w: 512, h: 330 });
    }
    const alerts = this.deps.alerts();
    const akey = alerts.map((a) => a.level + a.panel + a.text).join("|");
    if (akey === this.alertKey) return;
    this.alertKey = akey;
    for (const [id, lamp] of this.lamps) {
      const page = PAGE[id];
      const level = page ? (alerts.find((a) => a.panel === page)?.level ?? "nominal") : "nominal";
      const m = lamp.material as THREE.MeshStandardMaterial;
      m.color.setHex(LEVEL_COLOR[level] ?? 0x37e07a);
      m.emissive.setHex(LEVEL_COLOR[level] ?? 0x37e07a);
    }
    const label = (p: PanelId) => BRIDGE.stations.find((s) => s.id === p)?.label ?? p;
    this.alertBox.innerHTML = alerts.length ? alerts.slice(0, 3).map((a) => `<div class="br-alert ${a.level}">${a.level === "warning" ? "⚠" : "●"} ${label(a.panel)}: ${a.text}</div>`).join("") : "";
  }
}
