import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { placeAt, wallWithGaps, type Body } from "@modules/aerial-sanctuary/domain/walk";
import { FreeWalk } from "@modules/aerial-sanctuary/application/free-walk";
import { AGUAS, ALTARES, ARBOLES, CARRO, COSAS_FUERA, EDIFICIOS, FAMILIAS, FECHA, FONDO, HALF, HISTORIA, LUGARES_ABIERTOS, PERIBOLO_MUROS, PERSONAS, PUENTES, trees, type Arbol, type Cosa, type Edificio, type Muro } from "@modules/microcosmos/data/academia";
import { RETOS_ACADEMIA } from "@modules/microcosmos/data/retos-academia";
import { academiaWorld, estaEn, K, lugar, ruta, zonaAt, zonaLabel } from "@modules/microcosmos/application/mundo";
import { acabada, avanzar, linea, START, type EstadoHistoria } from "@modules/microcosmos/domain/historia";
import { ageAt, lineAt, papelPorEdad, spanOf, tallaPorEdad, tramoAt, type Papel, type Quehacer, type Vida } from "@modules/microcosmos/domain/vida";
import { procedureReto, type Reto } from "@modules/sanctuary-one/application/challenges";
import type { Reward } from "@modules/sanctuary-one/data/retos";
import { S1_DAY_REAL_S } from "@modules/sanctuary-one/domain/motion";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { CubeFigure } from "./adapters/three/interior/figure";
import { textSign } from "./adapters/three/interior/sign";
import { motion } from "./adapters/three/interior/step-show";
import { DayNight } from "./adapters/three/day-night";
import { poseOnFoot } from "./adapters/three/walk-look";
import { DOMENICA_HAIR } from "./ui/portraits";
import type { Walker } from "./adapters/input/walker";
import type { DuelView, SessionText } from "./ui/duel-view";
import { GamePad } from "./ui/game-pad";
import { RootMenu } from "./ui/root-menu";
import { ICON } from "./ui/icons";
import { retoButton } from "./ui/interaction";

/**
 * The first microcosm (docs/design/microcosmos.md): Plato's Academy on a summer day of 360 a. C., entered from the
 * simulation machine of sanctuary 1's assembly room. Loaded on demand (a chunk of its own) and disposed of on the way
 * out, so sanctuary 1 pays nothing for it while she is not inside. The place is drawn and walked at `K` times its real
 * size (application/mundo.ts): its insect-humans, she among them, are half its scale.
 */
export interface MicroHost {
  readonly root: HTMLElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly walker: Walker;
  readonly duel: DuelView;
  readonly sheet: SessionText;
  /** Her reward for a challenge (the needs she keeps in sanctuary 1); the message to show. */
  reward(r: Reward): string;
  /** Back to the machine in sanctuary 1. */
  exit(): void;
}

const ROOF = 0xb5583a;
const WALK_MS = 2.2;
const SWIM_MS = 1.6;
const EYE_M = 1.45;
const PEOPLE_MS = 1.4;
/** Walking slowly along a walk. */
const STROLL_MS = 0.7;

/** Geometries of one colour each, merged into a single mesh (a draw call for all the stone, wood and earth). */
class Batch {
  private readonly geos: THREE.BufferGeometry[] = [];
  add(geo: THREE.BufferGeometry, color: number, at: THREE.Matrix4): void {
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(at);
    const c = new THREE.Color(color);
    const n = g.getAttribute("position").count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.deleteAttribute("uv");
    this.geos.push(g);
    if (g !== geo) geo.dispose();
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, rot = 0): void {
    const m = new THREE.Matrix4().makeRotationY(rot).setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), color, m);
  }
  mesh(mat: THREE.Material): THREE.Mesh | undefined {
    if (!this.geos.length) return undefined;
    const merged = mergeGeometries(this.geos, false)!;
    for (const g of this.geos) g.dispose();
    this.geos.length = 0;
    return new THREE.Mesh(merged, mat);
  }
}

const M = (x: number, y: number, z: number, rot = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(s, s, s));

