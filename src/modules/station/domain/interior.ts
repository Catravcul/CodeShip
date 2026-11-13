import { Vec3 } from "@core/math/vec3";
import type { CraftSpec, MachineId } from "./blueprint";
import type { PortUser } from "./structure";

/**
 * Local vertical inside the station, like the ISS: every module keeps the same «up» (the overhead,
 * toward the zenith, +y of the station's body frame), so racks, labels and screens read the same way
 * everywhere (NASA-STD-3001 Vol. 2, V2 8007). Forward is −z, starboard +x.
 */
export type Face = "suelo" | "techo" | "babor" | "estribor" | "proa" | "popa";

export const FACE_NORMAL: Readonly<Record<Face, Vec3>> = {
  suelo: new Vec3(0, -1, 0),
  techo: new Vec3(0, 1, 0),
  babor: new Vec3(-1, 0, 0),
  estribor: new Vec3(1, 0, 0),
  proa: new Vec3(0, 0, -1),
  popa: new Vec3(0, 0, 1),
};

/** One letter per face for location codes, like the ISS's LAB1S2 (Destiny, starboard, bay 2). */
export const FACE_LETTER: Readonly<Record<Face, string>> = { suelo: "D", techo: "O", babor: "P", estribor: "S", proa: "F", popa: "A" };

/** Tabs of the station's task screen a machine can open. */
export type StationPanel = "materiales" | "planos" | "fabricacion" | "hangar";

/** An axis-aligned box in the station's body frame. */
export interface Box {
  readonly centre: Vec3;
  readonly half: Vec3;
}

/** A space she can float in: a module's free aisle between its racks, a hatch, or the hangar. */
export interface InteriorVolume extends Box {
  readonly id: string;
  /** Short location code (NOD2, HAB1, FAB1...). */
  readonly code: string;
  readonly label: string;
  readonly kind: "nodo" | "habitat" | "fabrica" | "esclusa" | "hangar" | "escotilla";
  readonly pressurised: boolean;
  /**
   * Hatches only: the axis she goes through (not shrunk by the body margin, so she can pass) and
   * what it needs to be open: the airlock at cabin pressure (inner hatch) or emptied with her in a
   * suit (outer hatch).
   */
  readonly through?: "x" | "y" | "z";
  readonly needs?: "presion" | "traje";
  readonly basis: string;
  readonly source?: string;
}

/** What a fixture does when she reaches it or taps it. */
export type FixtureAction =
  | { readonly kind: "panel"; readonly panel: StationPanel }
  | { readonly kind: "info" }
  | { readonly kind: "salir"; readonly to: PortUser }
  /** The ship bay: configure the parts of the docked ships (docs/design/accesos.md). */
  | { readonly kind: "bahia" }
  | { readonly kind: "esclusa" };

/** Something mounted in a module: a machine, a rack, a hatch. */
export interface Fixture {
  readonly id: string;
  readonly label: string;
  readonly volume: string;
  /** The wall it is mounted on. */
  readonly face: Face;
  /** Centre of its front, body frame. */
  readonly at: Vec3;
  /** Size along the station's x, y and z, m: it stands out of its wall by its size along the face's axis. */
  readonly size: Vec3;
  readonly action: FixtureAction;
  /** The station machine whose queue lights it, if any. */
  readonly machine?: MachineId;
  /** One line about it, shown on tapping. */
  readonly info: string;
  readonly source?: string;
}

export interface StationInteriorPlan {
  readonly volumes: readonly InteriorVolume[];
  readonly fixtures: readonly Fixture[];
  /** Solid things inside a volume she cannot float through there (the airlock's shell in the hangar, racks). */
  readonly solids: readonly (Box & { readonly volume: string })[];
  /** Where she comes in from each docking port, and the direction she faces. */
  readonly entries: Readonly<Record<PortUser, { readonly at: Vec3; readonly facing: Vec3 }>>;
  /** Hangar storage: racks for spare parts and cradles for probes. */
  readonly storage: HangarStorage;
}

/** Racks (one crate per slot) and cradles in the hangar. */
export interface HangarStorage {
  /** Slots on the racks, in fill order: centre of each crate. */
  readonly rackSlots: readonly Vec3[];
  /** Cradles on the deck, in fill order: centre of each probe. */
  readonly cradles: readonly Vec3[];
  readonly crate: Vec3;
}

const inBox = (b: Box, p: Vec3, margin: Vec3) =>
  Math.abs(p.x - b.centre.x) <= b.half.x - margin.x && Math.abs(p.y - b.centre.y) <= b.half.y - margin.y && Math.abs(p.z - b.centre.z) <= b.half.z - margin.z;

/** The space a fixture takes: from its front back into its wall. */
export function fixtureBox(f: Fixture): Box {
  const n = FACE_NORMAL[f.face];
  const depth = Math.abs(n.x) * f.size.x + Math.abs(n.y) * f.size.y + Math.abs(n.z) * f.size.z;
  return { centre: f.at.add(n.scale(depth / 2)), half: f.size.scale(0.5) };
}

