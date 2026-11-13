import type { Amounts, MaterialId, MaterialStock } from "./materials";

/**
 * One propellant line of a docked craft, as the refuelling line sees it: how much more it can hold
 * and which station materials each kg loaded takes. For a bipropellant pair the kg is of the mix, so
 * `perKg` splits it into fuel and oxidizer at the mixture ratio and adds the helium that recharges
 * the bottle; for a monopropellant or xenon it is that one material.
 */
export interface PropellantLine {
  /** Id of the line on the craft (the propellant it holds: "MMH/NTO", "Hydrazine", "xenon"…). */
  readonly id: string;
  /** Spanish label for the screen. */
  readonly label: string;
  readonly capacityKg: number;
  readonly onBoardKg: number;
  /** Station materials per kg loaded into the line. */
  readonly perKg: Amounts;
}

/** What one line will get: kg loaded, the materials it takes, and which one ran short (if any). */
export interface LinePlan {
  readonly line: PropellantLine;
  /** Room left: capacity minus what is on board and what is already on its way. */
  readonly roomKg: number;
  readonly loadKg: number;
  readonly takes: Amounts;
  /** The store material that limits the load below the room left, if one does. */
  readonly shortOf?: MaterialId;
}

const EPS = 1e-9;
/** Whole grams: what the screen and the challenge show is what is loaded. */
const g = (v: number) => Math.floor(v * 1000 + EPS) / 1000;

/**
 * Plan a refuel: each line gets as much as it has room for, limited by the store. Lines share the
 * store in order (the helium of two pairs comes out of the same bottles), so a later line sees what
 * the earlier ones took. `pending` is kg already queued for each line.
 */
export function planRefuel(lines: readonly PropellantLine[], stock: MaterialStock, pending: Readonly<Record<string, number>> = {}): LinePlan[] {
  const left = new Map<MaterialId, number>();
  const have = (id: MaterialId) => left.get(id) ?? stock.amount(id);
  return lines.map((line) => {
    const roomKg = g(Math.max(0, line.capacityKg - line.onBoardKg - (pending[line.id] ?? 0)));
    let loadKg = roomKg;
    let shortOf: MaterialId | undefined;
    for (const [id, per] of Object.entries(line.perKg)) {
      if (per <= 0) continue;
      const most = g(have(id) / per);
      if (most + EPS < loadKg) {
        loadKg = most;
        shortOf = id;
      }
    }
    const takes: Record<MaterialId, number> = {};
    for (const [id, per] of Object.entries(line.perKg)) {
      const n = Math.min(have(id), loadKg * per);
      if (n > 0) {
        takes[id] = n;
        left.set(id, have(id) - n);
      }
    }
    return { line, roomKg, loadKg, takes, ...(shortOf && loadKg + EPS < roomKg ? { shortOf } : {}) };
  });
}

/** Everything a plan takes from the store, summed over its lines. */
export function planTakes(plan: readonly LinePlan[]): Amounts {
  const out: Record<MaterialId, number> = {};
  for (const p of plan) for (const [id, n] of Object.entries(p.takes)) out[id] = (out[id] ?? 0) + n;
  return out;
}

/** Game hours a transfer takes at a line's flow rate (kg per game hour). */
export const transferHours = (kg: number, kgPerHour: number): number => Math.max(0, kg) / kgPerHour;
