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
 * clear, filtered fresh water behind acrylic (ours), so its branches and rings show far away; and its sky still shows
 * through it (Berón 2026-11-22: «cuando entro a nadar y veo el cielo parece que fuera oscuro… en la realidad creo que
 * es más transparente, dejando ver el exterior»): the background stays the sky and the fog is the sky tinted a little.
 */
const UNDER = { mar: { color: 0x0e4f63, near: 0.5, far: 35, tint: 1 }, claro: { color: 0x8fd3e6, near: 40, far: 700, tint: 0.3 } } as const;
/**
 * Natural water by depth (Berón 2026-11-22: «la luz llega de la superficie y mientras más profundo vaya será más oscuro…
 * si miro hacia el cielo bajo el mar conforme a la profundidad puedo ver más o menos detalles de lo que hace fuera»):
 * near the surface light and clear, the sky still seen through it; deeper, darker and closer, the sky fading out. The
 * sea's, and the globe's a deeper blue (a great body of water). Its colour near the surface and deep, and its depth (m)
 * of full darkness. Ours, cheap: the fog's colour and reach and the background, nothing more per frame.
 */
const DEEP = { oceano: { shallow: 0x2e8ea6, deep: 0x02131c, dark: 60, clear: 90, close: 20 }, globo: { shallow: 0x1d6f9c, deep: 0x041c30, dark: 120, clear: 110, close: 25 } } as const;
export type UnderwaterKind = keyof typeof UNDER | keyof typeof DEEP;
export class UnderwaterView {
  private on: UnderwaterKind | false = false;
  private depth = 0;
  private sky: { color: number; near: number; far: number; bg: number };

  constructor(private readonly scene: THREE.Scene) {
    const fog = scene.fog as THREE.Fog;
    this.sky = { color: fog.color.getHex(), near: fog.near, far: fog.far, bg: (scene.background as THREE.Color).getHex() };
  }

  /**
   * The camera is under water now: murky water (`true`, "mar"), the open sea by depth ("oceano"), the globe's ("globo"),
   * clear water ("claro"), or not;
   * `depth` m under its surface (natural water darkens with it).
   */
  set(on: boolean | UnderwaterKind, depth = 0): void {
    const k: UnderwaterKind | false = on === true ? "mar" : on;
    const d = Math.round(Math.max(0, depth) * 2) / 2;
    if (k === this.on && (d === this.depth || !k || !(k in DEEP))) return;
    this.on = k;
    this.depth = d;
    this.apply();
  }

  /** The sky changed (day and night): over water it shows as it is, through clear water tinted. */
  setSky(color: number): void {
    if (color === this.sky.color) return;
    this.sky = { ...this.sky, color, bg: color };
    this.apply();
  }

  private apply(): void {
    const k = this.on;
    const fog = this.scene.fog as THREE.Fog;
    const bg = this.scene.background as THREE.Color;
    if (!k) {
      fog.color.set(this.sky.color);
      fog.near = this.sky.near;
      fog.far = this.sky.far;
      bg.set(this.sky.bg);
      return;
    }
    if (k === "oceano" || k === "globo") {
      const w = DEEP[k];
      const f = Math.min(1, this.depth / w.dark);
      const water = new THREE.Color(w.shallow).lerp(new THREE.Color(w.deep), Math.pow(f, 0.7));
      // At night the water is dark whatever its depth: its light comes from the sky.
      const sky = new THREE.Color(this.sky.color);
      const lit = Math.min(1, (sky.r + sky.g + sky.b) / 2);
      water.multiplyScalar(0.25 + 0.75 * lit);
      fog.color.copy(water);
      fog.near = 0.5;
      fog.far = w.clear + (w.close - w.clear) * f;
      bg.copy(sky).lerp(water, 0.35 + 0.6 * f);
      return;
    }
    const u = UNDER[k];
    fog.color.set(this.sky.color).lerp(new THREE.Color(u.color), u.tint);
    fog.near = u.near;
    fog.far = u.far;
    // The sea hides the sky; clear water lets it through.
    bg.set(this.sky.bg);
  }
}