/** A thing's look (real metres in, world units out): simple shapes of its kind. */
function drawThing(b: Batch, c: Cosa, floor: number): void {
  const x = c.x * K;
  const z = c.z * K;
  const y = (floor + (c.y ?? 0)) * K;
  const w = c.w * K;
  const d = c.d * K;
  const h = c.h * K;
  const rot = c.rot ?? 0;
  const box = (color: number, dx = 0, dy = 0, dz = 0, ww = w, hh = h, dd = d) => b.add(new THREE.BoxGeometry(ww, hh, dd), color, M(x + dx, y + dy + hh / 2, z + dz, rot));
  switch (c.kind) {
    case "anforas": {
      const n = Math.max(1, Math.round(c.w / 0.6));
      for (let i = 0; i < n; i++) b.add(new THREE.CylinderGeometry(0.22 * K, 0.12 * K, h, 10), 0xb8633a, M(x - w / 2 + ((i + 0.5) * w) / n, y + h / 2, z));
      return;
    }
    case "vasija":
    case "pozo":
      b.add(new THREE.CylinderGeometry((w / 2) * 0.9, (w / 2) * 0.7, h, 12), c.kind === "pozo" ? 0x9a9488 : 0xb8633a, M(x, y + h / 2, z));
      return;
    case "saco":
      b.add(new THREE.CylinderGeometry(w / 2, w / 2, h, 10), 0x7a4a2a, M(x, y + h / 2, z));
      b.add(new THREE.CylinderGeometry(0.02 * K, 0.02 * K, (2.6 - (c.y ?? 0) - c.h) * K, 4), 0x5a4a3a, M(x, y + h + ((2.6 - (c.y ?? 0) - c.h) * K) / 2, z));
      return;
    case "gnomon":
    case "poste":
      b.add(new THREE.CylinderGeometry(w / 2, w / 2, h, 8), c.kind === "gnomon" ? 0x6a5a40 : 0xe8e0d0, M(x, y + h / 2, z));
      return;
    case "tumulo":
      b.add(new THREE.SphereGeometry(w / 2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x9a8a62, M(x, y, z));
      b.add(new THREE.BoxGeometry(0.6 * K, 1.6 * K, 0.2 * K), 0xe8e2d4, M(x, y + w / 2 + 0.6 * K, z));
      return;
    case "estela":
      box(0xe8e2d4, 0, 0, 0, w * 0.8, h, d * 0.5);
      box(0xd0c8b8, 0, 0, 0, w, 0.25 * K, d);
      return;
    case "altar":
      box(0xece6da);
      box(0xd8d0c0, 0, h - 0.12 * K, 0, w * 1.1, 0.12 * K, d * 1.1);
      return;
    case "kline":
    case "cama":
      box(0x8a5a32, 0, 0, 0, w, h * 0.65, d);
      box(c.kind === "kline" ? 0xa83a3a : 0xd8d0b8, 0, h * 0.65, 0, w * 0.95, 0.08 * K, d * 0.95);
      return;
    case "foso":
      b.add(new THREE.BoxGeometry(w, 0.04 * K, d), 0xe9d6a6, M(x, y + 0.02 * K, z, rot));
      return;
    case "bancal":
      b.add(new THREE.BoxGeometry(w, h, d), 0x5a4a2a, M(x, y + h / 2, z, rot));
      for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.25 * K, 6, 4), 0x4f8a3a, M(x - w / 2 + ((i + 0.5) * w) / 6, y + h + 0.1 * K, z));
      return;
    case "parra":
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) b.add(new THREE.CylinderGeometry(0.06 * K, 0.06 * K, h, 6), 0x6a4a2a, M(x + (dx * w) / 2, y + h / 2, z + (dz * d) / 2));
      b.add(new THREE.BoxGeometry(w, 0.2 * K, d), 0x4f7a32, M(x, y + h, z));
      return;
    case "telar":
      box(0x8a6a42, 0, 0, 0, w, h, 0.12 * K);
      box(0xc8b090, 0, 0.3 * K, 0.03 * K, w * 0.85, h * 0.7, 0.04 * K);
      return;
    case "hogar":
      box(0x8a7a6a);
      box(0xd8642a, 0, h, 0, w * 0.5, 0.08 * K, d * 0.5);
      return;
    case "compuerta":
      box(0x7a5a3a);
      return;
    case "banco":
      box(0xd8d0c0);
      return;
    case "estante":
      box(0x8a6a42, 0, 0, 0, w, h, d);
      return;
    default:
      box(c.kind === "mesa" ? 0x8a6a42 : c.kind === "arca" ? 0x7a5a3a : c.kind === "basa" ? 0xeae4d8 : c.kind === "lampara" ? 0xb8633a : c.kind === "molino" ? 0x8a8478 : 0xc8bca8);
  }
}

/** A wall's pieces (and the lintels over its doors, 2,3 m up: the doors are doors, not slots to the roof). */
function drawWall(b: Batch, m: Muro, floor: number, color: number): void {
  for (const s of wallWithGaps({ axis: m.axis, at: m.at * K, from: m.from * K, to: m.to * K, y0: floor * K, y1: (floor + m.h) * K, thick: m.t * K, gaps: m.gaps?.map((g) => ({ from: g.from * K, to: g.to * K, y1: g.to - g.from > 3 ? undefined : (Math.min(2.3, m.h - 0.1) + floor) * K })) })) b.box(s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, color);
}

/** The roof over a building, less its open courts (up to four strips round a court). */
function roofOf(e: Edificio): THREE.Mesh {
  const b = new Batch();
  const y = (e.floor + e.wallH) * K;
  const t = 0.3 * K;
  const court = e.courts?.[0];
  const rects = court
    ? [
        [e.x0, court.z0, e.x1, e.z0],
        [e.x0, e.z1, e.x1, court.z1],
        [e.x0, court.z0, court.x0, court.z1],
        [court.x1, court.z0, e.x1, court.z1],
      ]
    : [[e.x0, e.z0, e.x1, e.z1]];
  for (const [x0, z0, x1, z1] of rects) b.box(x0! * K - 0.3 * K, y, z0! * K - 0.3 * K, x1! * K + 0.3 * K, y + t, z1! * K + 0.3 * K, ROOF);
  return b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))!;
}

