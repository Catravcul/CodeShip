import { describe, expect, it } from "vitest";
import { cabHeight, liftPhase, liftSeconds, runSeconds } from "./lift";
import { inhabitedBuildingDistanceM, safetyDistanceM, tntKg, tooClose } from "./safety";
import { requiredPadHeight, validatePad } from "./launch-height";
import { RUNNING, iceThrowRadiusM, scan, tablesFor, tidalPowerKW, tipSpeedMs, turbineTopM, windPowerKW } from "./energy";
import { legPose, planTrip, tripSeconds, workerTripSeconds, type IslandPad } from "./travel";
import { BIRD_STOP, CRAFT, ELECTRON, FALCON9_CREW, HEIGHT_RULE, LIFT, MARINE_STOP, SOLAR, TIDAL, TIDAL_PEAK_MS, TIDAL_UNITS, TURBINE, AIR_BIRDS, FLOORS_KW } from "../data/facts";

const lift = LIFT.value;
const crafts = { helicoptero: CRAFT.helicoptero.value, alfombra: CRAFT.alfombra.value };

// Cold Sanctuary, Assets/Scripts/Tests/AereoTest.cs (group 110): the parts that do not need Unity.
describe("Santuario Aéreo (grupo 110 de Cold Sanctuary)", () => {
  it("el ascensor: 10 m/s, 1,5 m/s² y 4 s de puertas a cada lado (SiteLineRule.Run)", () => {
    expect(runSeconds(200, 10, 1.5)).toBeCloseTo(200 / 10 + 10 / 1.5, 6);
    // Too short to reach cruise: a triangle of speed.
    expect(runSeconds(20, 10, 1.5)).toBeCloseTo(2 * Math.sqrt(20 / 1.5), 6);
    expect(liftSeconds(182, lift)).toBeCloseTo(182 / 10 + 10 / 1.5 + 8, 6);
  });

  it("la cabina se ve subir: parte, va a crucero y frena hasta la parada exacta", () => {
    const total = runSeconds(170, lift.speedMs, lift.accelMs2);
    expect(cabHeight(0, 170, 0, lift)).toBe(0);
    expect(cabHeight(0, 170, total, lift)).toBeCloseTo(170, 6);
    expect(cabHeight(0, 170, total / 2, lift)).toBeCloseTo(85, 6);
    // Monotonic, and never faster than cruise.
    let last = 0;
    for (let t = 0.1; t <= total; t += 0.1) {
      const h = cabHeight(0, 170, t, lift);
      expect(h).toBeGreaterThanOrEqual(last - 1e-9);
      expect((h - last) / 0.1).toBeLessThanOrEqual(lift.speedMs + 1e-6);
      last = h;
    }
    expect(cabHeight(170, 0, total, lift)).toBeCloseTo(0, 6);
    expect(liftPhase(170, 1, lift)).toBe("cerrando");
    expect(liftPhase(170, 10, lift)).toBe("viajando");
    expect(liftPhase(170, total + 5, lift)).toBe("abriendo");
    expect(liftPhase(170, total + 9, lift)).toBe("parado");
  });

  it("su viaje cuenta el ascensor: hay subida aunque la escena no esté cargada", () => {
    const flight = CRAFT.alfombra.value.fixedS!;
    const energy = workerTripSeconds(flight, liftSeconds(34, lift));
    const launch = workerTripSeconds(flight, liftSeconds(260, lift));
    expect(energy).toBeGreaterThan(flight);
    expect(launch).toBeGreaterThan(energy);
    expect(workerTripSeconds(flight, undefined)).toBe(flight);
  });
});

