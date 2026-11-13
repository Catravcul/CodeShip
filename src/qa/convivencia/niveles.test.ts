/**
 * Coexistence of the subjugation levels' services with compressed travel and the station's store
 * (docs/qa/casos.md, área CV). The services move asteroids on the mission clock, but what they make
 * (packages, trust, extraction) runs on the station clock: a game day every 40 real seconds.
 */
import { describe, expect, it } from "vitest";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { BENNU } from "@modules/celestial/data/bennu";
import { extractionRateKgPerHour } from "@modules/subjugation/domain/yields";
import { storeCapacityKg } from "@modules/station/domain/outfit";
import { startingOutfit } from "@modules/station/data/outfit";
import { STORE_STOWAGE } from "@modules/station/data/store";
import { DAY_REAL_S, frames, servicesWorld } from "./mundo";

const MEMBER = POLANA_MEMBERS[0]!;
/** A mothership hop as main plays it: 60 fps at the trip's lapse (docs/design/viajes.md, ×600). */
const TRIP_LAPSE = 600;
const DT = 1 / 60;

describe("CV · niveles de subyugación y viaje comprimido", () => {
  it("CV-03 un viaje comprimido no multiplica los paquetes de nivel 3: salen uno por día de la estación (40 s reales)", () => {
    const w = servicesWorld();
    w.book.of(MEMBER.id).setLevel(3);
    // 30 s of trip at ×600 are 5 h of mission clock but under a day on board: no package yet.
    frames(30, DT, TRIP_LAPSE, w.frame);
    expect(w.inbox.pending.length + w.storedKg()).toBe(0);
    // Back to plain time: at 40 s on board a day has passed and one package is on its way.
    frames(DAY_REAL_S - 30 + 1, DT, 1, w.frame);
    expect(w.services.drainEvents().filter((e) => e.type === "paquete-estacion")).toHaveLength(1);
  });

  it("CV-03 nivel 2: los paquetes a la bodega de la nodriza tampoco se multiplican con la cámara rápida", () => {
    const w = servicesWorld();
    w.book.of(BENNU.id).setLevel(2);
    frames(30, DT, TRIP_LAPSE, w.frame);
    expect(w.services.packagesInFlight(BENNU.id) + w.hold.length).toBe(0);
  });

  it("CV-03 la confianza que devuelve el servicio tranquilo sigue los días de a bordo, no la cámara rápida", () => {
    const w = servicesWorld();
    const r = w.book.of(MEMBER.id);
    r.setLevel(3);
    r.fail();
    const before = r.trust;
    frames(30, DT, TRIP_LAPSE, w.frame);
    // +2 % a day: 0,75 days → +1,5 %, never the +100 % that 450 «days» of mission clock would give.
    expect(r.trust - before).toBeCloseTo(0.02 * (30 / DAY_REAL_S), 3);
  });

  it("CV-04 la extracción de nivel 4 durante un viaje comprimido va al ritmo de las horas de la estación", () => {
    const w = servicesWorld();
    w.book.of(BENNU.id).setLevel(4);
    // Bennu flies to the station (about a minute of game time) and parks.
    frames(120, 0.25, 1, w.frame);
    expect(w.services.mode(BENNU.id)).toBe("aparcado");
    const x = w.services.extraction(BENNU.id)!;
    const before = x.takenKg;
    frames(30, DT, TRIP_LAPSE, w.frame);
    // 30 real seconds on board are 18 station hours.
    const hours = 30 * (24 / DAY_REAL_S);
    // Handed over in lots of 1 t: within one lot of the rate × station hours (×600 would be 1000 times more).
    expect(Math.abs(x.takenKg - before - extractionRateKgPerHour(BENNU) * hours)).toBeLessThanOrEqual(x.lotKg);
  });

  it("CV-05 la extracción de nivel 4 llena el almacén hasta su capacidad y para: el asteroide guarda el resto (HC-02)", () => {
    // The starting station: 14 rack bays of stowage of 700 kg (data/store.ts).
    const capacity = storeCapacityKg(startingOutfit().modules, STORE_STOWAGE);
    const w = servicesWorld({ capacityKg: () => capacity });
    w.book.of(BENNU.id).setLevel(4);
    frames(120, 0.25, 1, w.frame);
    // Ten game days by the station: the extraction alone would bring over 100 t.
    frames(10 * DAY_REAL_S, 0.25, 1, w.frame);
    expect(w.storedKg()).toBeLessThanOrEqual(capacity + 1e-6);
    expect(w.storedKg()).toBeGreaterThan(capacity - 1000);
    expect(w.services.storeFull(BENNU.id)).toBe(true);
    const x = w.services.extraction(BENNU.id)!;
    expect(x.takenKg).toBeLessThanOrEqual(capacity + 1e-6);
    expect(w.services.drainEvents().filter((e) => e.type === "almacen-lleno")).toHaveLength(1);
    // The refinery (here: someone takes 5 t out) frees room and the extraction goes on.
    const [rock, rockKg] = w.station.stock.entries()[0]!;
    w.station.stock.take({ [rock]: Math.min(5000, rockKg) });
    const before = x.takenKg;
    frames(DAY_REAL_S, 0.25, 1, w.frame);
    expect(x.takenKg).toBeGreaterThan(before + 1000);
    expect(w.storedKg()).toBeLessThanOrEqual(capacity + 1e-6);
  });

  it("CV-05 con el almacén lleno los paquetes de nivel 3 esperan en el buzón y entran al hacer sitio (HC-02)", () => {
    let capacity = 0;
    const w = servicesWorld({ capacityKg: () => capacity });
    w.book.of(MEMBER.id).setLevel(3);
    // A package a day, about 60 station hours of flight from 58587.
    frames(6 * DAY_REAL_S, 0.25, 1, w.frame);
    expect(w.storedKg()).toBe(0);
    expect(w.inbox.waiting.length).toBeGreaterThan(0);
    capacity = 1e9;
    frames(1, 0.25, 1, w.frame);
    expect(w.inbox.waiting).toHaveLength(0);
    expect(w.storedKg()).toBeGreaterThan(0);
  });
});
