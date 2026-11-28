import { describe, expect, it } from "vitest";
import { handHits, handHover, handStart, handStep, handTap, type HandLimits, type HandWorld } from "./hand-flight";
import type { IslandPad } from "./travel";

const LIM: HandLimits = { fwdMs: 80, backMs: 20, sideMs: 20, climbMs: 6, yawDegS: 30, fwdStepMs: 10, climbStepMs: 1.5, yawStepDegS: 10, lagS: 2, radiusM: 8, heightM: 4.7, touchdownMs: 1.5, padRadiusM: 10, seaHoverM: 5 };
const A: IslandPad = { island: "a", at: { x: 0, y: 0, z: 0 }, crafts: ["helicoptero"] };
const B: IslandPad = { island: "b", at: { x: 0, y: 0, z: 400 }, crafts: ["helicoptero"] };
const C: IslandPad = { island: "c", at: { x: 400, y: 0, z: 0 }, crafts: ["alfombra"] };
const deck = (id: string, x: number, z: number, y = 0) => ({ id, area: id, y, x0: x - 20, x1: x + 20, z0: z - 20, z1: z + 20 });
const W: HandWorld = { floors: [deck("a", 0, 0), deck("b", 0, 400), deck("c", 400, 0)], solids: [{ x0: -5, x1: 5, z0: 195, z1: 205, y0: 0, y1: 100 }], seaY: -0.6, pads: [A, B, C] };

const run = (s: ReturnType<typeof handStart>, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.1) s = handStep(s, 0.1, W, LIM);
  return s;
};
const taps = (s: ReturnType<typeof handStart>, c: Parameters<typeof handTap>[1], n: number) => {
  for (let i = 0; i < n; i++) s = handTap(s, c, LIM);
  return s;
};

