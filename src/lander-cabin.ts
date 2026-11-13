import * as THREE from "three";
import { cabinActions, type CabinActionId, type CabinState, type CabinStationId } from "@modules/lander-cabin/domain/cabin";
import { LANDER_CABIN } from "@modules/lander-cabin/data/cabin";
import { buildCockpit } from "./adapters/three/cockpit";
import { drawScreen } from "./adapters/three/interior/room";
import { WalkRoom, type RoomAction } from "./walk-room";

/** Height of the cockpit model's floor under the pilot's eye, m (adapters/three/cockpit.ts). */
const FLOOR_Y = -0.8;

export interface CabinDeps {
  state(): CabinState;
  act(id: CabinActionId): void;
  /** The asteroid's mind console: phase, trust and levels (HTML for its card, lines for its 3D screen). */
  mind(): { html: string; screen: readonly string[] };
  openTasks(): void;
}

/** The capsule of adapters/three/cockpit.ts with the floor at y = 0, plus the mind console's screen and the mat. */
function cabinGeometry(): { group: THREE.Group; mindScreen: THREE.Mesh } {
  const group = new THREE.Group();
  const shell = buildCockpit();
  shell.position.y = -FLOOR_Y;
  group.add(shell);
  // The asteroid's mind console: a screen on the starboard end of the console.
  const mindScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mindScreen.position.set(0.86, 0.72, -0.7);
  mindScreen.rotation.set(-0.5, -0.35, 0);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.03), new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.5, roughness: 0.6 }));
  frame.position.copy(mindScreen.position).add(new THREE.Vector3(0.006, -0.005, -0.017));
  frame.rotation.copy(mindScreen.rotation);
  // The yoga mat, rolled half open behind the crew seat (the floor is tight).
  const purple = new THREE.MeshStandardMaterial({ color: 0x7a4fb0, roughness: 0.95 });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.3), purple);
  mat.position.set(0.45, 0.006, 0.84);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12), purple);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(0.7, 0.045, 0.84);
  const lamp = new THREE.PointLight(0xdfefff, 6, 5, 1);
  lamp.position.set(0, 1.55, 0.3);
  const fill = new THREE.PointLight(0x9fd8ff, 2.5, 4, 1);
  fill.position.set(0, 1.2, -0.4);
  group.add(mindScreen, frame, mat, roll, lamp, fill, new THREE.AmbientLight(0xb8c8d8, 1.1));
  return { group, mindScreen };
}

/**
 * The lander's crew cabin as a walkable place (docs/design/habitaculo.md): the same capsule the pilot
 * sees from the seat, with Doménica in it. Its machines replace HUD buttons: the pilot seat (fly), the
 * docking console under the roof hatch (undock, docking assist, into the vehicle it is docked to), the
 * asteroid's mind console (phase, trust, the duel), the EVA hatch (suit up and out) and a yoga mat
 * (sit in lotus: general settings).
 */
export class LanderCabin extends WalkRoom<CabinStationId> {
  private readonly mindScreen: THREE.Mesh;
  private mindKey = "";

  constructor(
    root: HTMLElement,
    private readonly deps: CabinDeps,
  ) {
    const g = cabinGeometry();
    super(root, { layout: LANDER_CABIN, cls: "cab", title: "Habitáculo del módulo", geometry: g.group, speedMs: 0.55, signs: ["asiento", "mente", "esterilla", "acople"] });
    this.mindScreen = g.mindScreen;
    drawScreen(this.mindScreen, "Mente", ["sin asteroide cerca"], { w: 512, h: 330 });
  }

  protected actions(id: CabinStationId): RoomAction[] {
    return cabinActions(id, this.deps.state());
  }

  protected act(_id: CabinStationId, action: string): void {
    this.deps.act(action as CabinActionId);
  }

  protected openTasks(): void {
    this.deps.openTasks();
  }

  protected override extra(id: CabinStationId): string {
    return id === "mente" ? `<div class="cm-mind">${this.deps.mind().html}</div>` : "";
  }

  protected override onKey(e: KeyboardEvent): void {
    if (e.code === "KeyH") this.goTo("asiento", () => this.deps.act("pilotar"));
  }

  protected override tick(): void {
    const lines = this.deps.mind().screen;
    const key = lines.join("|");
    if (key === this.mindKey) return;
    this.mindKey = key;
    drawScreen(this.mindScreen, "Mente del asteroide", lines, { w: 512, h: 330 });
  }

  /** At the mat: sit in lotus (the settings open over her). */
  sitLotus(): void {
    const mat = LANDER_CABIN.stations.find((s) => s.id === "esterilla")!;
    this.pos = { ...mat.stand };
    // Facing the console, so the camera at the front sees her.
    this.yaw = 0;
    this.seated = true;
  }

  standUp(): void {
    this.seated = false;
  }
}
