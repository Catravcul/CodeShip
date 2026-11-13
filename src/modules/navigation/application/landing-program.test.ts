import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { probeDesign } from "@modules/ship/data/probe";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { LANDING_LIMITS } from "@modules/flight/domain/landing-frame";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { landingChore } from "./landing-chore";
import { LANDING_PROGRAM, LandingProgram, type LandingCraft } from "./landing-program";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
/** The `n`-th different wrong answer (a repeated wrong answer is not a new mistake). */
const wrong = (ex: Exercise, n = 0): Answer =>
  ex.kind === "order" ? { kind: "order", order: [...ex.solution.slice(n + 1), ...ex.solution.slice(0, n + 1)] } : { kind: "choice", index: (ex.correct + 1 + n) % ex.options.length };

/**
 * A craft `heightM` above Bennu's surface, as a trip hands it over: moving with the ground under it
 * (Bennu turns once in 4,3 h) and with its nose at the asteroid (belly sideways).
 */
function make(craft: LandingCraft, heightM = 300, dir = new Vec3(0.3, 0.2, 1).normalize()) {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const ship = Ship.create(craft === "sonda" ? probeDesign(1) : explorerDesign());
  let r = 300;
  while (bennu.surfaceDistance(dir.scale(r), 0) < heightM) r += 0.5;
  const pos = dir.scale(r);
  // Nose (−Z) at the centre: rotate −Z onto −dir.
  const nose = dir.scale(-1);
  const axis = new Vec3(0, 0, -1).cross(nose);
  const angle = Math.acos(Math.max(-1, Math.min(1, new Vec3(0, 0, -1).dot(nose))));
  const q = axis.length() < 1e-9 ? Quat.IDENTITY : Quat.fromAxisAngle(axis.normalize(), angle);
  const fc = new FlightComputer(ship, RigidBodyState.at(pos).withOrientation(q).withVelocity(bennu.surfaceVelocity(pos)), { gravitySources: [bennu], target: bennu });
  const program = new LandingProgram({ craft, flight: () => fc, describe: (t) => (t === bennu ? { id: "101955", name: "Bennu" } : undefined) });
  program.update();
  return { bennu, fc, program, ship };
}

/** Frames of `dt` real seconds at the program's lapse, like main does. */
function fly(fc: FlightComputer, program: LandingProgram, maxRealS = 120, dt = 0.1) {
  let real = 0;
  let worstTilt = 0;
  while (real < maxRealS && program.status === "flying") {
    fc.update(dt * program.lapse, NO_INPUT);
    program.update();
    real += dt;
    worstTilt = Math.max(worstTilt, fc.telemetry().clearance < 2 ? fc.telemetry().tiltDeg : 0);
  }
  return { real, worstTilt };
}

describe("landing challenges (VUE-08)", () => {
  const { program } = make("sonda");
  const chore = landingChore(program.facts());

  it("VUE-08 a chain of five challenges with the descent's real numbers: site, drift, braking curve, final braking, anchors", () => {
    const kinds = chore.exercises.map((e) => (e.kind === "order" ? "ordenar" : e.skill));
    expect(kinds).toEqual(["ordenar", "completar", "predecir", "reparar", "especificar"]);
    expect(chore.kind).toBe("programar-aterrizaje");
    const [seq, drift, , flare, spec] = chore.exercises;
    // One trap block: coming down fast until it touches.
    expect(seq!.kind === "order" && seq!.blocks.length - seq!.solution.length).toBe(1);
    expect(drift!.kind === "choice" && drift!.question).toContain("Bennu gira");
    expect(flare!.kind === "choice" && flare!.options[flare!.correct]).toContain("0,040");
    expect(spec!.kind === "choice" && spec!.options[spec!.correct]).toContain("anclas de rosca");
  });

  it("VUE-08 each choice has a single right option and the chain can be solved", () => {
    for (const e of chore.exercises) if (e.kind === "choice") expect(new Set(e.options).size).toBe(e.options.length);
    const run = new ChoreRun(chore);
    while (run.current) run.submit(right(run.current));
    expect(run.status).toBe("done");
  });

  it("VUE-08 the lander's chain anchors its legs, not screws", () => {
    const { program: lander } = make("modulo");
    const spec = landingChore(lander.facts()).exercises[4]!;
    expect(spec.kind === "choice" && spec.options[spec.correct]).toContain("anclar las patas");
  });
});

