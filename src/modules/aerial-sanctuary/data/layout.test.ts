import { describe, expect, it } from "vitest";
import { buildLayout, subtract, SEA_Y } from "./layout";
import { ceilingOver } from "./montana";
import { placeAt, step, type Body, type Floor, type WalkWorld } from "../domain/walk";
import { reachable, shortestWay } from "../domain/route";
import { safetyDistanceM, tooClose } from "../domain/safety";
import { planTrip } from "../domain/travel";
import { spacingViolations, INTERACTABLE_SPACING } from "@core/spacing";
import { CRAFT, ELECTRON, FALCON9_CREW, HAND } from "./facts";
import { handHits } from "../domain/hand-flight";
import * as FACTS from "./facts";

const crafts = { helicoptero: CRAFT.helicoptero.value, alfombra: CRAFT.alfombra.value };

/** Walk from a to b the way the auto walker does: small steps straight at it (3D in the water). */
function walk(w: WalkWorld, from: Body, to: { x: number; y: number; z: number }, extra: Floor[] = []): Body {
  let b = from;
  for (let i = 0; i < 4000; i++) {
    const dx = to.x - b.x;
    const dy = to.y - b.y;
    const dz = to.z - b.z;
    const d = Math.hypot(dx, b.motion === "agua" ? dy : 0, dz);
    if (d < 0.05 && (b.motion !== "agua" || Math.abs(dy) < 0.3)) break;
    const s = Math.min(0.25, d) / Math.max(d, 1e-9);
    const next = step(w, b, { dx: dx * s, dy: b.motion === "agua" ? dy * s : 0, dz: dz * s }, extra);
    if (next === b) {
      // Swimming straight up or down where there is no horizontal room left.
      if (b.motion === "agua" && Math.abs(dy) > 0.05) {
        const up = step(w, b, { dx: 0, dy: Math.sign(dy) * Math.min(0.25, Math.abs(dy)), dz: 0 }, extra);
        if (up !== b) {
          b = up;
          continue;
        }
      }
      break;
    }
    b = next;
  }
  return b;
}

