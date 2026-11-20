import * as THREE from "three";
import type { CubeFigure } from "./interior/figure";
import type { FreeWalk } from "@modules/aerial-sanctuary/application/free-walk";
import type { Body } from "@modules/aerial-sanctuary/domain/walk";

/**
 * How walking on Earth looks, the same in every level with gravity (sanctuaries 1 and 3; the moves are
 * aerial-sanctuary/application/free-walk.ts): her body's pose for each move and the view under water.
 */

/** Her pose this frame: seated in lotus, swimming, falling, landing, jumping, sprinting or walking. */
export function poseOnFoot(avatar: CubeFigure, walk: FreeWalk, o: { body: Body; moving: boolean; sprinting: boolean; lotus: boolean; clock: number }, dt: number): void {
  const j = walk.jump;
  if (o.lotus) avatar.pose("lotus");
  else if (o.body.motion === "agua") avatar.swim(o.moving ? walk.stride : o.clock * 2.5, o.moving);
  else if (walk.falling) avatar.pose("reach");
  else if (walk.landing) avatar.jump("amortiguar");
  else if (j) avatar.jump(j.stage);
  else if (o.sprinting) avatar.run(walk.stride);
  else avatar.walk(walk.stride, o.moving ? 1 : 0);
  // Fast easing while running, jumping, falling or swimming, so a 4,5-steps-a-second stride and a 0,6 s jump show whole.
  avatar.update(dt, j || o.sprinting || walk.falling || walk.landing || o.body.motion === "agua" ? 16 : 3);
}

/**
 * Under water (Berón: «bajo el agua parece que se ve todo blanco»): the sea blue-green, its far side fading out in
 * ~35 m; a tree-building's water (Berón 2026-11-20: «la visión es muy oscura y borrosa que dificulta ver los túneles»)
 * clear and light, filtered fresh water behind acrylic (ours), so its branches and rings show 150 m away.
 */
const UNDER = { mar: { color: 0x0e4f63, near: 0.5, far: 35 }, claro: { color: 0x5fb4c9, near: 12, far: 150 } } as const;
export type UnderwaterKind = keyof typeof UNDER;
export class UnderwaterView {
  private on: UnderwaterKind | false = false;
  private readonly sky: { color: number; near: number; far: number; bg: number };

  constructor(private readonly scene: THREE.Scene) {
    const fog = scene.fog as THREE.Fog;
    this.sky = { color: fog.color.getHex(), near: fog.near, far: fog.far, bg: (scene.background as THREE.Color).getHex() };
  }

  /** The camera is under water now, the sea's (`true`, "mar") or clear water ("claro"), or not. */
  set(on: boolean | UnderwaterKind): void {
    const k: UnderwaterKind | false = on === true ? "mar" : on;
    if (k === this.on) return;
    this.on = k;
    const fog = this.scene.fog as THREE.Fog;
    const u = k ? UNDER[k] : { color: this.sky.color, near: this.sky.near, far: this.sky.far };
    fog.color.set(u.color);
    fog.near = u.near;
    fog.far = u.far;
    (this.scene.background as THREE.Color).set(k ? u.color : this.sky.bg);
  }
}
