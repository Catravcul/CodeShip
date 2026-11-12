import * as THREE from "three";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import { textSign } from "./farm-deck";

/**
 * The way out of the ring toward the spin axis: an elevator up a spoke from the habitat module's
 * end wall, the small rotating hub at the top and, past a bearing, the non-rotating spine module
 * where everything floats and whose far hatch leads to the cockpit.
 *
 * Interior frame = ring frame: x along the spin axis, y up (toward the axis), z spinward.
 * The axis runs at height R (the ring's floor radius) above the floor, right over the elevator.
 */
export interface SpokeLayout {
  /** Elevator shaft centre on the floor. */
  readonly x: number;
  readonly z: number;
  /** Car radius (it is a one-person capsule) and shaft radius, m. */
  readonly carR: number;
  readonly shaftR: number;
  /** Height of the spin axis above the floor (= floor radius). */
  readonly axisY: number;
  /** Car floor height at the top stop. */
  readonly topY: number;
  /** Rotating hub: |x| ≤ hubHalfX; non-rotating spine module from hubHalfX to moduleEndX. Both of radius tubeR. */
  readonly hubHalfX: number;
  readonly moduleEndX: number;
  readonly tubeR: number;
}

export function spokeLayout(ring: SpinRing, roomHalfL: number): SpokeLayout {
  const axisY = ring.spec.floorRadiusM;
  const tubeR = 2;
  return { x: 0, z: -roomHalfL + 0.5, carR: 0.45, shaftR: 0.8, axisY, topY: axisY - tubeR - 2.2, hubHalfX: 2.5, moduleEndX: 16, tubeR };
}

export interface SpokeHandles {
  readonly group: THREE.Group;
  /** The elevator car; move it with `position.y`. */
  readonly car: THREE.Group;
  /** Stripes on the bearing between the rotating hub and the still spine module (they turn at the spin rate). */
  readonly bearing: THREE.Group;
}

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

/** A tube along x of radius r from x0 to x1, centred on the spin axis, seen from inside. */
function axialTube(r: number, x0: number, x1: number, m: THREE.Material, L: SpokeLayout): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 28, 1, true), m);
  t.rotation.z = Math.PI / 2;
  t.position.set((x0 + x1) / 2, L.axisY, L.z);
  return t;
}

