import type { Rect } from "./walk";
import type { LakeLarvaSpec, LarvaStage } from "../data/larvas-lago";
import { hash01 } from "@modules/fauna/domain/roam";

/**
 * THE LAKE'S LARVAE, living their cycle (docs/design/larvas-lago.md; their species: data/larvas-lago.ts). Pure: where
 * each drawn larva is in its cycle at a day of biology, and where and how it stands on the lake's bottom. Each one runs
 * its species' real stages, egg to the adult leaving the water, and starts again with a new egg (another brood); the
 * drawn ones of a species are spread over the cycle (ours) so every stage shows at once.
 */
export const cycleDays = (s: LakeLarvaSpec): number => s.stages.reduce((t, x) => t + x.days, 0);

export interface LarvaMoment {
  readonly stage: LarvaStage;
  readonly label: string;
  /** How far into that stage (0 … 1). */
  readonly k: number;
  /** Its length over the grown larva's (an egg is tiny; it grows through its larval stage). */
  readonly grown: number;
}

/** The stage of a larva `day` days into its cycle (wrapped). */
export function stageAt(s: LakeLarvaSpec, day: number): LarvaMoment {
  const D = cycleDays(s);
  let d = ((day % D) + D) % D;
  for (const x of s.stages) {
    if (d < x.days) {
      const k = d / x.days;
      const grown = x.stage === "huevo" ? 0.08 : x.stage === "ninfa" || x.stage === "larva" ? 0.12 + 0.88 * k : 1;
      return { stage: x.stage, label: x.label, k, grown };
    }
    d -= x.days;
  }
  const last = s.stages.at(-1)!;
  return { stage: last.stage, label: last.label, k: 1, grown: 1 };
}

/** The lake as the larvae need it: its middle, bottom and surface, the ring they live in, what they keep out of. */
export interface LakeFrame {
  readonly x: number;
  readonly z: number;
  readonly floorY: number;
  readonly lakeTop: number;
  readonly r0: number;
  readonly r1: number;
  /** Trunks, root decks, the pupa's foot, the Starship: they never stand under or in them. */
  readonly keepOut: readonly Rect[];
}

export interface LarvaPose {
  readonly species: string;
  readonly i: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Its drawn length over the grown larva's. */
  scale: number;
  stage: LarvaStage;
  /** «Ninfa de libélula migradora · Ninfa: caza…». */
  label: string;
  moving: boolean;
}

const inside = (r: Rect, x: number, z: number, m: number) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

/** The home of drawn larva `i` of a species on the lake's bottom (seeded), clear of everything standing in the lake. */
export function larvaHome(s: LakeLarvaSpec, i: number, lake: LakeFrame, drawnLength: number): { x: number; z: number } {
  const seed = s.id.length * 131 + i * 17;
  let a = hash01(seed, 1) * Math.PI * 2;
  const r = lake.r0 + (lake.r1 - lake.r0) * hash01(seed, 2);
  for (let n = 0; n < 40; n++) {
    const x = lake.x + Math.cos(a) * r;
    const z = lake.z + Math.sin(a) * r;
    if (!lake.keepOut.some((k) => inside(k, x, z, drawnLength * 1.5 + 3))) return { x, z };
    a += 0.31;
  }
  return { x: lake.x + Math.cos(a) * lake.r1, z: lake.z + Math.sin(a) * lake.r1 };
}

/**
 * Drawn larva `i` of `s` at biology day `bioDay` (the island's chain clock) and real second `t`, its grown length
 * `drawnLength` m (×400): on the bottom, crawling a little round its home; a pupa of the midge, and every one
 * emerging, rises to the surface and out.
 */
export function larvaPose(s: LakeLarvaSpec, i: number, bioDay: number, t: number, lake: LakeFrame, drawnLength: number): LarvaPose {
  const D = cycleDays(s);
  const m = stageAt(s, bioDay + (i * D) / s.drawn);
  const home = larvaHome(s, i, lake, drawnLength);
  const seed = i * 7 + s.id.length;
  const crawls = m.stage === "ninfa" || m.stage === "larva";
  const a = t * 0.05 + hash01(seed, 3) * 6.28;
  const reach = crawls ? drawnLength * 1.5 : 0;
  const x = home.x + Math.cos(a) * reach;
  const z = home.z + Math.sin(a) * reach;
  const yaw = crawls ? -a : hash01(seed, 4) * 6.28;
  // On the bottom; rising to the surface (the midge's pupa) or out of it (every adult emerging).
  const rise = m.stage === "emergencia" || m.stage === "subimago" ? m.k : s.id === "quironomido" && m.stage === "pupa" ? m.k * 0.95 : 0;
  const y = lake.floorY + 0.05 + rise * (lake.lakeTop - lake.floorY + (m.stage === "pupa" ? -0.2 : 1));
  return { species: s.id, i, x, y, z, yaw, scale: m.grown, stage: m.stage, label: `${s.name} · ${m.label}`, moving: crawls };
}
