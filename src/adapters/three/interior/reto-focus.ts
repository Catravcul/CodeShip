import * as THREE from "three";
import type { StepAct, StepVisual } from "@modules/chores/domain/step-visual";
import type { StepFrame, StepShow } from "./step-show";

/**
 * The challenge's stage (Berón 2026-11-19: «los retos deberían enfocar para ver la animación»), one for every level
 * (reglas.md §4.2): she stands at the thing facing it, the camera comes in past her right shoulder so she and the
 * thing are in the strip the sheet leaves free (`sheetLens`), and each solved step is acted out (`retoVisual` over
 * StepShow). Sanctuary 1 and the ships' rooms frame with `retoFrame`/`focusReto`; the 0 g modules build their own
 * frame (foot loops, a rack overhead) and share the lens and the steps; sanctuary 3's posts, acted with a trainer,
 * frame the pair with `framePair` inside the post's room.
 */

/** The field of view a scene keeps outside a challenge, and the strip's own angle. */
export interface LensFov {
  /** The scene's own angle, back when the sheet closes (default: the one it had when the lens came on). */
  readonly base?: number;
  /** Half the vertical angle of the strip above the sheet in portrait (degrees, default 28: her whole at a thing). */
  readonly half?: number;
  /**
   * The free band of the screen in portrait (px from the top: where the sheet leaves room), measured from the sheet
   * itself (Berón 2026-11-23: «la vista HUD y vista panel de los retos debe enfocar diferente porque su área visible
   * es diferente»). Default: the top 30 % (the tallest panel's edge).
   */
  readonly band?: { readonly top: number; readonly bottom: number };
}

/** In portrait, the camera's line shows this far down the screen: the middle of the strip the tallest sheet leaves. */
export const LENS_LINE = 0.15;

/**
 * While the sheet is open the stage is drawn where the sheet leaves room: above it in portrait, left of it in landscape
 * (the sheet takes the right side), so she and the thing are never under it. In portrait the camera's line is at the
 * middle of the top 30 % (the tallest sheet's edge) and those 30 % see `half` degrees up and down of it: with the shoulder
 * frame of `retoFrame` her head, her feet and a table-high thing all show over the sheet (2026-11-19: with the scene's
 * own 72° the strip saw only 10° over the line and cut her head at the bioma's field table). The same lens in every
 * level; the scene's own angle comes back after.
 */
export function sheetLens(camera: THREE.PerspectiveCamera, on: boolean, fov: LensFov = {}): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const data = camera.userData as { lensBase?: number };
  if (on && data.lensBase === undefined) data.lensBase = camera.fov;
  camera.clearViewOffset();
  const rad = Math.PI / 180;
  if (on && h > w) {
    // The full frustum is F tall with its middle on the band's middle line c; its half angle makes the band span ±half.
    const b = fov.band ?? { top: 0, bottom: 2 * LENS_LINE * h };
    const c = Math.max(1, (b.top + b.bottom) / 2);
    const half = Math.max(20, (b.bottom - b.top) / 2);
    const F = 2 * Math.max(c, h - c);
    camera.aspect = w / F;
    camera.fov = (2 * Math.atan((Math.tan((fov.half ?? 28) * rad) * (F / 2)) / half)) / rad;
    camera.setViewOffset(w, F, 0, F / 2 - c, w, h);
  } else if (on) {
    const W = 1.44 * w;
    camera.aspect = W / h;
    camera.fov = 70;
    camera.setViewOffset(W, h, W - w, 0, w, h);
  } else {
    camera.aspect = w / h;
    const base = fov.base ?? data.lensBase;
    if (base !== undefined) camera.fov = base;
    data.lensBase = undefined;
  }
  camera.updateProjectionMatrix();
}

/** A thing to stand at: its base and its height (m). */
export interface RetoThing {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sy: number;
}

/**
 * The frame of a challenge at a thing: she stands at `stand` facing it, the camera behind her right shoulder, higher
 * and farther back for tall machines (the jalón's 2,1 m column: the whole machine and her in it). `close`: in 0 g she
 * floats in the console's foot loops this far in front of it, a little to the left of its middle, and the camera
 * comes in close past her right shoulder onto its screens (the Starship's flight deck). `target`: the thing's own
 * point for the steps' props (default: on it, at 70 % of its height).
 */
export function retoFrame(stand: THREE.Vector3, at: RetoThing, opts: { readonly close?: { readonly towardM: number; readonly k?: number }; readonly target?: THREE.Vector3; readonly mount?: StepFrame["mount"] } = {}): StepFrame {
  const target = opts.target ?? new THREE.Vector3(at.x, at.y + Math.min(1.1, Math.max(0.4, at.sy * 0.7)), at.z);
  const d = new THREE.Vector3(target.x - stand.x, 0, target.z - stand.z);
  if (d.lengthSq() < 1e-6) d.set(0, 0, -1);
  d.normalize();
  const right = new THREE.Vector3(-d.z, 0, d.x);
  const yaw = Math.atan2(d.x, d.z);
  const c = opts.close;
  if (c) {
    const feet = stand.clone().addScaledVector(d, c.towardM).addScaledVector(right, -0.3 * (c.k ?? 1));
    const look = target.clone().addScaledVector(d, -0.25);
    const camera = look.clone().addScaledVector(d, -1.1).addScaledVector(right, 1.0).setY(target.y + 0.4);
    return { stand: feet, yaw, camera, look, target };
  }
  const look = stand.clone().addScaledVector(d, 0.3).setY(stand.y + 0.95);
  // On a machine (opts.mount) she is the subject, not the whole machine: the camera stays closer.
  const tall = Math.max(0, at.sy - 1.2) * (opts.mount ? 0.35 : 1);
  const camera = look.clone().addScaledVector(d, -(2.0 + 3 * tall)).addScaledVector(right, 1.2 + 0.8 * tall).setY(stand.y + 1.85 + 0.8 * tall);
  return { stand, yaw, camera, look, target, mount: opts.mount };
}

