import { describe, expect, it } from "vitest";
import { compoundForChore, RETO_COMPOUNDS } from "./retos-trazos";
import { stations } from "../application/stations";
import { phase5Stations } from "../application/stations-phase5";
import { launchChallenges, launchStations } from "../application/launch";
import { flightChore } from "../application/flight-program";
import { fieldJobs } from "../application/field-work";
import { createBiome } from "../domain/bioma";
import { buildLayout } from "./layout";
import { CRAFT } from "./facts";
import { planTrip } from "../domain/travel";
import { COMPOUNDS } from "@modules/trazos/data/compounds";
import { CAMPUS_RETOS } from "./campus";
import { procedureReto } from "@modules/sanctuary-one/application/challenges";

describe("santuario 3: cada reto se dibuja como un compuesto", () => {
  it("todos los retos del santuario tienen su compuesto", () => {
    const L = buildLayout(1);
    const crafts = { helicoptero: CRAFT.helicoptero.value, alfombra: CRAFT.alfombra.value };
    const legs = planTrip("entrenamiento", "lanzadera", L.islands.map((i) => i.pad), crafts)!;
    const chores = [
      ...stations().map((s) => s.chore),
      ...phase5Stations().map((s) => s.chore),
      ...launchStations().map((s) => s.chore),
      ...launchChallenges().map((c) => c.chore),
      flightChore(legs, crafts, (id) => id),
      ...fieldJobs(createBiome(1)).map((j) => j.reto.chore),
      ...Object.values(CAMPUS_RETOS).map((q) => procedureReto(q).chore),
    ];
    expect(chores.length).toBeGreaterThanOrEqual(20);
    for (const c of chores) expect(compoundForChore(c.id), c.id).toBeDefined();
  });
  it("cada fila dice por qué y apunta a un compuesto del catálogo", () => {
    for (const r of RETO_COMPOUNDS) {
      expect(COMPOUNDS.some((c) => c.id === r.compound), r.compound).toBe(true);
      expect(r.why.length).toBeGreaterThan(30);
    }
  });
  it("un reto de otro sitio no tiene compuesto (sigue con su hoja)", () => {
    expect(compoundForChore("s1:cocina")).toBeUndefined();
  });
});
