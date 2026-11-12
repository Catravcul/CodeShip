import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Mothership } from "@modules/mothership/domain/mothership";
import { IDSS_CONTACT_LIMITS, NODRIZA } from "@modules/mothership/data/mothership";
import { SpinRing } from "@modules/gravity/domain/spin-gravity";
import { CODESHIP_RING } from "@modules/gravity/data/ring";
import { Habitat } from "@modules/habitat/application/habitat";
import { MACHINES } from "@modules/life-support/data/machines";
import { LETTUCE_OUTREDGEOUS, WHEAT_APOGEE } from "@modules/garden/data/species";
import { Cat } from "@modules/pets/domain/cat";
import { Mailbox } from "@modules/story/domain/mailbox";
import { NEVAEH_LETTERS } from "@modules/story/data/nevaeh";
import type { Alignment } from "@modules/mothership/domain/docking";
import { seededRandom } from "../../../content/random";
import { MissionLog } from "@modules/missions/domain/mission";
import { NEVAEH_MISSIONS } from "@modules/missions/data/nevaeh-missions";
import { alerts, missionsSummary, commsPanel, dockingPanel, lifePanel, navPanel, panelLevel, powerPanel, propulsionPanel, thrustersFiring, type TripProgress } from "./panels";

const ship = () => new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
const burning: TripProgress = { vehicle: "carrier", phase: "burn", remainingM: 5000, etaS: 3600, speedMS: 1, fraction: 0.2 };

const habitat = () => {
  const h = new Habitat(seededRandom(1), 2, undefined, "Doménica", MACHINES);
  h.bed("b1", WHEAT_APOGEE, 15);
  h.plant("p1", LETTUCE_OUTREDGEOUS);
  h.adopt(new Cat("luna", "Luna", 4));
  return h;
};

const aligned = (o: Partial<Alignment> = {}): Alignment => ({
  axialM: 3,
  lateral: Vec3.ZERO,
  lateralM: 0.05,
  closingMs: 0.07,
  lateralRateMs: 0,
  misalignDeg: 1,
  rollDeg: -2,
  rateDegS: 0,
  rollRateDegS: 0,
  ...o,
});

