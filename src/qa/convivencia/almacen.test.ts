/**
 * Shared state of the station: its store (refinery, plant, living machines, imports), its power budget
 * and Nevaeh's credits (docs/qa/entrelazamiento.md). Each case puts two writers on the same state.
 */
import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { G } from "@core/units";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { BioOps } from "@modules/station/application/bio-ops";
import type { StationSession } from "@modules/station/application/station-ops";
import { MaterialStock } from "@modules/station/domain/materials";
import { Hangar } from "@modules/station/domain/hangar";
import { Station } from "@modules/station/domain/station";
import { BIO_KCAL_PER_KG, BIO_OUTPUT_USE, BIO_PROCESSES, CREW_NEEDS, LARDER_UNITS } from "@modules/station/data/bio";
import { EQ_BIO_LAB, EQ_PROTEIN } from "@modules/station/data/bio-equipment";
import { BLUEPRINTS } from "@modules/station/data/blueprints";
import { EQ_COMPOSITES, EQ_CROPS, EQ_EBW, MOD_FARM, RADIATORS_DOUBLE, WINGS_IROSA, startingOutfit } from "@modules/station/data/outfit";
import { MATERIALS, cargoMaterial } from "@modules/station/data/materials";
import { PROPELLANT_PROCESSES } from "@modules/station/data/propellant-processes";
import { POLANA_STATION } from "@modules/station/data/station";
import { COMETS } from "@modules/celestial/data/comets";
import { ImportOps } from "@modules/imports/application/import-ops";
import { Wallet } from "@modules/imports/domain/wallet";
import { LAUNCHERS, TRANSFER_STAGE, GAME_HOURS_PER_TRANSIT_DAY } from "@modules/imports/data/launchers";
import { MASS_DRIVER, TUG } from "@modules/imports/data/craft";
import { importGood } from "@modules/imports/data/goods";

const bp = (id: string) => BLUEPRINTS.find((b) => b.id === id)!;
const HYDRAZINE = PROPELLANT_PROCESSES.find((p) => p.id === "hidracina")!;

/** A grown station whose living machines draw from the station's own store, as in main. */
function grownStation() {
  const outfit = startingOutfit();
  const st = new Station(POLANA_STATION, new MaterialStock(Object.fromEntries(MATERIALS.map((m) => [m.id, 1e6]))), new Hangar(), outfit);
  outfit.fitComponent(WINGS_IROSA);
  outfit.fitComponent(RADIATORS_DOUBLE);
  for (const id of [`plano-equipo-${EQ_EBW.id}`, `plano-equipo-${EQ_COMPOSITES.id}`, `plano-modulo-${MOD_FARM.id}`, `plano-equipo-${EQ_CROPS.id}`]) {
    st.fabricate(bp(id));
    st.tick(1e4);
  }
  const bio = new BioOps(outfit, st.stock, BIO_PROCESSES, {
    needs: CREW_NEEDS,
    kcalPerKg: BIO_KCAL_PER_KG,
    uses: BIO_OUTPUT_USE,
    larderUnits: LARDER_UNITS,
    crew: () => 1,
    eatersKcalPerDay: () => 4000,
    resinImportedKg: 120,
  });
  /** Leave exactly `kg` of ammonia and no fertiliser in the store. */
  const ammonia = (kg: number) => {
    st.stock.take({ amoniaco: st.stock.amount("amoniaco"), fertilizante: st.stock.amount("fertilizante") });
    st.stock.add({ amoniaco: kg });
  };
  const negatives = () => st.stock.entries().filter(([, n]) => n < 0);
  return { st, outfit, bio, ammonia, negatives };
}

