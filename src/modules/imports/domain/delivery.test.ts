import { describe, expect, it } from "vitest";
import { DeliveryLine } from "./delivery";

describe("delivery line", () => {
  it("a delivery the store refuses (full, HC-02) waits in the inbox and lands once it is accepted", () => {
    const line = new DeliveryLine();
    line.send("santuario", "A", { kit: 1 }, 2);
    line.send("santuario", "B", { kit: 2 }, 1);
    let open = false;
    expect(line.tick(3, () => open)).toEqual([]);
    expect(line.pending.map((d) => [d.label, d.waiting])).toEqual([
      ["A", true],
      ["B", true],
    ]);
    expect(line.waiting).toHaveLength(2);
    open = true;
    expect(line.tick(0, () => open).map((d) => d.label)).toEqual(["A", "B"]);
    expect(line.pending).toHaveLength(0);
  });

  it("accepts in order: once one is refused, the ones after it wait too", () => {
    const line = new DeliveryLine();
    line.send("x", "A", { a: 5 }, 1);
    line.send("x", "B", { a: 1 }, 1);
    let room = 3;
    const got = line.tick(1, (d) => {
      const kg = d.goods.a ?? 0;
      if (kg > room) return false;
      room -= kg;
      return true;
    });
    expect(got).toEqual([]);
    expect(line.waiting.map((d) => d.label)).toEqual(["A", "B"]);
  });
});