interface Gente {
  readonly id: string;
  readonly f: CubeFigure;
  readonly g: THREE.Group;
  sign: THREE.Sprite;
  name: string;
  papel: Papel;
  /** A line of the insects' pace (the families), or undefined for the named people of the story. */
  vida?: Vida;
  /** Their place now (a layout place id) and what they do there. */
  at: string;
  what: Quehacer;
  /** Their block's start (to see when it changes). */
  block: number;
  way?: THREE.Vector3[];
  s: number;
  wait: number;
  stride: number;
  /** Where round the place they stand (a fixed offset each). */
  readonly off: { x: number; z: number };
  /** Strolling: the next point round the place. */
  stroll?: THREE.Vector3;
  readonly seed: number;
}

const roman = (n: number) => ["", "", " II", " III", " IV", " V", " VI", " VII", " VIII", " IX", " X"][n] ?? ` ${n}`;
const hash = (i: number, k: number) => {
  let h = 2166136261;
  for (const c of `${i}:${k}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
};
const TRAIN = ["uchikomi", "derribo", "golpear", "sombra", "salto"] as const;

export class AcademiaMicro {
  readonly scene = new THREE.Scene();
  private readonly world = academiaWorld();
  private readonly walk: FreeWalk;
  private body: Body;
  private yaw = Math.PI;
  private pitch = -0.1;
  private thirdPerson = true;
  private readonly avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
  private readonly rig = new THREE.Group();
  private readonly dayNight: DayNight;
  /** The microcosm's clock: hours since the visit began (the hour of day is FECHA.startHour + this). */
  private clockH = 0;
  private readonly people: Gente[] = [];
  private readonly roofs: { e: Edificio; mesh: THREE.Mesh }[] = [];
  private readonly flames: THREE.Mesh[] = [];
  private readonly cart = new THREE.Group();
  private cartS = 0;
  private cartDir = 1;
  private cartWait = 0;
  private riding = false;
  private story: EstadoHistoria = START;
  private readonly ui = document.createElement("div");
  private readonly whereEl: HTMLElement;
  private readonly missionEl: HTMLElement;
  private readonly toastEl: HTMLElement;
  private toastFor = 0;
  private challenge?: Reto;
  private offered = "";
  private readonly pad: ReturnType<typeof GamePad.use>;
  private disposed = false;

  constructor(private readonly host: MicroHost) {
    const s = this.scene;
    s.background = new THREE.Color(0xa9cbe6);
    s.fog = new THREE.Fog(0xa9cbe6, 300, 1400);
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a7a5a, 1.3);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    sun.position.set(-200, 300, 120);
    s.add(hemi, sun);
    this.dayNight = new DayNight(s, hemi, sun);
    this.build();
    this.buildPeople();
    this.avatar.root.scale.setScalar(0.92);
    this.rig.add(this.avatar.root);
    s.add(this.rig);
    // She arrives at the road's end, by the cart, facing the Academy (the story's first step).
    const start = { x: (CARRO.from.x - 3) * K, z: (CARRO.from.z - 2) * K };
    this.body = placeAt(this.world, start.x, 0.01, start.z)!;
    this.walk = new FreeWalk(() => this.world, { walk: WALK_MS, swim: SWIM_MS }, this.yaw);
    this.ui.className = "cab-ui micro-ui";
    this.ui.innerHTML = `<div class="cab-where"></div><div class="cab-where micro-mision" style="top:calc(48px + env(safe-area-inset-top));right:12px;color:#ffe2a8"></div><div class="cab-toast" role="status" style="top:calc(118px + env(safe-area-inset-top))"></div>`;
    host.root.appendChild(this.ui);
    this.whereEl = this.ui.children[0] as HTMLElement;
    this.missionEl = this.ui.children[1] as HTMLElement;
    this.toastEl = this.ui.children[2] as HTMLElement;
    this.missionEl.textContent = linea(HISTORIA, this.story);
    this.pad = GamePad.use(host.root, this, {
      zoom: (dir) => host.walker.holdZoom(dir),
      plus: { label: "Historia", open: () => this.say(linea(HISTORIA, this.story), 6) },
      view: () => (this.thirdPerson = !this.thirdPerson),
      home: () => this.leave(),
      paused: () => !!this.challenge,
      moves: [
        { letter: "X", label: "Trepar", key: "KeyC", run: () => this.walk.startClimb(this.body, this.yaw) || this.say("Nada que trepar delante", 2) },
        { letter: "A", label: "Saltar", key: "Space", run: () => { const mv = host.walker.move(); this.walk.startJump(this.body, mv.forward !== 0 || mv.right !== 0, this.pad.isOn("B")); } },
        { letter: "B", label: "Correr", toggle: true, key: "ShiftLeft", run: () => undefined },
      ],
    });
    this.say(`${FECHA.label}. Eres una insecto-humana entre ellos. Botón de inicio: salir del microcosmos.`, 7);
  }

  private say(text: string, seconds = 4): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("on");
    this.toastFor = seconds;
  }

  // --- The place -------------------------------------------------------------------------------------------------
  private build(): void {
    const s = this.scene;
    const lambert = new THREE.MeshLambertMaterial({ vertexColors: true });
    const ground = new Batch();
    // The plain round the district, then its ground: earth, the Dromos's beaten road, the grove's grass, the track's sand.
    ground.box(-HALF * 4 * K, -0.3 * K, -HALF * 4 * K, HALF * 4 * K, -0.02 * K, HALF * 4 * K, 0xa89a6e);
    ground.box(-HALF * K, -0.02 * K, -HALF * K, HALF * K, 0, HALF * K, 0xb9a77a);
    for (const l of LUGARES_ABIERTOS) ground.box(l.x0 * K, 0, l.z0 * K, l.x1 * K, 0.01 * K, l.z1 * K, l.ground);
    // The Dromos goes on to the city.
    ground.box(-20 * K, 0, HALF * K, 20 * K, 0.01 * K, 520 * K, 0xc9b48e);
    for (const p of PUENTES) ground.box(p.x0 * K, 0, p.z0 * K, p.x1 * K, 0.15 * K, p.z1 * K, 0x8a6a42);
    s.add(ground.mesh(lambert)!);

    const stone = new Batch();
    for (const m of PERIBOLO_MUROS) drawWall(stone, m, 0, 0xcfc2a4);
    for (const e of EDIFICIOS) {
      stone.box(e.x0 * K, 0, e.z0 * K, e.x1 * K, e.floor * K, e.z1 * K, 0xd8ccb2);
      for (const c of e.courts ?? []) stone.box(c.x0 * K, e.floor * K, c.z0 * K, c.x1 * K, e.floor * K + 0.02 * K, c.z1 * K, e.id === "palestra" ? 0xe9d6a6 : 0xb8a888);
      for (const m of e.walls) drawWall(stone, m, e.floor, e.color);
      for (const c of e.things) drawThing(stone, c, e.floor);
      this.roofs.push({ e, mesh: roofOf(e) });
    }
    for (const c of [...ALTARES, ...COSAS_FUERA]) drawThing(stone, c, 0);
    // The fountain's basin.
    for (const a of AGUAS) if (a.id === "fuente") stone.box(a.x0 * K, 0, a.z0 * K, a.x1 * K, 0.8 * K, a.z1 * K, 0xcfc8b8);
    s.add(stone.mesh(lambert)!);
    for (const r of this.roofs) s.add(r.mesh);

    // The columns, all at once.
    const cols = EDIFICIOS.flatMap((e) => (e.columns ?? []).map((c) => ({ ...c, y: e.floor })));
    if (cols.length) {
      const geo = new THREE.CylinderGeometry(0.24 * K, 0.28 * K, 1, 12);
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xf2eee4 }), cols.length);
      cols.forEach((c, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(c.x * K, (c.y + c.h / 2) * K, c.z * K), new THREE.Quaternion(), new THREE.Vector3((c.d / 0.55), c.h * K, c.d / 0.55))));
      s.add(im);
    }

    // Water: the channel and the fountain.
    const water = new Batch();
    for (const a of AGUAS) {
      const top = a.id === "fuente" ? 0.7 : -0.05;
      water.box(a.x0 * K + (a.id === "fuente" ? 0.1 * K : 0), (top - a.depth) * K, a.z0 * K + (a.id === "fuente" ? 0.1 * K : 0), a.x1 * K - (a.id === "fuente" ? 0.1 * K : 0), top * K, a.z1 * K - (a.id === "fuente" ? 0.1 * K : 0), 0x3f86a8);
    }
    s.add(water.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }))!);

    // The trees: two instanced meshes (trunk, crown) per kind.
    const all = trees();
    const byKind = new Map<Arbol, typeof all>();
    for (const t of all) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t]);
    const CROWN: Record<Arbol, number> = { olivo: 0x7d8f62, platano: 0x4f7a3a, olmo: 0x55703a, alamo: 0x9fb38a, higuera: 0x5f8a3a };
    for (const [kind, list] of byKind) {
      const a = ARBOLES[kind];
      const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.7, 1, 7), new THREE.MeshLambertMaterial({ color: kind === "alamo" || kind === "platano" ? 0xbfb8a8 : 0x6a5a44 }), list.length);
      const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: CROWN[kind] }), list.length);
      list.forEach((t, i) => {
        const h = a.h * t.s * K;
        const r = a.crown * t.s * K;
        const tr = kind === "platano" ? 0.5 : kind === "olivo" ? 0.25 : 0.3;
        trunk.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t.x * K, (h - r) / 2, t.z * K), new THREE.Quaternion(), new THREE.Vector3(tr * K, h - r, tr * K)));
        const tall = kind === "alamo" ? 1.8 : kind === "olivo" ? 0.7 : 1;
        crown.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t.x * K, h - r * tall * 0.6, t.z * K), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.x), new THREE.Vector3(r, r * tall, r)));
      });
      s.add(trunk, crown);
    }

    // The landmark's fire, and the background: Kolonos, the walls and the Acropolis.
    const prom = ALTARES.find((a) => a.fire)!;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35 * K, 0.9 * K, 8), new THREE.MeshBasicMaterial({ color: 0xffa23a }));
    flame.position.set(prom.x * K, (prom.h + 0.45) * K, prom.z * K);
    this.flames.push(flame);
    s.add(flame);
    const back = new Batch();
    for (const f of FONDO) {
      if (f.kind === "colina") back.add(new THREE.SphereGeometry(f.r * K, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x8a8a5a, new THREE.Matrix4().compose(new THREE.Vector3(f.x * K, 0, f.z * K), new THREE.Quaternion(), new THREE.Vector3(1, f.h / f.r, 1)));
      if (f.kind === "murallas") {
        back.box((f.x - f.r) * K, 0, (f.z - 4) * K, (f.x - 22) * K, f.h * K, (f.z + 4) * K, 0xc8b898);
        back.box((f.x + 22) * K, 0, (f.z - 4) * K, (f.x + f.r) * K, f.h * K, (f.z + 4) * K, 0xc8b898);
        back.box((f.x - 22) * K, 0, (f.z - 6) * K, (f.x - 12) * K, (f.h + 4) * K, (f.z + 6) * K, 0xc8b898);
        back.box((f.x + 12) * K, 0, (f.z - 6) * K, (f.x + 22) * K, (f.h + 4) * K, (f.z + 6) * K, 0xc8b898);
      }
      if (f.kind === "acropolis") {
        back.add(new THREE.CylinderGeometry(f.r * 0.8 * K, f.r * K, f.h * K, 16), 0xa89a78, M(f.x * K, (f.h / 2) * K, f.z * K));
        back.box((f.x - 35) * K, f.h * K, (f.z - 15) * K, (f.x + 35) * K, (f.h + 16) * K, (f.z + 15) * K, 0xf0ece0);
        back.add(new THREE.ConeGeometry(42 * K, 6 * K, 4), 0xe8e2d4, new THREE.Matrix4().compose(new THREE.Vector3(f.x * K, (f.h + 19) * K, f.z * K), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4), new THREE.Vector3(1, 1, 0.45)));
      }
    }
    s.add(back.mesh(lambert)!);

    // The cart and its donkey.
    const cb = new Batch();
    cb.box(-0.7 * K, 0.55 * K, -1.1 * K, 0.7 * K, 0.75 * K, 1.1 * K, 0x8a6a42);
    for (const sx of [-1, 1]) cb.add(new THREE.CylinderGeometry(0.5 * K, 0.5 * K, 0.1 * K, 14), 0x5a4a32, new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(sx * 0.78 * K, 0.5 * K, 0));
    cb.box(-0.06 * K, 0.6 * K, -2.6 * K, 0.06 * K, 0.7 * K, -1.1 * K, 0x6a5a40);
    cb.box(-0.25 * K, 0.7 * K, -3.6 * K, 0.25 * K, 1.2 * K, -2.4 * K, 0x8a8478);
    cb.box(-0.12 * K, 1.0 * K, -4.1 * K, 0.12 * K, 1.35 * K, -3.5 * K, 0x8a8478);
    for (const [lx, lz] of [[-0.18, -3.5], [0.18, -3.5], [-0.18, -2.5], [0.18, -2.5]] as const) cb.box((lx - 0.05) * K, 0, (lz - 0.05) * K, (lx + 0.05) * K, 0.7 * K, (lz + 0.05) * K, 0x7a746a);
    this.cart.add(cb.mesh(lambert)!);
    s.add(this.cart);
  }

  // --- The people --------------------------------------------------------------------------------------------------
  private buildPeople(): void {
    const add = (id: string, name: string, papel: Papel, robe: number, hair: number, feminine: boolean, vida?: Vida) => {
      const f = new CubeFigure(0xd9a87e, robe, hair, feminine);
      const g = new THREE.Group();
      g.add(f.root);
      const sign = textSign(name);
      this.scene.add(g, sign);
      const i = this.people.length;
      const p: Gente = { id, f, g, sign, name, papel, vida, at: "ciudad", what: "dormir", block: -1, s: 0, wait: 0, stride: 0, off: { x: (hash(i, 1) - 0.5) * 2, z: (hash(i, 2) - 0.5) * 2 }, seed: i };
      this.people.push(p);
      return p;
    };
    for (const p of PERSONAS) add(p.id, p.name, p.papel, p.robe, p.hair, !!p.feminine);
    FAMILIAS.forEach((fa, i) => {
      const v: Vida = { family: fa.family, gen: 1, bornH: -fa.age, span: Math.max(spanOf(fa.family, 1), fa.age + 3) };
      add(`familia-${i}`, fa.family, papelPorEdad(fa.age, "joven"), fa.robe, 0x3a2e24, false, v);
    });
    // Everyone where their day has them at the start (no walking in from nowhere).
    for (const p of this.people) {
      const t = this.blockOf(p);
      p.at = t.at;
      p.what = t.what;
      p.block = t.from;
      const pt = this.spot(p);
      p.g.position.copy(pt);
    }
  }

  private hour(): number {
    return (FECHA.startHour + this.clockH) % 24;
  }

  /** The person's block now: their day's, or the story's when the step now needs them there. */
  private blockOf(p: Gente) {
    const step = HISTORIA[this.story.step];
    if (step?.with === p.id) return { from: -100 - this.story.step, what: (p.papel === "maestro" ? "ensenar" : "trabajar") as Quehacer, at: step.at };
    if (p.id === "carretero") {
      const h = this.hour();
      if (h >= 5 && h < 20) return { from: -50, what: "trabajar" as Quehacer, at: "carro" };
    }
    return tramoAt(p.papel, this.hour());
  }

  /** Where in its place the person stands (world units). */
  private spot(p: Gente): THREE.Vector3 {
    const l = lugar(p.at);
    const r = Math.min(l.r, 8);
    return new THREE.Vector3((l.x + p.off.x * r) * K, 0, (l.z + p.off.z * r) * K).setY(this.floorY(l.x + p.off.x * r, l.z + p.off.z * r));
  }

  private floorY(x: number, z: number): number {
    for (const e of EDIFICIOS) if (x >= e.x0 && x <= e.x1 && z >= e.z0 && z <= e.z1) return e.floor * K;
    return 0;
  }

  private lifeTick(p: Gente): void {
    if (!p.vida) return;
    const v = lineAt(p.vida, this.clockH);
    const age = ageAt(v, this.clockH);
    if (v.gen !== p.vida.gen) {
      p.vida = v;
      p.name = `${v.family}${roman(v.gen)}`;
      this.scene.remove(p.sign);
      p.sign.material.map?.dispose();
      p.sign.material.dispose();
      p.sign = textSign(p.name);
      this.scene.add(p.sign);
    }
    p.papel = papelPorEdad(age, "joven");
    p.g.scale.setScalar(tallaPorEdad(age));
  }

  private movePeople(dt: number): void {
    const clock = this.clockH * 3600;
    const near = (p: Gente) => p.g.position.distanceTo(this.host.camera.position) < 220;
    this.people.forEach((p, i) => {
      this.lifeTick(p);
      const t = this.blockOf(p);
      if (t.from !== p.block || t.at !== p.at) {
        if (t.at !== p.at) {
          // Each sets off at their own moment.
          p.wait = hash(i, Math.floor(this.clockH * 10)) * 25;
          const pts = ruta(p.at, t.at);
          const end = this.spot({ ...p, at: t.at });
          p.way = [p.g.position.clone(), ...pts.slice(1, -1).map(([x, z]) => new THREE.Vector3(x * K, this.floorY(x, z), z * K)), end];
          p.s = 0;
        }
        p.at = t.at;
        p.what = t.what;
        p.block = t.from;
      }
      const hidden = p.at === "ciudad" && !p.way;
      p.g.visible = !hidden;
      p.sign.visible = !hidden && near(p);
      if (p.way) {
        if (p.wait > 0) {
          p.wait -= dt;
          p.f.update(dt);
          this.placeSign(p);
          return;
        }
        p.s += PEOPLE_MS * dt;
        let d = p.s;
        let a = p.way[0]!;
        let b = a;
        let k = 1;
        for (; k < p.way.length; k++) {
          b = p.way[k]!;
          const len = a.distanceTo(b);
          if (d <= len) break;
          d -= len;
          a = b;
        }
        if (k >= p.way.length) {
          p.g.position.copy(p.way[p.way.length - 1]!);
          p.way = undefined;
        } else {
          const len = a.distanceTo(b) || 1;
          p.g.position.lerpVectors(a, b, d / len);
          p.g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
          if (near(p)) p.f.walk((p.stride += PEOPLE_MS * dt * 3), 1);
        }
      } else if (near(p)) this.doThere(p, dt, clock + i * 1.7);
      p.f.update(dt);
      this.placeSign(p);
    });
  }

  private placeSign(p: Gente): void {
    p.sign.position.set(p.g.position.x, p.g.position.y + 2.1 * p.g.scale.y, p.g.position.z);
  }

  /** What they do at their place: lessons, wrestling, running the track, cooking, sleeping, the walk under the planes. */
  private doThere(p: Gente, dt: number, clock: number): void {
    const f = p.f;
    switch (p.what) {
      case "dormir":
        f.pose("supine");
        return;
      case "comer":
      case "cenar":
        f.pose(p.at === "casa-andron" ? "sit-recline" : "sit");
        return;
      case "aprender":
        f.pose("sit");
        return;
      case "estudiar":
        f.pose("write");
        return;
      case "ensenar":
        f.poseAngles(motion("pedir", clock));
        return;
      case "entrenar":
        f.poseAngles(motion(TRAIN[p.seed % TRAIN.length]!, clock));
        return;
      case "trabajar":
        f.poseAngles(motion(p.at.startsWith("casa") ? "cocinar" : p.at === "carro" ? "respirar" : "golpear", clock));
        return;
      case "cuidar":
        f.poseAngles(motion(p.seed % 2 ? "agacharse" : "mezclar", clock));
        return;
      case "lavarse":
        f.pose("stand-hands");
        return;
      case "correr":
      case "pasear": {
        // Up and down the track, or slowly round the walk.
        const l = lugar(p.at);
        const run = p.what === "correr";
        if (!p.stroll || p.g.position.distanceTo(p.stroll) < 0.5) {
          const r = run ? 0 : l.r;
          const z = run ? (hash(p.seed, Math.floor(clock / 40)) < 0.5 ? -120 : 50) : l.z + (hash(p.seed, Math.floor(clock)) - 0.5) * 2 * r;
          p.stroll = new THREE.Vector3((l.x + (run ? p.off.x * 5 : (hash(p.seed, Math.floor(clock) + 3) - 0.5) * 2 * r)) * K, 0, z * K);
        }
        const v = p.stroll.clone().sub(p.g.position).setY(0);
        const sp = run ? 5 : STROLL_MS;
        const step = Math.min(v.length(), sp * dt);
        p.g.position.addScaledVector(v.normalize(), step);
        p.g.rotation.y = Math.atan2(v.x, v.z);
        if (run) f.run((p.stride += dt * 2.4));
        else f.walk((p.stride += sp * dt * 3), 0.6);
        return;
      }
      default:
        f.pose("stand");
    }
  }

  // --- The cart of the Dromos --------------------------------------------------------------------------------------
  private moveCart(dt: number): void {
    const len = Math.hypot(CARRO.to.x - CARRO.from.x, CARRO.to.z - CARRO.from.z);
    const h = this.hour();
    const working = h >= 5 && h < 20;
    if (this.cartWait > 0) this.cartWait -= dt;
    else if (working || this.riding) {
      this.cartS += (this.cartDir * CARRO.speed * dt) / len;
      if (this.cartS >= 1 || this.cartS <= 0) {
        this.cartS = Math.max(0, Math.min(1, this.cartS));
        this.cartDir *= -1;
        this.cartWait = 20;
        if (this.riding) this.getOff();
      }
    }
    const x = CARRO.from.x + (CARRO.to.x - CARRO.from.x) * this.cartS;
    const z = CARRO.from.z + (CARRO.to.z - CARRO.from.z) * this.cartS;
    this.cart.position.set(x * K, 0, z * K);
    this.cart.rotation.y = this.cartDir > 0 ? Math.PI : 0;
    const driver = this.people.find((p) => p.id === "carretero");
    if (driver && driver.at === "carro" && !driver.way) {
      driver.g.position.set((x - 1.4) * K, 0, z * K);
      driver.g.rotation.y = this.cart.rotation.y + Math.PI;
      if (this.cartWait <= 0) driver.f.walk((driver.stride += dt * 3), 0.7);
    }
  }

  private getOff(): void {
    this.riding = false;
    const x = this.cart.position.x - 2.2 * K;
    const z = this.cart.position.z;
    this.body = placeAt(this.world, x, 0.01, z) ?? this.body;
    this.say(this.cartS >= 1 ? "El carro ha llegado a la puerta de la Academia" : "El carro ha vuelto al final del camino", 3);
  }

  // --- Her, the story and its challenges --------------------------------------------------------------------------
  private storyTick(): void {
    if (this.challenge) return;
    const step = HISTORIA[this.story.step];
    const x = this.body.x / K;
    const z = this.body.z / K;
    if (step) {
      const here = estaEn(step.at, x, z);
      const before = this.story;
      if (here && !this.story.there) this.story = avanzar(HISTORIA, this.story, { kind: "llega", at: step.at });
      else if (!here && this.story.there) this.story = avanzar(HISTORIA, this.story, { kind: "sale", at: step.at });
      if (this.story.step !== before.step) this.stepDone();
    }
    // The orange button: the step's challenge where it is, or the cart when it is at hand.
    const cur = HISTORIA[this.story.step];
    const cartNear = !this.riding && Math.hypot(this.cart.position.x - this.body.x, this.cart.position.z - this.body.z) < 3.2 * K;
    let key = "";
    if (cur?.reto && this.story.there) key = `reto:${cur.reto}`;
    else if (cartNear) key = "carro";
    if (key === this.offered) return;
    this.offered = key;
    if (key.startsWith("reto:")) {
      const q = RETOS_ACADEMIA[cur!.reto!]!;
      RootMenu.interact(retoButton(q.title, () => this.openReto(cur!.reto!)));
    } else if (key === "carro") RootMenu.interact({ icon: ICON.machine, label: "Subir al carro", onClick: () => this.ride() });
    else RootMenu.interact(undefined);
  }

  private stepDone(): void {
    this.missionEl.textContent = linea(HISTORIA, this.story);
    if (acabada(HISTORIA, this.story)) this.say("Historia completa: has vivido un día en la Academia de Platón. Botón de inicio para salir.", 8);
    else this.say(`Hecho. ${linea(HISTORIA, this.story)}`, 5);
  }

  private ride(): void {
    this.riding = true;
    this.offered = "";
    RootMenu.interact(undefined);
    this.say("En el carro, por el Dromos entre las tumbas", 3);
  }

  private openReto(id: string): void {
    const r = procedureReto(RETOS_ACADEMIA[id]!);
    const run = new ChoreRun(r.chore);
    this.challenge = r;
    this.offered = "";
    RootMenu.interact(undefined);
    this.avatar.pose("stand");
    const duel = this.host.duel;
    duel.onClose = () => {
      duel.onClose = undefined;
      this.challenge = undefined;
      const ok = run.status === "done";
      const before = this.story.step;
      this.story = avanzar(HISTORIA, this.story, { kind: "reto", id, ok });
      if (ok) this.say(`${r.chore.title}: hecho. ${this.host.reward(r.reward)}`, 5);
      if (this.story.step !== before) this.stepDone();
    };
    duel.show(
      {
        get current() {
          return run.current;
        },
        get progress() {
          return run.step;
        },
        goal: run.steps,
        get lives() {
          return run.mistakesLeft;
        },
        maxLives: run.maxMistakes,
      },
      { ...this.host.sheet, title: r.chore.title },
      (ans: Answer) => ({ ok: run.submit(ans) }),
    );
  }

  private leave(): void {
    if (this.challenge) return;
    this.host.exit();
  }

  /** One frame: she, the people, the cart, the clock, the camera. Returns nothing; the host renders `scene`. */
  frame(dt: number): void {
    if (this.disposed) return;
    this.clockH += (24 * dt) / S1_DAY_REAL_S;
    const cam = this.host.camera;
    const walker = this.host.walker;
    this.moveCart(dt);
    let moving = false;
    if (this.riding) {
      this.body = { ...this.body, x: this.cart.position.x, y: 0.75 * K, z: this.cart.position.z };
    } else if (!this.challenge) {
      const c = this.walk.carry(dt, this.body);
      this.body = c.body;
      if (!c.busy) {
        const mv = walker.move();
        moving = mv.forward !== 0 || mv.right !== 0;
        this.body = this.walk.move(dt, this.body, { ...mv, yaw: this.yaw, pitch: this.pitch, run: this.pad.isOn("B") });
      }
    }
    this.movePeople(dt);
    this.storyTick();
    // The camera: hers, first or third person.
    const look = walker.look(dt);
    this.yaw += look.yaw;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch + look.pitch));
    if (!this.thirdPerson && !this.riding) this.walk.facing = this.yaw;
    this.rig.position.set(this.body.x, this.body.y, this.body.z);
    this.rig.rotation.y = (this.thirdPerson ? this.walk.facing : this.yaw) + Math.PI;
    const eye = this.body.y + EYE_M;
    if (this.thirdPerson || this.riding) {
      const d = 3.6;
      cam.position.set(this.body.x + Math.sin(this.yaw) * d * Math.cos(this.pitch), eye + 0.4 - Math.sin(this.pitch) * d, this.body.z + Math.cos(this.yaw) * d * Math.cos(this.pitch));
      cam.lookAt(this.body.x, eye - 0.2, this.body.z);
      this.rig.visible = true;
    } else {
      cam.position.set(this.body.x, eye, this.body.z);
      cam.rotation.set(this.pitch, this.yaw, 0);
      this.rig.visible = false;
    }
    if (this.riding) this.avatar.pose("ride");
    else poseOnFoot(this.avatar, this.walk, { body: this.body, moving, sprinting: moving && this.pad.isOn("B"), lotus: false, clock: this.clockH * 3600 }, dt);
    this.avatar.update(dt);
    // The cut-away view: a building's roof is not drawn while she is in it.
    const x = this.body.x / K;
    const z = this.body.z / K;
    for (const r of this.roofs) r.mesh.visible = !(x >= r.e.x0 && x <= r.e.x1 && z >= r.e.z0 && z <= r.e.z1);
    const tt = this.clockH * 3600;
    for (const f of this.flames) f.scale.set(1 + Math.sin(tt * 9) * 0.08, 1 + Math.sin(tt * 13) * 0.15, 1 + Math.cos(tt * 11) * 0.08);
    const hour = this.hour();
    this.dayNight.update(hour, cam);
    const hh = Math.floor(hour);
    const where = `Microcosmos · ${hh}:${String(Math.floor((hour - hh) * 60)).padStart(2, "0")} · ${this.riding ? "En el carro del Dromos" : zonaLabel(zonaAt(x, z))}`;
    if (this.whereEl.textContent !== where) this.whereEl.textContent = where;
    if (this.toastFor > 0 && (this.toastFor -= dt) <= 0) this.toastEl.classList.remove("on");
  }

  /** The figures and the draw calls (performance, for the live checks). */
  stats(): { people: number; calls: number; triangles: number } {
    const info = this.host.renderer.info.render;
    return { people: this.people.length, calls: info.calls, triangles: info.triangles };
  }

  /** Test hook: the story's state, and a way to put her somewhere (real metres). */
  get state(): EstadoHistoria {
    return this.story;
  }
  teleport(x: number, z: number): void {
    this.body = placeAt(this.world, x * K, this.floorY(x, z) + 0.01, z * K) ?? this.body;
  }
  setHour(h: number): void {
    this.clockH = (((h - FECHA.startHour) % 24) + 24) % 24;
  }

  /** Everything let go: the GPU's geometries, materials and textures, the HUD, the pad. */
  dispose(): void {
    this.disposed = true;
    if (this.challenge) this.host.duel.interrupt();
    RootMenu.interact(undefined);
    GamePad.release(this);
    this.ui.remove();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        (mat as THREE.SpriteMaterial).map?.dispose();
        mat.dispose();
      }
    });
    this.scene.clear();
  }
}
