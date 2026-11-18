import * as THREE from "three";
import type { Beat, HerPose, RigCue, Thing, ThingSpot } from "@modules/aerial-sanctuary/domain/station-beat";
import type { Stage, StageSpot } from "@modules/aerial-sanctuary/data/stages";
import type { StepVisual } from "@modules/chores/domain/step-visual";
import type { CubeFigure } from "./interior/figure";
import { scottTent, snowmobile } from "./aerial-models";

/**
 * Sanctuary 3's training posts acted out (reglas.md §4; domain/station-beat.ts): the furniture each post needs
 * (the tribunal's chair, the scale, the eye chart, the chamber's bench) and, while a challenge is open, each step
 * answered right played at the post by Doménica and the trainer, with the things in their hands or on her (a folder,
 * the cuff, the electrodes, the mask, the flight suit, the raft and the hoist, the EMU and the divers' lead). Each
 * beat takes `BEAT_S`; a loop (the lengths of the pool) plays its motion `times` times.
 */
export const BEAT_S = 2.2;

const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const box = (w: number, h: number, d: number, c: number, o?: Partial<THREE.MeshStandardMaterialParameters>) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o));

/** The figure and where it stands: the scene's own rig (Doménica) or a trainer's. */
export interface Actor {
  readonly rig: THREE.Object3D;
  readonly fig: CubeFigure;
}

const HER_POSE: Readonly<Record<HerPose, string>> = { "de-pie": "stand", sentada: "sit", tumbada: "supine", nadando: "swim", flotando: "tread", "brazos-arriba": "arms-up", "mano-adelante": "reach-one", mareada: "sit-dizzy", neutra: "float", recostada: "sit-recline", "manos-mandos": "stand-hands", moto: "ride", rodillas: "kneel", "boca-abajo": "prone" };

/** Clothes over her suit: the flight suit (olive), the LCVG (pale blue), the EMU's white. */
const TINT: Partial<Record<Thing, number>> = { mono: 0x5d6b3a, "prenda-lcvg": 0xb9d8ec, "pantalon-emu": 0xf2f2ee, "torso-emu": 0xf2f2ee };

export class S3Stage implements StepVisual {
  readonly root = new THREE.Group();
  private readonly things = new Map<Thing, THREE.Object3D>();
  private queue: Beat[] = [];
  private beat: Beat | undefined;
  private t = 0;
  private stage: Stage | undefined;
  private her: Actor | undefined;
  private trainer: Actor | undefined;
  private suitMeshes: THREE.MeshStandardMaterial[] = [];
  private suitColor = 0;
  private finishing = -1;
  /** The caption of the beat on screen (the scene shows it). */
  caption = "";
  /** She is being acted (the scene stops moving her by herself). */
  active = false;
  /**
   * Her spots on a moving machine (s3-rigs.ts), and the trainer's beside her there (`entrenador:<spot>`): she is
   * carried with it each frame.
   */
  mounts: ReadonlyMap<string, THREE.Object3D> = new Map();
  /** A beat tells its machine what to do (the centrifuge's g, the plane's phase, the simulator's screen). */
  onCue: ((cue: RigCue | undefined) => void) | undefined;

  constructor(stages: readonly Stage[]) {
    for (const s of stages) this.furnish(s);
    this.makeThings();
  }

