import * as THREE from "three";
import { cabinActions, type CabinActionId, type CabinState, type CabinStationId } from "@modules/lander-cabin/domain/cabin";
import { CABIN_SPREAD, LANDER_CABIN } from "@modules/lander-cabin/data/cabin";
import { buildLmCabin, lmDockingHatch } from "./adapters/three/lm-cabin";
import { drawScreen } from "./adapters/three/interior/room";
import { WalkRoom, type RoomAction } from "./walk-room";
import { scaleLights, worldScale } from "./adapters/three/interior/world-scale";

export interface CabinDeps {
  state(): CabinState;
  act(id: CabinActionId): void;
  /** The asteroid's mind console: phase, trust and levels (HTML for its card, lines for its 3D screen). */
  mind(): { html: string; screen: readonly string[] };
  /** The LM's ECS panel: O₂, water, LiOH and CO₂ (HTML for its card, lines for its 3D screen). */
  ecs?(): { html: string; screen: readonly string[] };
  openTasks(): void;
}

/**
 * The lander's crew cabin as a walkable place (docs/design/habitaculo.md): the Apollo LM's cabin
 * (adapters/three/lm-cabin.ts), with Doménica in it. Its machines replace HUD buttons: the commander's
 * station (fly), the overhead docking hatch (undock, docking assist, into the vehicle it is docked to),
 * the asteroid's mind console (phase, trust, the duel), the forward hatch (suit up and out), the ECS
 * panel (LiOH cartridges, O₂ and water) and a yoga mat (sit in lotus: general settings).
 */
export class LanderCabin extends WalkRoom<CabinStationId> {
  private readonly mindScreen: THREE.Mesh;
  private readonly ecsScreen: THREE.Mesh;
  private mindKey = "";
  private ecsKey = "";

  constructor(
    root: HTMLElement,
    private readonly deps: CabinDeps,
  ) {
    const k = worldScale();
    const g = buildLmCabin(LANDER_CABIN, k, CABIN_SPREAD);
    scaleLights(g.group, k);
    super(root, {
      layout: LANDER_CABIN,
      cls: "cab",
      title: "Habitáculo del módulo",
      geometry: g.group,
      speedMs: 0.55,
      signs: ["asiento", "mente", "ecs", "esterilla", "acople"],
      hatches: [{ station: "acople", ...lmDockingHatch(LANDER_CABIN, k) }],
      scale: k,
      // Under the roof (2,34 m).
      signY: (s) => Math.min(LANDER_CABIN.heightM - 0.12, s.look.y + 0.28),
    });
    this.mindScreen = g.mindScreen;
    this.ecsScreen = g.ecsScreen;
    drawScreen(this.mindScreen, "Mente", ["sin asteroide cerca"], { w: 512, h: 330 });
    drawScreen(this.ecsScreen, "ECS", ["…"], { w: 512, h: 340 });
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
    if (id === "mente") return `<div class="cm-mind">${this.deps.mind().html}</div>`;
    if (id === "ecs" && this.deps.ecs) return `<div class="cm-ecs">${this.deps.ecs().html}</div>`;
    return "";
  }

  protected override onKey(e: KeyboardEvent): void {
    if (e.code === "KeyH") this.goTo("asiento", () => this.deps.act("pilotar"));
  }

  protected override tick(): void {
    this.tickEcs();
    const lines = this.deps.mind().screen;
    const key = lines.join("|");
    if (key === this.mindKey) return;
    this.mindKey = key;
    drawScreen(this.mindScreen, "Mente del asteroide", lines, { w: 512, h: 330 });
  }

  private tickEcs(): void {
    if (!this.deps.ecs) return;
    const lines = this.deps.ecs().screen;
    const key = lines.join("|");
    if (key === this.ecsKey) return;
    this.ecsKey = key;
    drawScreen(this.ecsScreen, "ECS del módulo", lines, { w: 512, h: 340 });
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
