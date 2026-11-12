import type { Sourced } from "@core/units";
import type { Species } from "@modules/pets/domain/behavior";

/** Any animal that can join a family. */
export interface Member {
  readonly id: string;
  readonly name: string;
  readonly kind: Species;
  readonly young: boolean;
}

/**
 * Cross-species adoption is real: a cat raised ducklings born next to her litter, a dog nursed a
 * leopard cub, broody hens accept chicks that are not theirs when given them at night. Maternal
 * recognition is driven by oxytocin and learned, which is why keepers rely on cross-fostering.
 */
export const CROSS_FOSTERING: Sourced<string> = {
  value: "Las madres reconocen crías ajenas, incluso de otra especie, si las conocen en calma (oxitocina y aprendizaje).",
  source: "https://wcvmtoday.usask.ca/scicomm/family-or-foe-how-prey-and-predator-animals-can-develop-mother-child-bonds.php",
  note: "Broody hens grafting chicks: https://projects.sare.org/project-reports/fne08-645/ (3 of 4 groups accepted).",
};

/**
 * Interacting with animals lowers cortisol, heart rate and blood pressure and improves mood and
 * social behaviour (review of 69 studies, Beetz et al. 2012). Here it lowers Doménica's stress.
 */
export const ANIMAL_COMPANY: Sourced<string> = {
  value: "La interacción con animales baja el cortisol, la frecuencia cardiaca y la presión, y mejora el ánimo.",
  source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3408111/",
};

/** Game tuning (not measured): how fast bonds grow in calm, warm meetings and break in hostile ones. */
export const FAMILY_TUNING = {
  warmMeetingBond: 0.12,
  /** Brooding or snuggling a young animal bonds faster: that is how adoption happens. */
  motherBonus: 2,
  hostileBondLoss: 0.25,
  /** A bond this strong makes them family. */
  familyAt: 0.7,
  /** Family members (beyond the first) that make Doménica's company complete. */
  fullCompany: 4,
} as const;

/** A family: animals tied by strong bonds, from at least two species. */
export interface Family {
  readonly members: readonly Member[];
  readonly species: readonly Species[];
  /** The one who adopted the young, if any. */
  readonly motherId?: string;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How close each pair of animals is, 0..1. */
export class Bonds {
  private readonly _bonds = new Map<string, number>();
  private readonly _mothers = new Map<string, string>();

  get(a: string, b: string): number {
    return this._bonds.get(key(a, b)) ?? 0;
  }

  add(a: string, b: string, amount: number): number {
    const v = clamp01(this.get(a, b) + amount);
    this._bonds.set(key(a, b), v);
    return v;
  }

  /** `motherId` brooded or snuggled `youngId`. */
  nurture(motherId: string, youngId: string, amount: number): number {
    this._mothers.set(youngId, motherId);
    return this.add(motherId, youngId, amount);
  }

  /** Groups linked by bonds of at least `familyAt` that mix species. */
  families(members: readonly Member[]): Family[] {
    const byId = new Map(members.map((m) => [m.id, m]));
    const seen = new Set<string>();
    const out: Family[] = [];
    for (const m of members) {
      if (seen.has(m.id)) continue;
      const group: Member[] = [];
      const stack = [m];
      seen.add(m.id);
      while (stack.length) {
        const cur = stack.pop()!;
        group.push(cur);
        for (const other of members)
          if (!seen.has(other.id) && this.get(cur.id, other.id) >= FAMILY_TUNING.familyAt) {
            seen.add(other.id);
            stack.push(other);
          }
      }
      const species = [...new Set(group.map((g) => g.kind))];
      if (group.length < 2 || species.length < 2) continue;
      const young = group.find((g) => g.young && this._mothers.has(g.id) && byId.has(this._mothers.get(g.id)!));
      out.push({ members: group, species, motherId: young ? this._mothers.get(young.id) : undefined });
    }
    return out;
  }
}

/** 0..1: how much company the families give the crew. */
export function companionship(families: readonly Family[]): number {
  const n = families.reduce((s, f) => s + f.members.length - 1, 0);
  return Math.min(1, n / FAMILY_TUNING.fullCompany);
}