// Cold Sanctuary, Assets/Scripts/Tests/LaunchSiteTest.cs (group 90).
describe("Lanzadera de cohetes (grupo 90 de Cold Sanctuary)", () => {
  it("edificio habitado para 2,0 t de TNT: 201 m, +50 % por cascotes: 300 m (Electron)", () => {
    expect(tntKg(ELECTRON.propellantKg.value) / 1000).toBeCloseTo(2.04, 2);
    expect(inhabitedBuildingDistanceM(tntKg(ELECTRON.propellantKg.value))).toBeCloseTo(201, 0);
    expect(Math.round(safetyDistanceM(ELECTRON.propellantKg.value) / 10) * 10).toBe(300);
  });

  it("un Falcon 9 tripulado pide ~1,1 km (los 488 t de propulsante de sus dos etapas)", () => {
    const d = safetyDistanceM(FALCON9_CREW.propellantKg.value);
    expect(inhabitedBuildingDistanceM(tntKg(FALCON9_CREW.propellantKg.value))).toBeGreaterThan(700);
    expect(d).toBeGreaterThan(1050);
    expect(d).toBeLessThan(1150);
  });

  it("tooClose dice qué queda dentro de la distancia y a cuánto", () => {
    const near = tooClose({ x: 0, z: 0 }, 300, [
      { id: "cerca", x0: 100, x1: 120, z0: -10, z1: 10 },
      { id: "lejos", x0: 400, x1: 420, z0: -10, z1: 10 },
    ]);
    expect(near.map((n) => n.id)).toEqual(["cerca"]);
    expect(near[0]!.distanceM).toBeCloseTo(100, 6);
  });

  it("REGLA: la plataforma queda por encima de lo más alto del santuario y del vuelo de las aves, con su margen", () => {
    const need = requiredPadHeight([{ label: "el techo del parque", topM: 57 }], HEIGHT_RULE.value);
    expect(need.requiredM).toBe(152 + 30);
    expect(need.why).toMatch(/franja de vuelo/);
    const tall = requiredPadHeight([{ label: "un edificio-árbol que creció por pisos (prueba)", topM: 202 }], HEIGHT_RULE.value);
    expect(tall.requiredM).toBe(232);
    expect(tall.why).toMatch(/creció por pisos/);
  });

  it("VALIDADOR: al aparecer un elemento elevado más alto que la plataforma, la plataforma sube sola", () => {
    const pad0 = 182;
    const higher = requiredPadHeight([{ label: "prueba", topM: pad0 + 20 }], HEIGHT_RULE.value);
    const v = validatePad(pad0, higher);
    expect(v.raised).toBe(true);
    expect(v.padM).toBeGreaterThanOrEqual(pad0 + 20 + HEIGHT_RULE.value.marginM);
    // Without that element the pad meets the rule again at its height of before.
    expect(validatePad(pad0, requiredPadHeight([], HEIGHT_RULE.value)).raised).toBe(false);
  });
});

// Cold Sanctuary, Assets/Scripts/Tests/EnergyTest.cs (group 101): the rules without a scene.
describe("Parque energético (grupo 101 de Cold Sanctuary)", () => {
  const t = TURBINE.value;
  it("la curva del E-33: nada bajo el arranque ni sobre el corte, 330 kW desde la nominal", () => {
    expect(windPowerKW(2.9, t)).toBe(0);
    expect(windPowerKW(26, t)).toBe(0);
    expect(windPowerKW(12, t)).toBe(330);
    expect(windPowerKW(7.9, t)).toBeGreaterThan(0);
    expect(windPowerKW(7.9, t)).toBeLessThan(330);
    expect(turbineTopM(t)).toBeCloseTo(53.5, 6);
  });

  it("tres turbinas fuera del alcance del hielo sobre el árbol (1,5 × (buje + rotor))", () => {
    expect(iceThrowRadiusM(t)).toBeCloseTo(105, 6);
    // In the cap's corners, 104 m along each axis from the tree.
    expect(Math.hypot(104, 104)).toBeGreaterThanOrEqual(iceThrowRadiusM(t));
  });

  it("un ave a ≤ 200 m para la turbina; lejos, no para; sin aves rearma sola a los 30 s", () => {
    const r = BIRD_STOP.value;
    let s = scan(RUNNING, 0, [150], r);
    expect(s.stopped).toBe(true);
    expect(s.stops).toBe(1);
    s = scan(s, 10, [450], r);
    expect(s.stopped).toBe(true);
    s = scan(s, 29.9, [], r);
    expect(s.stopped).toBe(true);
    s = scan(s, 30, [], r);
    expect(s.stopped).toBe(false);
    expect(scan(RUNNING, 0, [201], r).stopped).toBe(false);
  });

  it("un ave lejos no para las demás", () => {
    const r = BIRD_STOP.value;
    const turbines = [{ d: [120] }, { d: [600] }, { d: [900] }].map((x) => scan(RUNNING, 0, x.d, r));
    expect(turbines.map((x) => x.stopped)).toEqual([true, false, false]);
  });

  it("un animal a ≤ 50 m para la mareal", () => {
    expect(scan(RUNNING, 0, [49], MARINE_STOP.value, "una foca").stopped).toBe(true);
  });

  it("la punta no pasa de 5 m/s ni con 2 m/s de corriente", () => {
    expect(tipSpeedMs(2, TIDAL.value)).toBeLessThanOrEqual(TIDAL.value.maxTipMs);
    expect(TIDAL.value.maxTipMs).toBeLessThan(5.6);
  });

  it("la mareal es un piloto: ≤ 2 % de la demanda", () => {
    expect(tidalPowerKW(TIDAL_PEAK_MS.value, TIDAL.value) * TIDAL_UNITS.value).toBeLessThan(30);
  });

  it("los paneles van en proporción a la energía", () => {
    const s = SOLAR.value;
    expect(tablesFor(200, s)).toBeGreaterThanOrEqual(2 * tablesFor(100, s) - 1);
    expect(tablesFor(0, s)).toBe(0);
    expect(tablesFor(FLOORS_KW.value, s)).toBe(7);
  });

  it("las aves del santuario aéreo: 10 (2 págalos, 4 petreles dameros, 2 albatros, 2 charranes), reales", () => {
    expect(AIR_BIRDS.reduce((n, b) => n + b.count, 0)).toBe(10);
    expect(AIR_BIRDS.every((b) => b.reality === "real" && b.source.length > 10)).toBe(true);
  });
});

