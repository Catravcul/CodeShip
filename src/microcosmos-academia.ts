import * as THREE from "three";
import { placeAt, type Body } from "@modules/aerial-sanctuary/domain/walk";
import { FreeWalk } from "@modules/aerial-sanctuary/application/free-walk";
import { AGUAS, ALTARES, ARBOLES, CARRO, COSAS_FUERA, EDIFICIOS, FAMILIAS, FECHA, FONDO, HALF, HISTORIA, LUGARES_ABIERTOS, PERIBOLO, PERIBOLO_MUROS, PERSONAS, PORTAL, PUENTES, trees, type Arbol, type Cosa, type Edificio, type Muro } from "@modules/microcosmos/data/academia";
import { PASOS_ACADEMIA, PASOS_DIALOGO, RETOS_ACADEMIA } from "@modules/microcosmos/data/retos-academia";
import { DIALOGOS } from "@modules/microcosmos/data/dialogos-academia";
import { academiaWorld, estaEn, K, lugar, ruta, stairRects, zonaAt, zonaLabel } from "@modules/microcosmos/application/mundo";
import { Batch, doric, drawThing, drawWall, M, roofOf } from "./adapters/three/academia-art";
import { acabada, avanzar, START, type EstadoHistoria } from "@modules/microcosmos/domain/historia";
import { ageAt, lineAt, papelPorEdad, spanOf, tallaPorEdad, tramoAt, type Papel, type Quehacer, type Vida } from "@modules/microcosmos/domain/vida";
import { procedureReto, type Reto } from "@modules/sanctuary-one/application/challenges";
import type { Procedure, Reward } from "@modules/sanctuary-one/data/retos";
import { S1_DAY_REAL_S } from "@modules/sanctuary-one/domain/motion";
import { greekOutfit } from "@modules/sanctuary-one/domain/ropa";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { CubeFigure } from "./adapters/three/interior/figure";
import { textSign } from "./adapters/three/interior/sign";
import { motion } from "./adapters/three/interior/step-show";
import { DayNight } from "./adapters/three/day-night";
import { sheetLens } from "./adapters/three/interior/reto-focus";
import { sheetBand } from "./ui/sheet-band";
import "./ui/microcosmos.css";
import type { MotionId } from "@modules/sanctuary-one/data/animaciones";
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
  /** Back to the machine in sanctuary 1 (through the portal). */
  exit(): void;
  /** The settings (the pad's home button, as in sanctuary 1). */
  openSettings(): void;
}

