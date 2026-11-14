import * as THREE from "three";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import { textSign } from "./sign";
import { LAUNCH_ANGLE, SPINE_X, spineAt, spineLayout } from "@modules/gravity/data/spine";

/**
 * The way out of the ring toward the spin axis: an elevator up a spoke from the habitat module's
 * end wall, the small rotating hub at the top and, past a bearing, the non-rotating spine module
 * where everything floats and whose far hatch leads to the cockpit. Along the spine, from the
 * bearing forward: the workshop, the stores, the side hatch to the flight deck and the airlock
 * with the suits (docs/design/interiores.md; compressed: outside the cans are ~20 m long).
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
  /** Side hatch of the spine module to the mothership's flight deck (docs/design/cabina-nodriza.md). */
  readonly deckHatchX: number;
  readonly moduleEndX: number;
  readonly tubeR: number;
}

export function spokeLayout(ring: SpinRing, roomHalfL: number): SpokeLayout {
  // Game values (docs/design/ingravidez.md, «Túneles más amplios»): ISS modules are ~4,2–4,5 m across
  // outside with a ~2 m aisle between racks; this large ship's hub and spine are open tubes 5,5 m
  // across (the hub's shell outside is 6 m), so the third-person camera fits behind her.
  return spineLayout(ring.spec.floorRadiusM, roomHalfL);
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
  // Non-rotating spine module, its lockers and lights (the handrails are built from the domain's rail list, zones.ts).
  g.add(axialTube(L.tubeR, L.hubHalfX, L.moduleEndX, mat(0xe8e2d6, { side: THREE.BackSide }), L));
  for (let x = L.hubHalfX + 1.5; x < L.deckHatchX; x += 3) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.3), band);
    strip.position.set(x, L.axisY + L.tubeR - 0.15, L.z);
    g.add(strip);
  }
  for (const x of [0, 7, 13]) {
    const l = new THREE.PointLight(0xfff3e0, 6, 9, 1.3);
    l.position.set(x, L.axisY + 1, L.z);
    g.add(l);
  }
  // Workshop (like a Destiny rack) on the far wall: a glovebox with two glove ports and a 3D printer.
  // Every thing one can use is 2 m from the next (HAB-08) and has its grab bar beside it (gravity/data/spine.ts).
  const wallZ = L.z - L.tubeR + 0.45;
  const glovebox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.9), mat(0xb8c2cc, { metalness: 0.3 }));
  glovebox.position.set(SPINE_X.guantera, L.axisY, wallZ);
  const window = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.02), glass);
  window.position.set(SPINE_X.guantera, L.axisY, wallZ + 0.46);
  g.add(glovebox, window);
  for (const dx of [-0.3, 0.3]) {
    const port = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 16), mat(0x30343c));
    port.position.set(SPINE_X.guantera + dx, L.axisY - 0.15, wallZ + 0.47);
    g.add(port);
  }
  const printer = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), mat(0x30343c));
  printer.position.set(SPINE_X.impresora, L.axisY, wallZ - 0.1);
  const printBed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff6a10, emissiveIntensity: 0.6 }));
  printBed.position.set(SPINE_X.impresora, L.axisY, wallZ + 0.21);
  g.add(printer, printBed);
  const shopSign = textSign("Taller · guantera e impresora 3D");
  shopSign.scale.multiplyScalar(0.7);
  shopSign.position.set((SPINE_X.guantera + SPINE_X.impresora) / 2, L.axisY + 0.85, wallZ + 0.3);
  g.add(shopSign);
  // Stores: cargo transfer bags strapped to the spinward wall (like the ISS PMM).
  const bag = mat(0xf0ede4);
  for (let x = SPINE_X.almacen - 0.8; x <= SPINE_X.almacen + 0.81; x += 0.55)
    for (const dy of [-0.55, 0, 0.55]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.3), bag);
      b.position.set(x, L.axisY + dy, L.z + L.tubeR - 0.4);
      g.add(b);
    }
  const storeSign = textSign("Almacén · bolsas de carga");
  storeSign.scale.multiplyScalar(0.7);
  storeSign.position.set(SPINE_X.almacen, L.axisY + 1.0, L.z + L.tubeR - 0.7);
  g.add(storeSign);
  // Airlock end (like Quest's crew lock): two suits on the wall and the outer hatch overhead.
  const suit = mat(0xf4f4f0);
  for (const x of [SPINE_X.trajes - 0.45, SPINE_X.trajes + 0.45]) {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), suit);
    torso.position.set(x, L.axisY + 0.1, wallZ);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.8, roughness: 0.2 }));
    helmet.position.set(x, L.axisY + 0.6, wallZ);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.25), suit);
    pack.position.set(x, L.axisY + 0.1, wallZ - 0.28);
    g.add(torso, helmet, pack);
  }
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 24), mat(0xe8c547, { emissive: 0x806010, emissiveIntensity: 0.4 }));
  outer.rotation.x = Math.PI / 2;
  outer.position.set(SPINE_X.trajes, L.axisY - L.tubeR + 0.05, L.z - 1.4);
  g.add(outer);
  const lockSign = textSign("Esclusa · trajes EMU");
  lockSign.scale.multiplyScalar(0.7);
  lockSign.position.set(SPINE_X.trajes, L.axisY + 1.05, wallZ + 0.3);
  g.add(lockSign);
  // Launchers low on the floor at both ends of the long run, beside the ladder: a sprung foot plate
  // with two springs, inside a catch net for coming the other way (gravity/data/spine.ts, «Lanzadores»).
  const netMat = new THREE.MeshBasicMaterial({ color: 0x7fdcff, wireframe: true, transparent: true, opacity: 0.6 });
  const plateMat = mat(0xff9a3c, { metalness: 0.4 });
  for (const [x, dir] of [
    [SPINE_X.lanzadorPopa, 1],
    [SPINE_X.lanzadorProa, -1],
  ] as const) {
    const lane = (dx: number, r = L.tubeR - 0.6) => spineAt(L, x + dx, LAUNCH_ANGLE, r);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4, 6, 6), netMat);
    net.rotation.y = Math.PI / 2;
    net.position.copy(lane(-dir * 0.75));
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.6), plateMat);
    plate.position.copy(lane(-dir * 0.55));
    g.add(net, plate);
    for (const dy of [-0.22, 0.22]) {
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), mat(0xe8c547, { metalness: 0.6 }));
      spring.rotation.z = Math.PI / 2;
      spring.position.copy(lane(-dir * 0.65)).add(new THREE.Vector3(0, dy, 0));
      g.add(spring);
    }
    const sign = textSign(dir > 0 ? "Lanzador → red de proa" : "Lanzador → red de popa");
    sign.scale.multiplyScalar(0.6);
    sign.position.copy(lane(0, L.tubeR - 1.5));
    g.add(sign);
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
  const hatchSign = textSign("Escotilla de atraque");
  hatchSign.position.set(L.moduleEndX - 0.4, L.axisY + 1.1, L.z);
  g.add(hatchSign);
  // Side hatch to the flight deck.
  const deckHatch = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 28), new THREE.MeshStandardMaterial({ color: 0x9fe8c4, emissive: 0x2f9f6f, emissiveIntensity: 1.1 }));
  deckHatch.position.set(L.deckHatchX, L.axisY, L.z + L.tubeR - 0.05);
  g.add(deckHatch);
  const deckSign = textSign("Puente de mando");
  deckSign.position.set(L.deckHatchX, L.axisY + 0.95, L.z + L.tubeR - 0.2);
  g.add(deckSign);
  // Hatch down into the spoke (in the hub's floor, over the elevator).
  const down = new THREE.Mesh(new THREE.TorusGeometry(L.carR + 0.1, 0.05, 8, 24), mat(0xe8c547, { emissive: 0x806010, emissiveIntensity: 0.6 }));
  down.rotation.x = Math.PI / 2;
  down.position.set(L.x, L.axisY - L.tubeR + 0.02, L.z);
  g.add(down);
  return { group: g, car, bearing };
}
