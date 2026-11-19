import * as THREE from "three";
import type { StepShow } from "./step-show";

/**
 * The challenge's stage on foot (Berón 2026-11-19: «los retos deberían enfocar para ver la animación»), shared by the
 * levels where she walks up to a thing: she stands at it facing it, the camera comes in past her right shoulder so she
 * and the thing are in the strip the sheet leaves free, and each solved step is acted out (StepShow, as in the ships).
 */

/**
 * While the sheet is open the stage is drawn where the sheet leaves room: above it in portrait (as the ships do),
 * left of it in landscape (the sheet takes the right side), so she and the thing are never under it.
 */
export function sheetLens(camera: THREE.PerspectiveCamera, on: boolean): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fov = camera.fov;
  camera.clearViewOffset();
  if (on && h > w) {
    camera.aspect = w / (1.6 * h);
    camera.setViewOffset(w, 1.6 * h, 0, 0.6 * h, w, h);
  } else if (on) {
    const W = 1.46 * w;
    camera.aspect = W / h;
    camera.setViewOffset(W, h, W - w, 0, w, h);
  } else camera.aspect = w / h;
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

/**
 * Begin the stage at a thing (its base `at` and its height `sy`) for her at `her`, looking `yaw`: where she stands (where
 * she is if within 2,5 m, else 0,9 m in front of it, on its floor). The lens narrows to the free strip.
 */
export function focusReto(steps: StepShow, camera: THREE.PerspectiveCamera, her: { x: number; y: number; z: number }, yaw: number, at: { x: number; y: number; z: number; sy: number }): THREE.Vector3 {
  const target = new THREE.Vector3(at.x, at.y + Math.min(1.1, Math.max(0.4, at.sy * 0.7)), at.z);
  const here = new THREE.Vector3(her.x, her.y, her.z);
  const d = new THREE.Vector3(at.x - her.x, 0, at.z - her.z);
  if (d.lengthSq() < 1e-4) d.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const dist = d.length();
  d.normalize();
  const stand = dist < 2.5 ? here : new THREE.Vector3(at.x, at.y, at.z).addScaledVector(d, -0.9);
  const right = new THREE.Vector3(-d.z, 0, d.x);
  const look = stand.clone().addScaledVector(d, 0.3).setY(stand.y + 0.95);
  // Wider for the tall machines she sits in (the jalón's column is 2,1 m): the whole machine and her in it.
  const tall = Math.max(0, at.sy - 1.2);
  const cam = look.clone().addScaledVector(d, -(2.0 + 3 * tall)).addScaledVector(right, 1.2 + 0.8 * tall).setY(stand.y + 1.85 + 0.8 * tall);
  steps.begin({ stand, yaw: Math.atan2(d.x, d.z), camera: cam, look, target });
  sheetLens(camera, true);
  return stand;
}
