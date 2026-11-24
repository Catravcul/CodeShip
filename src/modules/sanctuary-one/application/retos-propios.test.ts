import { describe, expect, it } from "vitest";
import { FLOOR_PLANS } from "../data/floors";
import { TOWERS } from "../data/site";
import { model } from "../data/catalog";
import { retosFor } from "./challenges";

/**
 * Each object its own challenge (Berón 2026-11-23: «lo ideal es que cada instrumento tenga su reto propio para que el
 * jugador aprenda de cada instrumento, y también debería funcionar así con los objetos de otras áreas»). Done for the
 * band, the dojo, the gym and the kitchen's stations (data/retos-objetos.ts), and for the hospital, the veterinary
 * hospital and the guard room (data/retos-objetos-2.ts), and all the rest (retos-objetos-3.ts and -4.ts, 2026-11-24):
 * no object shares its first challenge with another any more.
 */
const SHARING_AT_MOST = 0;

describe("retos propios de cada objeto", () => {
  it("ningún objeto comparte su primer reto con otro (Berón 2026-11-24: «terminar todos los retos»)", () => {
    const used = new Set<string>();
    for (const t of TOWERS) for (const f of t.floors) if (f.furnish) for (const i of FLOOR_PLANS.get(f.furnish)!.items) used.add(i.model);
    const first = new Map<string, string[]>();
    for (const id of used) {
      const r = retosFor(model(id), 0)[0];
      if (!r) continue;
      const k = r.chore.title;
      first.set(k, [...(first.get(k) ?? []), id]);
    }
    const sharing = [...first.values()].filter((ids) => ids.length > 1).flat();
    expect(sharing.length).toBeLessThanOrEqual(SHARING_AT_MOST);
  });
});
