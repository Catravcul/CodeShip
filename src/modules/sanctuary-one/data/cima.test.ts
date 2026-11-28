import { describe, expect, it } from "vitest";
import { buildS1Layout } from "./layout";
import { WalkIndex } from "./walk-index";
import { FreeWalk } from "@modules/aerial-sanctuary/application/free-walk";
import type { Body } from "@modules/aerial-sanctuary/domain/walk";
import { LEVEL } from "./castillos";

/** On the Residencia's crown, walking (Berón 2026-11-24): up a castle's stairs from the ring, and off its decks. */
const L = buildS1Layout(1);
const ix = new WalkIndex(L.world);
const crown = L.towers.find((t) => t.cima)!.cima!;

function walkTo(b: Body, to: { x: number; z: number }, seconds: number): Body {
  let y = b.y;
  const yaw = Math.atan2(-(to.x - b.x), -(to.z - b.z));
  const walk = new FreeWalk((x, z) => ix.near(x, z, y), { walk: 1.6, swim: 1.2 }, yaw);
  for (let t = 0; t < seconds; t += 0.05) {
    const c = walk.carry(0.05, b);
    b = c.body;
    y = b.y;
    if (!c.busy) b = walk.move(0.05, b, { forward: 1, right: 0, yaw: Math.atan2(-(to.x - b.x), -(to.z - b.z)), pitch: 0, run: false });
    if (Math.hypot(to.x - b.x, to.z - b.z) < 0.4) break;
  }
  return b;
}

describe("la cima de la Residencia a pie", () => {
  it("desde el suelo se sube por la escalera de cada castillo a su cubierta baja", () => {
    for (const c of crown.castles) {
      // The first flight (castillos.ts: floor → deck A), its steps in order; she walks up them to the landing.
      const flight = c.decks.filter((d) => d.kind === "escalon").slice(0, Math.ceil(LEVEL.a / 0.47));
      const mid = (d: { x0: number; x1: number; z0: number; z1: number }) => ({ x: (d.x0 + d.x1) / 2, z: (d.z0 + d.z1) / 2 });
      const a = mid(flight[0]!);
      const z = mid(flight[flight.length - 1]!);
      const dx = a.x - z.x, dz = a.z - z.z, n = Math.hypot(dx, dz);
      let b: Body = { x: a.x + (dx / n) * 2, y: crown.y, z: a.z + (dz / n) * 2, motion: "gravedad", area: crown.area };
      b = walkTo(b, z, 30);
      expect(b.y, c.name).toBeGreaterThan(crown.y + LEVEL.a - 0.1);
      // Then through the rail's gap onto the deck.
      const deck = c.decks[0]!;
      b = walkTo(b, mid(deck), 20);
      expect(b.y, `${c.name}: en la cubierta`).toBeCloseTo(crown.y + LEVEL.a, 1);
      expect(Math.hypot(b.x - mid(deck).x, b.z - mid(deck).z), c.name).toBeLessThan(1);
    }
  });
});