  /** The furniture the posts need, at their real places (none of it is in anyone's way: data/stages.test.ts). */
  private furnish(s: Stage): void {
    const add = (o: THREE.Object3D, x: number, y: number, z: number, face = 0) => {
      o.position.set(x, y, z);
      o.rotation.y = face;
      this.root.add(o);
    };
    const silla = s.her.silla;
    if (silla) {
      const chair = new THREE.Group();
      chair.add(box(0.45, 0.05, 0.45, 0x30343a).translateY(0.45), box(0.45, 0.45, 0.05, 0x30343a).translateY(0.7).translateZ(-0.22));
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) chair.add(box(0.04, 0.45, 0.04, 0x8a8f96).translateX(x!).translateY(0.225).translateZ(z!));
      add(chair, silla.x, silla.y, silla.z - Math.cos(silla.face) * 0.05, silla.face);
    }
    const scale = s.anchors.bascula;
    if (scale) add(box(0.4, 0.05, 0.4, 0xdfe3e6), scale.x, scale.y + 0.025, scale.z);
    const wall = s.anchors.pared;
    if (wall) {
      const chart = new THREE.Group();
      chart.add(box(0.5, 0.75, 0.02, 0xffffff));
      for (let i = 0; i < 6; i++) chart.add(box(0.36 - i * 0.05, 0.05 - i * 0.006, 0.01, 0x111111).translateY(0.28 - i * 0.11).translateZ(0.012));
      add(chart, wall.x, wall.y, wall.z);
    }
    // The chamber's bench, just behind where she sits (its top at her seat, 0,45 m over the chamber's floor).
    const bench = s.anchors.banco;
    const seat = s.her.camara;
    if (bench && seat) add(box(0.5, 0.45, 1.6, 0x6f7c86).translateY(-0.225), seat.x - Math.sin(seat.face) * 0.12, bench.y, seat.z - Math.cos(seat.face) * 0.12);
    const top = s.anchors.techo;
    if (top) {
      // The hoist's rail under the roof, over where the raft comes.
      add(box(0.3, 0.3, 8, 0x8a8f96), top.x, top.y - 0.6, top.z);
    }
  }

  private makeThings(): void {
    const g = (...m: THREE.Object3D[]) => {
      const o = new THREE.Group();
      if (m.length) o.add(...m);
      return o;
    };
    this.things.set("carpeta", box(0.24, 0.02, 0.32, 0x2f6f9f));
    this.things.set("lista", g(box(0.22, 0.3, 0.015, 0x8a6a48), box(0.18, 0.24, 0.005, 0xffffff).translateZ(0.01)));
    this.things.set("sello", box(0.06, 0.09, 0.06, 0xb43a2a));
    this.things.set("acreditacion", box(0.08, 0.11, 0.01, 0xffd27f));
    this.things.set("manguito", box(0.13, 0.14, 0.13, 0x1d3b7a));
    this.things.set("electrodos", g(...[-0.08, 0, 0.08].map((x) => box(0.03, 0.03, 0.01, 0xeeeeee).translateX(x))));
    this.things.set("mascara", g(box(0.12, 0.1, 0.07, 0x6fbf8f, { transparent: true, opacity: 0.85 })));
    this.things.set("casco", new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), mat(0xe8f4ff, { transparent: true, opacity: 0.35, depthWrite: false })));
    this.things.set("plomo", g(box(0.1, 0.06, 0.05, 0x555a60).translateX(-0.12), box(0.1, 0.06, 0.05, 0x555a60).translateX(0.12)));
    this.things.set("espuma", box(0.12, 0.08, 0.08, 0xffd23f));
    // The life raft (a six-person one is about 2 m across) and the hoist's cable and horse-collar.
    this.things.set("balsa", g(new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.22, 8, 20), mat(0xf26a1b)).rotateX(Math.PI / 2), box(1.5, 0.05, 1.5, 0xf26a1b).translateY(-0.15)));
    this.things.set("arnes", g(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), mat(0xf2c200))));
    // Phase 5: the centrifuge's electrodes and the button she presses at each light; the simulator's headset and
    // the robotics desk's two hand controllers.
    this.things.set("sensores", g(...[-0.07, 0.07].map((x) => box(0.035, 0.035, 0.01, 0xeeeeee).translateX(x)), box(0.2, 0.01, 0.01, 0x333333).translateY(-0.03)));
    this.things.set("boton", g(box(0.05, 0.1, 0.05, 0x30343a), new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), mat(0xd23b2a)).translateY(0.06)));
    this.things.set("casco-vuelo", g(box(0.24, 0.05, 0.05, 0x222222), box(0.04, 0.09, 0.09, 0x222222).translateX(-0.12).translateY(-0.08), box(0.04, 0.09, 0.09, 0x222222).translateX(0.12).translateY(-0.08)));
    this.things.set("mandos", g(...[-0.35, 0.35].map((x) => g(box(0.14, 0.04, 0.14, 0x30343a).translateX(x), box(0.04, 0.14, 0.04, 0x111111).translateX(x).translateY(0.09)))));
    // The meteorite search (ANSMET): the stone, the GPS, the aluminium tag, the counter, the camera, the book, the
    // sterile tongs and Teflon bag, the tape and the flag.
    this.things.set("meteorito", new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), mat(0x1c1a18, { flatShading: true })));
    this.things.set("gps", box(0.07, 0.13, 0.03, 0xf2c200));
    this.things.set("etiqueta", box(0.05, 0.03, 0.004, 0xc8ccd0));
    this.things.set("contador", box(0.06, 0.04, 0.04, 0xf26a1b));
    this.things.set("camara-foto", g(box(0.13, 0.09, 0.07, 0x111111), new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), mat(0x333333)).rotateX(Math.PI / 2).translateY(-0.05)));
    this.things.set("libro", box(0.15, 0.02, 0.21, 0xd8562c));
    this.things.set("pinzas", g(box(0.008, 0.008, 0.2, 0xdfe3e6).translateX(-0.01), box(0.008, 0.008, 0.2, 0xdfe3e6).translateX(0.01)));
    this.things.set("bolsa", box(0.14, 0.18, 0.05, 0xe8f4ff));
    this.things.set("cinta", new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 12), mat(0xd23b2a)));
    this.things.set("bandera", g(box(0.02, 1.2, 0.02, 0x8a8f96).translateY(0.6), box(0.25, 0.16, 0.01, 0xd23b2a).translateY(1.1).translateX(0.13)));
    this.things.set("moto-nieve", snowmobile());
    // Cold survival (the field school): the Scott tent, the snow-block wall against the wind, the roofed trench, the
    // stove and its pot, the HF radio and its two 10 m antennas.
    this.things.set("tienda-scott", scottTent());
    const wall = g();
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) wall.add(box(0.48, 0.38, 0.4, 0xf4f8fb).translateX(-1.25 + i * 0.5 + (row % 2) * 0.25).translateY(0.2 + row * 0.4));
    this.things.set("muro-nieve", wall);
    const trench = g(box(0.9, 0.02, 2.2, 0x6f8796).translateY(0.01));
    for (let i = 0; i < 4; i++) trench.add(box(1.0, 0.25, 0.48, 0xf4f8fb).translateY(0.62).translateZ(-0.78 + i * 0.52));
    for (const x of [-0.55, 0.55]) trench.add(box(0.2, 0.5, 2.2, 0xe6eef3).translateX(x).translateY(0.25));
    this.things.set("zanja-techo", trench);
    this.things.set("hornillo", g(box(0.22, 0.12, 0.22, 0x50565e).translateY(0.06)));
    this.things.set("olla", new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.14, 12), mat(0x9aa6ae)));
    this.things.set("radio-hf", g(box(0.3, 0.18, 0.22, 0x4a5a3a).translateY(0.09)));
    const aerial = g();
    for (const x of [0, 10]) aerial.add(box(0.04, 3, 0.04, 0x8a8f96).translateX(x).translateY(1.5));
    const wire = box(10, 0.01, 0.01, 0x111111);
    wire.position.set(5, 2.9, 0);
    aerial.add(wire);
    this.things.set("antena", aerial);
    this.cable.visible = false;
    this.root.add(this.cable);
    for (const o of this.things.values()) {
      o.visible = false;
      this.root.add(o);
    }
  }

  /** Start a post's challenge: she and the trainer take their places. */
  open(stage: Stage, her: Actor, trainer: Actor | undefined): void {
    this.stage = stage;
    this.her = her;
    this.trainer = trainer;
    this.queue = [];
    this.beat = undefined;
    this.finishing = -1;
    this.active = true;
    this.caption = "";
    // The suit's own colour: what the clothes tint (and go back to).
    if (!this.suitMeshes.length) {
      const all: THREE.MeshStandardMaterial[] = [];
      her.fig.root.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m?.color) all.push(m);
      });
      // The torso's box is the suit; the skin and hair differ.
      const counts = new Map<number, number>();
      for (const m of all) counts.set(m.color.getHex(), (counts.get(m.color.getHex()) ?? 0) + 1);
      this.suitColor = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
      this.suitMeshes = all.filter((m) => m.color.getHex() === this.suitColor);
    }
    const first = Object.values(stage.her)[0] ?? stage.lap?.from;
    if (first) this.place(her.rig, first);
    her.fig.pose(first && (first === stage.her.silla || first === stage.her.camara) ? "sit" : "stand");
    if (trainer) {
      this.place(trainer.rig, stage.trainer);
      trainer.fig.pose("stand");
    }
  }

  private place(o: THREE.Object3D, p: StageSpot): void {
    o.position.set(p.x, p.y, p.z);
    o.rotation.set(0, p.face, 0);
  }

  /** Beats to play next, in order. */
  play(beats: readonly Beat[]): void {
    this.queue.push(...beats);
    this.finishing = -1;
  }

  stepDone(): void {
    /* the scene queues the beats itself (it knows which part was already seen) */
  }

  finish(): void {
    this.finishing = BEAT_S * 1.5;
  }

  clear(): void {
    this.active = false;
    this.held = undefined;
    this.queue = [];
    this.beat = undefined;
    this.caption = "";
    for (const o of this.things.values()) {
      o.visible = false;
      if (o.parent !== this.root) this.root.attach(o);
    }
    for (const m of this.suitMeshes) m.color.setHex(this.suitColor);
    this.cable.visible = false;
    // The trainer is back at her place: she leaves the room from there, the way she came in.
    if (this.trainer && this.stage) this.place(this.trainer.rig, this.stage.trainer);
    this.her?.rig.rotation.set(0, this.her.rig.rotation.y, 0);
    this.onCue?.(undefined);
    this.her = undefined;
    this.trainer = undefined;
  }

  /** What the camera frames: her and the trainer when they are close, else her; and how far apart they are. */
  focus(out: THREE.Vector3): number {
    const h = this.her?.rig.position;
    const t = this.trainer?.rig.position;
    if (!h) return 0;
    const d = t ? Math.hypot(t.x - h.x, t.z - h.z) : 99;
    // Side by side (the table, the couch), both in the shot; apart (she swims, he waits on the edge), her.
    const close = !!t && d < 4.5 && Math.abs(t.y - h.y) < 1.5;
    if (close) out.set((h.x + t!.x) / 2, (h.y + t!.y) / 2, (h.z + t!.z) / 2);
    else out.copy(h);
    return close ? d : 0;
  }

  /** Counts the beats begun: the camera turns side on again when one moves them. */
  moves = 0;

  /** The yaw that looks side on to the line from her to the trainer at the current beat's places, if they are close. */
  sideYaw(): number | undefined {
    const s = this.stage;
    const b = this.beat;
    if (!s || !b) return undefined;
    const h = b.her === "largo" ? s.lap?.from : s.her[b.her];
    const t = s.beside[b.her] ?? s.trainer;
    if (!h) return undefined;
    const d = Math.hypot(t.x - h.x, t.z - h.z);
    return d > 0.5 && d < 4.5 && Math.abs(t.y - h.y) < 1.5 ? Math.atan2(t.x - h.x, t.z - h.z) + Math.PI / 2 : undefined;
  }

  /** The room the open stage is in. */
  get room(): string | undefined {
    return this.active ? this.stage?.room : undefined;
  }

  /** Her spot's facing at the start (the camera starts side on). */
  get startFace(): number {
    const first = this.stage ? Object.values(this.stage.her)[0] : undefined;
    return first?.face ?? 0;
  }

  /** Whether beats are still playing. */
  get busy(): boolean {
    return !!this.beat || this.queue.length > 0;
  }

  update(dt: number): void {
    if (!this.active || !this.stage || !this.her) return;
    if (!this.beat && this.queue.length) {
      this.beat = this.queue.shift()!;
      this.moves++;
      this.t = 0;
      this.enter(this.beat);
    }
    if (this.beat) {
      this.t += dt;
      this.move(this.beat, this.t);
      if (this.t >= BEAT_S * (this.beat.times ?? 1)) {
        this.held = this.beat.her;
        this.beat = undefined;
      }
    } else {
      // Between beats she stays on the moving machine she is on (the gondola goes on turning).
      const m = this.held && this.mounts.get(this.held);
      if (m) this.ride(this.her.rig, m);
      const tm = this.held && this.mounts.get(`entrenador:${this.held}`);
      if (tm && this.trainer) this.ride(this.trainer.rig, tm);
      if (this.finishing > 0) this.finishing -= dt;
    }
    this.her.fig.update(dt);
    this.trainer?.fig.update(dt);
    this.followHands();
  }

  /** A beat starts: poses, the things where the beat says. */
  private enter(b: Beat): void {
    const her = this.her!;
    this.caption = b.caption;
    const seated = b.her === "silla" || b.her === "camara" || b.her === "camilla-sentada" || b.her === "balsa" || b.her === "avion-asiento" || b.her === "dragon-asiento";
    let pose = HER_POSE[b.pose];
    if (seated && (b.pose === "sentada" || b.pose === "de-pie")) pose = b.pose === "de-pie" && b.her === "silla" ? "stand" : "sit";
    if (seated && b.pose === "mano-adelante") pose = "sit-reach";
    if (seated && b.pose === "manos-mandos") pose = "sit-hands";
    her.fig.pose(pose);
    const tr = this.trainer;
    // On a moving machine the trainer rides beside her, as she does (seated, lying, floating).
    if (tr && this.mounts.has(`entrenador:${b.her}`)) tr.fig.pose(pose === "sit-hands" ? "sit" : pose);
    else if (tr) tr.fig.pose(b.trainer === "escribe" ? "write" : b.trainer === "da" || b.trainer === "ayuda" ? "reach-one" : "stand");
    this.onCue?.(b.rig);
    // Clothes: the tint of the outermost one listed.
    let tint = this.suitColor;
    for (const t of ["prenda-lcvg", "mono", "pantalon-emu", "torso-emu"] as const) if (b.things.some((x) => x.thing === t)) tint = TINT[t]!;
    for (const m of this.suitMeshes) m.color.setHex(tint);
    for (const [id, o] of this.things) {
      const cue = b.things.find((x) => x.thing === id);
      if (!cue || TINT[id] !== undefined) {
        o.visible = false;
        continue;
      }
      o.visible = true;
      this.put(id, o, cue.at);
    }
  }

  /** Where a thing goes: hung from a hand, the head or the chest, or at an anchor of the post. */
  private put(id: Thing, o: THREE.Object3D, at: ThingSpot): void {
    const her = this.her!.fig;
    const tr = this.trainer?.fig;
    const hang = (parent: THREE.Object3D, x: number, y: number, z: number) => {
      parent.add(o);
      o.position.set(x, y, z);
      o.rotation.set(0, 0, 0);
    };
    const s = this.stage!;
    switch (at) {
      case "mano-ella":
        return hang(her.hand(0), 0, -0.06, 0.06);
      case "mano-entrenador":
        return tr ? hang(tr.hand(0), 0, -0.06, 0.06) : void (o.visible = false);
      case "brazo":
        return hang(her.hand(1).parent!, 0, -0.08, 0);
      case "pecho":
        return hang(her.chestNode, id === "acreditacion" ? 0.09 : 0, 0.14, 0.12);
      case "cara":
        return hang(her.headNode, 0, id === "casco" ? 0.13 : 0.08, id === "casco" ? 0 : 0.13);
      case "cintura":
        // Astride the snowmobile: it goes under her, its seat under her hips.
        if (id === "moto-nieve") {
          hang(this.her!.rig, 0, 0, 0.4);
          o.rotation.y = -Math.PI / 2;
          return;
        }
        return hang(her.root, 0, -0.02, 0);
      case "sitio": {
        // At the post's place for it (the stone on the ice, the tent, the wall, the desk's controllers).
        const a = s.anchors[id];
        if (!a) {
          o.visible = false;
          return;
        }
        this.root.attach(o);
        o.position.set(a.x, a.y, a.z);
        o.rotation.set(0, id === "moto-nieve" ? Math.PI / 4 : 0, 0);
        return;
      }
      case "mesa": {
        this.root.attach(o);
        const m = s.anchors.mesa!;
        o.position.set(m.x, m.y + 0.012, m.z - 0.25);
        o.rotation.set(0, 0, 0);
        return;
      }
      case "agua": {
        this.root.attach(o);
        const w = s.anchors.agua!;
        o.position.set(w.x, w.y + 0.05, w.z);
        o.rotation.set(0, 0, 0);
        return;
      }
      case "cuerpo":
        // The hoist's collar goes round her chest; its cable runs up to the rail.
        if (id === "arnes") return hang(her.chestNode, 0, 0.1, 0);
        o.visible = false;
        return;
      case "pared":
        o.visible = false;
        return;
    }
  }

  /** She moves to the beat's spot (and swims her lengths there and back); the hoist's cable reaches the rail. */
  private move(b: Beat, t: number): void {
    const s = this.stage!;
    const rig = this.her!.rig;
    if (b.her === "largo" && s.lap) {
      const n = b.times ?? 1;
      const u = Math.min(1, t / (BEAT_S * n)) * n;
      const leg = Math.min(n - 1, Math.floor(u));
      const f = u - leg;
      const [a, c] = leg % 2 === 0 ? [s.lap.from, s.lap.to] : [s.lap.to, s.lap.from];
      rig.position.set(a.x + (c.x - a.x) * f, a.y, a.z + (c.z - a.z) * f);
      rig.rotation.y = Math.atan2(c.x - a.x, c.z - a.z);
      return;
    }
    // The trainer goes with her where the post says (the doctor from the scale to the couch), else stays at her place.
    const tr = this.trainer?.rig;
    const tm = this.mounts.get(`entrenador:${b.her}`);
    const tp = s.beside[b.her] ?? s.trainer;
    if (tr && tm) this.ride(tr, tm);
    else if (tr) {
      tr.position.lerp(this.tmp.set(tp.x, tp.y, tp.z), Math.min(1, t / 0.8));
      tr.rotation.set(0, tp.face, 0);
    }
    const hm = this.mounts.get(b.her);
    if (hm) return this.ride(rig, hm);
    rig.rotation.set(0, rig.rotation.y, 0);
    const p = s.her[b.her];
    if (!p) return;
    const e = Math.min(1, t / 0.8);
    rig.position.lerp(new THREE.Vector3(p.x, p.y, p.z), e);
    rig.rotation.y = p.face;
    // Treading water bobs a little.
    if (b.her === "flotando" || b.her === "fondo") rig.position.y = p.y + Math.sin(t * 2.4) * 0.05;
  }

  private readonly tmp = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  /** Her spot at the last beat (she stays on it until the next). */
  private held: Beat["her"] | undefined;
  /** Carried by a moving machine: at its mount, turned as it is. */
  private ride(o: THREE.Object3D, m: THREE.Object3D): void {
    m.updateWorldMatrix(true, false);
    m.getWorldPosition(o.position);
    m.getWorldQuaternion(this.q);
    o.quaternion.copy(this.q);
  }
  /** The hoist's cable, from the collar on her chest straight up to the rail. */
  private readonly cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), mat(0x222222));
  private followHands(): void {
    const harness = this.things.get("arnes")!;
    const top = this.stage?.anchors.techo;
    this.cable.visible = !!top && harness.visible;
    if (!this.cable.visible || !top) return;
    harness.updateWorldMatrix(true, false);
    harness.getWorldPosition(this.tmp);
    const railY = top.y - 0.75;
    const len = Math.max(0.1, railY - this.tmp.y);
    this.cable.scale.set(1, len, 1);
    this.cable.position.set(this.tmp.x, this.tmp.y + len / 2, this.tmp.z);
  }
}