const WALK_MS = 2.2;
const SWIM_MS = 1.6;
const EYE_M = 1.45;
const PEOPLE_MS = 1.4;
/** Walking slowly along a walk. */
const STROLL_MS = 0.7;

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
  readonly feminine: boolean;
  readonly robe: number;
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
  /** The open challenge's stage: who is with her, the camera's orbit round them, the step she last solved. */
  private stage?: { partner?: Gente; cx: number; cy: number; cz: number; yaw: number; pitch: number; dist: number; step: number; her: readonly MotionId[]; them: readonly MotionId[]; lensKey: string };
  private frameNo = 0;
  /** The third-person camera's distance (a pinch, the wheel; Berón 2026-11-24: «no había zoom»). */
  private camDist = 4.2;
  private readonly portal = new THREE.Group();
  private bornAt = 0;
  private readonly beacon = new THREE.Group();
  private readonly arrowEl: HTMLElement;
  private readonly cardEl: HTMLElement;
  private cardFor = 0;
  private readonly missionsEl: HTMLElement;
  /** Who she is talking with (they keep still and gesture). */
  private talking?: Gente;
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
    this.ui.innerHTML = `<div class="cab-where"></div><div class="cab-where micro-mision" style="top:calc(48px + env(safe-area-inset-top));right:12px;color:#ffe2a8"></div><div class="cab-toast" role="status" style="top:calc(140px + env(safe-area-inset-top))"></div>`;
    host.root.appendChild(this.ui);
    this.whereEl = this.ui.children[0] as HTMLElement;
    this.missionEl = this.ui.children[1] as HTMLElement;
    this.toastEl = this.ui.children[2] as HTMLElement;
    this.missionLine();
    // Where to go: an arrow and the distance (the step's place also has a beam of light over it).
    this.arrowEl = document.createElement("div");
    this.arrowEl.className = "micro-arrow";
    this.arrowEl.innerHTML = `<span class="micro-arrow-head">➤</span><span class="micro-arrow-text"></span>`;
    this.ui.appendChild(this.arrowEl);
    // The story in pictures: a card for each step reached.
    this.cardEl = document.createElement("div");
    this.cardEl.className = "micro-card";
    this.ui.appendChild(this.cardEl);
    this.missionsEl = document.createElement("div");
    this.missionsEl.className = "micro-missions hidden";
    host.root.appendChild(this.missionsEl);
    this.pad = GamePad.use(host.root, this, {
      zoom: (dir) => host.walker.holdZoom(dir),
      plus: { label: "Misiones", open: () => this.openMissions() },
      view: () => (this.thirdPerson = !this.thirdPerson),
      // Settings, as in sanctuary 1 (Berón 2026-11-24: «el botón de ajustes… me ha enviado de vuelta»); the way out is
      // the portal.
      home: () => host.openSettings(),
      paused: () => !!this.challenge,
      moves: [
        { letter: "X", label: "Trepar", key: "KeyC", run: () => this.walk.startClimb(this.body, this.yaw) || this.say("Nada que trepar delante", 2) },
        { letter: "A", label: "Saltar", key: "Space", run: () => { const mv = host.walker.move(); this.walk.startJump(this.body, mv.forward !== 0 || mv.right !== 0, this.pad.isOn("B")); } },
        { letter: "B", label: "Correr", toggle: true, key: "ShiftLeft", run: () => undefined },
      ],
    });
    this.say(`${FECHA.label}. Eres una insecto-humana entre ellos. Para volver, el portal junto al camino.`, 7);
    this.showCard(0);
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
    for (const m of PERIBOLO_MUROS) drawWall(stone, m, 0, 0xcfc2a4, K, false);
    for (const e of EDIFICIOS) {
      // Its plinth (the krepis) and its steps.
      stone.box(e.x0 * K, 0, e.z0 * K, e.x1 * K, e.floor * K, e.z1 * K, 0xd8ccb2);
      for (const st of e.stairs ?? []) for (const r of stairRects(e, st)) stone.box(r.x0 * K, 0, r.z0 * K, r.x1 * K, r.y * K, r.z1 * K, 0xe2d8c2);
      // Its floor: the rooms paved (a pebble mosaic in the andron), the courts of sand or beaten earth.
      stone.box(e.x0 * K, e.floor * K, e.z0 * K, e.x1 * K, e.floor * K + 0.01 * K, e.z1 * K, e.thatch ? 0x9a8a62 : 0xcfc4ae);
      for (const r of e.rooms) if (r.id === "casa-andron") stone.box(r.x0 * K + 0.3 * K, e.floor * K + 0.01 * K, r.z0 * K + 0.3 * K, r.x1 * K - 0.3 * K, e.floor * K + 0.02 * K, r.z1 * K - 0.3 * K, 0x2a3a4a);
      for (const c of e.courts ?? []) stone.box(c.x0 * K, e.floor * K, c.z0 * K, c.x1 * K, e.floor * K + 0.02 * K, c.z1 * K, e.id === "palestra" ? 0xe9d6a6 : 0xb8a888);
      for (const m of e.walls) drawWall(stone, m, e.floor, e.thatch ? 0xb59a74 : e.color, K, !!e.painted);
      for (const c of e.things) drawThing(stone, c, e.floor, K);
      for (const c of e.columns ?? []) doric(stone, c.x * K, e.floor * K, c.z * K, c.h * K, c.d * K);
      this.roofs.push({ e, mesh: roofOf(e, K, e.thatch) });
    }
    for (const c of [...ALTARES, ...COSAS_FUERA]) drawThing(stone, c, 0, K);
    // The fountain: a stone basin with its spout on a pillar.
    for (const a of AGUAS)
      if (a.id === "fuente") {
        stone.box(a.x0 * K, 0, a.z0 * K, a.x1 * K, 0.8 * K, a.z1 * K, 0xcfc8b8);
        stone.box(((a.x0 + a.x1) / 2 - 0.3) * K, 0, (a.z0 - 0.5) * K, ((a.x0 + a.x1) / 2 + 0.3) * K, 1.8 * K, a.z0 * K, 0xe8e2d4);
        stone.add(new THREE.SphereGeometry(0.15 * K, 8, 6), 0xb87338, M(((a.x0 + a.x1) / 2) * K, 1.4 * K, (a.z0 + 0.05) * K));
      }
    s.add(stone.mesh(lambert)!);
    for (const r of this.roofs) s.add(r.mesh);

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
    this.buildPortal();
    this.buildBeacon();
  }

  /**
   * The portal back (Cold Sanctuary's GalaxyPortal): a black hole with its glowing accretion disc and two spiral arms of
   * blue and violet stars, turning slowly, standing by the road's end. Walking into it takes her back.
   */
  private buildPortal(): void {
    const r = PORTAL.r * K;
    const g = this.portal;
    const unlit = (c: number, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 24, 16), unlit(0x020205)));
    const disk = new THREE.Group();
    disk.rotation.x = (72 * Math.PI) / 180;
    for (const [rr, c] of [[0.32, 0xfff2d8], [0.42, 0xffc673], [0.52, 0xff9a40]] as const) disk.add(new THREE.Mesh(new THREE.TorusGeometry(r * rr, r * 0.035, 8, 48), unlit(c)));
    g.add(disk);
    const arms = new THREE.Group();
    const star = new THREE.BoxGeometry(1, 1, 1);
    const blue = unlit(0x8cb3ff);
    const violet = unlit(0xbf8cf2);
    for (let arm = 0; arm < 2; arm++)
      for (let i = 0; i < 60; i++) {
        const t = i / 60;
        const a = arm * Math.PI + t * Math.PI * 2.6;
        const rr = r * (0.5 + t * 0.9);
        const m = new THREE.Mesh(star, i % 3 ? blue : violet);
        m.position.set(Math.cos(a) * rr + (hash(i, arm) - 0.5) * 0.18 * r, Math.sin(a) * rr + (hash(arm, i) - 0.5) * 0.18 * r, (hash(i + 7, arm) - 0.5) * 0.08 * r);
        m.scale.setScalar(r * (0.05 + 0.04 * (1 - t)));
        arms.add(m);
      }
    g.add(arms);
    g.userData = { disk, arms };
    g.position.set(PORTAL.x * K, r * 1.1, PORTAL.z * K);
    const label = textSign("Portal de vuelta al santuario");
    label.position.set(PORTAL.x * K, r * 2.4, PORTAL.z * K);
    this.scene.add(g, label);
  }

  /** A beam of light and a turning gem over the current step's place (the way, shown in the world). */
  private buildBeacon(): void {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 20;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xffb02a }));
    gem.position.y = 9;
    this.beacon.add(beam, gem);
    this.beacon.userData = { gem };
    this.scene.add(this.beacon);
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
      const p: Gente = { id, f, g, sign, name, papel, vida, at: "ciudad", what: "dormir", block: -1, s: 0, wait: 0, stride: 0, off: { x: (hash(i, 1) - 0.5) * 2, z: (hash(i, 2) - 0.5) * 2 }, seed: i, feminine, robe };
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
      // Dressed as in Athens then, for what they do (domain/ropa.ts): exomis to exercise, a short chiton to work.
      const what = t.what === "entrenar" || t.what === "correr" ? "ejercicio" : t.what === "cuidar" || (t.what === "trabajar" && p.papel !== "maestro") ? "trabajo" : undefined;
      p.f.wear(greekOutfit({ feminine: p.feminine, robe: p.robe, what, elder: p.papel === "maestro" || p.papel === "anciano" }));
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
      if (p.id === "carretero" && p.at === "carro" && !p.way) {
        // Moved and posed with his cart (moveCart).
        p.g.visible = true;
        p.sign.visible = near(p);
        return;
      }
      if (p === this.talking) {
        const st = this.stage;
        p.f.poseAngles(motion(st && st.step >= 0 ? st.them[st.step]! : "respirar", clock + i));
        p.f.update(dt);
        this.placeSign(p);
        return;
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
    // The donkey ahead (the cart's −z), pulling it the way it goes (Berón 2026-11-24: it went backwards, «como siendo
    // jalado»): towards the gate it faces −z as drawn, back to the road's end it turns round.
    this.cart.rotation.y = this.cartDir > 0 ? 0 : Math.PI;
    const driver = this.people.find((p) => p.id === "carretero");
    if (driver && driver.at === "carro" && !driver.way) {
      // He walks by the donkey's head, leading it, facing where they go.
      const r = this.cart.rotation.y;
      const lx = -0.9 * K, lz = -3.0 * K;
      driver.g.position.set(x * K + lx * Math.cos(r) + lz * Math.sin(r), 0, z * K - lx * Math.sin(r) + lz * Math.cos(r));
      driver.g.rotation.y = r + Math.PI;
      if (this.cartWait <= 0 && (working || this.riding)) driver.f.walk((driver.stride += CARRO.speed * dt * 3), 1);
      else driver.f.pose("stand");
      driver.f.update(dt);
      driver.sign.position.set(driver.g.position.x, driver.g.position.y + 2.1, driver.g.position.z);
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
    // …or a talk with whoever of the story's people is at hand (their dialogue, a challenge too).
    const talk = cartNear ? undefined : this.people.find((p) => DIALOGOS[p.id] && p.g.visible && Math.hypot(p.g.position.x - this.body.x, p.g.position.z - this.body.z) < 2.2 * K);
    let key = "";
    if (cur?.reto && this.story.there) key = `reto:${cur.reto}`;
    else if (cartNear) key = "carro";
    else if (talk) key = `hablar:${talk.id}`;
    if (key === this.offered) return;
    this.offered = key;
    if (key.startsWith("reto:")) {
      const q = RETOS_ACADEMIA[cur!.reto!]!;
      RootMenu.interact(retoButton(q.title, () => this.openReto(cur!.reto!)));
    } else if (key === "carro") RootMenu.interact({ icon: ICON.machine, label: "Subir al carro", onClick: () => this.ride() });
    else if (talk) RootMenu.interact(retoButton(`Hablar con ${talk.name}`, () => this.talk(talk)));
    else RootMenu.interact(undefined);
  }

  /** A talk: they turn to her and speak while she orders what is said. */
  private talk(p: Gente): void {
    this.talking = p;
    p.g.rotation.y = Math.atan2(this.body.x - p.g.position.x, this.body.z - p.g.position.z);
    this.open(
      DIALOGOS[p.id]!,
      (ok, r) => {
        this.talking = undefined;
        if (ok) this.say(`${r.chore.title}: ${this.host.reward(r.reward)}`, 5);
      },
      p,
    );
  }

  /** The current step, short: its picture and number (the whole of it is in the card and the missions window). */
  private missionLine(): void {
    const cur = HISTORIA[this.story.step];
    this.missionEl.textContent = cur ? `${cur.icon ?? ""} Paso ${this.story.step + 1} de ${HISTORIA.length} · ＋ Misiones` : `🏛️ Historia completa`;
  }

  private stepDone(): void {
    this.missionLine();
    if (acabada(HISTORIA, this.story)) this.showCard(HISTORIA.length, "Has vivido un día en la Academia de Platón. Vuelve por el portal cuando quieras.");
    else this.showCard(this.story.step, "Hecho. Ahora:");
  }

  /** The story in pictures: the step's picture, its number and what to do, for a few seconds. */
  private showCard(step: number, lead = ""): void {
    const cur = HISTORIA[step];
    const pics = HISTORIA.map((h, i) => `<span class="${i < this.story.step ? "done" : i === this.story.step ? "now" : ""}">${h.icon ?? "•"}</span>`).join("");
    this.cardEl.innerHTML = cur
      ? `<div class="micro-card-pic">${cur.icon ?? ""}</div><div class="micro-card-lead">${lead} Paso ${step + 1} de ${HISTORIA.length}</div><div class="micro-card-text">${cur.text}</div><div class="micro-card-strip">${pics}</div>`
      : `<div class="micro-card-pic">🏛️</div><div class="micro-card-lead">Historia completa</div><div class="micro-card-text">${lead}</div><div class="micro-card-strip">${pics}</div>`;
    this.cardEl.classList.add("on");
    this.cardFor = 6;
  }

  /**
   * The missions window (Berón 2026-11-24: «falta que se le muestre al jugador la modal de misiones para que se mueva
   * fácilmente por el lugar»): the plan of the Academy with each step's place numbered and where she is, and the steps
   * in pictures, each with «Ir» to go there; and the way back through the portal.
   */
  private openMissions(): void {
    const el = this.missionsEl;
    const X = (x: number) => x.toFixed(1);
    const rect = (r: { x0: number; x1: number; z0: number; z1: number }, fill: string, extra = "") => `<rect x="${X(r.x0)}" y="${X(r.z0)}" width="${X(r.x1 - r.x0)}" height="${X(r.z1 - r.z0)}" fill="${fill}" ${extra}/>`;
    const parts: string[] = [];
    parts.push(rect({ x0: -HALF, x1: HALF, z0: -HALF, z1: HALF }, "#cdbb8e"));
    for (const l of LUGARES_ABIERTOS) parts.push(rect(l, `#${l.ground.toString(16).padStart(6, "0")}`));
    parts.push(rect(PERIBOLO, "none", `stroke="#8a7a5a" stroke-width="1.2"`));
    for (const t of trees().filter((_, i) => i % 2 === 0)) parts.push(`<circle cx="${X(t.x)}" cy="${X(t.z)}" r="${t.kind === "platano" ? 2.6 : 1.6}" fill="${t.kind === "olivo" ? "#7d8f62" : "#4f7a3a"}"/>`);
    for (const a of AGUAS) parts.push(rect(a, "#3f86a8"));
    for (const e of EDIFICIOS) {
      parts.push(rect(e, e.thatch ? "#b59a74" : "#b5583a", `stroke="#6a3a2a" stroke-width="0.6"`));
      for (const c of e.courts ?? []) parts.push(rect(c, "#e9d6a6"));
    }
    for (const e of EDIFICIOS.filter((q) => !q.id.startsWith("choza") || q.id === "choza-0")) parts.push(`<text x="${X((e.x0 + e.x1) / 2)}" y="${X(e.z0 - 2)}" font-size="6" text-anchor="middle" fill="#2a2018">${e.id.startsWith("choza") ? "Chozas" : e.label.split(" (")[0]}</text>`);
    parts.push(`<circle cx="${PORTAL.x}" cy="${PORTAL.z}" r="5" fill="#0a0a14" stroke="#ffc673" stroke-width="1.5"/><text x="${PORTAL.x}" y="${PORTAL.z - 8}" font-size="6" text-anchor="middle" fill="#2a2018">Portal</text>`);
    HISTORIA.forEach((h, i) => {
      const l = lugar(h.at);
      const st = i < this.story.step ? "done" : i === this.story.step ? "now" : "next";
      parts.push(`<g class="mm-step ${st}"><circle cx="${X(l.x)}" cy="${X(l.z)}" r="7"/><text x="${X(l.x)}" y="${X(l.z + 2.6)}" font-size="8" text-anchor="middle">${i + 1}</text></g>`);
    });
    const bx = this.body.x / K, bz = this.body.z / K;
    parts.push(`<circle class="mm-me" cx="${X(bx)}" cy="${X(bz)}" r="4.5"/>`);
    const rows = HISTORIA.map((h, i) => {
      const st = i < this.story.step ? "done" : i === this.story.step ? "now" : "next";
      return `<li class="${st}"><span class="mm-pic">${h.icon ?? ""}</span><span class="mm-text"><b>${i + 1}.</b> ${h.text}${h.reto ? ` <em>· reto: ${RETOS_ACADEMIA[h.reto]!.title}</em>` : ""}</span><button data-go="${i}">${st === "done" ? "Volver" : "Ir"}</button></li>`;
    }).join("");
    el.innerHTML = `<div class="mm-box"><div class="mm-head"><b>Misiones · ${FECHA.label}</b><button data-close>✕</button></div><svg viewBox="${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}" class="mm-map">${parts.join("")}</svg><ol class="mm-list">${rows}</ol><button class="mm-portal" data-portal>🌀 Volver al santuario por el portal</button></div>`;
    el.classList.remove("hidden");
    el.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-close]") || t === el) return el.classList.add("hidden");
      const go = t.closest<HTMLElement>("[data-go]");
      if (go) {
        const l = lugar(HISTORIA[Number(go.dataset.go)]!.at);
        el.classList.add("hidden");
        this.teleport(l.x + 1.2, l.z + 1.2);
        return;
      }
      if (t.closest("[data-portal]")) {
        el.classList.add("hidden");
        this.teleport(PORTAL.x + 4, PORTAL.z);
        this.yaw = Math.PI / 2;
      }
    };
  }

  private ride(): void {
    this.riding = true;
    this.offered = "";
    RootMenu.interact(undefined);
    this.say("En el carro, por el Dromos entre las tumbas", 3);
  }

  private openReto(id: string): void {
    const withId = HISTORIA[this.story.step]?.with;
    const partner = this.people.find((p) => p.id === withId && !p.way && p.g.position.distanceTo(this.rig.position) < 14);
    if (partner) this.talking = partner;
    this.open(
      RETOS_ACADEMIA[id]!,
      (ok, r) => {
        this.talking = undefined;
        const before = this.story.step;
        this.story = avanzar(HISTORIA, this.story, { kind: "reto", id, ok });
        if (ok) this.say(`${r.chore.title}: hecho. ${this.host.reward(r.reward)}`, 5);
        if (this.story.step !== before) this.stepDone();
      },
      partner,
    );
  }

  private open(proc: Procedure, done: (ok: boolean, r: Reto) => void, partner?: Gente): void {
    const r = procedureReto(proc);
    const run = new ChoreRun(r.chore);
    this.challenge = r;
    this.offered = "";
    RootMenu.interact(undefined);
    this.avatar.pose("stand");
    // The stage: she and whoever is with her face each other; the camera looks at them from the side, and the player
    // turns it with a finger or the stick and zooms with a pinch or the zoom buttons (Berón 2026-11-24).
    const anims = PASOS_ACADEMIA[proc.id] ?? PASOS_DIALOGO;
    const cyc = (xs: readonly MotionId[], n: number) => Array.from({ length: n }, (_, i) => xs[i % xs.length]!);
    let cx = this.body.x, cz = this.body.z;
    let face = this.walk.facing;
    if (partner) {
      const dx = this.body.x - partner.g.position.x, dz = this.body.z - partner.g.position.z;
      const d = Math.hypot(dx, dz) || 1;
      // She stands 1,6 m from them, facing them.
      const bx = partner.g.position.x + (dx / d) * 1.6, bz = partner.g.position.z + (dz / d) * 1.6;
      this.body = placeAt(this.world, bx, this.body.y + 0.3, bz) ?? this.body;
      face = Math.atan2(-dx, -dz);
      partner.g.rotation.y = Math.atan2(dx, dz);
      cx = (this.body.x + partner.g.position.x) / 2;
      cz = (this.body.z + partner.g.position.z) / 2;
    }
    this.walk.facing = face;
    this.stage = { partner, cx, cy: this.body.y + 1, cz, yaw: face + Math.PI / 2, pitch: 0.25, dist: 4.6, step: -1, her: cyc(anims.her, r.chore.exercises.length), them: cyc(anims.partner, r.chore.exercises.length), lensKey: "" };
    const duel = this.host.duel;
    duel.onClose = () => {
      duel.onClose = undefined;
      this.challenge = undefined;
      this.stage = undefined;
      sheetLens(this.host.camera, false);
      done(run.status === "done", r);
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
      (ans: Answer) => {
        const before = run.step;
        const ok = run.submit(ans);
        // Each solved step is acted out, over and over until the next is solved.
        if (ok && this.stage && run.step > before) this.stage.step = run.step - 1;
        return { ok };
      },
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
    // The camera: hers, first or third person; at a challenge, round her and whoever is with her.
    const look = walker.look(dt);
    const st = this.stage;
    if (st) {
      st.yaw += look.yaw;
      st.pitch = Math.max(-0.2, Math.min(1.2, st.pitch + look.pitch));
    } else {
      this.yaw += look.yaw;
      this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch + look.pitch));
    }
    if (!this.thirdPerson && !this.riding && !st) this.walk.facing = this.yaw;
    this.rig.position.set(this.body.x, this.body.y, this.body.z);
    this.rig.rotation.y = (this.thirdPerson || st ? this.walk.facing : this.yaw) + Math.PI;
    const eye = this.body.y + EYE_M;
    if (st) {
      cam.position.set(st.cx + Math.sin(st.yaw) * st.dist * Math.cos(st.pitch), st.cy + Math.sin(st.pitch) * st.dist, st.cz + Math.cos(st.yaw) * st.dist * Math.cos(st.pitch));
      cam.lookAt(st.cx, st.cy, st.cz);
      this.rig.visible = true;
      // Framed in the free band over (or between) the sheet's blocks: the panel and HUD views leave different room.
      if ((this.frameNo++ & 15) === 0) {
        const band = sheetBand();
        const key = band ? `${Math.round(band.top)}-${Math.round(band.bottom)}` : "-";
        if (key !== st.lensKey) {
          st.lensKey = key;
          sheetLens(cam, true, band ? { band } : {});
        }
      }
    } else if (this.thirdPerson || this.riding) {
      const d = this.camDist;
      cam.position.set(this.body.x + Math.sin(this.yaw) * d * Math.cos(this.pitch), eye + 0.4 - Math.sin(this.pitch) * d, this.body.z + Math.cos(this.yaw) * d * Math.cos(this.pitch));
      cam.lookAt(this.body.x, eye - 0.2, this.body.z);
      this.rig.visible = true;
    } else {
      cam.position.set(this.body.x, eye, this.body.z);
      cam.rotation.set(this.pitch, this.yaw, 0);
      this.rig.visible = false;
    }
    // Her clothes: a chiton and cloak; the exomis at the palaestra and the track, a short chiton for work (domain/ropa.ts).
    const zone = zonaAt(this.body.x / K, this.body.z / K);
    const doing = /^palestra|^pista/.test(zone) || this.challenge?.chore.title.includes("antorchas") ? "ejercicio" : /cocina|huerto|olivar|acequia/.test(zone) ? "trabajo" : undefined;
    this.avatar.wear(greekOutfit({ feminine: true, robe: 0xc9d8e8, what: doing }));
    if (st) {
      if (st.step >= 0) this.avatar.poseAngles(motion(st.her[st.step]!, this.clockH * 3600));
      else this.avatar.pose("stand");
    } else if (this.riding) this.avatar.pose("ride");
    else poseOnFoot(this.avatar, this.walk, { body: this.body, moving, sprinting: moving && this.pad.isOn("B"), lotus: false, clock: this.clockH * 3600 }, dt);
    this.avatar.update(dt);
    // The cut-away view: a building's roof is not drawn while she is in it.
    const x = this.body.x / K;
    const z = this.body.z / K;
    for (const r of this.roofs) r.mesh.visible = !(x >= r.e.x0 && x <= r.e.x1 && z >= r.e.z0 && z <= r.e.z1);
    // The portal turns; walking into it takes her back (not in her first seconds here, when she arrives beside it).
    const pd = this.portal.userData as { disk: THREE.Object3D; arms: THREE.Object3D };
    pd.disk.rotation.z += dt * 0.32;
    pd.arms.rotation.z += dt * 0.08;
    this.bornAt += dt;
    if (!this.challenge && this.bornAt > 4 && Math.hypot(this.body.x - this.portal.position.x, this.body.z - this.portal.position.z) < PORTAL.r * K * 0.5) {
      this.leave();
      return;
    }
    // The way to the current step: the beam over its place and the arrow with the distance.
    const cur = HISTORIA[this.story.step];
    const there = !cur || this.story.there || estaEn(cur.at, this.body.x / K, this.body.z / K);
    this.beacon.visible = !there;
    this.arrowEl.style.display = there || st ? "none" : "";
    if (cur && !there) {
      const l = lugar(cur.at);
      this.beacon.position.set(l.x * K, this.floorY(l.x, l.z), l.z * K);
      (this.beacon.userData.gem as THREE.Object3D).rotation.y += dt * 1.5;
      const dx = l.x * K - this.body.x, dz = l.z * K - this.body.z;
      // Relative to where the camera looks (screen up = ahead).
      const camYaw = this.thirdPerson ? this.yaw : this.yaw;
      const a = Math.atan2(dx, dz) - (camYaw + Math.PI);
      (this.arrowEl.firstElementChild as HTMLElement).style.transform = `rotate(${(-a * 180) / Math.PI - 90}deg)`;
      const m = Math.round(Math.hypot(dx, dz) / K);
      const txt = `${cur.icon ?? ""} ${m} m`;
      const te = this.arrowEl.lastElementChild as HTMLElement;
      if (te.textContent !== txt) te.textContent = txt;
    }
    if (this.cardFor > 0 && (this.cardFor -= dt) <= 0) this.cardEl.classList.remove("on");
    const tt = this.clockH * 3600;
    for (const f of this.flames) f.scale.set(1 + Math.sin(tt * 9) * 0.08, 1 + Math.sin(tt * 13) * 0.15, 1 + Math.cos(tt * 11) * 0.08);
    const hour = this.hour();
    this.dayNight.update(hour, cam);
    const hh = Math.floor(hour);
    const where = `Microcosmos · ${hh}:${String(Math.floor((hour - hh) * 60)).padStart(2, "0")} · ${this.riding ? "En el carro del Dromos" : zonaLabel(zonaAt(x, z))}`;
    if (this.whereEl.textContent !== where) this.whereEl.textContent = where;
    if (this.toastFor > 0 && (this.toastFor -= dt) <= 0) this.toastEl.classList.remove("on");
  }

  /** A finger turns the challenge's view (sanctuary 1 passes its canvas gestures on while she is here). */
  gesture(dx: number, dy: number): void {
    if (!this.stage) return;
    this.stage.yaw -= dx * 0.008;
    this.stage.pitch = Math.max(-0.2, Math.min(1.2, this.stage.pitch + dy * 0.006));
  }
  /** A pinch or the wheel zooms the challenge's view (>1 closer). */
  zoomBy(f: number): void {
    if (this.stage) this.stage.dist = Math.max(1.6, Math.min(14, this.stage.dist / f));
    else this.camDist = Math.max(1.6, Math.min(30, this.camDist / f));
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
    this.missionsEl.remove();
    sheetLens(this.host.camera, false);
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
