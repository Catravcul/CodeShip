import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { AMBIENT, ambientOpacity, ambientVisible, NoticeQueue, type ViewCone } from "./notices";

describe("NoticeQueue (H24: the player's notices come first)", () => {
  it("an alert does not replace the player's notice: it waits and shows after it", () => {
    const q = new NoticeQueue();
    q.push("Bajas al anillo para «Regar»", "jugador", 0, 3);
    q.push("Una máquina se ha averiado", "alerta", 0.3);
    expect(q.current(0.4)?.text).toMatch(/Bajas al anillo/);
    expect(q.current(2.9)?.text).toMatch(/Bajas al anillo/);
    expect(q.current(3.1)?.text).toMatch(/averiado/);
    expect(q.current(3.1)?.until).toBeCloseTo(6);
    expect(q.current(6.1)).toBeUndefined();
  });

  it("a new player's notice replaces anything; an alert replaces an alert", () => {
    const q = new NoticeQueue();
    q.push("Carta de Nevaeh", "alerta", 0);
    q.push("Impulso fuerte", "jugador", 1);
    expect(q.current(1)?.text).toBe("Impulso fuerte");
    const r = new NoticeQueue();
    r.push("A", "alerta", 0);
    r.push("B", "alerta", 0.5);
    expect(r.current(0.6)?.text).toBe("B");
  });

  it("does not queue the same alert twice, and keeps few", () => {
    const q = new NoticeQueue();
    q.push("Tú", "jugador", 0, 10);
    for (let i = 0; i < 3; i++) q.push("Igual", "alerta", 0);
    expect(q.queued).toBe(1);
    for (let i = 0; i < 6; i++) q.push(`n${i}`, "alerta", 0);
    expect(q.queued).toBe(3);
  });

  it("skips waiting notices that ended while nobody asked", () => {
    const q = new NoticeQueue();
    q.push("Tú", "jugador", 0, 1);
    q.push("x", "alerta", 0, 1);
    q.push("y", "alerta", 0, 1);
    expect(q.current(2.5)?.text).toBe("y");
  });
});

describe("ambient notices: only where the player looks", () => {
  const cam: ViewCone = { position: Vec3.ZERO, forward: new Vec3(0, 0, -1), up: Vec3.Y, fovY: (70 * Math.PI) / 180, aspect: 390 / 664 };

  it("in front and inside the field of view: shown", () => {
    expect(ambientVisible(cam, new Vec3(0, 0, -5))).toBe(true);
    expect(ambientVisible(cam, new Vec3(0, 2, -5))).toBe(true);
  });

  it("behind, off to the side of a narrow phone view, too far or in another space: hidden", () => {
    expect(ambientVisible(cam, new Vec3(0, 0, 5))).toBe(false);
    expect(ambientVisible(cam, new Vec3(4, 0, -5))).toBe(false);
    expect(ambientVisible({ ...cam, aspect: 1280 / 800 }, new Vec3(4, 0, -5))).toBe(true);
    expect(ambientVisible(cam, new Vec3(0, 0, -(AMBIENT.maxM + 1)))).toBe(false);
    expect(ambientVisible(cam, new Vec3(0, 0, -5), false)).toBe(false);
  });

  it("fades out at the end of its life", () => {
    expect(ambientOpacity(0)).toBe(1);
    expect(ambientOpacity(AMBIENT.seconds - AMBIENT.fadeS / 2)).toBeCloseTo(0.5);
    expect(ambientOpacity(AMBIENT.seconds)).toBe(0);
  });
});