describe("vuelo a mano (§3.6 Manual: cíclico, colectivo y pedales)", () => {
  it("en el suelo solo el colectivo la levanta; el cíclico no la arrastra por la cubierta", () => {
    let s = handStart("helicoptero", A, 0);
    s = taps(s, "ciclico-adelante", 3);
    s = run(s, 3);
    expect(s.onGround).toBe(true);
    expect(s.z).toBe(0);
    s = taps(s, "colectivo-arriba", 2);
    s = run(s, 4);
    expect(s.onGround).toBe(false);
    expect(s.y).toBeGreaterThan(3);
    expect(s.landedOn).toBeUndefined();
  });

  it("cada toque pide un paso, sin pasar de los límites (crucero, ascenso, giro)", () => {
    let s = handStart("helicoptero", A, 0);
    s = taps(s, "ciclico-adelante", 20);
    s = taps(s, "colectivo-arriba", 20);
    s = taps(s, "pedal-izquierdo", 20);
    expect(s.ask).toEqual({ fwd: 8, side: 0, up: 4, yaw: 3 });
    s = taps(s, "ciclico-atras", 30);
    expect(s.ask.fwd).toBe(-2);
  });

  it("la velocidad llega con retardo hacia lo pedido, y el pedal gira el morro", () => {
    let s = taps(handStart("helicoptero", A, 0), "colectivo-arriba", 4);
    s = run(s, 10);
    s = handHover(taps(s, "colectivo-arriba", 0));
    s = taps(s, "ciclico-adelante", 2);
    const a = handStep(s, 0.5, W, LIM);
    expect(a.vFwd).toBeGreaterThan(0);
    expect(a.vFwd).toBeLessThan(20);
    s = taps(s, "pedal-izquierdo", 3);
    const b = run(s, 3);
    expect(b.heading).toBeGreaterThan(0.3);
  });

  it("sobre el mar no amara: se queda en el estacionario más bajo", () => {
    let s = taps(handStart("helicoptero", A, Math.PI / 2), "colectivo-arriba", 2);
    s = run(s, 6);
    s = taps(s, "ciclico-adelante", 3);
    s = run(s, 10);
    s = taps(handHover(s), "colectivo-abajo", 4);
    s = run(s, 30);
    expect(s.x).toBeGreaterThan(30);
    expect(s.y).toBeCloseTo(-0.6 + 5, 5);
    expect(s.bump).toBe("mar");
  });

  it("el rotor no atraviesa una torre: se para delante", () => {
    let s = taps(handStart("helicoptero", A, 0), "colectivo-arriba", 4);
    s = run(s, 6);
    s = taps(handHover(s), "ciclico-adelante", 3);
    s = run(s, 30);
    expect(s.z).toBeLessThan(195 - 8 + 0.5);
    expect(s.bump).toBe("rotor");
  });

  it("se posa despacio en el helipuerto de otra isla y termina allí; no en uno de alfombras", () => {
    let s = handStart("helicoptero", A, 0);
    s = { ...s, x: 30, z: 400, y: 20, onGround: false, landedOn: undefined } as typeof s;
    s = taps(s, "colectivo-abajo", 4);
    s = run(s, 3);
    expect(s.onGround).toBe(false);
    s = taps(handHover({ ...s, x: 3, z: 401 }), "colectivo-abajo", 1);
    s = run(s, 40);
    expect(s.onGround).toBe(true);
    expect(s.landedOn).toBe("b");
    let c = { ...handStart("helicoptero", A, 0), x: 400, z: 0, y: 10, onGround: false } as ReturnType<typeof handStart>;
    c = run(taps(c, "colectivo-abajo", 1), 40);
    expect(c.onGround).toBe(true);
    expect(c.landedOn).toBeUndefined();
  });

  it("bajando deprisa no toca: se aguanta sobre la cubierta (toma dura evitada)", () => {
    let s = { ...handStart("helicoptero", A, 0), y: 30, onGround: false } as ReturnType<typeof handStart>;
    s = taps(s, "colectivo-abajo", 4);
    let sawHard = false;
    for (let t = 0; t < 40; t += 0.1) {
      s = handStep(s, 0.1, W, LIM);
      if (s.bump === "dura") sawHard = true;
    }
    expect(sawHard).toBe(true);
    expect(s.onGround).toBe(false);
    s = taps(handHover(s), "colectivo-abajo", 1);
    s = run(s, 10);
    expect(s.onGround).toBe(true);
  });

  it("el disco del rotor va arriba: pasa sobre lo bajo de junto a la cubierta (un surtidor), no sobre un poste alto", () => {
    // A helicopter: the disc is the top metre of its height; under it only the fuselage, 2,6 m to each side.
    const heli: HandLimits = { ...LIM, rotorDiscM: 1, bodyRadiusM: 2.6 };
    const low = { x0: 7, x1: 8, z0: -0.5, z1: 0.5, y0: 0, y1: 1.8 };
    const post = { x0: 7, x1: 7.4, z0: -0.2, z1: 0.2, y0: 0, y1: 6 };
    const w = (q: typeof low): HandWorld => ({ ...W, solids: [q] });
    expect(handHits(w(low), 0, 0, 0, heli)).toBe(false);
    expect(handHits(w(post), 0, 0, 0, heli)).toBe(true);
    // Within the fuselage's reach it does touch the low one.
    expect(handHits(w(low), 5, 0, 0, heli)).toBe(true);
    // Without a disc of its own (the carpet), its whole height reaches as far.
    expect(handHits(w(low), 0, 0, 0, LIM)).toBe(true);
    // Coming down 7 m beside the pump, it sets down on the pad.
    let s = { ...handStart("helicoptero", A, 0), y: 6, onGround: false } as ReturnType<typeof handStart>;
    s = taps(s, "colectivo-abajo", 1);
    for (let t = 0; t < 20; t += 0.1) s = handStep(s, 0.1, w(low), heli);
    expect(s.onGround).toBe(true);
    expect(s.landedOn).toBe("a");
  });
});
