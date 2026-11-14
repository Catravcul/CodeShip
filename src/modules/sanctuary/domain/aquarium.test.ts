import { describe, expect, it } from "vitest";
import { FAMILY_TUNING } from "@modules/family/domain/family";
import { RingAquarium, type AquariumEvent } from "./aquarium";

const run = (a: RingAquarium, days: number, step = 0.1): AquariumEvent[] => {
  const out: AquariumEvent[] = [];
  for (let t = 0; t < days - 1e-9; t += step) out.push(...a.tick(step));
  return out;
};

describe("ring aquarium: a closed 1 m³ loop (hornwort → medaka and snails → biofilter)", () => {
  it("starts with the glass greening and the school hungry: two care chores are due", () => {
    const a = new RingAquarium();
    expect(a.volumeL).toBe(1000);
    expect(a.needs).toEqual({ feed: true, cleanGlass: true, changeWater: false });
  });

  it("the biofilter keeps ammonia near zero; nitrate creeps up and the hornwort takes part of it", () => {
    const a = new RingAquarium({ nitrateMgL: 10 });
    run(a, 30);
    expect(a.ammoniaMgL).toBeLessThan(0.05);
    expect(a.nitrateMgL).toBeGreaterThan(10);
    const bare = new RingAquarium({ nitrateMgL: 10, hornwortG: 0 });
    run(bare, 30);
    expect(bare.nitrateMgL).toBeGreaterThan(a.nitrateMgL);
  });

  it("a water change takes out its share of nitrate", () => {
    const a = new RingAquarium({ nitrateMgL: 50 });
    a.changeWater(0.2);
    expect(a.nitrateMgL).toBeCloseTo(40, 6);
  });

  it("algae grow on the glass under the LEDs; the snails graze some; cleaning clears it", () => {
    const a = new RingAquarium({ algae: 0.1 });
    run(a, 5);
    expect(a.algae).toBeGreaterThan(0.1);
    a.cleanGlass();
    expect(a.algae).toBeLessThan(0.1);
  });

  it("hunger grows a quarter a day; feeding settles it", () => {
    const a = new RingAquarium({ hunger: 0 });
    run(a, 2);
    expect(a.hunger).toBeCloseTo(0.5, 6);
    a.feed();
    expect(a.hunger).toBe(0);
  });

  it("neglect makes the fish ill; good water lets them recover", () => {
    const a = new RingAquarium({ hunger: 1, nitrateMgL: 90 });
    run(a, 3);
    expect(a.fishHealth).toBeLessThan(1);
    a.feed();
    a.changeWater(0.5);
    a.changeWater(0.5);
    const low = a.fishHealth;
    run(a, 2);
    expect(a.fishHealth).toBeGreaterThan(low);
  });
});

describe("friendship: the fish are friends, never food", () => {
  it("each calm care visit is a warm meeting; the mind program makes them family", () => {
    const a = new RingAquarium();
    expect(a.canBefriend).toBe(false);
    a.feed();
    expect(a.bond).toBeCloseTo(FAMILY_TUNING.warmMeetingBond, 6);
    expect(a.canBefriend).toBe(true);
    const ev = a.befriend();
    expect(a.friends).toBe(true);
    expect(a.bond).toBeGreaterThanOrEqual(FAMILY_TUNING.familyAt);
    expect(ev).toEqual([{ type: "amigos" }]);
    expect(a.canBefriend).toBe(false);
  });

  it("help can only be asked of friends", () => {
    const a = new RingAquarium();
    expect(() => a.ask("caracoles-limpian")).toThrow(/amig/);
  });
});

describe("asking for help (a mind program for the snails or the fish)", () => {
  const friends = () => {
    const a = new RingAquarium();
    a.feed();
    a.befriend();
    return a;
  };

  it("the snails clean the glass: algae fall at once and keep falling, and the cleaning chore is not needed", () => {
    const a = friends();
    const before = a.algae;
    a.ask("caracoles-limpian");
    expect(a.helping("caracoles-limpian")).toBe(true);
    expect(a.algae).toBeLessThan(before);
    const now = a.algae;
    run(a, 1);
    expect(a.algae).toBeLessThan(now);
    expect(a.needs.cleanGlass).toBe(false);
  });

  it("the medaka signal the water: the water change is due earlier (30 mg/L, not 40) and they say so", () => {
    const a = friends();
    a.changeWater(0); // no-op, keeps state
    const b = new RingAquarium({ nitrateMgL: 35 });
    b.feed();
    b.befriend();
    expect(b.needs.changeWater).toBe(false);
    const ev = b.ask("medakas-avisan");
    expect(b.needs.changeWater).toBe(true);
    expect(ev).toContainEqual({ type: "aviso", reason: "nitrato" });
    expect(a.helping("medakas-avisan")).toBe(false);
  });

  it("help lasts a while (10 days), then they go back to their own life", () => {
    const a = friends();
    a.ask("caracoles-limpian");
    const ev = run(a, 11);
    expect(a.helping("caracoles-limpian")).toBe(false);
    expect(ev).toContainEqual({ type: "ayuda-terminada", helper: "caracoles-limpian" });
  });

  it("friends calm the crew: a few minutes of watching them lowers stress", () => {
    const a = friends();
    expect(a.calmPerDay).toBeGreaterThan(0);
    expect(new RingAquarium().calmPerDay).toBe(0);
  });
});
