import * as THREE from "three";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import type { Stage } from "@modules/aerial-sanctuary/data/stages";
import type { Trainer } from "@modules/aerial-sanctuary/data/trainers";
import { shortestWay, nearestPoint } from "@modules/aerial-sanctuary/domain/route";
import { whereAt, type Whereabouts } from "@modules/aerial-sanctuary/domain/roster";
import { CubeFigure } from "./interior/figure";
import { textSign } from "./interior/sign";
import type { Actor } from "./s3-stage";

/**
 * The trainers of sanctuary 3 in the scene (data/trainers.ts, domain/roster.ts): simple cube figures that walk the
 * island's paths at a walking pace to where their shift puts them (their post, the gym to train, the crossroads to
 * eat or when free) and stand there; the Magnate appears at a post when nobody is on shift there (she can teleport).
 * Each carries her name over her head, so she is seen at the post from afar.
 */
const WALK_MS = 1.4;

interface Walker {
  readonly who: Trainer;
  readonly actor: Actor;
  key: string;
  path: { x: number; y: number; z: number }[];
  i: number;
  face: number;
  stride: number;
  /** Lent to a challenge: the stage moves it. */
  lent: boolean;
  /** The way point her spot is reached from (she leaves by it: never through a table or a wall). */
  via?: string;
  /** The waypoints from that point in to her spot. */
  out?: readonly { x: number; y: number; z: number }[];
}

export class TrainerCrowd {
  readonly root = new THREE.Group();
  private readonly walkers: Walker[] = [];
  private readonly magnate: Walker;
  private magnatePost: number | undefined;

  constructor(
    private readonly L: S3Layout,
    private readonly stages: ReadonlyMap<number, Stage>,
    people: readonly Trainer[],
    magnate: Trainer,
    hour: number,
  ) {
    const make = (t: Trainer): Walker => {
      const fig = new CubeFigure(t.skin, t.clothes, t.hair, t.longHair);
      const rig = new THREE.Group();
      fig.root.scale.setScalar(t.heightM / 1.6 * 0.92);
      rig.add(fig.root);
      const sign = textSign(t.name);
      sign.scale.multiplyScalar(0.7);
      sign.position.y = t.heightM + 0.45;
      rig.add(sign);
      this.root.add(rig);
      return { who: t, actor: { rig, fig }, key: "", path: [], i: 0, face: 0, stride: 0, lent: false };
    };
    for (const t of people) {
      const w = make(t);
      this.walkers.push(w);
      // At the start of the game each is already where her shift puts her.
      const spot = this.spotOf(w, whereAt(t.shift, hour));
      w.key = this.keyOf(whereAt(t.shift, hour));
      if (spot.via) w.via = spot.via;
      if (spot.then) w.out = spot.then;
      w.actor.rig.position.set(spot.x, spot.y, spot.z);
      w.actor.rig.rotation.y = spot.face;
    }
    this.magnate = make(magnate);
    this.magnate.actor.rig.visible = false;
  }

  private keyOf(w: Whereabouts): string {
    return w.kind === "puesto" ? `puesto:${w.post}` : w.kind;
  }

  /** Where a trainer stands for these whereabouts (each her own spot at the gym and the crossroads). */
  private spotOf(w: Walker, where: Whereabouts): { x: number; y: number; z: number; face: number; via?: string; then?: readonly { x: number; y: number; z: number }[] } {
    const n = this.walkers.indexOf(w);
    const k = this.L.k;
    if (where.kind === "puesto") {
      const s = this.stages.get(where.post);
      if (s) return { ...s.trainer, via: `entrenamiento:${s.room}:dentro`, then: s.trainerVia };
    }
    if (where.kind === "gimnasio") {
      const p = this.L.graph.points.find((q) => q.id === "entrenamiento:gimnasio:dentro")!;
      return { x: p.x + 1.5 * k, y: 0, z: p.z - 2.5 * k + n * 1.0 * k, face: Math.PI / 2, via: p.id };
    }
    const c = this.L.graph.points.find((q) => q.id === "entrenamiento:cruce")!;
    const a = (n / Math.max(1, this.walkers.length)) * Math.PI * 2;
    return { x: c.x + 3 + Math.cos(a) * 2.2, y: 0, z: c.z + Math.sin(a) * 2.2, face: a + Math.PI, via: c.id };
  }

