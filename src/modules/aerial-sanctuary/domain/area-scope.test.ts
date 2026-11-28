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
  it("dentro de la montaña, cada edificio-árbol es un edificio y sus pisos, pisos; las salas van en el piso de su edificio", () => {
    const s = s3AreaScopes(L.areas.filter((a) => a.island === "entrenamiento"));
    expect(s.scopes.map((g) => g.kind)).toEqual(["edificio", "piso"]);
    const nbl = { edificio: "torre:astronautas", piso: "torre:astronautas:piso-1" };
    expect(s.of("entrenamiento:nbl")).toEqual(nbl);
    expect(s.of("entrenamiento:nbl-control")).toEqual(nbl);
    expect(s.of("astronautas:piso-1")).toEqual(nbl);
    expect(s.of("entrenamiento:residencia")).toEqual({ edificio: "torre:ciencias", piso: "torre:ciencias:cima" });
    expect(s.of("entrenamiento:servicios:pie")).toEqual({ edificio: "torre:servicios", piso: "torre:entrenamiento:servicios:pie" });
    expect(s.of("entrenamiento:helipuerto")).toBeUndefined();
    expect(s.of("entrenamiento:compuerta-sur")).toBeUndefined();
    const ids = s.scopes[0]!.options.map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(["torre:servicios", "torre:entrenamiento", "torre:ciencias", "torre:produccion", "torre:campos", "torre:astronautas", "torre:astronautas-salas"]));
  });
  it("una isla sin edificios (el glaciar) no tiene alcance propio: solo «Toda la isla»", () => {
    expect(s3AreaScopes(L.areas.filter((a) => a.island === "glaciar")).scopes).toEqual([]);
  });
  it("en la isla de las alturas, las zonas por su cinturón de altitud: de la estepa a las nieves", () => {
    const s = s3AreaScopes(L.areas.filter((a) => a.island === "bioma"));
    expect(s.scopes.map((g) => g.kind)).toEqual(["cinturon"]);
    expect(s.scopes[0]!.options.map((o) => o.id)).toEqual(expect.arrayContaining(["submontano", "montano", "subalpino", "alpino", "subnival", "nival"]));
    expect(s.of("bioma:estepa")).toEqual({ cinturon: "submontano" });
    expect(s.of("bioma:nieves")).toEqual({ cinturon: "nival" });
    expect(s.of("bioma:isla")).toBeUndefined();
  });
});
