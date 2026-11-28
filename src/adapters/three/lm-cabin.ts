import * as THREE from "three";
import type { CabinLayout, CabinStationId } from "@modules/lander-cabin/domain/cabin";
import { textSign } from "./interior/sign";
import { CREW_STATION, LM_PANELS, STATION_BODY, type PanelId } from "@modules/lander-cabin/data/crew-station";
import { LmInstruments } from "./lm-instruments";

export interface LmCabinGeometry {
  readonly group: THREE.Group;
  readonly mindScreen: THREE.Mesh;
  readonly ecsScreen: THREE.Mesh;
  /** The live flight instruments of panels 1, 2, 4 and 5 (the flight view feeds them). */
  readonly instruments: LmInstruments;
  /** The commander's eye where he stands at his station, in the group's frame. */
  readonly commanderEye: THREE.Vector3;
  /** Centre of the overhead docking window, in the group's frame. */
  readonly dockingWindow: THREE.Vector3;
}

/** The commander's eye above the floor: Doménica standing (src/walk-room.ts). */
export const LM_EYE_M = 1.45;

/**
 * The Apollo LM's crew cabin (docs/design/modulo-lunar-juventas.md, «Cabina»; docs/design/cabina-lm.md), built
 * from the presented layout (lander-cabin/data/cabin.ts) and the real crew station (lander-cabin/data/crew-station.ts).
 * The same model is the walkable cabin and the commander's view when he flies: the presentation layer spreads
 * the floor plan by `spread` (1 with «Separación: Real») and draws it `k` times bigger (src/core/scale.ts);
 * heights stay real (2,34 m to the roof). Two standing stations with their armrests, restraint cables and
 * hand controllers (ACA right, TTCA left; real size, `userData.body`) under the two triangular windows (real
 * holes in the front wall: the commander sees out of his), panels 1–6 between and under them, 8 and 11 on
 * the left wall, 12, 14 and 16 on the right, the overhead docking window with the COAS above the commander,
 * the forward hatch low in the middle, the ascent engine cover in the midsection with the docking hatch above
 * it, the ECS panel with its LiOH cartridges on the left and the yoga mat on the right.
 */
