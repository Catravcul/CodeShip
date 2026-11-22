import { describe, expect, it } from "vitest";
import { C } from "./models/kit";
import { FLOOR_PLANS } from "./floors";
import { TOWERS } from "./site";
import { model, MODELS } from "./catalog";
import { MIN_SCORE, PENDIENTES, floatingParts, realism, settled } from "./realismo";

/** The models on today's floors (the roomy buildings are kept, not built). */
const USED = [...new Set(TOWERS.flatMap((t) => t.floors.flatMap((f) => (f.furnish ? FLOOR_PLANS.get(f.furnish)!.items.map((i) => i.model) : []))))];

describe("revisión de realismo de los objetos 3D (Berón 2026-11-22)", () => {
  it("una silla sin patas flota; con su pata no; una pieza a 5 cm de su mesa se asienta", () => {
    const seat = C(0, 0.47, 0, 0.5, 0.06, 0.5);
    expect(floatingParts([C(0, 0.02, 0, 2, 0.04, 2), seat])).toHaveLength(1);
    expect(floatingParts([seat, C(0, 0.22, 0, 0.05, 0.44, 0.05)])).toHaveLength(0);
    const top = C(0, 0.75, 0, 1, 0.04, 1);
    const drum = C(0, 0.9, 0, 0.4, 0.1, 0.4);
    const out = settled([top, C(0, 0.37, 0, 0.05, 0.74, 0.05), drum]);
    expect(floatingParts(out)).toHaveLength(0);
    expect(out[2]![1]).toBeCloseTo(0.82, 2);
  });
  it("un cubo suelo de un color no pasa; un suelo se revisa solo por su fuente", () => {
    const cube = { ...MODELS[0]!, id: "cubo", shape: "caja" as const, parts: undefined, size: { x: 1, y: 1, z: 1 } };
    expect(realism(cube).score).toBeLessThan(MIN_SCORE);
    expect(realism(model("plaza-suelo")).score).toBe(100);
  });
  it("cada objeto de los pisos de hoy llega a 80 puntos y no tiene nada en el aire, salvo los pendientes de rehacer", () => {
    const low = USED.filter((id) => !PENDIENTES.has(id)).map((id) => ({ id, r: realism(model(id)) })).filter(({ r }) => r.score < MIN_SCORE || r.floating > 0);
    expect(low.map(({ id, r }) => `${id} (${r.score}: ${r.notes.join(", ")})`)).toEqual([]);
  });
  it("la lista de pendientes solo baja: el que ya llega sale de ella", () => {
    const done = [...PENDIENTES].filter((id) => !USED.includes(id) || (realism(model(id)).score >= MIN_SCORE && !realism(model(id)).floating));
    expect(done).toEqual([]);
    expect(PENDIENTES.size).toBeLessThanOrEqual(80);
  });
  it("ningún cubo suelto: todo lo que no es un suelo está hecho de piezas", () => {
    const cubes = USED.filter((id) => { const r = realism(model(id)); return !r.flat && r.pieces < 2; });
    expect(cubes).toEqual([]);
  });
  it("cada objeto tiene su fuente y su etiqueta de realidad", () => {
    for (const id of USED) {
      const d = model(id);
      expect(d.source.length, id).toBeGreaterThanOrEqual(12);
      expect(["real", "en-desarrollo", "licencia", "ficcion"], id).toContain(d.reality);
    }
  });
});
