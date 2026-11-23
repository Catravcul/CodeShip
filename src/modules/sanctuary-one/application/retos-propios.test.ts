import { describe, expect, it } from "vitest";
import { FLOOR_PLANS } from "../data/floors";
import { TOWERS } from "../data/site";
import { model } from "../data/catalog";
import { retosFor } from "./challenges";

/**
 * Each object its own challenge (Berón 2026-11-23: «lo ideal es que cada instrumento tenga su reto propio para que el
 * jugador aprenda de cada instrumento, y también debería funcionar así con los objetos de otras áreas»). Done for the
 * band, the dojo, the gym and the kitchen's stations (data/retos-objetos.ts); the hospital, the labs, the workshops and
 * the fields still share theirs. The count of objects sharing their first challenge with another only goes down.
 */
const SHARING_AT_MOST = 255;

describe("retos propios de cada objeto", () => {
  it("los objetos que aún comparten su primer reto con otro objeto distinto no aumentan", () => {
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
