import * as THREE from "three";
/**
 * The dollhouse camera `from`, turned round `aim` by the camera joystick: `yaw` about the vertical, `pitch`
 * lowers it (+, looking up at her) or raises it (−), kept between just above her level and nearly overhead.
 */
export function orbitAround(from: THREE.Vector3, aim: THREE.Vector3, yaw: number, pitch: number): THREE.Vector3 {
  const off = from.clone().sub(aim);
  const flat = Math.hypot(off.x, off.z);
  const r = off.length();
  const elev = Math.max(0.08, Math.min(1.45, Math.atan2(off.y, flat) - pitch));
  const head = Math.atan2(off.x, off.z) + yaw;
  return new THREE.Vector3(Math.sin(head) * Math.cos(elev) * r, Math.sin(elev) * r, Math.cos(head) * Math.cos(elev) * r).add(aim);
}
