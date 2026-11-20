import { LOBES, TOWERS, isLand } from "./site";

/**
 * The landscape of sanctuary 1, placed on the plan (y = 0 on the ice; icebergs on the water): Cold Sanctuary's wild
 * caps (WildCaps.cs WildLobe: in each «Bosque» lobe a pressure ridge with its snowdrift, a rock outcrop with its wind
 * scour and lichen, and a haul-out on the shore), the tundra's plants on the land island, and the two icebergs.
 * Deterministic (a fixed seed per lobe), and clear of the trunks' feet (36 m, TrunkMargin).
 */
export interface LandItem {
  readonly model: string;
  readonly x: number;
  readonly z: number;
  readonly rot: number;
  readonly name?: string;
  /** On the water (icebergs). */
  readonly sea?: boolean;
}

const TRUNK_MARGIN = 36;
/** Where the wind blows to (Cold Sanctuary's NuclearSiteRule.PrevailingWindTo is a katabatic; ours: from the south-west). */
const LEE = { x: 0.8, z: 0.6 };

function rng(seed: number): (a: number, b: number) => number {
  let s = seed >>> 0;
  return (a, b) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return a + ((s >>> 8) / 0x1000000) * (b - a);
  };
}

const nearTrunk = (x: number, z: number) => TOWERS.some((t) => Math.hypot(x - t.x, z - t.z) < TRUNK_MARGIN);
/** Inside another lobe (overlapping caps: drawn once). */
const inOther = (l: { x: number; z: number }, x: number, z: number) => LOBES.some((q) => q !== l && q.r > 0 && q.name < (l as { name?: string }).name! && Math.hypot(x - q.x, z - q.z) < q.r);
const onLobe = (l: { x: number; z: number; r: number }, x: number, z: number, margin: number) => Math.hypot(x - l.x, z - l.z) < l.r - margin;

/** A free spot of the lobe (WildSpot): 12 angles from `angle`, at `radius` from its centre. */
function spot(l: { x: number; z: number; r: number }, angle: number, radius: number, half: number): { x: number; z: number } | undefined {
  for (let k = 0; k < 12; k++) {
    const a = ((angle + k * 30) * Math.PI) / 180;
    const x = l.x + Math.sin(a) * radius;
    const z = l.z + Math.cos(a) * radius;
    if (onLobe(l, x, z, half) && !nearTrunk(x, z)) return { x, z };
  }
  return undefined;
}

