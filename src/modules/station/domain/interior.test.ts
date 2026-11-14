import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { POLANA_LAYOUT } from "../data/structure";
import { POLANA_INTERIOR, hangarPressureCase, stationInteriorPlan } from "../data/interior";
import { EQ_BIG_PRINTER, EQ_CARBONYL, EQ_COMPOSITES, EQ_CROPS, EQ_EBW, MOD_FAB2, MOD_FARM, MOD_HANGAR, RADIATORS_DOUBLE, startingOutfit } from "../data/outfit";
import { BLUEPRINTS } from "../data/blueprints";
import { MATERIALS } from "../data/materials";
import { POLANA_STATION } from "../data/station";
import { MaterialStock } from "./materials";
import { Hangar } from "./hangar";
import { Station } from "./station";
import { FACE_NORMAL, StationInterior, distanceToBox, faceToward, fixtureBox } from "./interior";

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
    expect(interior.fixture("consola-hangar")!.action.kind).toBe("hangar");
    expect(panel("estante-babor")).toBe("hangar");
    for (const p of ["materiales", "planos", "fabricacion", "hangar"] as const) expect(interior.fixturesFor(p).length).toBeGreaterThan(0);
    expect(interior.fixture("refineria")!.machine).toBe("refineria");
  });

  it("every fixture can be reached from somewhere she fits", () => {
    for (const f of POLANA_INTERIOR.fixtures) {
      const suited = f.volume === "hangar";
      if (f.action.kind === "puerta") {
        // A door: just inside its own side of the hatch, on whichever side of the airlock's state it opens.
        const p = f.at.sub(FACE_NORMAL[f.face].scale(0.6));
        expect(interior.fits(p, BODY, false) || interior.fits(p, BODY, true), f.id).toBe(true);
        continue;
      }
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

describe("station interior as the station grows (generated from the outfit)", () => {
  const grown = () => {
    const st = new Station(POLANA_STATION, new MaterialStock(Object.fromEntries(MATERIALS.map((m) => [m.id, 1e6]))), new Hangar(), startingOutfit());
    for (const id of [`plano-equipo-${EQ_EBW.id}`, `plano-equipo-${EQ_COMPOSITES.id}`, `plano-equipo-${EQ_CARBONYL.id}`, `plano-modulo-${MOD_FAB2.id}`, `plano-modulo-${MOD_FARM.id}`, `plano-equipo-${EQ_BIG_PRINTER.id}`, `plano-modulo-${MOD_HANGAR.id}`]) {
      st.fabricate(BLUEPRINTS.find((b) => b.id === id)!);
      st.tick(1e5);
    }
    st.outfit!.fitComponent(RADIATORS_DOUBLE);
    st.fabricate(BLUEPRINTS.find((b) => b.id === `plano-equipo-${EQ_CROPS.id}`)!);
    st.tick(1e5);
    const o = st.outfit!;
    return { o, inside: new StationInterior(stationInteriorPlan(o.layout, o)) };
  };

  it("the base plan's machines come from the starting equipment, in the fabrication module's racks", () => {
    for (const id of ["refineria", "guantera", "fundicion", "impresora", "planta"]) expect(interior.fixture(id)?.volume, id).toBe("fabrica");
    expect(interior.fixture("puerto-babor")).toBeDefined();
  });

  it("a berthed module is a new aisle along x reached through a CBM hatch from node 1; its port cap is gone", () => {
    const { o, inside } = grown();
    expect(inside.plan.fixtures.some((f) => f.id === "puerto-babor" || f.id === "puerto-estribor")).toBe(false);
    for (const m of [MOD_FAB2, MOD_FARM]) {
      const v = inside.volume(m.id)!;
      expect(2 * v.half.x).toBeCloseTo(m.lengthM, 2);
      const pm = o.layout.modules.find((x) => x.id === m.id)!;
      expect(Math.hypot(v.half.y, v.half.z)).toBeLessThan(pm.radiusM);
      const far = new Vec3(v.centre.x + Math.sign(v.centre.x) * (v.half.x - 0.5), 0, 0);
      // From the probe's entry: into node 1, then sideways into the new module.
      const sonda = POLANA_INTERIOR.entries.sonda.at;
      const ok = (a: Vec3, b: Vec3) => {
        const n = Math.ceil(b.sub(a).length() / 0.05);
        for (let k = 0; k <= n; k++) if (!inside.fits(a.add(b.sub(a).scale(k / n)), BODY, false)) return false;
        return true;
      };
      expect(ok(sonda, new Vec3(0, 0, sonda.z)) && ok(new Vec3(0, 0, sonda.z), Vec3.ZERO) && ok(Vec3.ZERO, far), m.id).toBe(true);
      expect(inside.pressurisedAt(far)).toBe(true);
    }
  });

  it("new equipment stands in its module's racks and opens its tab; codes count along the module", () => {
    const { inside } = grown();
    const crops = inside.fixture(EQ_CROPS.id)!;
    expect(crops.volume).toBe(MOD_FARM.id);
    expect(["proa", "popa"]).toContain(crops.face);
    expect(inside.locationCode(crops)).toMatch(/^AGR1[FA][1-6]$/);
    expect(inside.fixture(EQ_BIG_PRINTER.id)!.volume).toBe("fabrica");
    expect(inside.fixture("impresora")).toBeUndefined();
    expect(inside.fixture(EQ_EBW.id)!.action).toEqual({ kind: "panel", panel: "planos" });
    // Every fixture can still be reached.
    for (const f of inside.plan.fixtures.filter((x) => x.volume !== "hangar")) {
      const v = inside.volume(f.volume)!;
      let ok = false;
      for (let k = 0; k <= 40 && !ok; k++) {
        const p = f.at.add(v.centre.sub(f.at).scale(k / 40));
        // Toward the aisle's axis, keeping the position along the module (or along the axis for an end port).
        const endCap = f.face === "babor" || f.face === "estribor" ? v.half.x > v.half.z : f.face === "proa" || f.face === "popa" ? v.half.z > v.half.x : false;
        const along = v.half.x > v.half.z ? "x" : "z";
        const q = endCap ? p : new Vec3(along === "x" ? f.at.x : p.x, p.y, along === "z" ? f.at.z : p.z);
        ok = inside.fits(q, BODY, false) && distanceToBox(fixtureBox(f), q) <= 1.0;
      }
      expect(ok, f.id).toBe(true);
    }
  });

  it("the extended hangar has more room for spare parts", () => {
    const { inside } = grown();
    expect(2 * inside.volume("hangar")!.half.z).toBeGreaterThan(2 * interior.volume("hangar")!.half.z + 9);
  });
});