export function buildLmCabin(L: CabinLayout<CabinStationId>, k: number, spread = 1): LmCabinGeometry {
  const g = new THREE.Group();
  const f = L.floor;
  const H = L.heightM;
  const S = spread * k;
  const at = (id: CabinStationId) => L.stations.find((s) => s.id === id)!;
  const metal = new THREE.MeshStandardMaterial({ color: 0x8c949c, roughness: 0.55, metalness: 0.6 });
  const wall = new THREE.MeshStandardMaterial({ color: 0x5d646b, roughness: 0.8, metalness: 0.3, side: THREE.DoubleSide });
  const panel = new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.8, metalness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.7, metalness: 0.4 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x9fe7a0 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const strap = new THREE.MeshStandardMaterial({ color: 0xc8c2b0, roughness: 0.9 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5 });
  const lioh = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.7 });
  const o2 = new THREE.MeshStandardMaterial({ color: 0x2f8f4f, roughness: 0.5 });
  const glass = new THREE.MeshBasicMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const label = (text: string, x: number, y: number, z: number) => {
    const l = textSign(text);
    l.scale.multiplyScalar(0.2 * k);
    l.position.set(x, y, z);
    g.add(l);
  };

  const left = f.minX * k;
  const right = f.maxX * k;
  const front = f.minZ * k;
  const back = f.maxZ * k;
  const W = right - left;
  const D = back - front;
  const cx = (right + left) / 2;
  const cz = (back + front) / 2;
  const cdr = at("asiento");
  const lmp = at("mente");
  const C = CREW_STATION;
  const winW = C.forwardWindowWidthM.value * k;
  const winH = C.forwardWindowHeightM.value;
  const winBottom = C.forwardWindowBottomM.value;
  // A triangular window of each station (wide at the top, its point down and outboard), as a hole in the front wall.
  const windowAt = (sx: number, out: -1 | 1): THREE.Vector2[] => {
    const o = sx + (out * winW) / 2;
    const i = sx - (out * winW) / 2;
    return [new THREE.Vector2(o, winBottom + winH), new THREE.Vector2(o, winBottom), new THREE.Vector2(i, winBottom + winH)];
  };
  const cdrWin = windowAt(cdr.stand.x * k, -1);
  const lmpWin = windowAt(lmp.stand.x * k, 1);
  const dockWin = { x: cdr.stand.x * k, z: (cdr.stand.z - C.dockingWindowForwardM.value) * k, w: C.dockingWindowWidthM.value * k, d: C.dockingWindowDepthM.value * k };

  // Shell: floor; the front wall with the two windows cut out; the roof with the docking window cut out; the rest.
  box(W, 0.02, D, grey, cx, -0.01, cz);
  const frontShape = new THREE.Shape([new THREE.Vector2(left, 0), new THREE.Vector2(right, 0), new THREE.Vector2(right, H), new THREE.Vector2(left, H)]);
  frontShape.holes.push(new THREE.Path(cdrWin), new THREE.Path(lmpWin));
  const frontWall = new THREE.Mesh(new THREE.ShapeGeometry(frontShape), wall);
  frontWall.position.z = front;
  g.add(frontWall);
  for (const tri of [cdrWin, lmpWin]) {
    const pane = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(tri)), glass);
    pane.position.z = front - 0.01;
    pane.renderOrder = 2;
    g.add(pane);
    // The window frame.
    const frame = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(tri.map((p) => new THREE.Vector3(p.x, p.y, front + 0.005))), new THREE.LineBasicMaterial({ color: 0x8c949c }));
    g.add(frame);
  }
  // The landing point designator: a scale of degrees on the commander's window (lined up on both panes, read against the DSKY's angle).
  const lpdX = cdrWin[2]!.x - winW * 0.32;
  const lpd: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) {
    const y = winBottom + winH - 0.04 - i * ((winH - 0.12) / 8) * 0.85;
    const half = i % 2 ? 0.012 : 0.025;
    lpd.push(new THREE.Vector3(lpdX - half * k, y, front - 0.005), new THREE.Vector3(lpdX + half * k, y, front - 0.005));
  }
  lpd.push(new THREE.Vector3(lpdX, winBottom + winH - 0.04, front - 0.005), new THREE.Vector3(lpdX, lpd[lpd.length - 1]!.y, front - 0.005));
  const lpdLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lpd), new THREE.LineBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.8 }));
  lpdLines.name = "lpd";
  g.add(lpdLines);

  const roofShape = new THREE.Shape([new THREE.Vector2(left, front), new THREE.Vector2(right, front), new THREE.Vector2(right, back), new THREE.Vector2(left, back)]);
  roofShape.holes.push(
    new THREE.Path([
      new THREE.Vector2(dockWin.x - dockWin.w / 2, dockWin.z - dockWin.d / 2),
      new THREE.Vector2(dockWin.x - dockWin.w / 2, dockWin.z + dockWin.d / 2),
      new THREE.Vector2(dockWin.x + dockWin.w / 2, dockWin.z + dockWin.d / 2),
      new THREE.Vector2(dockWin.x + dockWin.w / 2, dockWin.z - dockWin.d / 2),
    ]),
  );
  const roof = new THREE.Mesh(new THREE.ShapeGeometry(roofShape), wall);
  roof.rotation.x = Math.PI / 2;
  roof.position.y = H;
  g.add(roof);
  for (const [w, h, x, y, z, ry] of [
    [W, H, cx, H / 2, back, 0],
    [D, H, left, H / 2, cz, Math.PI / 2],
    [D, H, right, H / 2, cz, Math.PI / 2],
  ] as const) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wall);
    p.position.set(x, y, z);
    p.rotation.y = ry;
    g.add(p);
  }
  // The docking window's frame and, under it, the COAS: a reticle on a combining glass the commander lines up on the target.
  box(dockWin.w + 0.04, 0.03, 0.02, metal, dockWin.x, H - 0.015, dockWin.z - dockWin.d / 2 - 0.01);
  box(dockWin.w + 0.04, 0.03, 0.02, metal, dockWin.x, H - 0.015, dockWin.z + dockWin.d / 2 + 0.01);
  const coas = new THREE.Group();
  coas.name = "coas";
  coas.position.set(dockWin.x, H - 0.09, dockWin.z);
  // Its housing on the frame, outboard of the window (the reticle is projected on the glass over the opening).
  box(0.1, 0.05, 0.07, black, -dockWin.w / 2 - 0.05, 0.02, 0, coas);
  const reticle = new THREE.Mesh(new THREE.PlaneGeometry(dockWin.d * 0.9, dockWin.d * 0.9), new THREE.MeshBasicMaterial({ map: coasTexture(), transparent: true, depthTest: false, depthWrite: false }));
  reticle.rotation.x = Math.PI / 2;
  reticle.renderOrder = 12;
  coas.add(reticle);
  g.add(coas);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(dockWin.w, dockWin.d), glass);
  pane.rotation.x = Math.PI / 2;
  pane.position.set(dockWin.x, H + 0.01, dockWin.z);
  g.add(pane);

  // The panels, numbered as in the LM, where the presentation layer puts them (the same spread as the stations).
  const faces: Partial<Record<PanelId, THREE.Mesh>> = {};
  const balls: THREE.Mesh[] = [];
  for (const p of LM_PANELS) {
    const w = p.wM * k;
    const holder = new THREE.Group();
    if (p.wall === "front") {
      holder.position.set(p.at.x * S, p.at.y, front + 0.06 * k);
      holder.rotation.y = p.yawRad ?? 0;
    } else {
      const side = p.wall === "left" ? 1 : -1;
      holder.position.set((p.wall === "left" ? left : right) + side * 0.03, p.at.y, p.at.z * S);
      holder.rotation.y = (side * Math.PI) / 2;
    }
    g.add(holder);
    box(w + 0.02, p.hM + 0.02, 0.05, panel, 0, 0, -0.03, holder);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, p.hM), panel);
    face.position.z = 0.0;
    face.name = `panel-${p.id}`;
    holder.add(face);
    faces[p.id] = face;
    if (p.id === "1" || p.id === "2") {
      // The FDAI's ball in its hole, a child of the cabin (it turns in the craft's frame, not the panel's).
      const r = 0.075 * k;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), black);
      holder.updateMatrix();
      ball.position.copy(new THREE.Vector3(((110 - 180) / 360) * w, ((220 - 140) / 440) * p.hM, 0.005).applyMatrix4(holder.matrix));
      ball.name = `fdai-${p.id}`;
      g.add(ball);
      balls.push(ball);
    }
    if (!["1", "2", "4", "5"].includes(p.id)) {
      // Switches and breakers: rows of small knobs, some lit.
      const rows = p.id === "11" ? 5 : p.id === "16" ? 4 : 3;
      for (let rI = 0; rI < rows; rI++)
        for (let c = 0; c < 8; c++) box(0.018 * k, 0.018, 0.02, (rI + c) % 7 === 0 ? amber : (rI * 3 + c) % 11 === 0 ? glow : metal, (c - 3.5) * (w / 9), (rI - (rows - 1) / 2) * (p.hM / (rows + 0.5)), 0.012, holder);
    }
  }
  const instruments = new LmInstruments({ p1: faces["1"]!, p2: faces["2"]!, dsky: faces["4"]!, p5: faces["5"]!, balls });
  // Glareshields over panels 1 and 2.
  for (const sx of [-1, 1]) box(0.36 * k, 0.02, 0.14 * k, black, sx * 0.3 * S, 1.6, front + 0.08 * k);

  // At each station what her body meets, at real size around where she stands: armrests, ACA (right hand),
  // TTCA (left hand) and the restraint cables from the floor to the hips.
  const B = STATION_BODY;
  for (const s of [cdr, lmp]) {
    const x = s.stand.x * k;
    const z = s.stand.z * k;
    const parts: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      parts.push(box(0.06, 0.05, 0.36, metal, x + side * B.armrestSideM, B.armrestY, z - 0.12));
      // Restraint cable, from a floor ring outboard of the foot to the hip.
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, B.restraintY, 6), strap);
      cable.position.set(x + side * 0.2, B.restraintY / 2, z + 0.05);
      cable.rotation.z = side * 0.12;
      g.add(cable);
      parts.push(cable);
    }
    // ACA: a pistol grip on the right; TTCA: a T-handle on the left.
    const aca = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.13, 10), black);
    aca.position.set(x + B.controllerSideM, B.controllerY + 0.065, z - B.controllerForwardM);
    aca.rotation.x = -0.25;
    aca.name = s.id === "asiento" ? "aca" : "aca-lmp";
    g.add(aca);
    parts.push(aca, box(0.05, 0.03, 0.08, metal, x + B.controllerSideM, B.controllerY, z - B.controllerForwardM));
    const ttca = box(0.1, 0.022, 0.022, black, x - B.controllerSideM, B.controllerY + 0.07, z - B.controllerForwardM);
    ttca.name = s.id === "asiento" ? "ttca" : "ttca-lmp";
    parts.push(ttca, box(0.022, 0.07, 0.022, metal, x - B.controllerSideM, B.controllerY + 0.03, z - B.controllerForwardM));
    for (const m of parts) m.userData.body = true;
  }
  // Forward hatch (0,81 × 0,81 m), low between the stations, under panel 4: its leaf swings in when she
  // goes out (lmForwardHatch, src/walk-room.ts).
  label("Escotilla delantera", 0, 0.7, front + 0.15 * k);

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
  // Its lid is the hatch leaf the room opens (walk-room.ts, LM_DOCKING_HATCH).
  g.add(ring);

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
  // On the pilot's side, under his window and over panel 6.
  mindScreen.position.set(m.x * k, 1.1, front + 0.1 * k);
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
  const commanderEye = new THREE.Vector3(cdr.stand.x * k, LM_EYE_M, cdr.stand.z * k);
  return { group: g, mindScreen, ecsScreen, instruments, commanderEye, dockingWindow: new THREE.Vector3(dockWin.x, H, dockWin.z) };
}

