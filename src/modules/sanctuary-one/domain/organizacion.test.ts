import { describe, expect, it } from "vitest";
import { CROWN_SHARE, RING_SHARE, categoria, ocupacion, reorganizar, revisar, tipoDePiso, ubicar, type Componente, type EdificioTag, type PisoTag } from "./organizacion";

const C = (id: string, categoria: Componente["categoria"], cuota = 1): Componente => ({ id, nombre: id, categoria, cuota });
const P = (id: string, ...componentes: Componente[]): PisoTag => ({ id, componentes });
const E = (id: string, ...pisos: PisoTag[]): EdificioTag => ({ id, nombre: id, pisos });

describe("reglas de organización de edificios y pisos (Berón 2026-11-24)", () => {
  it("marcas: un piso con un componente es puro, con varios mixto; el edificio es de su categoría más común", () => {
    expect(tipoDePiso(P("a", C("gym", "entrenamiento")))).toBe("pura");
    const m = P("b", C("info", "ciencias", 0.8), C("sim", "ciencias", 0.15));
    expect(tipoDePiso(m)).toBe("mixta");
    expect(ocupacion(m)).toBeCloseTo(0.95);
    expect(categoria(E("x", P("1", C("a", "ciencias")), P("2", C("b", "ciencias")), P("3", C("c", "servicios"))))).toBe("ciencias");
  });

  it("regla 1: dónde cabe según su cuota: piso, piso con anillo, cima, cima con anillo o repartido", () => {
    expect(ubicar(1).en).toBe("piso");
    expect(ubicar(1 + RING_SHARE).en).toBe("piso+anillo");
    expect(ubicar(2).en).toBe("cima");
    expect(ubicar(CROWN_SHARE).en).toBe("cima");
    expect(ubicar(CROWN_SHARE + 1).en).toBe("cima+anillo");
    const r = ubicar(40);
    expect(r).toEqual({ en: "repartir", pisos: Math.ceil(40 / (1 + RING_SHARE)) });
  });

  it("regla 2: si un componente de un piso mixto crece, el otro busca un piso de su categoría con sitio", () => {
    const h = revisar([E("a", P("mix", C("info", "ciencias", 0.9), C("sim", "ciencias", 0.3)), P("lab", C("lab", "ciencias", 0.5)), P("gym", C("gym", "entrenamiento", 0.2)))]);
    expect(h).toContainEqual({ regla: "desbordado", piso: "mix", crece: "info", mover: "sim", a: "lab" });
  });

  it("regla 1 y 3: lo que no cabe sube a la cima con sus pisos; el edificio que queda solo con su cima la cede al de menos pisos y desaparece", () => {
    const res = E("res", P("plaza", C("res", "vivienda", 7)), P("h1", C("h1", "vivienda")), P("h2", C("h2", "vivienda")));
    const out = reorganizar([E("a", P("1", C("a1", "servicios")), P("2", C("a2", "servicios")), P("3", C("a3", "servicios"))), E("b", P("1", C("b1", "ciencias"))), res]);
    expect(out.edificios.map((e) => e.id)).toEqual(["a", "b"]);
    expect(out.edificios[1]!.cima?.componentes[0]?.id).toBe("res");
    expect(out.hecho).toHaveLength(2);
  });

  it("regla 4: un edificio con menos de la mitad de pisos que el más lleno queda marcado", () => {
    const h = revisar([E("a", ...[1, 2, 3, 4, 5].map((i) => P(`${i}`, C(`a${i}`, "servicios")))), E("b", P("1", C("b1", "campos")))]);
    expect(h).toContainEqual({ regla: "desequilibrio", edificio: "b", pisos: 1, maximo: 5 });
  });

  it("un edificio que ya tiene cima no se queda dando vueltas con otro componente grande", () => {
    const e: EdificioTag = { ...E("a", P("1", C("big", "servicios", 3))), cima: P("c", C("c", "vivienda", 5)) };
    const out = reorganizar([e]);
    expect(out.edificios[0]!.cima?.id).toBe("c");
    expect(out.hecho).toEqual([]);
  });
});
