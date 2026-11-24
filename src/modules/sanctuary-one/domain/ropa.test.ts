import { describe, expect, it } from "vitest";
import { greekOutfit, workOutfit } from "./ropa";

describe("la ropa: la del trabajo de cada piso y la de cada época (Berón 2026-11-24)", () => {
  it("cada oficio con su ropa", () => {
    expect(workOutfit("hospital")?.hat?.kind).toBe("quirofano");
    expect(workOutfit("restaurante")?.hat?.kind).toBe("cocinero");
    expect(workOutfit("laboratorios")?.coat).toBeDefined();
    expect(workOutfit("construccion")?.hat?.kind).toBe("casco");
    expect(workOutfit("gimnasio")?.shorts).toBe(true);
    expect(workOutfit("habitaciones-1")).toBeUndefined();
  });
  it("en la Atenas de Platón, quitón y manto; para ejercitarse, la exomis", () => {
    expect(greekOutfit({ feminine: true }).robe?.long).toBe(true);
    expect(greekOutfit({ what: "ejercicio" }).label).toMatch(/Exomis/);
    expect(greekOutfit({}).cloak).toBeDefined();
  });
});