/** The COAS's reticle: a cross with range marks (the commander lines it up on the docking target). */
function coasTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.strokeStyle = "#ffcf5a";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(128, 8);
  x.lineTo(128, 248);
  x.moveTo(8, 128);
  x.lineTo(248, 128);
  x.stroke();
  x.lineWidth = 2;
  for (let i = -5; i <= 5; i++) {
    if (!i) continue;
    const l = i % 5 ? 6 : 12;
    x.beginPath();
    x.moveTo(128 + i * 22, 128 - l);
    x.lineTo(128 + i * 22, 128 + l);
    x.moveTo(128 - l, 128 + i * 22);
    x.lineTo(128 + l, 128 + i * 22);
    x.stroke();
  }
  x.beginPath();
  x.arc(128, 128, 60, 0, Math.PI * 2);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The forward hatch's leaf: low in the front wall between the stations, square (32 in, crew-station.ts), opening into the cabin. */
export function lmForwardHatch(L: CabinLayout<CabinStationId>, k: number): { at: THREE.Vector3; into: THREE.Vector3; sizeM: number; round: boolean } {
  const s = CREW_STATION.forwardHatchM.value;
  return { at: new THREE.Vector3(0, s / 2, L.floor.minZ * k + 0.03), into: new THREE.Vector3(0, 0, 1), sizeM: s * k, round: false };
}

/** The overhead docking hatch's leaf: where it is (drawn m), the way it opens and its size (0,84 m round, apolloLm). */
export function lmDockingHatch(L: CabinLayout<CabinStationId>, k: number): { at: THREE.Vector3; into: THREE.Vector3; sizeM: number; round: boolean } {
  const dock = L.stations.find((s) => s.id === "acople")!.look;
  return { at: new THREE.Vector3(dock.x * k, L.heightM - 0.09, dock.z * k), into: new THREE.Vector3(0, -1, 0), sizeM: 0.8 * k, round: true };
}
