import { describe, expect, it } from "vitest";
import { MODELS } from "@modules/sanctuary-one/data/catalog";
import { retoTag, retosFor } from "@modules/sanctuary-one/application/challenges";
import { stations } from "@modules/aerial-sanctuary/application/stations";
import { POSTS } from "@modules/aerial-sanctuary/application/initiation";
import { FIELD } from "@modules/aerial-sanctuary/data/bioma-retos";
import { RETO, RETOS, capitalised, choreWord, retoWord, retosWord } from "./palabra";

const ONE_WORD = /^\p{Lu}[\p{Ll}]+$/u;

describe("retoWord: una palabra que dice de qué va el reto (Berón 2026-11-25)", () => {
  it("la del dato manda, en una palabra y con mayúscula", () => {
    expect(retoWord({ palabra: "canto", id: "musica-voz" })).toBe("Canto");
    expect(capitalised("BOXEO")).toBe("Boxeo");
  });

  it.each([
    [{ id: "dojo-saco-pesado", kind: "ejercicio", title: "Asaltos al saco pesado" }, "Boxeo"],
    [{ id: "cocina-pan-masa-madre", kind: "procesar", title: "Pan de masa madre" }, "Cocina"],
    [{ id: "cocinar-tortilla", kind: "cocinar", title: "Cocinar Tortilla de papa" }, "Cocina"],
    [{ id: "yoga-saludo", kind: "yoga", title: "Saludo al Sol" }, "Yoga"],
    [{ id: "gym-cinta-carrera", kind: "ejercicio", title: "Carrera en la cinta" }, "Cardio"],
    [{ id: "obj-cons-grua", kind: "trabajar", title: "Izar con la grúa" }, "Obra"],
    [{ id: "gym-limpiar-maquina", kind: "limpiar", title: "Limpiar la máquina" }, "Limpieza"],
    [{ id: "chore:sv-pm-ogs", kind: "soporte-vital", title: "Mantener el OGS" }, "Mantenimiento"],
    [{ id: "brazo:cygnus", title: "Capturar un Cygnus" }, "Robótica"],
    [{ id: "s3:puesto-4", title: "Cámara hipobárica" }, "Hipoxia"],
    [{ title: "Natación y supervivencia en el agua" }, "Natación"],
    [{ title: "Centrífuga" }, "Centrífuga"],
    [{ title: "Mesa de campo" }, "Fauna"],
    [{ title: "Empezar el reto", place: "Consola de la centrífuga" }, "Centrífuga"],
    [{ title: "Empezar el reto" }, RETO],
  ])("%o → %s", (tag, word) => expect(retoWord(tag)).toBe(word));

  it("cada reto del santuario 1 da una sola palabra propia (nunca «Reto»)", () => {
    const bad: string[] = [];
    for (const m of MODELS)
      for (const r of retosFor(m)) {
        const w = retoWord(retoTag(r));
        if (!ONE_WORD.test(w) || w === RETO) bad.push(`${m.id}: ${r.chore.title} → ${w}`);
      }
    expect(bad).toEqual([]);
  });

  it("cada puesto del santuario 3 da su palabra desde su dato y desde su título (el botón de la tarjeta solo lleva el título)", () => {
    for (const s of stations()) {
      const w = choreWord(s.chore);
      expect(w, `puesto ${s.post}`).toMatch(ONE_WORD);
      expect(w).not.toBe(RETO);
      expect(retoWord({ title: s.chore.title }), `puesto ${s.post}: ${s.chore.title}`).toBe(w);
    }
    for (const p of POSTS) expect(retoWord({ id: `s3:puesto-${p.n}` }), `puesto ${p.n}`).not.toBe(RETO);
  });

  it("los retos del bioma del 3 son de fauna, como su mesa de campo", () => {
    for (const r of Object.values(FIELD)) expect(retoWord({ title: (r as { title: string }).title })).toBe("Fauna");
  });

  it("varios retos en un sitio: la palabra del primero si son del mismo tipo; si no, «Retos»", () => {
    expect(retosWord([{ id: "dojo-saco" }, { id: "dojo-pera-rapida" }])).toBe("Boxeo");
    expect(retosWord([{ id: "dojo-saco" }, { id: "gym-limpiar-maquina", kind: "limpiar" }])).toBe(RETOS);
    expect(retosWord([])).toBe(RETO);
  });
});
