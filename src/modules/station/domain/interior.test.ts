import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { POLANA_LAYOUT } from "../data/structure";
import { POLANA_INTERIOR, hangarPressureCase, stationInteriorPlan } from "../data/interior";
import { EQ_BIG_PRINTER, EQ_CARBONYL, EQ_COMPOSITES, EQ_EBW, GROWTH_BLUEPRINTS, MOD_FAB2, MOD_HAVEN2, startingOutfit } from "../data/outfit";
import { EXPOSED_FACILITY } from "../data/iss";
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
  it("every module's aisle fits inside its pressure hull and runs its real length", () => {
    for (const id of ["nodo-1", "nodo-2", "nodo-3", "destiny", "quest", "columbus", "kibo"]) {
      const m = POLANA_LAYOUT.modules.find((x) => x.id === id)!;
      const v = interior.volume(id)!;
      const along = v.half.x > v.half.z ? "x" : "z";
      const across = along === "x" ? "z" : "x";
      expect(Math.hypot(v.half[across], v.half.y), id).toBeLessThan(m.radiusM);
      expect(2 * v.half[along], id).toBeCloseTo(Math.abs(m.to[along] - m.from[along]), 6);
    }
  });

  it("EST-42 Destiny is as long as the real one (8,5 m) and Kibo's pressurised module 11,19 m", () => {
    expect(2 * interior.volume("destiny")!.half.z).toBeCloseTo(8.5, 6);
    expect(2 * interior.volume("kibo")!.half.x).toBeCloseTo(11.19, 6);
  });

  it("there is no hangar: everything inside is pressurised (the Bishop and the JEM-EF replace it)", () => {
    expect(POLANA_INTERIOR.volumes.some((v) => v.kind === "hangar")).toBe(false);
    expect(POLANA_LAYOUT.parts.some((p) => p.kind === "hangar")).toBe(false);
    for (const v of POLANA_INTERIOR.volumes) expect(interior.pressurisedAt(v.centre), v.id).toBe(true);
    expect(POLANA_LAYOUT.parts.find((p) => p.id === "jem-ef")?.kind).toBe("plataforma");
  });

  it("from either docking port she can float down the stack to Unity and into Tranquility, Columbus and Kibo", () => {
    const u = interior.volume("nodo-1")!;
    const h2 = interior.volume("nodo-2")!;
    const sonda = POLANA_INTERIOR.entries.sonda.at;
    const nodriza = POLANA_INTERIOR.entries.nodriza.at;
    expect(path([sonda, new Vec3(0, 0, sonda.z), u.centre], false)).toBe(true);
    expect(path([nodriza, u.centre], false)).toBe(true);
    const n3 = interior.volume("nodo-3")!;
    expect(path([u.centre, new Vec3(n3.centre.x - n3.half.x + 0.5, 0, 0)], false)).toBe(true);
    for (const id of ["columbus", "kibo"]) {
      const v = interior.volume(id)!;
      expect(path([h2.centre, new Vec3(v.centre.x + Math.sign(v.centre.x) * (v.half.x - 0.5), 0, h2.centre.z)], false), id).toBe(true);
    }
  });

  it("she cannot go through a bulkhead outside its hatch", () => {
    const lab = interior.volume("destiny")!;
    const wall = lab.centre.z + lab.half.z; // Destiny / Unity
    expect(interior.fits(new Vec3(0, 0, wall), BODY, false)).toBe(true);
    expect(interior.fits(new Vec3(0, 0.9, wall), BODY, false)).toBe(false);
    expect(interior.fits(new Vec3(0, 0, lab.centre.z), BODY, false)).toBe(true);
    expect(interior.fits(new Vec3(0, lab.half.y + 0.1, lab.centre.z), BODY, false)).toBe(false);
  });

  it("Quest is the airlock: with it emptied (suited) its hatch to Unity is shut", () => {
    const q = interior.volume("quest")!.centre;
    const u = interior.volume("nodo-1")!.centre;
    expect(path([u, q], false)).toBe(true);
    expect(path([q, u], true)).toBe(false);
  });

  it("each machine opens its tab of the station screen, and every tab has one", () => {
    const panel = (id: string) => {
      const a = interior.fixture(id)!.action;
      return a.kind === "panel" ? a.panel : undefined;
    };
    expect(panel("refineria")).toBe("propelente");
    expect(panel("fundicion")).toBe("fabricacion");
    expect(panel("impresora")).toBe("planos");
    // Kibo's airlock keeps the parts list (they are outside on the JEM-EF, as on the ISS).
    expect(panel("esclusa-kibo")).toBe("hangar");
    for (const p of ["materiales", "planos", "fabricacion", "hangar"] as const) expect(interior.fixturesFor(p).length).toBeGreaterThan(0);
    expect(interior.fixture("refineria")!.machine).toBe("refineria");
  });

  it("every fixture can be reached from somewhere she fits", () => {
    for (const f of POLANA_INTERIOR.fixtures) {
      const suited = false;
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
        // Toward the aisle's axis, keeping the position along the module (or toward its middle, for a thing on an end bulkhead).
        const along = v.half.x > v.half.z ? "x" : "z";
        const endCap = f.face === "babor" || f.face === "estribor" ? along === "x" : f.face === "proa" || f.face === "popa" ? along === "z" : false;
        const d = v.centre.sub(f.at);
        const p = f.at.add(new Vec3(along === "x" && !endCap ? 0 : d.x, d.y, along === "z" && !endCap ? 0 : d.z).scale(k / 40));
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

  it("gives the ISS's own location codes (COL1, LAB1, JPM1…)", () => {
    expect(interior.locationCode(interior.fixture("refineria")!)).toMatch(/^COL1[FAPSOD][1-6]$/);
    expect(interior.locationCode(interior.fixture("guantera")!)).toMatch(/^LAB1[FAPSOD][1-6]$/);
    expect(interior.locationCode(interior.fixture("refabricator")!)).toMatch(/^JPM1[FAPSOD][1-6]$/);
  });

  it("stores no spare parts inside: they go out on the JEM-EF's 12 ports, and no craft is kept aboard", () => {
    const { crates, probes } = interior.stow([["tanque", 3]], [{ id: "p1", name: "Sonda 1", kind: "sonda", massKg: 300 }]);
    expect(crates).toEqual([]);
    expect(probes).toEqual([]);
    expect(EXPOSED_FACILITY.ports).toBe(12);
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
    for (const id of [`plano-equipo-${EQ_EBW.id}`, `plano-equipo-${EQ_COMPOSITES.id}`, `plano-modulo-${MOD_HAVEN2.id}`, `plano-modulo-${MOD_FAB2.id}`, `plano-equipo-${EQ_CARBONYL.id}`, `plano-equipo-${EQ_BIG_PRINTER.id}`]) {
      st.fabricate([...BLUEPRINTS, ...GROWTH_BLUEPRINTS].find((b) => b.id === id)!);
      st.tick(1e5);
    }
    const o = st.outfit!;
    return { o, inside: new StationInterior(stationInteriorPlan(o.layout, o)) };
  };

  it("the base plan's machines come from the starting equipment, in Destiny's, Kibo's and Columbus's racks", () => {
    for (const id of ["refineria", "fundicion", "impresora", "planta"]) expect(interior.fixture(id)?.volume, id).toBe("columbus");
    for (const id of ["guantera", "amf", "eclss-ar-bastidor", "eclss-itcs-bastidor"]) expect(interior.fixture(id)?.volume, id).toBe("destiny");
    expect(interior.fixture("refabricator")?.volume).toBe("kibo");
    expect(interior.fixture("puerto-nodo-3-popa")).toBeDefined();
  });

  it("a berthed module is a new aisle along z reached through a CBM hatch from Tranquility; its port cap is gone", () => {
    const { o, inside } = grown();
    expect(inside.plan.fixtures.some((f) => f.id.startsWith("puerto-nodo-3-"))).toBe(false);
    const n3 = inside.volume("nodo-3")!;
    for (const m of [MOD_HAVEN2, MOD_FAB2]) {
      const v = inside.volume(m.id)!;
      expect(2 * v.half.z).toBeCloseTo(m.lengthM, 2);
      const pm = o.layout.modules.find((x) => x.id === m.id)!;
      expect(Math.hypot(v.half.y, v.half.x)).toBeLessThan(pm.radiusM);
      const far = new Vec3(v.centre.x, 0, v.centre.z + Math.sign(v.centre.z) * (v.half.z - 0.5));
      const ok = (a: Vec3, b: Vec3) => {
        const n = Math.ceil(b.sub(a).length() / 0.05);
        for (let k = 0; k <= n; k++) if (!inside.fits(a.add(b.sub(a).scale(k / n)), BODY, false)) return false;
        return true;
      };
      // From Unity into Tranquility, then fore or aft into the new module.
      const mid = new Vec3(v.centre.x, 0, n3.centre.z);
      expect(ok(Vec3.ZERO, mid) && ok(mid, far), m.id).toBe(true);
      expect(inside.pressurisedAt(far)).toBe(true);
    }
  });

  it("new equipment stands in its module's racks and opens its tab; codes count along the module", () => {
    const { inside } = grown();
    const carbonyl = inside.fixture(EQ_CARBONYL.id)!;
    expect(["columbus", MOD_FAB2.id]).toContain(carbonyl.volume);
    expect(inside.fixture(EQ_BIG_PRINTER.id)!.volume).toBe("columbus");
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
});
