import { describe, expect, it } from "vitest";
import { Hen, HEN_TUNING } from "./hen";

describe("hen", () => {
  it("lays about one egg a day when fed, calm and with 16 h of light", () => {
    const h = new Hen("clara", "Clara");
    let eggs = 0;
    for (let t = 0; t < 10; t += 0.1) {
      eggs += h.tick(0.1, 16);
      h.feed();
    }
    expect(eggs).toBe(Math.floor(10 / HEN_TUNING.layIntervalDays));
  });

  it("stops laying with short days, hunger, fright or injury", () => {
    const dark = new Hen("a", "A");
    expect(dark.tick(3, 8)).toBe(0);
    const scared = new Hen("b", "B");
    scared.startle(0.9);
    expect(scared.tick(1, 16)).toBe(0);
    const hurt = new Hen("c", "C");
    hurt.health.add("herida", 0.6, "gato");
    expect(hurt.laying(16)).toBe(false);
  });
});