export function buildSpoke(L: SpokeLayout, ring: SpinRing, roomHeight: number): SpokeHandles {
  const g = new THREE.Group();
  const metal = mat(0x9aa6b6, { metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const band = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfe6ff, emissiveIntensity: 1.3 });

  // In the room: a glass column with a frame, from floor to ceiling, and a sign.
  const column = new THREE.Mesh(new THREE.CylinderGeometry(L.carR + 0.06, L.carR + 0.06, roomHeight, 24, 1, true), glass);
  column.position.set(L.x, roomHeight / 2, L.z);
  g.add(column);
  for (const y of [0.02, roomHeight - 0.03]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(L.carR + 0.06, 0.035, 8, 28), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(L.x, y, L.z);
    g.add(rim);
  }
  const sign = textSign(`Ascensor al eje · ${L.axisY} m · 0 g arriba`);
  sign.position.set(L.x, roomHeight - 0.3, L.z + 0.65);
  g.add(sign);

  // The shaft up the spoke, with an emergency ladder, light bands and the gravity at each level.
  const shaftLen = L.topY + 2.4 - roomHeight;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(L.shaftR, L.shaftR, shaftLen, 24, 1, true), mat(0xc9ced6, { side: THREE.BackSide }));
  shaft.position.set(L.x, roomHeight + shaftLen / 2, L.z);
  g.add(shaft);
  const rungs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), mat(0xe8c547, { metalness: 0.4 }), Math.floor(shaftLen / 0.35));
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < rungs.count; i++) rungs.setMatrixAt(i, m4.makeTranslation(L.x, roomHeight + 0.2 + i * 0.35, L.z - L.shaftR + 0.1));
  g.add(rungs);
  for (let y = roomHeight + 3; y < L.topY + 2; y += 4) {
    const b = new THREE.Mesh(new THREE.TorusGeometry(L.shaftR - 0.02, 0.03, 6, 24), band);
    b.rotation.x = Math.PI / 2;
    b.position.set(L.x, y, L.z);
    g.add(b);
  }
  for (let h = 10; h < L.topY; h += 10) {
    const s = textSign(`${ring.gravityG(L.axisY - h).toFixed(2).replace(".", ",")} g · a ${(L.axisY - h).toFixed(0)} m del eje`);
    s.position.set(L.x + L.shaftR - 0.25, h, L.z);
    s.scale.multiplyScalar(0.8);
    g.add(s);
  }

  // The car: an open platform with a rail and its own light.
  const car = new THREE.Group();
  car.position.set(L.x, 0, L.z);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(L.carR, L.carR, 0.06, 24), metal);
  floor.position.y = -0.03;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(L.carR - 0.04, 0.02, 6, 24), mat(0xe8c547, { metalness: 0.4 }));
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 1.0;
  const lamp = new THREE.PointLight(0xe6f2ff, 5, 9, 1.4);
  lamp.position.y = 2.1;
  car.add(floor, rail, lamp);
  g.add(car);

  // Rotating hub at the top of the spoke: it still turns with the ring, so a little gravity remains.
  const hubWall = mat(0xd7dce3, { side: THREE.BackSide });
  g.add(axialTube(L.tubeR, -L.hubHalfX, L.hubHalfX, hubWall, L));
  for (const sx of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CircleGeometry(L.tubeR, 28), mat(0xaab4c0));
    end.rotation.y = (-sx * Math.PI) / 2;
    end.position.set(sx < 0 ? -L.hubHalfX : L.moduleEndX, L.axisY, L.z);
    g.add(end);
  }
  // Non-rotating spine module, its handrails, lockers and lights.
  g.add(axialTube(L.tubeR, L.hubHalfX, L.moduleEndX, mat(0xe8e2d6, { side: THREE.BackSide }), L));
  const railMat = mat(0xe8c547, { metalness: 0.4 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L.moduleEndX + L.hubHalfX - 0.4, 6), railMat);
    r.rotation.z = Math.PI / 2;
    r.position.set((L.moduleEndX - L.hubHalfX) / 2, L.axisY + Math.cos(a) * (L.tubeR - 0.2), L.z + Math.sin(a) * (L.tubeR - 0.2));
    g.add(r);
  }
  for (let x = L.hubHalfX + 1.5; x < L.moduleEndX - 1; x += 3) {
    const locker = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.25), mat(0x8a96a6));
    locker.position.set(x, L.axisY, L.z - L.tubeR + 0.3);
    g.add(locker);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.3), band);
    strip.position.set(x, L.axisY + L.tubeR - 0.15, L.z);
    g.add(strip);
  }
  for (const x of [0, 7, 13]) {
    const l = new THREE.PointLight(0xfff3e0, 6, 9, 1.3);
    l.position.set(x, L.axisY + 1, L.z);
    g.add(l);
  }
  // Bearing: it is the line where the turning hub meets the still spine.
  const bearing = new THREE.Group();
  bearing.position.set(L.hubHalfX, L.axisY, L.z);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(L.tubeR - 0.05, 0.08, 8, 40), metal);
  collar.rotation.y = Math.PI / 2;
  bearing.add(collar);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), mat(k % 2 ? 0x2a2a2a : 0xe8c547));
    tick.position.set(-0.1, Math.cos(a) * (L.tubeR - 0.15), Math.sin(a) * (L.tubeR - 0.15));
    bearing.add(tick);
  }
  g.add(bearing);
  const bearingSign = textSign("Cojinete: aquí deja de girar");
  bearingSign.position.set(L.hubHalfX + 0.2, L.axisY + 1.2, L.z);
  g.add(bearingSign);
  // Hatch to the cockpit at the end of the spine.
  const hatch = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 28), new THREE.MeshStandardMaterial({ color: 0x7fdcff, emissive: 0x2f8fbf, emissiveIntensity: 1.2 }));
  hatch.rotation.y = Math.PI / 2;
  hatch.position.set(L.moduleEndX - 0.05, L.axisY, L.z);
  g.add(hatch);
  const hatchSign = textSign("Escotilla a la cabina");
  hatchSign.position.set(L.moduleEndX - 0.4, L.axisY + 1.1, L.z);
  g.add(hatchSign);
  // Hatch down into the spoke (in the hub's floor, over the elevator).
  const down = new THREE.Mesh(new THREE.TorusGeometry(L.carR + 0.1, 0.05, 8, 24), mat(0xe8c547, { emissive: 0x806010, emissiveIntensity: 0.6 }));
  down.rotation.x = Math.PI / 2;
  down.position.set(L.x, L.axisY - L.tubeR + 0.02, L.z);
  g.add(down);
  return { group: g, car, bearing };
}
