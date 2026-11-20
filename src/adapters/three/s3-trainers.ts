import * as THREE from "three";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import type { Stage } from "@modules/aerial-sanctuary/data/stages";
import type { Trainer } from "@modules/aerial-sanctuary/data/trainers";
import { shortestWay, nearestPoint } from "@modules/aerial-sanctuary/domain/route";
import { leaveFor, whereAt, type Whereabouts } from "@modules/aerial-sanctuary/domain/roster";
import { BOARD_HOURS_PER_REAL_S } from "@core/board-time";
import { CubeFigure } from "./interior/figure";
import { textSign } from "./interior/sign";
import type { Actor } from "./s3-stage";

/**
 * The trainers of sanctuary 3 in the scene (data/trainers.ts, domain/roster.ts): simple cube figures that walk the
 * island's paths at a walking pace to where their shift puts them (their post, the gym to train, the crossroads to
 * eat or when free; on the glacier, its camp) and stand there. Each sets off early enough to be there when her
 * shift starts (`leaveFor`: the walk is timed on the board clock). Each carries her name over her head, so she is
 * seen at the post from afar.
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
  /** Walking metres between two of a trainer's places (by key), measured once on the paths. */
  private readonly metres = new Map<string, number>();

  constructor(
    private readonly L: S3Layout,
    private readonly stages: ReadonlyMap<number, Stage>,
    people: readonly Trainer[],
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
  }

  private keyOf(w: Whereabouts): string {
    return w.kind === "puesto" ? `puesto:${w.post}` : w.kind;
  }

  /** Where a trainer stands for these whereabouts (each her own spot at the gym and the crossroads; on the glacier, the camp). */
  private spotOf(w: Walker, where: Whereabouts): { x: number; y: number; z: number; face: number; via?: string; then?: readonly { x: number; y: number; z: number }[] } {
    const n = this.walkers.indexOf(w);
    const k = this.L.k;
    if (where.kind === "puesto") {
      const s = this.stages.get(where.post);
      if (s) return { ...s.trainer, via: s.door, then: s.trainerVia };
    }
    if (w.who.base === "glaciar") {
      const c = this.L.graph.points.find((q) => q.id === "glaciar:campamento")!;
      const a = (n / Math.max(1, this.walkers.length)) * Math.PI * 2 + (where.kind === "gimnasio" ? 0.4 : 0);
      return { x: c.x + Math.cos(a) * 3 * k, y: 0, z: c.z + Math.sin(a) * 3 * k, face: a + Math.PI, via: c.id };
    }
    if (where.kind === "gimnasio") {
      const p = this.L.graph.points.find((q) => q.id === "entrenamiento:gimnasio:dentro")!;
      return { x: p.x + 1.5 * k, y: 0, z: p.z - 2.5 * k + (n % 8) * 1.0 * k, face: Math.PI / 2, via: p.id };
    }
    const c = this.L.graph.points.find((q) => q.id === "entrenamiento:cruce")!;
    const a = (n / Math.max(1, this.walkers.length)) * Math.PI * 2;
    return { x: c.x + 3 + Math.cos(a) * 2.2, y: 0, z: c.z + Math.sin(a) * 2.2, face: a + Math.PI, via: c.id };
  }

  /** Board hours of the walk from where she is (or is going), or from place `from`, to `to`. */
  private walkHours(w: Walker, to: Whereabouts, from?: Whereabouts): number {
    const key = this.keyOf(to);
    if (from) {
      const memo = `${w.who.id}|${this.keyOf(from)}|${key}`;
      let m = this.metres.get(memo);
      if (m === undefined) {
        const a = this.spotOf(w, from);
        m = this.pathMetres({ x: a.x, z: a.z }, a.via, a.then, this.spotOf(w, to));
        this.metres.set(memo, m);
      }
      return (m / WALK_MS) * BOARD_HOURS_PER_REAL_S;
    }
    if (key === w.key) return w.i >= w.path.length ? 0 : this.etaS(w.who.id) * BOARD_HOURS_PER_REAL_S;
    const memo = `${w.who.id}|${w.key}|${key}`;
    const settled = w.i >= w.path.length;
    let m = settled ? this.metres.get(memo) : undefined;
    if (m === undefined) {
      const here = w.actor.rig.position;
      const from = w.via ?? nearestPoint(this.L.graph, { x: here.x, y: here.y, z: here.z })?.id;
      m = this.pathMetres({ x: here.x, z: here.z }, from, w.out, this.spotOf(w, to));
      if (settled) this.metres.set(memo, m);
    }
    return (m / WALK_MS) * BOARD_HOURS_PER_REAL_S;
  }

  /** Metres from `p` (reached from way point `via` by the waypoints `out`) along the paths to `spot`. */
  private pathMetres(p: { x: number; z: number }, via: string | undefined, out: readonly { x: number; z: number }[] | undefined, spot: { x: number; z: number; via?: string; then?: readonly { x: number; z: number }[] }): number {
    const way = via && spot.via ? shortestWay(this.L.graph, via, spot.via) : undefined;
    const pts = [...[...(out ?? [])].reverse(), ...(way ?? []), ...(spot.then ?? []), spot];
    let m = 0;
    for (const q of pts) {
      m += Math.hypot(q.x - p.x, q.z - p.z);
      p = q;
    }
    return m;
  }

  /** Each frame: who goes where at this board hour, and a step along the way. */
  update(dt: number, hour: number): void {
    for (const w of this.walkers) {
      if (w.lent) continue;
      // She sets off early enough to be at her next place when it starts.
      const at = w.i >= w.path.length ? this.placeOf(w) : undefined;
      const where = leaveFor(w.who.shift, hour, at, (to, from) => this.walkHours(w, to, from));
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
  }

  /** Where she stands now, as whereabouts (from her key). */
  private placeOf(w: Walker): Whereabouts {
    return w.key.startsWith("puesto:") ? { kind: "puesto", post: Number(w.key.slice(7)) } : w.key === "gimnasio" ? { kind: "gimnasio" } : { kind: "cruce" };
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

  /** Lend a trainer to a challenge's stage (it moves her) and take her back after. */
  lend(id: string, on: boolean): Actor | undefined {
    const w = this.walkers.find((q) => q.who.id === id);
    if (!w) return undefined;
    w.lent = on;
    return w.actor;
  }

  /** Where each is now (the journeys read it). */
  positions(): { id: string; x: number; z: number; key: string; there: boolean }[] {
    return this.walkers.map((w) => ({ id: w.who.id, x: w.actor.rig.position.x, z: w.actor.rig.position.z, key: w.key, there: w.i >= w.path.length }));
  }
}