/**
 * Begin the stage at a thing for her at `her`, looking `yaw`: she stands where she is if within 2,5 m, else 0,9 m in
 * front of it on its floor. The lens narrows to the free strip. Returns where she stands. `mount`: the machine's own
 * place for her while she does the exercise (on its seat, its belt, under its bar), see StepFrame.mount.
 */
export function focusReto(steps: StepShow, camera: THREE.PerspectiveCamera, her: { x: number; y: number; z: number }, yaw: number, at: RetoThing, fov?: LensFov, mount?: StepFrame["mount"]): THREE.Vector3 {
  const d = new THREE.Vector3(at.x - her.x, 0, at.z - her.z);
  if (d.lengthSq() < 1e-4) d.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const dist = d.length();
  d.normalize();
  const stand = dist < 2.5 ? new THREE.Vector3(her.x, her.y, her.z) : new THREE.Vector3(at.x, at.y, at.z).addScaledVector(d, -0.9);
  steps.begin(retoFrame(stand, at, { mount }));
  sheetLens(camera, true, fov);
  return stand;
}

/**
 * The steps of an open challenge acted out on the stage: a right answer plays its acts (the blocks of an order
 * already played pick by pick, «paso a paso», are not played again). `clear` puts the scene back.
 */
export function retoVisual(steps: StepShow, acts: (index: number) => readonly StepAct[], clear: () => void, finish: () => void = () => {}): StepVisual {
  let picked = { index: -1, n: 0 };
  return {
    stepDone: (index) => {
      if (steps.framing) steps.play(acts(index).slice(picked.index === index ? picked.n : 0));
      picked = { index: -1, n: 0 };
    },
    partDone: (index, part) => {
      const v = acts(index)[part];
      if (v && steps.framing) steps.play([v]);
      picked = { index, n: part + 1 };
    },
    finish,
    clear,
  };
}

/** A room's box (centre and half sizes, m): the camera never goes through its walls or roof. */
export interface RetoRoom {
  readonly centre: { readonly x: number; readonly y?: number; readonly z: number };
  readonly half: { readonly x: number; readonly y: number; readonly z: number };
}

/** How far from `c` along `yaw` before the room's walls (less a margin for the camera). */
export function roomAlong(a: RetoRoom, c: { x: number; z: number }, yaw: number): number {
  const dx = Math.sin(yaw);
  const dz = Math.cos(yaw);
  const tx = dx > 1e-6 ? (a.centre.x + a.half.x - c.x) / dx : dx < -1e-6 ? (a.centre.x - a.half.x - c.x) / dx : Infinity;
  const tz = dz > 1e-6 ? (a.centre.z + a.half.z - c.z) / dz : dz < -1e-6 ? (a.centre.z - a.half.z - c.z) / dz : Infinity;
  return Math.min(tx, tz) - 0.7;
}

/** Of the eight sides round `c`, starting at `first`, the one with the most room before a wall. */
export function roomiestYaw(a: RetoRoom | undefined, c: { x: number; z: number }, first: number): number {
  if (!a) return first;
  let best = { yaw: first, room: -1 };
  for (let i = 0; i < 8; i++) {
    const yw = first + (i * Math.PI) / 4;
    const room = Math.min(roomAlong(a, c, yw), 7) - (i % 2) * 0.01;
    if (room > best.room + 0.5) best = { yaw: yw, room };
  }
  return best.yaw;
}

/**
 * A challenge acted by two (sanctuary 3's posts: Doménica and the trainer): the camera side on to the pair centred
 * at `c`, `apart` metres between them, looking from `yaw` (which the camera stick turns), never through the room's
 * walls or roof. When a wall comes too close behind and the stick is idle, `yaw` eases round to the nearest side
 * with room for the whole shot; returns the new `yaw`. The sheet's strip is the lens's (`sheetLens`), as at a machine.
 */
export function framePair(camera: THREE.PerspectiveCamera, c: THREE.Vector3, apart: number, yaw: number, pitch: number, room: RetoRoom | undefined, turned: boolean, dt: number, eye?: { x: number; y: number; z: number }): number {
  let x: number, y: number, z: number;
  if (eye) ({ x, y, z } = eye);
  else {
    const d = Math.max(5, apart * 1.2 + 2.5);
    if (room && !turned && roomAlong(room, c, yaw) < d * 0.85) {
      for (let i = 1; i <= 16; i++) {
        const yw = yaw + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.2;
        if (roomAlong(room, c, yw) >= d * 0.85) {
          yaw += (yw - yaw) * Math.min(1, dt * 3);
          break;
        }
      }
    }
    x = c.x + Math.sin(yaw) * d;
    z = c.z + Math.cos(yaw) * d;
    y = c.y + 1.5 + Math.max(0, -pitch) * 2;
    if (room) {
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      x = clamp(x, room.centre.x - room.half.x + 0.7, room.centre.x + room.half.x - 0.7);
      z = clamp(z, room.centre.z - room.half.z + 0.7, room.centre.z + room.half.z - 0.7);
      y = clamp(y, c.y + 0.3, room.half.y * 2 - 0.4);
    }
  }
  camera.position.set(x, y, z);
  camera.lookAt(c.x, c.y + 0.8, c.z);
  return yaw;
}