/** Distance from a point to a box (0 inside). */
export function distanceToBox(b: Box, p: Vec3): number {
  const d = (c: number, h: number, q: number) => Math.max(0, Math.abs(q - c) - h);
  return Math.hypot(d(b.centre.x, b.half.x, p.x), d(b.centre.y, b.half.y, p.y), d(b.centre.z, b.half.z, p.z));
}

/** The face a direction points at most (for the «looking to» readout). */
export function faceToward(dir: Vec3): Face {
  const a = { x: Math.abs(dir.x), y: Math.abs(dir.y), z: Math.abs(dir.z) };
  if (a.y >= a.x && a.y >= a.z) return dir.y >= 0 ? "techo" : "suelo";
  if (a.x >= a.z) return dir.x >= 0 ? "estribor" : "babor";
  return dir.z >= 0 ? "popa" : "proa";
}

/**
 * The station's interior: the volumes she can float through in microgravity (the station does not
 * spin), what is mounted on their walls, and the airlock rule between the pressurised modules and
 * the hangar, which is open to vacuum (docs/design/interiores.md).
 */
export class StationInterior {
  constructor(readonly plan: StationInteriorPlan) {}

  volume(id: string): InteriorVolume | undefined {
    return this.plan.volumes.find((v) => v.id === id);
  }

  /** The volume she is in (a module rather than the hatch she is going through). */
  volumeAt(p: Vec3): InteriorVolume | undefined {
    const hits = this.plan.volumes.filter((v) => inBox(v, p, Vec3.ZERO));
    return hits.find((v) => v.kind !== "escotilla") ?? hits[0];
  }

  /** Air to breathe here (false in the hangar, and in the airlock once emptied). */
  pressurisedAt(p: Vec3, airlockEmpty = false): boolean {
    const v = this.volumeAt(p);
    if (!v) return false;
    if (v.kind === "esclusa") return !airlockEmpty;
    return v.pressurised;
  }

  /**
   * Whether her body centre fits at `p`, keeping `margin` from the walls. `suited` is the airlock's
   * state: emptied with her in a suit (outer hatch open) or at cabin pressure (inner hatch open).
   */
  fits(p: Vec3, margin: number, suited: boolean): boolean {
    const m = new Vec3(margin, margin, margin);
    return this.plan.volumes.some((v) => {
      if (v.needs === "traje" && !suited) return false;
      if (v.needs === "presion" && suited) return false;
      const vm = v.through ? new Vec3(v.through === "x" ? 0 : margin, v.through === "y" ? 0 : margin, v.through === "z" ? 0 : margin) : m;
      return inBox(v, p, vm) && !this.plan.solids.some((s) => s.volume === v.id && inBox(s, p, m.scale(-1)));
    });
  }

  /** The nearest fixture within `reachM` of her (measured to the fixture's box). */
  fixtureNear(p: Vec3, reachM = 1.0): Fixture | undefined {
    let best: Fixture | undefined;
    let bestD = reachM;
    for (const f of this.plan.fixtures) {
      const d = distanceToBox(fixtureBox(f), p);
      if (d <= bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  fixture(id: string): Fixture | undefined {
    return this.plan.fixtures.find((f) => f.id === id);
  }

  /** Fixtures that open a given tab of the station's screen. */
  fixturesFor(panel: StationPanel): Fixture[] {
    return this.plan.fixtures.filter((f) => f.action.kind === "panel" && f.action.panel === panel);
  }

  /** Location code of a fixture, like the ISS's: module code + face letter + bay (FAB1S2). */
  locationCode(f: Fixture): string {
    const v = this.volume(f.volume)!;
    const along = (f.at.z - (v.centre.z - v.half.z)) / (2 * v.half.z);
    const bay = Math.max(1, Math.min(6, Math.floor(along * 6) + 1));
    return `${v.code}${FACE_LETTER[f.face]}${bay}`;
  }

  /** Where each spare part and probe goes in the hangar (extra ones wait in the last slots' place). */
  stow(parts: readonly [string, number][], crafts: readonly CraftSpec[]): { crates: { partId: string; at: Vec3 }[]; probes: { craft: CraftSpec; at: Vec3 }[] } {
    const s = this.plan.storage;
    const crates: { partId: string; at: Vec3 }[] = [];
    for (const [partId, n] of parts)
      for (let k = 0; k < n && crates.length < s.rackSlots.length; k++) crates.push({ partId, at: s.rackSlots[crates.length]! });
    const probes = crafts
      .filter((c) => c.kind === "sonda")
      .slice(0, s.cradles.length)
      .map((craft, i) => ({ craft, at: s.cradles[i]! }));
    return { crates, probes };
  }
}
