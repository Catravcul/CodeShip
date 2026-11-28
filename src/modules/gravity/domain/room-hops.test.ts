import { describe, expect, it } from "vitest";
import { HOP } from "./hops";
import { roomHopAt, roomHops, roomHopsSeconds } from "./room-hops";

describe("HAB-46 No area has gravity: she crosses the flight deck in hops, never walking", () => {
  it("cuts a route into equal hops no longer than the preferred hop", () => {
    const hops = roomHops({ x: 0, z: 0 }, [{ x: 0, z: 3 }, { x: 2, z: 3 }]);
    expect(hops.length).toBe(3);
    for (const h of hops) expect(h.lengthM).toBeLessThanOrEqual(HOP.preferM + 1e-9);
    expect(hops.at(-1)!.to).toEqual({ x: 2, z: 3 });
    expect(hops[1]!.from).toEqual(hops[0]!.to);
  });

  it("each hop pushes off, glides and catches, ending at the next handhold; the aim pause only before the first", () => {
    const [h] = roomHops({ x: 0, z: 0 }, [{ x: 0, z: 2 }]);
    const phases = new Set<string>();
    let t = 0;
    let last = roomHopAt(h!, 0, true);
    while (!last.done && t < 20) {
      t += 0.05;
      last = roomHopAt(h!, t, true);
      phases.add(last.phase);
    }
    expect([...phases]).toEqual(["aim", "push", "glide", "catch"]);
    expect(last.at.z).toBeCloseTo(2, 6);
    expect(t).toBeCloseTo(roomHopsSeconds([h!]), 1);
    expect(roomHopAt(h!, 0, false).phase).toBe("push");
  });
});
