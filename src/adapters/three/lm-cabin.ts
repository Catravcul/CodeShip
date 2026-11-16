import * as THREE from "three";
import type { CabinLayout, CabinStationId } from "@modules/lander-cabin/domain/cabin";
import { textSign } from "./interior/sign";

export interface LmCabinGeometry {
  readonly group: THREE.Group;
  readonly mindScreen: THREE.Mesh;
  readonly ecsScreen: THREE.Mesh;
}

/**
 * The Apollo LM's crew cabin, walkable (docs/design/modulo-lunar-juventas.md, «Cabina»), built from the
 * presented layout (lander-cabin/data/cabin.ts): the floor plan comes already spread by the presentation
 * layer and is drawn `k` times bigger (src/core/scale.ts); heights stay real (2,34 m to the roof). Two
 * standing stations with their armrests and restraints under the two triangular windows, the main
 * panels between them, the forward hatch low in the middle, the ascent engine cover in the midsection
 * with the overhead docking hatch above it, the ECS panel with its LiOH cartridges on the left and the
 * yoga mat on the right. Armrests and restraints keep their true size (`userData.body`).
 */
export function buildLmCabin(L: CabinLayout<CabinStationId>, k: number): LmCabinGeometry {
  const g = new THREE.Group();
  const f = L.floor;
  const H = L.heightM;
  const at = (id: CabinStationId) => L.stations.find((s) => s.id === id)!;
  const metal = new THREE.MeshStandardMaterial({ color: 0x8c949c, roughness: 0.55, metalness: 0.6 });
  const wall = new THREE.MeshStandardMaterial({ color: 0x5d646b, roughness: 0.8, metalness: 0.3, side: THREE.BackSide });
  const panel = new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.8, metalness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.7, metalness: 0.4 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x9fe7a0 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const strap = new THREE.MeshStandardMaterial({ color: 0xc8c2b0, roughness: 0.9 });
  const lioh = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.7 });
  const o2 = new THREE.MeshStandardMaterial({ color: 0x2f8f4f, roughness: 0.5 });
  const window = new THREE.MeshBasicMaterial({ color: 0x0b1018 });
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const label = (text: string, x: number, y: number, z: number) => {
    const l = textSign(text);
    l.scale.multiplyScalar(0.2 * k);
    l.position.set(x, y, z);
    g.add(l);
  };

  const W = (f.maxX - f.minX) * k;
  const D = (f.maxZ - f.minZ) * k;
  const cx = ((f.maxX + f.minX) / 2) * k;
  const cz = ((f.maxZ + f.minZ) / 2) * k;
  const front = f.minZ * k;
  // Shell: the compartment's walls, floor and roof.
  box(W, H, D, wall, cx, H / 2, cz);
  box(W, 0.02, D, grey, cx, -0.01, cz);

  // Forward cabin: under each triangular window a station with its panel, armrests and restraints.
  for (const id of ["asiento", "mente"] as const) {
    const s = at(id);
    const x = s.stand.x * k;
    const tri = new THREE.Shape();
    tri.moveTo(-0.35 * k, 0);
    tri.lineTo(0.35 * k, 0);
    tri.lineTo(id === "asiento" ? 0.35 * k : -0.35 * k, 0.45);
    tri.closePath();
    const win = new THREE.Mesh(new THREE.ShapeGeometry(tri), window);
    win.position.set(x, 1.55, front + 0.01);
    g.add(win);
    box(0.7 * k, 0.5, 0.25 * k, panel, x, 1.05, front + 0.13 * k);
    for (let i = 0; i < 6; i++) box(0.05 * k, 0.04, 0.01, i % 3 ? glow : amber, x + (i - 2.5) * 0.09 * k, 1.12 + (i % 2) * 0.12, front + 0.26 * k);
    for (const side of [-1, 1]) {
      const arm = box(0.06, 0.06, 0.4, metal, x + side * 0.28 * k, 1.0, s.stand.z * k - 0.05);
      arm.userData.body = true;
    }
    const r = box(0.04, 1.0, 0.04, strap, x, 0.5, s.stand.z * k + 0.25);
    r.userData.body = true;
  }
  // The main panels between the windows (flight, engines, warnings), forward of the hatch.
  box(0.6 * k, 0.9, 0.2 * k, panel, 0, 1.55, front + 0.1 * k);
  for (let i = 0; i < 12; i++) box(0.04 * k, 0.03, 0.01, i % 4 ? glow : amber, (((i % 4) - 1.5) * 0.12) * k, 1.3 + Math.floor(i / 4) * 0.2, front + 0.21 * k);
  // Forward hatch (0,81 × 0,81 m), low between the stations.
  const hatch = box(0.81 * k, 0.81, 0.05, metal, 0, 0.45, front + 0.03);
  hatch.userData.hatch = "delantera";
  label("Escotilla delantera", 0, 0.98, front + 0.15 * k);

  // Midsection: the ascent engine cover on the floor, the overhead docking hatch above it.
  const cover = f.blocked[0];
  if (cover) {
    const rw = ((cover.maxX - cover.minX) * k) / 2;
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(rw * 0.9, rw, 0.55, 24), grey);
    dome.scale.z = ((cover.maxZ - cover.minZ) * k) / (2 * rw);
    dome.position.set(((cover.maxX + cover.minX) / 2) * k, 0.275, ((cover.maxZ + cover.minZ) / 2) * k);
    g.add(dome);
    label("Cubierta del motor de ascenso", dome.position.x, 0.75, dome.position.z);
  }
  const dock = at("acople").look;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 * k, 0.05, 8, 28), metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(dock.x * k, H - 0.05, dock.z * k);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.4 * k, 28), panel);
  lid.rotation.x = Math.PI / 2;
  lid.position.set(dock.x * k, H - 0.06, dock.z * k);
  g.add(ring, lid);

  // ECS panel on the left of the midsection: readout, two LiOH cartridges, the O₂ bottle.
  const e = at("ecs").look;
  box(0.08, 0.9, 0.7 * k, panel, f.minX * k + 0.04, e.y + 0.2, e.z * k);
  const ecsScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.42 * k, 0.28 * k), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ecsScreen.rotation.y = Math.PI / 2;
  ecsScreen.position.set(f.minX * k + 0.09, e.y + 0.4, e.z * k);
  g.add(ecsScreen);
  for (const dz of [-0.2, 0.2]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * k, 0.08 * k, 0.3, 14), lioh);
    c.position.set(f.minX * k + 0.14, e.y - 0.1, e.z * k + dz * k);
    g.add(c);
  }
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * k, 0.1 * k, 0.5, 14), o2);
  bottle.position.set(f.minX * k + 0.16, 0.25, e.z * k + 0.45 * k);
  g.add(bottle);

  // The asteroid's mind console: a screen on the LMP's panel (the game's fiction).
  const m = at("mente").look;
  const mindScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34 * k, 0.22 * k), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mindScreen.position.set(m.x * k, 1.2, front + 0.27 * k);
  g.add(mindScreen);

  // The yoga mat (real size: she sits on it).
  const purple = new THREE.MeshStandardMaterial({ color: 0x7a4fb0, roughness: 0.95 });
  const matAt = at("esterilla").look;
  box(0.42, 0.012, 0.6, purple, matAt.x * k, 0.006, matAt.z * k);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 12), purple);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(matAt.x * k, 0.045, matAt.z * k + 0.32);
  g.add(roll);

  const lamp = new THREE.PointLight(0xdfefff, 6, 5, 1);
  lamp.position.set(0, H - 0.3, 0.2 * k);
  const aft = new THREE.PointLight(0xdfefff, 4, 4, 1);
  aft.position.set(0, H - 0.3, (f.maxZ - 0.5) * k);
  g.add(lamp, aft, new THREE.AmbientLight(0xb8c8d8, 1.1));
  return { group: g, mindScreen, ecsScreen };
}
