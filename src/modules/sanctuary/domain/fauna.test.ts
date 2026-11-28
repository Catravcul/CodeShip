import { describe, expect, it } from "vitest";
import type { SanctuaryArea } from "./area";
import { fit, loopStatus, type Species } from "./fauna";

const SRC = "https://example.org/fuente";
const medaka: Species = { id: "medaka", name: "Medaka", habitat: "agua", role: "consumidor", zeroG: "orienta-con-luz", tempC: [18, 30], minWaterL: 1, source: SRC };
const cavefish: Species = { id: "pez-ciego", name: "Pez ciego", habitat: "agua", role: "consumidor", zeroG: "sin-datos-sin-vista", tempC: [18, 27], minWaterL: 40, source: SRC };
const hornwort: Species = { id: "ceratofilo", name: "Ceratófilo", habitat: "agua", role: "productor", zeroG: "ok", needsLight: true, tempC: [10, 30], minWaterL: 0.5, source: SRC };
const bee: Species = { id: "abeja", name: "Abeja", habitat: "aire", role: "consumidor", zeroG: "no", tempC: [15, 35], source: SRC };
const grenadier: Species = { id: "granadero", name: "Granadero", habitat: "agua", role: "consumidor", zeroG: "sin-datos", tempC: [2, 6], minWaterL: 200, minPressureKpa: 10000, source: SRC };
const biofilter: Species = { id: "nitrificantes", name: "Bacterias nitrificantes", habitat: "agua", role: "descomponedor", zeroG: "ok", tempC: [5, 35], source: SRC };

const area = (over: Partial<SanctuaryArea>): SanctuaryArea => ({
  id: "a",
  name: "A",
  kind: "marino",
  host: "estacion",
  gravityG: 0,
  light: "fotoperiodo",
  waterM3: 1,
  pressureKpa: 101.3,
  tempC: [22, 26],
  residents: [],
  support: [],
  requires: { areas: [], station: [] },
  ...over,
});

describe("which fauna fits an area", () => {
  it("medaka fits a lit 0 g aquarium: it keeps its back to the light (Ijiri's strain)", () => {
    expect(fit(medaka, area({}))).toEqual({ ok: true, reasons: [] });
  });

  it("in the dark, a fish that orients by light loops in 0 g", () => {
    expect(fit(medaka, area({ light: "oscuridad" })).reasons).toContain("ingravidez-a-oscuras");
  });

  it("a blind cave fish has no light to lean on: only in a ring", () => {
    expect(fit(cavefish, area({ waterM3: 1, light: "oscuridad" })).ok).toBe(false);
    expect(fit(cavefish, area({ gravityG: 1, light: "oscuridad", waterM3: 1 }))).toEqual({ ok: true, reasons: [] });
  });

  it("plants need light; aquatic species need enough water", () => {
    expect(fit(hornwort, area({ light: "oscuridad" })).reasons).toContain("necesita-luz");
    expect(fit(cavefish, area({ gravityG: 1, waterM3: 0.01 })).reasons).toContain("poca-agua");
    expect(fit(medaka, area({ waterM3: 0 })).reasons).toContain("sin-agua");
  });

  it("bees cannot fly in 0 g (STS-3) but would in a ring", () => {
    expect(fit(bee, area({ kind: "aereo", waterM3: 0, tempC: [20, 25] })).reasons).toContain("no-funciona-en-ingravidez");
    expect(fit(bee, area({ kind: "aereo", waterM3: 0, gravityG: 1, tempC: [20, 25] })).ok).toBe(true);
  });

  it("a land or air animal does not go into a marine area", () => {
    expect(fit(bee, area({ gravityG: 1, tempC: [20, 25] })).reasons).toEqual(["habitat"]);
  });

  it("sea and fresh water do not mix: a moon jellyfish needs a salt tank, a medaka a fresh one", () => {
    const jelly: Species = { id: "medusa", name: "Medusa luna", habitat: "agua", role: "consumidor", zeroG: "ok", salt: true, tempC: [18, 26], minWaterL: 10, source: SRC };
    expect(fit(jelly, area({ gravityG: 1 })).reasons).toEqual(["salinidad"]);
    expect(fit(jelly, area({ gravityG: 1, salt: true }))).toEqual({ ok: true, reasons: [] });
    expect(fit(medaka, area({ salt: true })).reasons).toEqual(["salinidad"]);
  });

  it("abyssal fish need their pressure and their cold", () => {
    const r = fit(grenadier, area({ gravityG: 1, waterM3: 1, light: "oscuridad" })).reasons;
    expect(r).toContain("falta-presion");
    expect(r).toContain("temperatura");
  });
});

describe("self-sufficiency loop (C.E.B.A.S.: plant, animal, bacteria)", () => {
  const catalog = [medaka, hornwort, biofilter];

  it("is closed with a producer, a consumer and a decomposer", () => {
    expect(loopStatus(area({ residents: ["medaka", "ceratofilo", "nitrificantes"] }), catalog)).toEqual({ closed: true, missing: [] });
  });

  it("a machine can fill a role (the biofilter, an electrolyser)", () => {
    expect(loopStatus(area({ residents: ["medaka", "ceratofilo"], support: ["descomponedor"] }), catalog).closed).toBe(true);
  });

  it("says which roles are missing", () => {
    expect(loopStatus(area({ residents: ["medaka"] }), catalog)).toEqual({ closed: false, missing: ["productor", "descomponedor"] });
  });

  it("an unknown resident is an error, not a silent pass", () => {
    expect(() => loopStatus(area({ residents: ["kraken"] }), catalog)).toThrow(/kraken/);
  });
});
