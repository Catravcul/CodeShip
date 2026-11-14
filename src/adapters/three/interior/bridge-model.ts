import * as THREE from "three";
import { BRIDGE, BRIDGE_ERGONOMICS as E, PLOT_TABLE, type BridgeStationId } from "@modules/flight-deck/data/bridge";
import type { CabinStation } from "@modules/lander-cabin/domain/cabin";
import { PartKit, ScreenAtlas, at } from "./console-kit";
import { paintScreen, type Rect, type ScreenKind } from "./console-screens";

/**
 * The bridge drawn from the research (docs/design/puente.md): an Orion-style pilot station facing the bow
 * window, the probe's station beside it (seated, RHC and THC on the armrests), a TORU-style docking console,
 * the plot table with the trajectory display in the middle, systems consoles along the side walls (each with
 * a tilted screen, a sloped switch shelf, a keypad, guarded switches, handholds and foot loops), cable
 * trays and light panels overhead.
 *
 * Scale (src/core/scale.ts): the floor plan, the room's walls and ceiling, the machines' widths, depths, screens
 * and switches are drawn `k` times their real size; the heights and sizes where her body meets them (work
 * surface, seat, grips, foot loops, handrails) stay real, so she still fits.
 */

const COL = {
  body: 0x2b3038,
  plinth: 0x15181c,
  slab: 0x3a414b,
  bezel: 0x101317,
  switchBase: 0x8a9099,
  lever: 0xe6e8ea,
  guard: 0xc8322b,
  key: 0xb8bec6,
  yellow: 0xf2c230,
  seat: 0x2f4f6f,
  belt: 0x111418,
  buckle: 0xa7adb4,
  rib: 0xc4c8c2,
  tray: 0x59606a,
  floorLine: 0x4a525e,
} as const;
const GLOW = { cyan: 0x7fdcff, green: 0x37e07a, amber: 0xffb347, red: 0xff3b30, panel: 0xe8f4ff } as const;

/** One screen of a console: its cell of the atlas, its kind, and where it is (for the scale study). */
export interface BridgeScreen {
  readonly station: BridgeStationId;
  readonly kind: ScreenKind;
  readonly title: string;
  readonly rect: Rect;
  /** Size, drawn m, and its world matrix (the plane faces local +Z). */
  readonly w: number;
  readonly h: number;
  readonly matrix: THREE.Matrix4;
  /** Atlas pixels per screen height (320 for a cell, 640 for the plot table's block). */
  readonly pxTall: number;
}

export interface BridgeModel {
  readonly group: THREE.Group;
  readonly atlas: ScreenAtlas;
  readonly screens: readonly BridgeScreen[];
  readonly lamps: THREE.InstancedMesh;
  readonly lampIndex: ReadonlyMap<BridgeStationId, number>;
  /** Where she looks at each machine (its main screen's centre), drawn m. */
  readonly aim: ReadonlyMap<BridgeStationId, THREE.Vector3>;
  /** Top of each machine, drawn m (its sign goes over it). */
  readonly top: ReadonlyMap<BridgeStationId, number>;
  /** Small controls to measure on screen: a toggle switch and a keypad key per console, drawn m. */
  readonly controls: readonly { station: BridgeStationId; what: string; at: THREE.Vector3; size: number }[];
  readonly ends: { bow: THREE.Object3D; aft: THREE.Object3D };
}

/** The screens each station carries (the pilot and the probe have three, like Orion). */
const SCREENS: Readonly<Record<BridgeStationId, readonly [ScreenKind, string][]>> = {
  prop: [
    ["attitude", "Actitud"],
    ["prop", "Propulsión"],
    ["plot", "Trayectoria"],
  ],
  sonda: [
    ["probeMap", "Órbita sonda"],
    ["probeCam", "Cámara sonda"],
    ["attitude", "Actitud sonda"],
  ],
  dock: [["dock", "Acople"]],
  nav: [["plot", "Mesa de navegación"]],
  life: [["life", "Vida · ECLSS"]],
  power: [["power", "Energía · EPS/TCS"]],
  mente: [["mind", "Mente del asteroide"]],
  nano: [["nano", "nano_net"]],
  comms: [["comms", "Radio · COMM"]],
  salida: [["hatch", "Escotilla"]],
};