describe("Viajes entre islas", () => {
  const pads: IslandPad[] = [
    { island: "entrenamiento", at: { x: 200, y: 0, z: -95 }, crafts: ["helicoptero"] },
    { island: "lanzadera", at: { x: -527, y: 0, z: -33 }, crafts: ["alfombra", "helicoptero"] },
    { island: "muelle", at: { x: -306, y: 0, z: 170 }, crafts: ["alfombra"] },
    { island: "parque", at: { x: -362, y: 0, z: 500 }, crafts: ["alfombra"] },
  ];
  it("se vuela en lo que admiten las dos islas: helicóptero a la lanzadera, alfombra entre casquetes", () => {
    const a = planTrip("entrenamiento", "lanzadera", pads, crafts)!;
    expect(a.map((l) => l.craft)).toEqual(["helicoptero"]);
    const b = planTrip("lanzadera", "parque", pads, crafts)!;
    expect(b.map((l) => l.craft)).toEqual(["alfombra"]);
    expect(b[0]!.seconds).toBe(30);
  });

  it("si no hay vuelo directo, hace escala: helicóptero a la lanzadera y alfombra al parque", () => {
    const t = planTrip("entrenamiento", "parque", pads, crafts)!;
    expect(t.map((l) => [l.to, l.craft])).toEqual([
      ["lanzadera", "helicoptero"],
      ["parque", "alfombra"],
    ]);
    expect(tripSeconds(t)).toBeGreaterThan(60);
  });

  it("el helicóptero tarda lo que pide la distancia a 280 km/h, más despegar y aterrizar", () => {
    const [leg] = planTrip("entrenamiento", "lanzadera", pads, crafts)!;
    expect(leg!.seconds).toBeCloseTo(40 + leg!.distanceM / (280 / 3.6), 6);
  });

  it("el vuelo se ve: despega en vertical, cruza en línea recta y se posa en la otra plataforma", () => {
    const [leg] = planTrip("entrenamiento", "lanzadera", pads, crafts)!;
    const c = crafts.helicoptero;
    const up = legPose(leg!, c.climbS / 2, c);
    expect(up.phase).toBe("despegue");
    expect(up.x).toBe(leg!.a.x);
    const mid = legPose(leg!, leg!.seconds / 2, c);
    expect(mid.phase).toBe("crucero");
    expect(mid.y).toBeCloseTo(c.cruiseAboveM, 6);
    const end = legPose(leg!, leg!.seconds, c);
    expect([end.x, end.z]).toEqual([leg!.b.x, leg!.b.z]);
  });

  it("sin vehículo común no hay viaje", () => {
    expect(planTrip("entrenamiento", "x", pads, crafts)).toBeUndefined();
    expect(planTrip("muelle", "muelle", pads, crafts)).toEqual([]);
  });
});
