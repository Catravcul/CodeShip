import { describe, expect, it } from "vitest";
// @ts-expect-error: node's fs, in a test only (the project has no @types/node)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

declare const process: { env: Record<string, string | undefined> };
import { documento, lista } from "./lista";
import { REVISADO } from "../data/revisado";

const DOC = "docs/qa/revision-en-vivo.md";

describe("la lista de revisión en vivo (Berón 2026-11-24)", () => {
  it("cada revisión anotada es de algo que existe, con fecha y lo visto", () => {
    const ids = new Set(lista().map((r) => r.id));
    for (const [id, r] of Object.entries(REVISADO)) {
      expect(ids.has(id), id).toBe(true);
      expect(r.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.visto.length).toBeGreaterThan(5);
    }
  });
  it("el documento está al día con los catálogos (REVISION_ESCRIBIR=1 lo regenera)", () => {
    const want = documento();
    if (process.env.REVISION_ESCRIBIR) writeFileSync(DOC, want);
    expect(existsSync(DOC)).toBe(true);
    expect(readFileSync(DOC, "utf8")).toBe(want);
  });
});