export function buildBridge(k: number): BridgeModel {
  const g = new THREE.Group();
  const main = new PartKit();
  const bowKit = new PartKit();
  const aftKit = new PartKit();
  const atlas = new ScreenAtlas(512, 320, 4, 6);
  const screens: BridgeScreen[] = [];
  const aim = new Map<BridgeStationId, THREE.Vector3>();
  const top = new Map<BridgeStationId, number>();
  const controls: { station: BridgeStationId; what: string; at: THREE.Vector3; size: number }[] = [];
  const lampAt = new Map<BridgeStationId, THREE.Vector3>();
  let cellNo = 0;
  const nextCell = () => {
    const c = cellNo++;
    return atlas.cell(c % 4, Math.floor(c / 4));
  };
  // The plot table's display takes a 2 × 2 block at the bottom of the atlas.
  const plotBlock = atlas.cell(0, 4, 2, 2);

  const W = 6.4 * k;
  const L = 8.0 * k;
  const H = BRIDGE.heightM * k;
  const I = new THREE.Matrix4();

  // --- The shell: separate meshes, so the dollhouse camera can hide the wall in its way. -----------------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9dcd6, roughness: 0.9 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a414b, roughness: 0.75 });
  const shell = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };
  shell(W, 0.05, L, floorMat, 0, -0.025, 0);
  shell(W, 0.05, L, wallMat, 0, H, 0);
  for (const sx of [-1, 1]) shell(0.05, H, L, wallMat, (sx * W) / 2, H / 2, 0);
  const aft = shell(W, H, 0.05, wallMat, 0, H / 2, L / 2 + 0.05);
  // Bow: a wide window onto the stars between two wall strips; it goes as a whole under the cutaway.
  const bow = new THREE.Group();
  g.add(bow);
  const sill = 0.75 * k;
  const head = 0.45 * k;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, H - sill - head), new THREE.MeshBasicMaterial({ color: 0x02040a, side: THREE.DoubleSide }));
  sky.position.set(0, sill + (H - sill - head) / 2, -L / 2 - 0.05);
  sky.userData.cutWith = bow;
  bow.add(sky);
  for (const [h, y] of [
    [sill, sill / 2],
    [head, H - head / 2],
  ] as const) {
    const strip = shell(W, h, 0.05, wallMat, 0, y, -L / 2, bow);
    strip.userData.cutWith = bow;
  }
  const stars = new THREE.BufferGeometry();
  const pts: number[] = [];
  for (let i = 0; i < 220; i++) pts.push((Math.random() - 0.5) * (W - 0.2), (Math.random() - 0.5) * (H - sill - head - 0.1), 0.01);
  stars.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  sky.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 0.015 * k })));
  // Window frame: sill, head and mullions every 1,6 m (real), like the Cupola's framed panes.
  const winH = H - sill - head;
  bowKit.box(W, 0.08 * k, 0.16 * k, COL.rib, at(I, 0, sill, -L / 2 + 0.06 * k));
  bowKit.box(W, 0.08 * k, 0.16 * k, COL.rib, at(I, 0, H - head, -L / 2 + 0.06 * k));
  for (let x = -W / 2 + 1.6 * k; x < W / 2 - 0.1; x += 1.6 * k) bowKit.box(0.09 * k, winH, 0.14 * k, COL.rib, at(I, x, sill + winH / 2, -L / 2 + 0.05 * k));
  // Aft: the hatch to the spine (ring, door, wheel) on the aft wall, hidden with it.
  aftKit.add(new THREE.TorusGeometry(0.42 * k, 0.05 * k, 8, 28), 0x2a2f36, at(I, 0, 1.1 * k, L / 2 - 0.03));
  aftKit.cyl(0.38 * k, 0.04 * k, 0x9aa3ad, at(I, 0, 1.1 * k, L / 2 - 0.02, Math.PI / 2), 24);
  aftKit.add(new THREE.TorusGeometry(0.12 * k, 0.012 * k, 6, 16), COL.yellow, at(I, 0, 1.1 * k, L / 2 - 0.07 * k));
  // Hatch panel with its pressure screen, starboard of the hatch.
  const hatchM = at(I, 0.75 * k, 1.25, L / 2 - 0.04 * k, 0, Math.PI);
  aftKit.box(0.4 * k, 0.3 * k, 0.04 * k, COL.bezel, at(hatchM, 0, 0, -0.02 * k));
  const hatchCell = nextCell();
  atlas.quad(hatchCell, 0.34 * k, 0.21 * k, at(hatchM, 0, 0, 0.002), "aft");
  screens.push({ station: "salida", kind: "hatch", title: "Escotilla", rect: hatchCell, w: 0.34 * k, h: 0.21 * k, matrix: at(hatchM, 0, 0, 0.002), pxTall: 320 });
  aim.set("salida", new THREE.Vector3(0, 1.1 * k, L / 2));
  top.set("salida", 1.1 * k + 0.6 * k);
  lampAt.set("salida", new THREE.Vector3(0.75 * k, 1.25 + 0.2 * k, L / 2 - 0.06 * k));

  // Wall ribs, the handrail on each side wall (body height), overhead light panels and cable trays.
  for (const sx of [-1, 1]) {
    for (let z = -L / 2 + 1.6 * k; z < L / 2 - 0.1; z += 1.6 * k) main.box(0.12 * k, H, 0.1 * k, COL.rib, at(I, sx * (W / 2 - 0.06 * k), H / 2, z));
    main.bar(new THREE.Vector3(sx * (W / 2 - 0.09 * k), 1.2, -L / 2 + 0.6 * k), new THREE.Vector3(sx * (W / 2 - 0.09 * k), 1.2, L / 2 - 0.6 * k), 0.017, COL.yellow);
    // Cable tray: a U channel with three bundles in it, along the ceiling.
    const tx = sx * (W / 2 - 0.7 * k);
    const ty = H - 0.12 * k;
    main.box(0.32 * k, 0.015 * k, L - 0.3 * k, COL.tray, at(I, tx, ty - 0.05 * k, 0));
    for (const e of [-1, 1]) main.box(0.015 * k, 0.1 * k, L - 0.3 * k, COL.tray, at(I, tx + e * 0.16 * k, ty, 0));
    [0xd8752a, 0x2f7fc1, 0x8a8f98].forEach((c, i) => main.cyl(0.025 * k, L - 0.4 * k, c, at(I, tx + (i - 1) * 0.08 * k, ty - 0.015 * k, 0, Math.PI / 2), 8));
  }
  for (const z of [-2.4, -0.8, 0.8, 2.4]) main.box(1.4 * k, 0.03, 0.3 * k, GLOW.panel, at(I, 0, H - 0.03, z * k), true);
  // Floor: walkway lines between the stations (lighter strips on the deck).
  for (const z of [-2.0, 2.3]) main.box(W - 0.4 * k, 0.004, 0.05 * k, COL.floorLine, at(I, 0, 0.002, z * k));
  for (const x of [-1.4, 1.4]) main.box(0.05 * k, 0.004, L - 0.6 * k, COL.floorLine, at(I, x * k, 0.002, 0));

  // --- The machines. -------------------------------------------------------------------------------------
  /** A frame on the floor at the console's front edge, local +Z pointing back at where she stands. */
  const frameFor = (s: CabinStation<BridgeStationId>, standoff: number) => {
    const dir = new THREE.Vector2(s.look.x - s.stand.x, s.look.z - s.stand.z).normalize();
    const yaw = Math.atan2(-dir.x, -dir.y);
    return { m: at(I, s.stand.x * k + dir.x * standoff, 0, s.stand.z * k + dir.y * standoff, 0, yaw), dir };
  };
  /** A screen with its bezel, tilted so it faces her eye (MSIS: under 30° off its normal). */
  const display = (s: CabinStation<BridgeStationId>, base: THREE.Matrix4, x: number, y: number, z: number, w: number, h: number, eye: number, kind: ScreenKind, title: string, toe = 0): THREE.Matrix4 => {
    const c = new THREE.Vector3(x, y, z).applyMatrix4(base);
    const flat = Math.hypot(c.x - s.stand.x * k, c.z - s.stand.z * k);
    const pitch = Math.atan2(eye - c.y, flat);
    const m = at(base, x, y, z, -pitch, toe);
    main.box(w + 0.05 * k, h + 0.05 * k, 0.05 * k, COL.bezel, at(m, 0, 0, -0.027 * k));
    // Glare hood over the top edge.
    main.box(w + 0.07 * k, 0.015 * k, 0.07 * k, COL.bezel, at(m, 0, h / 2 + 0.03 * k, 0.01 * k));
    const rect = nextCell();
    const q = at(m, 0, 0, 0.002);
    atlas.quad(rect, w, h, q);
    screens.push({ station: s.id, kind, title, rect, w, h, matrix: q, pxTall: 320 });
    return m;
  };
  /** A row of toggle switches, a keypad and two guarded switches on a sloped shelf (frame: shelf centre). */
  const switchShelf = (s: CabinStation<BridgeStationId>, shelf: THREE.Matrix4, w: number, d: number) => {
    main.box(w, 0.03, d, COL.slab, shelf);
    const toggles = 8;
    for (let i = 0; i < toggles; i++) {
      const x = -w * 0.42 + (i * w * 0.4) / (toggles - 1);
      main.box(0.026 * k, 0.012, 0.03 * k, COL.switchBase, at(shelf, x, 0.02, 0));
      main.cyl(0.0045 * k, 0.032 * k, COL.lever, at(shelf, x, 0.03 + 0.012 * k, -0.004 * k, -0.35), 6);
      main.box(0.008 * k, 0.004, 0.008 * k, i % 3 ? GLOW.green : GLOW.amber, at(shelf, x, 0.018, d * 0.32), true);
    }
    // Two guarded switches (red covers), like the Dragon's covered buttons.
    for (const i of [0, 1]) {
      const x = w * 0.06 + i * 0.05 * k;
      main.box(0.03 * k, 0.008, 0.038 * k, COL.yellow, at(shelf, x, 0.018, 0));
      main.box(0.022 * k, 0.014 * k, 0.03 * k, COL.guard, at(shelf, x, 0.022 + 0.007 * k, -0.002, 0.25));
    }
    // A 3 × 4 keypad with backlit keys.
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 3; c++) main.box(0.022 * k, 0.01, 0.02 * k, r === 3 && c === 2 ? GLOW.green : COL.key, at(shelf, w * 0.28 + c * 0.028 * k, 0.02, -d * 0.32 + r * 0.026 * k), r === 3 && c === 2);
    controls.push({ station: s.id, what: "interruptor", at: new THREE.Vector3(-w * 0.42, 0.03, 0).applyMatrix4(shelf), size: 0.032 * k });
    controls.push({ station: s.id, what: "tecla", at: new THREE.Vector3(w * 0.28, 0.02, 0).applyMatrix4(shelf), size: 0.022 * k });
  };
  /** Foot loops at her feet and two handholds on the console's sides (zero g: MSIS asks for restraints). */
  const restraints = (base: THREE.Matrix4, w: number, feetZ: number) => {
    const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(base);
    main.bar(p(-0.2, 0.07, feetZ), p(0.2, 0.07, feetZ), 0.012, COL.yellow);
    for (const x of [-0.2, 0.2]) main.bar(p(x, 0, feetZ), p(x, 0.07, feetZ), 0.012, COL.yellow);
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 + 0.05);
      main.bar(p(x, 0.65, -0.08), p(x, 1.05, -0.08), 0.014, COL.yellow);
      for (const y of [0.65, 1.05]) main.bar(p(sx * (w / 2), y, -0.08), p(x, y, -0.08), 0.01, COL.yellow);
    }
  };

  for (const s of BRIDGE.stations) {
    if (s.id === "salida") continue;
    if (s.id === "nav") {
      // The plot table: a slanted glass like a drafting table (the near edge at her work height), so it is
      // under 30° off her line of sight (MSIS); a handrail rim round it, a pedestal under it.
      const t = at(I, PLOT_TABLE.x * k, 0, PLOT_TABLE.z * k, 0, Math.atan2(s.stand.x - PLOT_TABLE.x, s.stand.z - PLOT_TABLE.z));
      const tw = E.plotTableM.w * k;
      const td = E.plotTableM.d * k;
      const tilt = 0.45;
      const near = E.workSurfaceM - 0.05;
      const yc = near + (td / 2) * Math.sin(tilt);
      // Body under the glass: up to its near edge, and a back block under the raised far half.
      main.box(tw * 0.8, near - 0.18, td * 0.6, COL.body, at(t, 0, (near - 0.18) / 2 + 0.12, 0));
      main.box(tw * 0.8, yc - 0.12, td * 0.25, COL.body, at(t, 0, (yc - 0.12) / 2 + 0.12, -td * 0.18));
      main.box(tw * 0.6, 0.12, td * 0.45, COL.plinth, at(t, 0, 0.06, 0));
      const surf = at(t, 0, yc, 0, -Math.PI / 2 + tilt);
      main.box(tw + 0.06 * k, td + 0.06 * k, 0.05, COL.bezel, at(surf, 0, 0, -0.03));
      const q = at(surf, 0, 0, 0.002);
      atlas.quad(plotBlock, tw, td, q);
      screens.push({ station: "nav", kind: "plot", title: "Mesa de navegación", rect: plotBlock, w: tw, h: td, matrix: q, pxTall: 640 });
      // In the glass's frame: x across, y up the slope, z out of the glass.
      const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(surf);
      const hx = tw / 2 + 0.05 * k;
      const hy = td / 2 + 0.05 * k;
      const r = 0.05;
      main.bar(p(-hx, -hy, r), p(hx, -hy, r), 0.014, COL.yellow);
      main.bar(p(-hx, hy, r), p(hx, hy, r), 0.014, COL.yellow);
      main.bar(p(-hx, -hy, r), p(-hx, hy, r), 0.014, COL.yellow);
      main.bar(p(hx, -hy, r), p(hx, hy, r), 0.014, COL.yellow);
      for (const [x, y] of [
        [-hx, -hy],
        [hx, -hy],
        [-hx, hy],
        [hx, hy],
      ] as const)
        main.bar(p(x, y, -0.02), p(x, y, r), 0.01, COL.yellow);
      // A glowing strip along her edge.
      main.box(tw, 0.015 * k, 0.012, GLOW.cyan, at(surf, 0, -td / 2 - 0.02 * k, 0.0), true);
      aim.set("nav", p(0, 0, 0));
      top.set("nav", p(0, hy, 0).y);
      lampAt.set("nav", p(hx, hy, r + 0.03));
      controls.push({ station: "nav", what: "borde de la mesa", at: p(0, -hy, r), size: 0.028 });
      continue;
    }
    const list = SCREENS[s.id];
    if (s.seated) {
      // Seated station (pilot, probe): restraint seat at her place, three screens in a row, switch panel below.
      // Close enough for MSIS (screens 0,33–0,71 m from her eye): her knees go under the screens.
      const { m } = frameFor(s, 0.3);
      const dw = E.pilotDisplayM.w * k;
      const dh = E.pilotDisplayM.h * k;
      const w = 3 * dw + 0.16 * k;
      const d = 0.4 * k;
      main.box(w, 0.42, d, COL.body, at(m, 0, 0.21, -d / 2 - 0.1 * k));
      main.box(w * 0.92, 0.1, d - 0.06 * k, COL.plinth, at(m, 0, 0.05, -d / 2 - 0.13 * k));
      // Switch interface panel, sloped, under the screens (Orion's beside its displays; Dragon's below).
      switchShelf(s, at(m, 0, 0.6, -0.05 * k, 0.55), w * 0.9, 0.16 * k);
      const yc = 0.7 + dh / 2 + 0.03 * k;
      const zc = -0.14 * k;
      main.box(w, dh + 0.12 * k, 0.06 * k, COL.body, at(m, 0, yc, zc - 0.08 * k));
      main.box(w, yc - dh / 2 - 0.42, 0.08 * k, COL.body, at(m, 0, 0.42 + (yc - dh / 2 - 0.42) / 2, zc - 0.08 * k));
      let mid: THREE.Matrix4 | undefined;
      list.forEach(([kind, title], i) => {
        const x = (i - 1) * (dw + 0.04 * k);
        const mm = display(s, m, x, yc, zc + (i === 1 ? 0 : 0.04 * k), dw, dh, E.eyeSeatedM, kind, title, -(i - 1) * 0.3);
        if (i === 1) mid = mm;
      });
      aim.set(s.id, new THREE.Vector3(0, 0, 0).applyMatrix4(mid!));
      top.set(s.id, yc + dh / 2 + 0.1 * k);
      lampAt.set(s.id, new THREE.Vector3(w / 2 - 0.05 * k, yc + dh / 2 + 0.08 * k, zc - 0.08 * k).applyMatrix4(m));
      // The seat: real size (her body), on a pedestal, with harness, armrests, RHC right and THC left, foot bar.
      const seat = at(I, s.stand.x * k, 0, s.stand.z * k, 0, Math.atan2(-(s.look.x - s.stand.x), -(s.look.z - s.stand.z)));
      main.cyl(0.06, E.seatPanM - 0.04, COL.slab, at(seat, 0, (E.seatPanM - 0.04) / 2, 0.02));
      main.box(0.5, 0.1, 0.06, COL.slab, at(seat, 0, 0.05, 0.02));
      main.box(0.46, 0.07, 0.46, COL.seat, at(seat, 0, E.seatPanM, 0.02));
      main.box(0.46, 0.62, 0.08, COL.seat, at(seat, 0, E.seatPanM + 0.36, 0.27, 0.22));
      main.box(0.26, 0.18, 0.08, COL.seat, at(seat, 0, E.seatPanM + 0.78, 0.36, 0.22));
      for (const sx of [-1, 1]) main.box(0.05, 0.5, 0.012, COL.belt, at(seat, sx * 0.1, E.seatPanM + 0.34, 0.215, 0.22));
      main.box(0.42, 0.04, 0.012, COL.belt, at(seat, 0, E.seatPanM + 0.08, -0.15));
      main.box(0.07, 0.05, 0.02, COL.buckle, at(seat, 0, E.seatPanM + 0.09, -0.16));
      for (const sx of [-1, 1]) {
        main.box(0.08, 0.05, 0.38, COL.slab, at(seat, sx * 0.3, E.gripM - 0.1, -0.02));
        main.box(0.03, E.gripM - 0.12, 0.03, COL.slab, at(seat, sx * 0.3, (E.gripM - 0.12) / 2, 0.12));
      }
      // RHC (right hand): a pistol grip on a gimbal, trigger and a red button on top.
      main.box(0.07, 0.035, 0.07, COL.plinth, at(seat, 0.3, E.gripM - 0.06, -0.17));
      main.cyl(0.012, 0.05, COL.switchBase, at(seat, 0.3, E.gripM - 0.02, -0.17), 8);
      main.box(0.035, 0.09, 0.045, COL.plinth, at(seat, 0.3, E.gripM + 0.04, -0.17, -0.15));
      main.box(0.012, 0.012, 0.012, GLOW.red, at(seat, 0.3, E.gripM + 0.09, -0.175), true);
      // THC (left hand): a T-handle that slides along three axes.
      main.box(0.07, 0.035, 0.07, COL.plinth, at(seat, -0.3, E.gripM - 0.06, -0.17));
      main.cyl(0.012, 0.05, COL.switchBase, at(seat, -0.3, E.gripM - 0.02, -0.17), 8);
      main.cyl(0.014, 0.09, COL.plinth, at(seat, -0.3, E.gripM + 0.02, -0.17, 0, 0, Math.PI / 2), 8);
      controls.push({ station: s.id, what: "RHC", at: new THREE.Vector3(0.3, E.gripM + 0.04, -0.17).applyMatrix4(seat), size: 0.09 });
      // Foot restraint bar under the console.
      const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(seat);
      main.bar(p(-0.18, 0.08, -0.5), p(0.18, 0.08, -0.5), 0.012, COL.yellow);
      for (const x of [-0.18, 0.18]) main.bar(p(x, 0, -0.5), p(x, 0.08, -0.5), 0.012, COL.yellow);
      continue;
    }
    // Standing console (systems, docking): body, sloped shelf, one tilted screen, foot loops and handholds.
    const standoff = 0.18;
    const { m } = frameFor(s, standoff);
    const w = E.consoleM.w * k;
    const d = E.consoleM.d * k;
    const S = E.workSurfaceM;
    main.box(w, S - 0.12, d, COL.body, at(m, 0, (S - 0.12) / 2 + 0.12, -d / 2));
    main.box(w * 0.94, 0.12, d - 0.08 * k, COL.plinth, at(m, 0, 0.06, -d / 2 - 0.04 * k));
    main.box(w, 0.035, d, COL.slab, at(m, 0, S - 0.018, -d / 2));
    switchShelf(s, at(m, 0, S + 0.04, -0.12 * k, 0.22), w * 0.96, 0.2 * k);
    const dw = E.displayM.w * k;
    const dh = E.displayM.h * k;
    const yc = S + 0.08 + dh / 2;
    const zc = -d * 0.68;
    // Stem from the console top to the back of the screen.
    main.box(0.1 * k, 0.16, 0.06 * k, COL.bezel, at(m, 0, S + 0.06, zc - 0.05 * k));
    const [kind, title] = list[0]!;
    const dm = display(s, m, 0, yc, zc, dw, dh, E.eyeStandingM, kind, title);
    if (s.id === "dock") {
      // TORU-style: two small hand controllers either side of the shelf (translation left, rotation right).
      for (const sx of [-1, 1]) {
        main.box(0.07, 0.04, 0.07, COL.plinth, at(m, sx * (w / 2 - 0.06 * k), S + 0.02, -0.07 * k));
        main.cyl(0.011, 0.08, COL.switchBase, at(m, sx * (w / 2 - 0.06 * k), S + 0.08, -0.07 * k), 8);
        main.box(0.03, 0.05, 0.035, COL.plinth, at(m, sx * (w / 2 - 0.06 * k), S + 0.14, -0.07 * k));
      }
    }
    restraints(m, w, standoff);
    aim.set(s.id, new THREE.Vector3(0, 0, 0).applyMatrix4(dm));
    top.set(s.id, yc + dh / 2 + 0.05 * k);
    lampAt.set(s.id, new THREE.Vector3(dw / 2 + 0.06 * k, yc + dh / 2, zc).applyMatrix4(m));
  }

  for (const mesh of main.build()) g.add(mesh);
  for (const mesh of bowKit.build(false)) {
    mesh.userData.cutWith = bow;
    bow.add(mesh);
  }
  // The aft hatch's parts in the aft wall's frame, so the cutaway hides them with it.
  const aftGroup = new THREE.Group();
  aftGroup.position.copy(aft.position).negate();
  aft.add(aftGroup);
  for (const mesh of aftKit.build(false)) {
    mesh.userData.cutWith = aft;
    aftGroup.add(mesh);
  }
  const aftScreens = atlas.build("aft");
  aftScreens.userData.cutWith = aft;
  aftGroup.add(aftScreens);
  g.add(atlas.build("main"));

  // Status lamps: one instanced mesh, coloured per console.
  const ids = [...lampAt.keys()];
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03 * k, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), ids.length);
  const lampIndex = new Map<BridgeStationId, number>();
  ids.forEach((id, i) => {
    lamps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(lampAt.get(id)!));
    lamps.setColorAt(i, new THREE.Color(GLOW.green));
    lampIndex.set(id, i);
  });
  lamps.userData.noCut = true;
  g.add(lamps);

  // Light: the same two ceiling lamps and ambient as before, reach scaled with the room (no shadows).
  for (const z of [-2, 2]) {
    const light = new THREE.PointLight(0xdfefff, 10 * k, 8 * k, 1);
    light.position.set(0, H - 0.3, z * k);
    g.add(light);
  }
  g.add(new THREE.AmbientLight(0xb8c8d8, 1.0));

  for (const sc of screens) paintScreen(atlas.ctx, sc.rect, sc.kind, sc.title, []);
  atlas.refresh();
  return { group: g, atlas, screens, lamps, lampIndex, aim, top, controls, ends: { bow, aft } };
}