export function landscape(): LandItem[] {
  const out: LandItem[] = [];
  const along = { x: -LEE.z, z: LEE.x };
  const alongYaw = Math.atan2(along.x, along.z);
  LOBES.forEach((l, index) => {
    if (l.r <= 0) return;
    const R = rng(4001 + index * 37);
    const a0 = index * 73;
    if (l.name.includes("Bosque_")) {
      const ridge = spot(l, a0, l.r * 0.45, 9);
      if (ridge) {
        for (let i = 0; i < 12; i++) {
          const o = -11 + i * 2, j = R(-0.8, 0.8);
          out.push({ model: "cresta-presion", x: ridge.x + along.x * o + LEE.x * j, z: ridge.z + along.z * o + LEE.z * j, rot: alongYaw + R(-0.5, 0.5), ...(i === 0 ? { name: "Cresta de presión" } : {}) });
        }
        out.push({ model: "ventisquero", x: ridge.x + LEE.x * 5, z: ridge.z + LEE.z * 5, rot: alongYaw, name: "Ventisquero (guarida de la osa)" });
      }
      const rock = spot(l, a0 + 130, l.r * 0.35, 7);
      if (rock) {
        out.push({ model: "roca-nunatak-alta", x: rock.x, z: rock.z, rot: R(0, 1.5), name: "Nunatak: nidos y posadero del petrel" });
        for (let i = 1; i < 6; i++) {
          const a = (i * 72 * Math.PI) / 180, r = R(2.6, 4);
          out.push({ model: "roca-nunatak", x: rock.x + Math.sin(a) * r, z: rock.z + Math.cos(a) * r, rot: R(0, 1.5) });
        }
        out.push({ model: "liquen-viento", x: rock.x - LEE.x * 7, z: rock.z - LEE.z * 7, rot: Math.atan2(LEE.x, LEE.z), name: "Hueco de viento con liquen" });
      }
      // The haul-out, on the shore facing the sea (the lobe's edge away from the sanctuary's centre).
      const out0 = Math.atan2(l.x, l.z);
      const hx = l.x + Math.sin(out0) * (l.r - 4), hz = l.z + Math.cos(out0) * (l.r - 4);
      if (!nearTrunk(hx, hz)) out.push({ model: "descansadero", x: hx, z: hz, rot: out0 + Math.PI / 2, name: "Descansadero (foca y morsa)" });
    }
    if (isLand(l) && l.name.startsWith("Isla:")) {
      // Tundra: moss and lichen cushions, dwarf willow, mountain avens, and ponds with cotton grass.
      const n = Math.round(l.r / 3);
      for (let i = 0; i < n; i++) {
        const a = R(0, Math.PI * 2), r = l.r * Math.sqrt(R(0.02, 0.85));
        const x = l.x + Math.sin(a) * r, z = l.z + Math.cos(a) * r;
        if (nearTrunk(x, z)) continue;
        const kind = i % 6;
        if (kind === 5) {
          out.push({ model: "tundra-charca", x, z, rot: R(0, 3), name: "Charca de tundra" });
          for (let c = 0; c < 4; c++) out.push({ model: "tundra-algodon", x: x + R(-3.5, 3.5), z: z + R(-2.8, 2.8), rot: 0, name: "Algodón ártico" });
        } else {
          out.push({ model: "tundra-musgo", x, z, rot: R(0, 3) });
          out.push({ model: kind % 2 ? "tundra-sauce" : "tundra-dryas", x: x + R(-1, 1), z: z + R(-1, 1), rot: R(0, 3), name: kind % 2 ? "Sauce ártico" : "Dríada de ocho pétalos" });
        }
      }
    }
  });
  // Every ice cap's surface (docs/design/santuario1.md §Casquetes): sastrugi along the wind every ~12 m, a few hummocks
  // near the edge where the floe was pressed, and on the caps that touch the land island the tide crack of its shore.
  LOBES.forEach((l, index) => {
    if (l.r <= 0 || isLand(l)) return;
    const R = rng(9100 + index * 53);
    for (let gx = -l.r; gx <= l.r; gx += 12)
      for (let gz = -l.r; gz <= l.r; gz += 12) {
        const x = l.x + gx + R(-4, 4), z = l.z + gz + R(-4, 4);
        if (!onLobe(l, x, z, 3) || nearTrunk(x, z) || inOther(l, x, z)) continue;
        out.push({ model: "sastrugi", x, z, rot: alongYaw + Math.PI / 2 + R(-0.2, 0.2) });
      }
    const n = Math.max(2, Math.round(l.r / 9));
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), r = l.r - R(4, 7);
      const x = l.x + Math.sin(a) * r, z = l.z + Math.cos(a) * r;
      if (nearTrunk(x, z) || inOther(l, x, z)) continue;
      out.push({ model: "hummock", x, z, rot: R(0, 3), ...(i === 0 ? { name: "Montículos de hielo (hummocks)" } : {}) });
    }
    for (const q of LOBES) {
      if (q.r <= 0 || !isLand(q)) continue;
      const d = Math.hypot(q.x - l.x, q.z - l.z);
      if (d > l.r + q.r - 2) continue;
      // Where the two touch: the crack runs along the shore, 6 m out on the ice.
      const ux = (q.x - l.x) / d, uz = (q.z - l.z) / d;
      const at = Math.max(0, (d - q.r) - 6);
      const x = l.x + ux * Math.min(at, l.r - 4), z = l.z + uz * Math.min(at, l.r - 4);
      if (!nearTrunk(x, z)) out.push({ model: "grieta-marea", x, z, rot: Math.atan2(ux, uz) + Math.PI / 2, name: "Grieta de marea" });
    }
  });
  // The island's trees (Cold Sanctuary's BuildIceFlora): six mountain birches in a ring of 16 m round the grove.
  const GROVE = { x: -125, z: -165 };
  for (let k = 0, n = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const x = GROVE.x + Math.sin(a) * 16;
    const z = GROVE.z + Math.cos(a) * 16;
    if (!LOBES.some((l) => isLand(l) && Math.hypot(x - l.x, z - l.z) < l.r * 0.92)) continue;
    out.push({ model: "abedul-isla", x, z, rot: k * 0.7, ...(n++ === 0 ? { name: "Abedules de la isla" } : {}) });
  }
  out.push({ model: "iceberg-varado", x: -500, z: -500, rot: 0, name: "Iceberg varado", sea: true });
  out.push({ model: "iceberg-deriva", x: 540, z: 200, rot: 0, name: "Iceberg a la deriva", sea: true });
  return out;
}

/** The drifting iceberg's path (Icebergs.cs driftA → driftB): it ends up near the nuclear site. */
export const DRIFT = { a: { x: 540, z: 200 }, b: { x: 520, z: -260 } } as const;