for (const k of [1, 1.5]) {
  describe(`Santuario 3 a escala ${k}`, () => {
    const L = buildLayout(k);
    const W = L.world;
    const byId = new Map(L.graph.points.map((p) => [p.id, p]));

    it("el S-92 se posa en cualquier punto del círculo de toma de cada helipuerto sin que el rotor toque nada", () => {
      // The touchdown circle (padRadiusM) says where a landing counts: from all of it the rotor must clear what stands
      // round the deck (the windsock, the floodlights), or she hangs stuck over the pad (PX-46 on CI, 1,5 m over it).
      const lim = HAND.helicoptero.value;
      const bad: string[] = [];
      for (const isl of L.islands) {
        if (!isl.pad.crafts.includes("helicoptero")) continue;
        const { x, y, z } = isl.pad.at;
        for (let r = 0; r <= lim.padRadiusM; r += 0.25)
          for (let a = 0; a < 360; a += 5) {
            const px = x + r * Math.cos((a * Math.PI) / 180);
            const pz = z + r * Math.sin((a * Math.PI) / 180);
            if (handHits({ floors: W.floors, solids: W.solids, seaY: SEA_Y, pads: [] }, px, y, pz, lim)) {
              bad.push(`${isl.id}: a ${r} m del centro (${a}°)`);
              r = Infinity;
              break;
            }
          }
      }
      expect(bad).toEqual([]);
    });

    it("cada tramo del camino se anda (o se nada) sin chocar: el «Ir» nunca atraviesa una pared", () => {
      const bad: string[] = [];
      for (const [a, b] of L.graph.links) {
        const p = byId.get(a)!;
        const q = byId.get(b)!;
        if (p.lift && q.lift && p.lift.id === q.lift.id) continue;
        // A carpet flight is flown, not walked (montana.test.ts flies them).
        if (p.carpet && q.carpet) continue;
        const start = placeAt(W, p.x, p.y, p.z);
        if (!start) {
          bad.push(`${a}: no hay suelo ni agua`);
          continue;
        }
        const end = walk(W, start, q);
        if (Math.hypot(end.x - q.x, end.z - q.z) > 0.4 || Math.abs(end.y - q.y) > 1.5) bad.push(`${a} → ${b}: se queda en (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
      }
      expect(bad).toEqual([]);
    });

    it("todo compartimento que existe se puede recorrer: cada área tiene su punto, y se llega desde el andén de su isla (reglas §2.1)", () => {
      for (const isl of L.islands) {
        const seen = reachable(L.graph, isl.arrival);
        const missing = L.areas.filter((a) => a.island === isl.id && !seen.has(a.point)).map((a) => a.id);
        expect(missing, isl.id).toEqual([]);
        expect(seen.has(isl.nav), `${isl.id}: máquina de navegación`).toBe(true);
      }
      for (const a of L.areas) expect(byId.has(a.point), a.id).toBe(true);
    });

    it("cada máquina se alcanza a pie desde el andén de su isla", () => {
      for (const m of L.machines) {
        const isl = L.islands.find((i) => i.id === m.island)!;
        expect(shortestWay(L.graph, isl.arrival, m.point), m.id).toBeDefined();
      }
    });

    it("hay al menos 2 m entre las cosas con las que se interactúa, en cada isla", () => {
      for (const isl of L.islands) {
        const items = L.machines.filter((m) => m.island === isl.id).map((m) => ({ id: m.id, centre: { x: m.x, y: m.y, z: m.z }, anchor: { x: m.x, y: m.y, z: m.z } }));
        expect(spacingViolations(items, INTERACTABLE_SPACING.minM), isl.id).toEqual([]);
      }
    });

    it("una máquina de navegación en cada isla", () => {
      for (const isl of L.islands) expect(L.machines.filter((m) => m.island === isl.id && m.kind === "navegacion").length, isl.id).toBe(1);
    });

    it("las salas del campus caben bajo el techo de la montaña hueca y no se pisan, a esta escala", () => {
      // The buildings (their rooms within, as the NBL's control room or the mock-ups, are inside them), each on its tree's floor.
      const rooms = L.areas.filter((a) => a.island === "entrenamiento" && a.floorY !== undefined && /^entrenamiento:[a-z-]+$/.test(a.id) && !a.id.includes("arbol"));
      expect(rooms.length).toBeGreaterThanOrEqual(20);
      for (const r of rooms) {
        const box = { x0: r.centre.x - r.half.x, x1: r.centre.x + r.half.x, z0: r.centre.z - r.half.z, z1: r.centre.z + r.half.z };
        expect(ceilingOver(box), `${r.id}: techo`).toBeGreaterThan(r.centre.y + r.half.y + 4);
      }
      for (let i = 0; i < rooms.length; i++)
        for (let j = i + 1; j < rooms.length; j++) {
          const a = rooms[i]!;
          const b = rooms[j]!;
          if (Math.abs(a.centre.y - b.centre.y) > a.half.y + b.half.y + 2) continue;
          // A compartment (a mock-up, a chamber) stands inside its hall.
          const inside = (p: typeof a, q: typeof a) => Math.abs(p.centre.x - q.centre.x) + p.half.x <= q.half.x + 0.01 && Math.abs(p.centre.z - q.centre.z) + p.half.z <= q.half.z + 0.01;
          if (inside(a, b) || inside(b, a)) continue;
          const apart = Math.abs(a.centre.x - b.centre.x) >= a.half.x + b.half.x + 2 || Math.abs(a.centre.z - b.centre.z) >= a.half.z + b.half.z + 2;
          expect(apart, `${a.id} y ${b.id}`).toBe(true);
        }
    });

    it("el ascensor de cada árbol para en el andén, en cada nivel y en el techo; el de la lanzadera, en la plataforma", () => {
      const launch = L.lifts.find((l) => l.id === "lanzadera-arbol")!;
      expect(launch.stops.map((s) => s.label)).toEqual(["Andén", "Nivel 1", "Nivel 2", "El techo", "Plataforma de lanzamiento"]);
      expect(launch.stops[0]!.y).toBe(0);
      expect(launch.stops.at(-1)!.y).toBeCloseTo(L.crown.y, 6);
      const energy = L.lifts.find((l) => l.id === "parque-arbol")!;
      expect(energy.stops.map((s) => s.y)).toEqual([0, 12, 34, 57]);
    });

    it("T13: la corona del Electron cumple la regla de altura (unos 182 m), y deja en la plataforma", () => {
      expect(L.crown.y).toBeGreaterThanOrEqual(182 - 0.01);
      expect(L.crown.why).toMatch(/aves/);
      const top = L.lifts.find((l) => l.id === "lanzadera-arbol")!.stops.at(-1)!;
      const p = byId.get(top.point)!;
      expect(placeAt(W, p.x, p.y, p.z)?.y).toBeCloseTo(L.crown.y, 6);
    });

    it(`la lanzadera está a ≥ ${Math.round(safetyDistanceM(ELECTRON.propellantKg.value))} m de todo lo habitado (Electron)`, () => {
      const pad = { x: L.crown.x, z: L.crown.z };
      expect(tooClose(pad, safetyDistanceM(ELECTRON.propellantKg.value), L.inhabited)).toEqual([]);
    });

    it(`§2.4: las áreas de Cold Sanctuary también se dibujan ${k} veces más anchas (los datos, a tamaño real)`, () => {
      const cap = L.areas.find((a) => a.id === "lanzadera:casquete")!;
      expect(cap.half.x).toBeCloseTo(FACTS.SITE.launchCapHalf.value * k, 6);
      expect(cap.half.y).toBe(1);
      const dock = L.areas.find((a) => a.id === "muelle:muelle")!;
      expect(dock.half.x * 2).toBeCloseTo(FACTS.SITE.dockSize.value.x * k, 6);
      expect(L.inhabited.map((f) => f.id)).toContain("muelle aéreo");
      const energy = L.lifts.find((l) => l.id === "parque-arbol")!;
      expect(energy.stops.map((s) => s.y)).toEqual([0, 12, 34, 57]);
    });

    it("el Falcon 9 tripulado está a ~1,1 km de todo lo habitado, también del árbol de la lanzadera", () => {
      const f9 = L.props.find((p) => p.kind === "falcon9")!;
      const min = safetyDistanceM(FALCON9_CREW.propellantKg.value);
      const launchTree = { id: "árbol de la lanzadera", x0: L.crown.x - 11, x1: L.crown.x + 11, z0: L.crown.z - 11, z1: L.crown.z + 11 };
      expect(tooClose({ x: f9.x, z: f9.z }, min, [...L.inhabited, launchTree])).toEqual([]);
      expect(Math.hypot(f9.x - L.crown.x, f9.z - L.crown.z)).toBeLessThan(2000);
    });

    it("de la isla de entrenamiento se vuela a cada isla, con escala si hace falta", () => {
      const pads = L.islands.map((i) => i.pad);
      for (const to of L.islands) if (to.id !== "entrenamiento") expect(planTrip("entrenamiento", to.id, pads, crafts), to.id).toBeDefined();
      expect(planTrip("entrenamiento", "lanzadera", pads, crafts)!.map((l) => l.craft)).toEqual(["helicoptero"]);
      expect(planTrip("lanzadera", "muelle", pads, crafts)!.map((l) => l.craft)).toEqual(["alfombra"]);
    });

    it("empieza en el helipuerto de la isla de entrenamiento, andando", () => {
      const s = byId.get(L.start)!;
      const b = placeAt(W, s.x, s.y, s.z)!;
      expect(b.motion).toBe("gravedad");
      expect(b.area).toBe("entrenamiento:helipuerto");
    });

    it("en el mar y en la piscina se nada; al salir del agua por una orilla baja se vuelve a andar", () => {
      const sea = placeAt(W, 0, SEA_Y - 2, 0)!;
      expect(sea.motion).toBe("agua");
      const pool = L.world.waters.find((w) => w.id === "nbl-piscina")!;
      const inPool = placeAt(W, (pool.x0 + pool.x1) / 2, pool.yTop - 3, (pool.z0 + pool.z1) / 2)!;
      expect(inPool.motion).toBe("agua");
      // Swim to the pool's south edge and out onto the deck.
      const out = walk(W, inPool, { x: (pool.x0 + pool.x1) / 2, y: pool.yTop + 0.3, z: pool.z0 - 2 });
      expect(out.motion).toBe("gravedad");
      expect(out.area).toBe("entrenamiento:nbl");
    });

    it("el borde de un piso alto no deja caer: no hay paso donde no hay suelo ni agua", () => {
      const roof = L.lifts.find((l) => l.id === "lanzadera-arbol")!.stops.at(-1)!;
      const p = byId.get(roof.point)!;
      const b = placeAt(W, p.x, p.y, p.z)!;
      const end = walk(W, b, { x: p.x - 40, y: p.y, z: p.z });
      expect(end.y).toBeCloseTo(p.y, 6);
      expect(end.x).toBeGreaterThan(p.x - 15);
    });
  });
}

describe("Datos del santuario 3", () => {
  it("cada dato lleva su fuente y su etiqueta (real, en desarrollo, licencia o ficción)", () => {
    const facts: { value: unknown; reality: string; source: string }[] = [];
    const visit = (v: unknown) => {
      if (v && typeof v === "object") {
        if ("value" in v && "reality" in v && "source" in v) facts.push(v as never);
        else for (const x of Object.values(v)) visit(x);
      }
    };
    visit(FACTS);
    expect(facts.length).toBeGreaterThan(40);
    for (const f of facts) {
      expect(["real", "en-desarrollo", "licencia", "ficcion"]).toContain(f.reality);
      expect(f.source.length).toBeGreaterThan(10);
    }
  });

  it("las áreas de Cold Sanctuary son ficción y las salas del campus, reales (la montaña, sus árboles y el Starship inundado, ficción)", () => {
    const L = buildLayout(1);
    const built = /:(lago|montana|cueva-|arbol-|starship|pupa)/;
    for (const a of L.areas) {
      if (a.island === "entrenamiento") expect(a.reality, a.id).toBe(built.test(a.id) ? "ficcion" : "real");
      if (a.island === "lanzadera" || a.island === "parque" || a.island === "muelle") expect(a.reality, a.id).toBe("ficcion");
    }
  });

  it("subtract parte un rectángulo alrededor de un hueco", () => {
    const parts = subtract({ x0: 0, x1: 10, z0: 0, z1: 10 }, { x0: 4, x1: 6, z0: 4, z1: 6 });
    expect(parts.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0)).toBeCloseTo(96, 6);
  });
});
