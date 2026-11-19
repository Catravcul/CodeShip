import { describe, expect, it } from "vitest";
import { buildLayout } from "../data/layout";
import { s3AreaScopes } from "./area-scope";

describe("el alcance de Áreas del santuario 3: isla → edificio → piso (Berón 2026-11-19)", () => {
  const L = buildLayout(1);
  it("en la lanzadera, el edificio-árbol con sus dos niveles; cada piso y mirador en su nivel", () => {
    const s = s3AreaScopes(L.areas.filter((a) => a.island === "lanzadera"));
    expect(s.scopes.map((g) => g.kind)).toEqual(["edificio", "piso"]);
    expect(s.scopes[0]!.options).toEqual([{ id: "lanzadera-arbol", label: "Lanzadera de cohetes" }]);
    expect(s.scopes[1]!.options.map((o) => o.label)).toEqual(["Lanzadera de cohetes · nivel 1", "Lanzadera de cohetes · nivel 2"]);
    expect(s.of("lanzadera-arbol:piso-1-0")).toEqual({ edificio: "lanzadera-arbol", piso: "lanzadera-arbol:nivel-1" });
    expect(s.of("lanzadera-arbol:punta-2-0")).toEqual({ edificio: "lanzadera-arbol", piso: "lanzadera-arbol:nivel-2" });
    expect(s.of("lanzadera-arbol:techo")).toEqual({ edificio: "lanzadera-arbol" });
    expect(s.of("lanzadera:casquete")).toBeUndefined();
  });
  it("en la isla de entrenamiento, cada instalación es un edificio y sus salas van dentro; sin pisos", () => {
    const s = s3AreaScopes(L.areas.filter((a) => a.island === "entrenamiento"));
    expect(s.scopes.map((g) => g.kind)).toEqual(["edificio"]);
    expect(s.of("entrenamiento:nbl-control")).toEqual({ edificio: "entrenamiento:nbl" });
    expect(s.of("entrenamiento:simulador-dragon-capsula")).toEqual({ edificio: "entrenamiento:simulador-dragon" });
    expect(s.of("entrenamiento:svmf-orion")).toEqual({ edificio: "entrenamiento:svmf" });
    expect(s.of("entrenamiento:helipuerto")).toBeUndefined();
    const ids = s.scopes[0]!.options.map((o) => o.id);
    expect(ids).toContain("entrenamiento:nbl");
    expect(ids).not.toContain("entrenamiento:nbl-control");
  });
  it("una isla sin edificios (el glaciar) no tiene alcance propio: solo «Toda la isla»", () => {
    expect(s3AreaScopes(L.areas.filter((a) => a.island === "glaciar")).scopes).toEqual([]);
  });
});
