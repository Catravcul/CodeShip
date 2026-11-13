import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { POLANA_LAYOUT } from "../data/structure";
import { POLANA_INTERIOR, hangarPressureCase } from "../data/interior";
import { StationInterior, distanceToBox, faceToward, fixtureBox } from "./interior";

const interior = new StationInterior(POLANA_INTERIOR);
const BODY = 0.3;

/** Floats in a straight line in small steps; false if a step does not fit. */
const path = (points: Vec3[], suited: boolean) => {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const n = Math.ceil(b.sub(a).length() / 0.05);
    for (let k = 0; k <= n; k++) if (!interior.fits(a.add(b.sub(a).scale(k / n)), BODY, suited)) return false;
  }
  return true;
};

describe("station interior (sized from the structure)", () => {
  it("every module's aisle fits inside its pressure hull", () => {
    for (const id of ["nodo-1", "nodo-2", "habitat", "fabrica"]) {
      const m = POLANA_LAYOUT.modules.find((x) => x.id === id)!;
      const v = interior.volume(id)!;
      expect(Math.hypot(v.half.x, v.half.y)).toBeLessThan(m.radiusM);
      expect(2 * v.half.z).toBeCloseTo(Math.abs(m.to.z - m.from.z), 6);
    }
  });

  it("the habitat is as long as HALO (6,1 m)", () => {
    expect(2 * interior.volume("habitat")!.half.z).toBeCloseTo(6.1, 6);
  });

  it("the hangar lies inside the structure's hangar box and has no air", () => {
    const h = interior.volume("hangar")!;
    const part = POLANA_LAYOUT.parts.find((p) => p.kind === "hangar")!;
    for (const k of ["x", "y", "z"] as const) expect(Math.abs(h.centre[k] - part.centre[k]) + h.half[k]).toBeLessThanOrEqual(part.half[k]);
    expect(interior.pressurisedAt(h.centre)).toBe(false);
    expect(interior.pressurisedAt(interior.volume("habitat")!.centre)).toBe(true);
  });

  it("from either docking port she can float to the far end of the fabrication module", () => {
    const fab = interior.volume("fabrica")!;
    const end = new Vec3(0, 0, fab.centre.z + fab.half.z - 0.5);
    const sonda = POLANA_INTERIOR.entries.sonda.at;
    const nodriza = POLANA_INTERIOR.entries.nodriza.at;
    expect(path([sonda, new Vec3(0, 0, sonda.z), end], false)).toBe(true);
    expect(path([nodriza, end], false)).toBe(true);
  });

  it("she cannot go through a bulkhead outside its hatch", () => {
    const hab = interior.volume("habitat")!;
    const wall = hab.centre.z + hab.half.z; // habitat / node 1
    expect(interior.fits(new Vec3(0, 0, wall), BODY, false)).toBe(true);
    expect(interior.fits(new Vec3(0, 0.9, wall), BODY, false)).toBe(false);
    expect(interior.fits(new Vec3(0, 0, hab.centre.z), BODY, false)).toBe(true);
    expect(interior.fits(new Vec3(0, 1.0, hab.centre.z), BODY, false)).toBe(false);
  });

  it("the airlock lets her into the hangar only suited, and back only repressurised", () => {
    const lock = interior.volume("esclusa")!;
    const inLock = lock.centre;
    const fab = interior.volume("fabrica")!.centre;
    const hangar = new Vec3(0, 0, lock.centre.z + lock.half.z + 2);
    expect(path([fab, inLock], false)).toBe(true);
    expect(path([inLock, hangar], false)).toBe(false);
    expect(path([inLock, hangar], true)).toBe(true);
    expect(path([inLock, fab], true)).toBe(false);
    expect(interior.pressurisedAt(inLock, true)).toBe(false);
  });

  it("the racks and the airlock's shell are solid in the hangar", () => {
    const lock = interior.volume("esclusa")!;
    expect(interior.fits(new Vec3(1.2, 0, lock.centre.z), BODY, true)).toBe(false);
    const rack = interior.fixture("estante-babor")!;
    expect(interior.fits(fixtureBox(rack).centre, BODY, true)).toBe(false);
    expect(interior.fits(rack.at.add(new Vec3(1, 0, 0)), BODY, true)).toBe(true);
  });

  it("each machine opens its tab of the station screen, and every tab has one", () => {
    const panel = (id: string) => {
      const a = interior.fixture(id)!.action;
      return a.kind === "panel" ? a.panel : undefined;
    };
    expect(panel("refineria")).toBe("propelente");
    expect(panel("fundicion")).toBe("fabricacion");
    expect(panel("impresora")).toBe("planos");
    expect(panel("consola-hangar")).toBe("hangar");
    for (const p of ["materiales", "planos", "fabricacion", "hangar"] as const) expect(interior.fixturesFor(p).length).toBeGreaterThan(0);
    expect(interior.fixture("refineria")!.machine).toBe("refineria");
  });

  it("every fixture can be reached from somewhere she fits", () => {
    for (const f of POLANA_INTERIOR.fixtures) {
      const suited = f.volume === "hangar";
      const v = interior.volume(f.volume)!;
      // Walk from the fixture's front toward the volume's axis until she fits.
      let ok = false;
      for (let k = 0; k <= 40 && !ok; k++) {
        const p = f.at.add(new Vec3(v.centre.x - f.at.x, v.centre.y - f.at.y, f.volume === "hangar" ? v.centre.z - f.at.z : 0).scale(k / 40));
        ok = interior.fits(p, BODY, suited) && interior.fixtureNear(p, 1.0) !== undefined && distanceToBox(fixtureBox(f), p) <= 1.0;
      }
      expect(ok, f.id).toBe(true);
    }
  });

  it("walking up to the refinery offers the refinery", () => {
    const f = interior.fixture("refineria")!;
    expect(interior.fixtureNear(f.at.add(new Vec3(0.5, 0, 0)))?.id).toBe("refineria");
    expect(interior.fixtureNear(new Vec3(0, 0, -100))).toBeUndefined();
  });

  it("from the probe's entry, the hatch back to the probe is at hand", () => {
    expect(interior.fixtureNear(POLANA_INTERIOR.entries.sonda.at)?.action).toEqual({ kind: "salir", to: "sonda" });
    expect(interior.fixtureNear(POLANA_INTERIOR.entries.nodriza.at)?.action).toEqual({ kind: "salir", to: "nodriza" });
  });

  it("names faces with the local vertical (overhead up, starboard +x, forward −z)", () => {
    expect(faceToward(new Vec3(0, 1, 0.2))).toBe("techo");
    expect(faceToward(new Vec3(0, -1, 0))).toBe("suelo");
    expect(faceToward(new Vec3(0.9, 0.1, 0.2))).toBe("estribor");
    expect(faceToward(new Vec3(-1, 0, 0))).toBe("babor");
    expect(faceToward(new Vec3(0, 0, -1))).toBe("proa");
    expect(faceToward(new Vec3(0.1, 0, 1))).toBe("popa");
  });

  it("gives ISS-style location codes", () => {
    expect(interior.locationCode(interior.fixture("refineria")!)).toMatch(/^FAB1P[1-6]$/);
    expect(interior.locationCode(interior.fixture("impresora")!)).toMatch(/^FAB1S[1-6]$/);
  });

  it("stows spare parts in crates on the racks and probes on cradles", () => {
    const { crates, probes } = interior.stow(
      [
        ["tanque", 3],
        ["rueda", 2],
      ],
      [
        { id: "nodriza", name: "Nodriza", kind: "nave", massKg: 0 },
        { id: "p1", name: "Sonda 1", kind: "sonda", massKg: 300 },
      ],
    );
    expect(crates.map((c) => c.partId)).toEqual(["tanque", "tanque", "tanque", "rueda", "rueda"]);
    expect(new Set(crates.map((c) => `${c.at.x},${c.at.y},${c.at.z}`)).size).toBe(5);
    expect(probes.map((p) => p.craft.id)).toEqual(["p1"]);
    const h = interior.volume("hangar")!;
    for (const c of [...crates.map((x) => x.at), ...probes.map((x) => x.at)]) expect(interior.volumeAt(c)).toBe(h);
    const many = interior.stow([["x", 1000]], []);
    expect(many.crates.length).toBe(POLANA_INTERIOR.storage.rackSlots.length);
  });

  it("pressurising the hangar would take tonnes of air and meganewtons on each wall", () => {
    const c = hangarPressureCase();
    expect(c.volumeM3).toBeCloseTo(5600, 0);
    expect(c.airKg).toBeGreaterThan(6500);
    expect(c.wallLoadMN).toBeGreaterThan(40);
  });
});