describe("flight deck panels", () => {
  it("propulsion: 18 X3 at 5.4 N give 97.2 N; every thruster fires only in the burn and braking of a hop", () => {
    const m = ship();
    const idle = propulsionPanel(m);
    expect(idle.thrusterCount).toBe(18);
    expect(idle.totalThrustN).toBeCloseTo(97.2, 6);
    expect(idle.firing).toBe(0);
    expect(idle.thrustNowN).toBe(0);
    const p = propulsionPanel(m, burning);
    expect(p.firing).toBe(18);
    expect(p.thrustNowN).toBeCloseTo(97.2, 6);
    // ṁ = F / (Isp·g₀) = 5.4 / (2250 · 9.80665) ≈ 244.7 mg/s per thruster.
    expect(p.flowPerThrusterMgS).toBeCloseTo(244.7, 1);
    expect(thrustersFiring({ ...burning, phase: "flip" })).toBe(false);
    expect(thrustersFiring({ ...burning, phase: "brake" })).toBe(true);
    expect(thrustersFiring({ ...burning, vehicle: "probe" })).toBe(false);
  });

  it("propulsion: xenon, Δv and endurance come from the mothership's own mass budget", () => {
    const m = ship();
    const p = propulsionPanel(m);
    expect(p.xenonKg).toBe(150000);
    expect(p.xenonFraction).toBe(1);
    expect(p.deltaVMs).toBeCloseTo(m.deltaV(), 9);
    expect(p.massT).toBeCloseTo(m.massKg / 1000, 9);
    // 150 t at 18 × 244.7 mg/s lasts about 394 days of full thrust.
    expect(p.burnDaysLeft).toBeCloseTo(394.1, 0);
    m.burn(1000);
    const after = propulsionPanel(m);
    expect(after.xenonKg).toBeLessThan(150000);
    expect(after.deltaVMs).toBeCloseTo(p.deltaVMs - 1000, 6);
  });

  it("power: 2 MWe at 33.7 % means ~3.9 MW of waste heat, ~1.43 kW per m² of radiator; the array takes 1.78 MW while firing", () => {
    const m = ship();
    const idle = powerPanel(m);
    expect(idle.electricKw).toBe(2000);
    expect(idle.thermalKw).toBeCloseTo(2000 / 0.337, 6);
    expect(idle.wasteHeatKw).toBeCloseTo(3934.7, 1);
    expect(idle.radiatorFluxKwM2).toBeCloseTo(1.426, 3);
    expect(idle.thrusterLoadKw).toBe(0);
    expect(idle.marginKw).toBe(2000);
    const busy = powerPanel(m, burning);
    expect(busy.thrusterLoadKw).toBe(18 * 99);
    expect(busy.marginKw).toBe(2000 - 1782);
  });

  it("life: ring, crew, garden, animals and machines are read from the ring and the habitat", () => {
    const ring = new SpinRing(CODESHIP_RING);
    const h = habitat();
    const l = lifePanel(ring, h);
    expect(l.ringRpm).toBeCloseTo(4, 9);
    // a = ω²r: 4 rpm at 56 m gives about 1.00 g.
    expect(l.floorG).toBeCloseTo(1.0, 1);
    expect(l.crewName).toBe("Doménica");
    expect(l.plantsAlive).toBe(2);
    expect(l.growingAreaM2).toBeCloseTo(15 + h.plants[1]!.areaM2, 9);
    expect(l.animals).toBe(1);
    expect(l.machinesTotal).toBe(MACHINES.length);
    expect(l.machinesWorking).toBe(MACHINES.length);
    expect(l.foodRatio).toBeCloseTo(h.sustainability.ratio, 9);
    const stopped = lifePanel(new SpinRing(CODESHIP_RING, false), h);
    expect(stopped.floorG).toBe(0);
    expect(stopped.spinFraction).toBe(0);
  });

  it("docking: checks each contact condition against the IDSS limits; nothing to check while docked", () => {
    const view = (docked: boolean, a: Alignment) => ({ docked, assist: true, lastFailures: [], limits: IDSS_CONTACT_LIMITS, alignment: () => a });
    expect(dockingPanel(view(true, aligned()), 0).checks).toEqual([]);
    const good = dockingPanel(view(false, aligned()), 12);
    expect(good.rangeM).toBe(12);
    expect(good.checks.every((c) => c.ok)).toBe(true);
    const bad = dockingPanel(view(false, aligned({ closingMs: 0.3, misalignDeg: 6 })), 3);
    expect(bad.checks.filter((c) => !c.ok).map((c) => c.label)).toEqual(["Cierre", "Inclinación"]);
    const probe = { name: "Explorer", hullIntegrity: 0.4, propellants: [] };
    expect(dockingPanel(view(true, aligned()), 0, probe).probe).toBe(probe);
    const dock = dockingPanel(view(true, aligned()), 0, probe);
    const quiet = { prop: propulsionPanel(ship()), life: lifePanel(new SpinRing(CODESHIP_RING), habitat()), comms: commsPanel([]), nav: navPanel("Bennu", "idle") };
    expect(alerts({ ...quiet, dock }).find((a) => a.panel === "dock")).toMatchObject({ level: "caution", text: "Casco de la sonda dañado" });
  });

  it("comms: newest letter first, unread and pending missions counted", () => {
    const box = new Mailbox(NEVAEH_LETTERS);
    let c = commsPanel(box.received);
    expect(c.unread).toBe(1);
    expect(c.pendingMissions).toBe(1);
    box.read(c.letters[0]!.id);
    box.achieve("nucleo");
    box.tick(0.3);
    c = commsPanel(box.received);
    expect(c.letters.map((l) => l.id)).toEqual(["nano-net-generar", "nano-net-nucleo"]);
    expect(c.letters[1]!.read).toBe(true);
    expect(c.unread).toBe(1);
    expect(c.pendingMissions).toBe(1);
  });

  it("comms: sums up Nevaeh's mission chain from the mission log", () => {
    const log = new MissionLog(NEVAEH_MISSIONS, [{ id: "x", name: "X" }]);
    const m = missionsSummary(log);
    expect(m.mainTotal).toBe(NEVAEH_MISSIONS.length);
    expect(m.mainDone).toBe(0);
    expect(m.active?.targetId).toBe(log.active?.target.id);
    expect(m.sideTotal).toBe(1);
    expect(commsPanel([], m).missions).toBe(m);
    const first = log.active!.target.id;
    log.update((id) => id === first);
    expect(missionsSummary(log).mainDone).toBe(1);
  });

  it("alerts: a nominal ship is quiet; low xenon, broken machines and an absent probe show up, worst first", () => {
    const m = ship();
    const ring = new SpinRing(CODESHIP_RING);
    const h = habitat();
    const dockedView = { docked: true, assist: false, lastFailures: [], limits: IDSS_CONTACT_LIMITS, alignment: () => aligned() };
    const base = { prop: propulsionPanel(m), life: lifePanel(ring, h), dock: dockingPanel(dockedView, 0), comms: commsPanel([]), nav: navPanel("Bennu", "idle") };
    // The test garden is small, so only the food advisory is up.
    expect(alerts(base).map((a) => a.level)).toEqual(base.life.foodRatio < 0.8 ? ["advisory"] : []);
    m.burn(m.deltaV() - 50);
    h.machines[0]!.damage(1);
    const list = alerts({ ...base, prop: propulsionPanel(m), life: lifePanel(ring, h), dock: dockingPanel({ ...dockedView, docked: false }, 500) });
    expect(list[0]).toMatchObject({ level: "warning", panel: "prop" });
    expect(list.some((a) => a.panel === "life" && a.level === "caution")).toBe(true);
    expect(panelLevel(list, "dock")).toBe("advisory");
    expect(panelLevel(list, "comms")).toBe("nominal");
  });
});
