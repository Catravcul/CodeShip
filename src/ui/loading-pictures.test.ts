import { describe, expect, it } from "vitest";
import { LEVELS } from "@modules/levels/data/levels";
import { PICTURES } from "./loading-pictures";

describe("pantallas de carga: todos los santuarios equivalentes (Berón 2026-11-25, reglas.md §5.3)", () => {
  it("cada nivel que se juega tiene su dibujo de carga, con su número y su nombre", () => {
    for (const l of LEVELS.filter((q) => q.state === "jugable")) {
      const p = PICTURES[l.id];
      expect(p, l.id).toBeDefined();
      expect(p!.title).toContain(String(l.number));
      expect(p!.title).toContain(l.name.replace(/^Santuario /, "").slice(0, 4));
    }
  });

  it("cada dibujo es un SVG con nombre accesible y sus ids propios (no choca con los de otro)", () => {
    const ids = new Map<string, string>();
    for (const [level, p] of Object.entries(PICTURES)) {
      if (!p) continue;
      expect(p.svg).toMatch(/<svg viewBox="0 0 360 300" role="img" aria-label="[^"]{20,}"/);
      expect(p.svg).not.toContain("undefined");
      for (const [, id] of p.svg.matchAll(/ id="([^"]+)"/g)) {
        expect(ids.get(id!), `${id} en ${level} y ${ids.get(id!)}`).toBeUndefined();
        ids.set(id!, level);
      }
    }
  });
});