  /** Each frame: who goes where at this board hour, and a step along the way. */
  update(dt: number, hour: number): void {
    for (const w of this.walkers) {
      if (w.lent) continue;
      const where = whereAt(w.who.shift, hour);
      const key = this.keyOf(where);
      if (key !== w.key) {
        w.key = key;
        const spot = this.spotOf(w, where);
        const from = w.via ?? nearestPoint(this.L.graph, { x: w.actor.rig.position.x, y: w.actor.rig.position.y, z: w.actor.rig.position.z })?.id;
        const way = from && spot.via ? shortestWay(this.L.graph, from, spot.via) : undefined;
        if (spot.via) w.via = spot.via;
        // Out the way she came in (her post's waypoints backwards), along the paths, then in to the new place.
        const out = [...(w.out ?? [])].reverse();
        w.path = [...out, ...(way ?? []).map((p) => ({ x: p.x, y: p.y, z: p.z })), ...(spot.then ?? []), { x: spot.x, y: spot.y, z: spot.z }];
        w.out = spot.then;
        w.i = 0;
        w.face = spot.face;
      }
      this.step(w, dt);
      w.actor.fig.update(dt);
    }
    if (this.magnate.actor.rig.visible && !this.magnate.lent) this.magnate.actor.fig.update(dt);
  }

  private step(w: Walker, dt: number): void {
    const rig = w.actor.rig;
    const target = w.path[w.i];
    if (!target) {
      w.actor.fig.walk(w.stride, 0);
      rig.rotation.y = w.face;
      return;
    }
    const dx = target.x - rig.position.x;
    const dz = target.z - rig.position.z;
    const d = Math.hypot(dx, dz);
    const go = WALK_MS * dt;
    if (d <= go) {
      rig.position.set(target.x, target.y, target.z);
      w.i++;
    } else {
      rig.position.x += (dx / d) * go;
      rig.position.z += (dz / d) * go;
      rig.position.y += (target.y - rig.position.y) * Math.min(1, go / Math.max(d, 1e-6));
      rig.rotation.y = Math.atan2(dx, dz);
    }
    w.stride += go * 3;
    w.actor.fig.walk(w.stride, 1);
  }

  /** Whether trainer `id` is standing at post `post` now (not on her way). */
  atPost(id: string, post: number): boolean {
    if (id === this.magnate.who.id) return this.magnatePost === post;
    const w = this.walkers.find((q) => q.who.id === id);
    return !!w && w.key === `puesto:${post}` && w.i >= w.path.length;
  }

  /** Seconds left of her walk to where she is going. */
  etaS(id: string): number {
    const w = this.walkers.find((q) => q.who.id === id);
    if (!w) return 0;
    let d = 0;
    let p = w.actor.rig.position.clone();
    for (let i = w.i; i < w.path.length; i++) {
      const q = w.path[i]!;
      d += Math.hypot(q.x - p.x, q.z - p.z);
      p = new THREE.Vector3(q.x, q.y, q.z);
    }
    return d / WALK_MS;
  }

  /** The Magnate at a post (she teleports there), or gone. */
  magnateTo(post: number | undefined): void {
    if (post === this.magnatePost) return;
    this.magnatePost = post;
    const s = post === undefined ? undefined : this.stages.get(post);
    const rig = this.magnate.actor.rig;
    rig.visible = !!s;
    if (s) {
      rig.position.set(s.trainer.x, s.trainer.y, s.trainer.z);
      rig.rotation.y = s.trainer.face;
      this.magnate.actor.fig.pose("stand");
    }
  }

  /** Lend a trainer to a challenge's stage (it moves her) and take her back after. */
  lend(id: string, on: boolean): Actor | undefined {
    const w = id === this.magnate.who.id ? this.magnate : this.walkers.find((q) => q.who.id === id);
    if (!w) return undefined;
    w.lent = on;
    return w.actor;
  }

  /** Where each is now (the journeys read it). */
  positions(): { id: string; x: number; z: number; key: string; there: boolean }[] {
    return [...this.walkers, this.magnate].filter((w) => w.actor.rig.visible).map((w) => ({ id: w.who.id, x: w.actor.rig.position.x, z: w.actor.rig.position.z, key: w === this.magnate ? `puesto:${this.magnatePost}` : w.key, there: w === this.magnate || w.i >= w.path.length }));
  }
}
