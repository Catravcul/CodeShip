import { describe, expect, it } from "vitest";
import { WORLD_SCALE } from "@core/scale";
import { buildS1Layout } from "./layout";
import { model } from "./catalog";
import { MISSIONS } from "./misiones";
import { retosFor } from "../application/challenges";

describe("cada misión de jornada está en su piso y tiene su reto", () => {
  const L = buildS1Layout(WORLD_SCALE);
  const furnishOf = new Map(L.areas.map((a) => [a.id, a.furnish]));
  for (const m of MISSIONS)
    it(m.id, () => {
      const it = L.instances.find((i) => i.model === m.model && (furnishOf.get(i.area) === m.floor || i.area === m.floor));
      expect(it, `${m.model} en ${m.floor}`).toBeDefined();
      expect(retosFor(model(m.model))[m.reto ?? 0], "su reto").toBeDefined();
    });
});
