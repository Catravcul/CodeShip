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

/** Under water (Berón: «bajo el agua parece que se ve todo blanco»): blue-green, and the far side fades out in ~35 m. */
const UNDER = 0x0e4f63;
export class UnderwaterView {
  private on = false;
  private readonly sky: { color: number; near: number; far: number; bg: number };

  constructor(private readonly scene: THREE.Scene) {
    const fog = scene.fog as THREE.Fog;
    this.sky = { color: fog.color.getHex(), near: fog.near, far: fog.far, bg: (scene.background as THREE.Color).getHex() };
  }

  /** The camera is under water (or not) now. */
  set(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(on ? UNDER : this.sky.color);
    fog.near = on ? 0.5 : this.sky.near;
    fog.far = on ? 35 : this.sky.far;
    (this.scene.background as THREE.Color).set(on ? UNDER : this.sky.bg);
  }
}