describe("CV · almacén, energía y créditos compartidos", () => {
  it("CV-10 la planta pone en cola hidracina y luego los cultivos abonan con el amoníaco que queda: nada negativo", () => {
    const g = grownStation();
    g.ammonia(1.72);
    g.st.refine(HYDRAZINE);
    expect(g.st.stock.amount("amoniaco")).toBeCloseTo(1.72 - 1.7, 9);
    g.bio.tick(24);
    g.st.tick(24);
    expect(g.st.stock.amount("amoniaco")).toBeGreaterThanOrEqual(0);
    expect(g.negatives()).toEqual([]);
    // The crops ran short: the 20 g left were not enough for a day of fertiliser (about 45 g of ammonia).
    expect(g.bio.lab.run("cultivo").short).toBe("fertilizante");
  });

  it("CV-10 al revés: el abono con amoníaco se come primero el amoníaco y la planta solo hace media tanda (HC-04, sin reservas)", () => {
    const g = grownStation();
    g.ammonia(1.72);
    g.bio.tick(24);
    const left = g.st.stock.amount("amoniaco");
    expect(left).toBeLessThan(1.7);
    expect(left).toBeGreaterThan(0);
    const job = g.st.refine(HYDRAZINE);
    // A partial batch: the hours scale with what was left.
    expect(job.hoursTotal).toBeLessThan(HYDRAZINE.hours);
    expect(g.negatives()).toEqual([]);
  });

  it("CV-10 la refinería y los biorreactores intercalados muchas veces no dejan nunca el almacén en negativo", () => {
    const g = grownStation();
    g.ammonia(20);
    for (let i = 0; i < 48; i++) {
      if (g.st.queue("planta").length === 0 && g.st.stock.amount("amoniaco") >= 1.7) g.st.refine(HYDRAZINE);
      g.bio.tick(1);
      g.st.tick(1);
      expect(g.negatives()).toEqual([]);
    }
  });

  it("CV-11 crecer la estación reserva su energía al ponerse en cola, aunque los biorreactores estén trabajando", () => {
    const g = grownStation();
    const o = g.outfit;
    const draw0 = o.drawKw;
    // The living machines working do not change the budget: power counts what is built, not what runs.
    g.bio.tick(48);
    expect(o.drawKw).toBe(draw0);
    const free0 = o.capacityKw - o.drawKw;
    // A test piece of equipment that fits now…
    const probe = { ...EQ_PROTEIN, id: "prueba-energia", powerKw: free0 - EQ_BIO_LAB.powerKw + 0.5 };
    expect(o.equipmentBlocker(probe)).toBeUndefined();
    // …no longer fits once the lab is queued: its power is reserved while it is built.
    g.st.fabricate(bp(`plano-equipo-${EQ_BIO_LAB.id}`));
    expect(o.drawKw).toBeCloseTo(draw0 + EQ_BIO_LAB.powerKw, 9);
    expect(o.equipmentBlocker(probe)).toMatch(/Falta energía/);
    g.bio.tick(48);
    expect(o.equipmentBlocker(probe)).toMatch(/Falta energía/);
  });

  it("CV-15 dos pedidos en retos a la vez con créditos para uno: el segundo, resuelto, no cobra ni envía nada y no avisa (HC-05)", () => {
    const station = new Station(POLANA_STATION, new MaterialStock({}), new Hangar());
    const c67p = COMETS.find((c) => c.id === "67p")!;
    const ops = new ImportOps(station, new Wallet(0), {
      regionAU: () => 2.1,
      bodies: () => [
        {
          id: c67p.id,
          name: c67p.name,
          position: new Vec3(12000, -4000, -9000),
          meanRadiusM: c67p.meanRadiusM.value,
          densityKgM3: c67p.densityKgM3.value,
          escapeSpeedMs: Math.sqrt((2 * G * c67p.massKg.value) / c67p.meanRadiusM.value),
          composition: c67p.composition,
          comet: true,
        },
      ],
      toMaterial: cargoMaterial,
      launchers: LAUNCHERS,
      stage: { ispS: TRANSFER_STAGE.ispS.value, tankage: TRANSFER_STAGE.tankage.value },
      gameHoursPerTransitDay: GAME_HOURS_PER_TRANSIT_DAY,
      kgPerUnit: (id) => importGood(id)?.kgPerUnit ?? 1,
      tug: TUG,
      driver: MASS_DRIVER,
    });
    const q = ops.quote({ kit: 1 }, "falcon-heavy");
    ops.wallet.earn(q.credits * 1.5, "misión");
    const a = ops.startOrder({ kit: 1 }, "falcon-heavy", "A");
    const b = ops.startOrder({ kit: 1 }, "falcon-heavy", "B");
    solveAll(a);
    solveAll(b);
    expect(ops.wallet.balance).toBeCloseTo(q.credits * 0.5, 6);
    expect(ops.deliveries.pending).toHaveLength(1);
    expect(ops.drainEvents().filter((e) => e.type === "pedido")).toHaveLength(1);
    // With half an order left a new one cannot even start: the blocker says what is missing.
    expect(ops.orderBlocker({ kit: 1 }, "falcon-heavy")).toMatch(/Faltan/);
    // A mission that pays while a chain is open lets that chain through when it is solved.
    ops.wallet.earn(q.credits, "misión");
    const c = ops.startOrder({ kit: 1 }, "falcon-heavy", "C");
    ops.wallet.spend(ops.wallet.balance, "otro pedido resuelto antes");
    ops.wallet.earn(q.credits, "misión secundaria");
    solveAll(c);
    expect(ops.deliveries.pending).toHaveLength(2);
  });
});

function solveAll(s: StationSession): void {
  const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
  while (s.run.status !== "done") s.answer(right(s.run.current!));
}