describe("landing by program (VUE-09, SON-05)", () => {
  it("VUE-09 the offer only appears in the approach zone, free and above the ground", () => {
    const far = make("modulo", 900);
    expect(far.program.inZone()).toBe(false);
    expect(far.program.canProgram().ok).toBe(false);
    const near = make("modulo", 300);
    expect(near.program.inZone()).toBe(true);
    expect(near.program.canProgram()).toEqual({ ok: true });
    // The readout's site is picked below the craft as it enters the zone.
    expect(near.program.missM()!).toBeLessThan(0.5);
  });

  it("VUE-09 the lander, programmed without mistakes, touches down on the site within the limits and anchors", () => {
    const { fc, program } = make("modulo");
    const run = program.startProgramming();
    while (run.current) program.answer(right(run.current));
    expect(program.status).toBe("flying");
    expect(program.lapse).toBeGreaterThan(1);
    const { real, worstTilt } = fly(fc, program);
    expect(program.status).toBe("landed");
    expect(fc.landed).toBe(true);
    expect(fc.ship.hullIntegrity).toBe(1);
    expect(program.missM()!).toBeLessThan(LANDING_PROGRAM.craft.modulo.siteRadiusM);
    expect(worstTilt).toBeLessThan(LANDING_LIMITS.tiltDeg);
    // A short time-lapse: about the half minute of a short trip.
    expect(real).toBeLessThan(60);
  });

  it("SON-05 the probe lands by program on Bennu and anchors within its 1,5 m site", () => {
    const { fc, program } = make("sonda");
    program.engage(0);
    fly(fc, program, 150);
    expect(program.status).toBe("landed");
    expect(fc.landed).toBe(true);
    expect(program.missM()!).toBeLessThan(LANDING_PROGRAM.craft.sonda.siteRadiusM);
  });

  it("VUE-09 one wrong answer: still lands, but off the centre of the site", () => {
    const { fc, program } = make("modulo");
    const run = program.startProgramming();
    program.answer(wrong(run.current!));
    while (run.current) program.answer(right(run.current));
    expect(program.mistakes).toBe(1);
    fly(fc, program);
    expect(program.status).toBe("landed");
    expect(program.missM()!).toBeGreaterThan(2);
  });

  it("VUE-09 two wrong answers: a hard touchdown that bounces off, without breaking anything; retry", () => {
    const { fc, program } = make("modulo");
    program.engage(2);
    fly(fc, program);
    expect(program.status).toBe("bounced");
    expect(fc.landed).toBe(false);
    expect(fc.ship.hullIntegrity).toBe(1);
    // It rises slowly off the ground: the pilot can program it again from here.
    fc.update(5, NO_INPUT);
    expect(fc.telemetry().clearance).toBeGreaterThan(LANDING_PROGRAM.minM);
    expect(program.canProgram().ok).toBe(true);
  });

  it("VUE-09 three wrong answers: the program does not load and the pilot keeps the controls", () => {
    const { fc, program } = make("modulo");
    const run = program.startProgramming();
    for (let i = 0; i < 3; i++) program.answer(wrong(run.current!, i));
    expect(program.status).toBe("failed");
    expect(fc.guidance).toBeNull();
  });

  it("VUE-09 touching the controls takes them back from the program", () => {
    const { fc, program } = make("modulo");
    program.engage(0);
    fc.update(1, NO_INPUT);
    fc.update(0.1, { mainThrottle: 0, translation: new Vec3(0, 1, 0), rotation: Vec3.ZERO });
    program.update();
    expect(program.status).toBe("manual");
  });
});
