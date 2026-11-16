import * as THREE from "three";
import { cabinActions, type CabinActionId, type CabinState, type CabinStationId } from "@modules/lander-cabin/domain/cabin";
import { CABIN_DEPARTURE, LANDER_CABIN } from "@modules/lander-cabin/data/cabin";
import { buildCockpit } from "./adapters/three/cockpit";
import { drawScreen } from "./adapters/three/interior/room";
import { WalkRoom, type RoomAction } from "./walk-room";
import { scaleLights, worldScale } from "./adapters/three/interior/world-scale";

/** Height of the cockpit model's floor under the pilot's eye, m (adapters/three/cockpit.ts). */
const FLOOR_Y = -0.8;

export interface CabinDeps {
  state(): CabinState;
  act(id: CabinActionId): void;
  /** The asteroid's mind console: phase, trust and levels (HTML for its card, lines for its 3D screen). */
  mind(): { html: string; screen: readonly string[] };
  openTasks(): void;
}

/**
 * The capsule of adapters/three/cockpit.ts, lengthened aft (CABIN_DEPARTURE), with the floor at y = 0, plus
 * the mind console's screen and the mat; drawn `k` times bigger on the floor plan (src/core/scale.ts). Heights
 * stay real, and so do the seats and her hand controllers (`userData.body`), the mat she sits on and the
 * capsule's small labels (in a cabin this tight a bigger plate fills the view).
 */
function cabinGeometry(k: number): { group: THREE.Group; mindScreen: THREE.Mesh } {
  const group = new THREE.Group();
  const shell = buildCockpit({ aftM: CABIN_DEPARTURE.aftM, dockHatchZ: 2.6, evaHatchZ: 1.65 });
  shell.position.y = -FLOOR_Y;
  const plan = new THREE.Group();
  plan.scale.set(k, 1, k);
  plan.add(shell);
  group.add(plan);
  // Under a (k, 1, k) plan a group turned only about y keeps its shape: undo the stretch where her body goes.
  shell.traverse((o) => {
    if (o.userData.body) o.scale.set(1 / k, 1, 1 / k);
    if ((o as THREE.Sprite).isSprite) o.scale.x /= k;
  });
  // The asteroid's mind console: a screen on the starboard end of the console (a machine screen: k bigger).
  const mindScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mindScreen.position.set(0.86 * k, 0.72, -0.7 * k);
  mindScreen.rotation.set(-0.5, -0.35, 0);
  mindScreen.scale.setScalar(k);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.03), new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.5, roughness: 0.6 }));
  frame.position.copy(mindScreen.position).add(new THREE.Vector3(0.006, -0.005, -0.017).multiplyScalar(k));
  frame.rotation.copy(mindScreen.rotation);
  frame.scale.setScalar(k);
  // The yoga mat, rolled half open on the floor between the crew seat and the EVA hatch (real size: she sits on it).
  const purple = new THREE.MeshStandardMaterial({ color: 0x7a4fb0, roughness: 0.95 });
  const matAt = LANDER_CABIN.stations.find((s) => s.id === "esterilla")!.look;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.6), purple);
  mat.position.set(matAt.x * k, 0.006, matAt.z * k);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 12), purple);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(matAt.x * k, 0.045, matAt.z * k + 0.32);
  const lamp = new THREE.PointLight(0xdfefff, 6, 5, 1);
  lamp.position.set(0, 1.55, 0.3 * k);
  const fill = new THREE.PointLight(0x9fd8ff, 2.5, 4, 1);
  fill.position.set(0, 1.2, -0.4 * k);
  const aft = new THREE.PointLight(0xdfefff, 4, 4, 1);
  aft.position.set(0, 1.55, 2.0 * k);
  group.add(mindScreen, frame, mat, roll, lamp, fill, aft, new THREE.AmbientLight(0xb8c8d8, 1.1));
  scaleLights(group, k);
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
    const k = worldScale();
    const g = cabinGeometry(k);
    super(root, {
      layout: LANDER_CABIN,
      cls: "cab",
      title: "Habitáculo del módulo",
      geometry: g.group,
      speedMs: 0.55,
      signs: ["asiento", "mente", "esterilla", "acople"],
      scale: k,
      // Under the roof, which stays at body height (1,7 m).
      signY: (s) => Math.min(LANDER_CABIN.heightM - 0.12, s.look.y + 0.28),
    });
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
