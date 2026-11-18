import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { footprint, type PlacedFixture } from "./fixtures";
import { placeAt, step, type Body, type Solid, type WalkWorld } from "../domain/walk";
import { stageFor, STAGED_POSTS } from "./stages";

/** Walk from a to b as the auto walker does (small steps straight at it). */
function walk(w: WalkWorld, from: Body, to: { x: number; z: number }): Body {
  let b = from;
  for (let i = 0; i < 4000; i++) {
    const dx = to.x - b.x;
    const dz = to.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) break;
    const s = Math.min(0.25, d) / d;
    const next = step(w, b, { dx: dx * s, dz: dz * s });
    if (next === b) break;
    b = next;
  }
  return b;
}

const EPS = 0.004;
const overlap = (a: Solid, b: Solid) => a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.z0 < b.z1 - EPS && b.z0 < a.z1 - EPS && a.y0 < b.y1 - EPS && b.y0 < a.y1 - EPS;
const boxOf = (f: PlacedFixture): Solid => ({ ...footprint(f), y0: f.y, y1: f.y + f.h });
const segDist = (x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }) => {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L)) : 0;
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
};
/** Distance from a point to a rectangle on the plan (0 inside). */
const rectDist = (x: number, z: number, r: { x0: number; x1: number; z0: number; z1: number }) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));

for (const k of [1, 1.5]) {
  describe(`Isla de entrenamiento con detalle, a escala ${k} (santuario3-detalle.md)`, () => {
    const L = buildLayout(k);
    const F = L.fixtures;
    const byId = new Map(L.graph.points.map((p) => [p.id, p]));

    it("cada sala real tiene su equipo: nada está vacío", () => {
      const count = (room: string) => F.filter((f) => f.area.startsWith(`entrenamiento:${room}`) && f.kind !== "caja" && f.kind !== "luz-techo").length;
      for (const room of ["nbl", "svmf", "control", "gimnasio", "medico", "supervivencia"]) expect(count(room), room).toBeGreaterThanOrEqual(12);
      const kinds = new Set(F.map((f) => f.kind));
      for (const want of ["grua-puente", "grua-pluma", "soporte-emu", "puesto-buzos", "camaras-buceo", "hiperbarica", "maqueta-modulo", "consola-fcr", "pantallas-frente", "camilla-exam", "ecg", "ecografo", "audiometro", "asiento-camara", "consola-camara", "cinta", "bici", "jaula", "ared", "taquillas", "mets", "balsa", "izado", "luz-pista", "manga", "surtidor", "farola", "tussac", "capsula-orion", "rack-ispr"] as const) expect(kinds.has(want), want).toBe(true);
      expect(F.filter((f) => f.kind === "consola-fcr" && f.area === "entrenamiento:control").length).toBe(16);
      expect(F.filter((f) => f.kind === "grua-pluma").length).toBe(4);
      expect(F.filter((f) => f.kind === "grua-puente" && f.area === "entrenamiento:nbl").length).toBe(2);
    });

    it("los simuladores y la robótica tienen sus salas, como las reales: Hawthorne, el LMS del edificio 5 y el centro de la CSA", () => {
      const named = (area: string, name: string) => F.filter((f) => f.area.startsWith(`entrenamiento:${area}`) && f.name.includes(name));
      expect(named("simulador-dragon", "dos asientos").length).toBe(1);
      expect(named("simulador-dragon", "instructores").length).toBe(1);
      expect(named("simulador-lm", "Consola de control del LMS").length).toBe(1);
      expect(named("robotica", "Pizarra interactiva").length).toBe(3);
      expect(named("robotica", "Canadarm2").length + named("robotica", "Dextre").length).toBe(2);
      expect(named("robotica-destiny", "Estación de robótica").length).toBe(1);
      // Neither the SVMF nor Mission Control keeps a Dragon or a robotics station.
      expect(L.areas.some((a) => a.id === "entrenamiento:svmf-dragon")).toBe(false);
      expect(L.machines.some((m) => m.id === "control-robotica")).toBe(false);
    });

    it("cada pieza lleva su fuente y su etiqueta (real, en desarrollo, licencia o ficción)", () => {
      for (const f of F) {
        expect(["real", "en-desarrollo", "licencia", "ficcion"], f.name).toContain(f.reality);
        expect(f.source.length, f.name).toBeGreaterThan(10);
      }
    });

    it("nada atraviesa nada: ninguna pieza se mete en otra, en una pared ni en un mueble de la sala", () => {
      const fixtureBoxes = new Set(F.filter((f) => f.solid).map((f) => JSON.stringify(boxOf(f))));
      const others = L.world.solids.filter((s) => !fixtureBoxes.has(JSON.stringify(s)));
      const solidOnes = F.filter((f) => f.solid);
      const bad: string[] = [];
      for (let i = 0; i < solidOnes.length; i++) {
        const a = boxOf(solidOnes[i]!);
        for (let j = i + 1; j < solidOnes.length; j++) if (overlap(a, boxOf(solidOnes[j]!))) bad.push(`${solidOnes[i]!.name} × ${solidOnes[j]!.name} en (${a.x0.toFixed(1)}, ${a.z0.toFixed(1)})`);
        for (const s of others) if (overlap(a, s)) bad.push(`${solidOnes[i]!.name} × pared/mueble en (${s.x0.toFixed(1)}, ${s.z0.toFixed(1)})`);
      }
      // What stands free but is not solid (a raft, the step, a chamber's shell) does not run into walls either.
      for (const f of F.filter((q) => !q.solid && !q.mounted && !["pavimento", "caja", "barandilla", "escalon", "capsula-orion", "hiperbarica", "luz-pista", "rotulo-suelo", "pilote"].includes(q.kind))) for (const s of others) if (overlap(boxOf(f), s)) bad.push(`${f.name} × pared en (${s.x0.toFixed(1)}, ${s.z0.toFixed(1)})`);
      expect(bad).toEqual([]);
    });

    it("los caminos quedan libres: medio metro entre cada tramo del «Ir» y cada pieza en la que se choca", () => {
      const bad: string[] = [];
      for (const [a, b] of L.graph.links) {
        const p = byId.get(a)!;
        const q = byId.get(b)!;
        if (!a.startsWith("entrenamiento") || (p.lift && q.lift)) continue;
        const y = Math.min(p.y, q.y);
        for (const f of F.filter((g) => g.solid && g.kind !== "caja" && g.y < Math.max(p.y, q.y) + 1.7 && g.y + g.h > y + 0.15)) {
          const r = footprint(f);
          for (let t = 0; t <= 1; t += 0.05) {
            const x = p.x + (q.x - p.x) * t;
            const z = p.z + (q.z - p.z) * t;
            if (rectDist(x, z, r) < 0.5) {
              bad.push(`${a} → ${b}: ${f.name} a ${rectDist(x, z, r).toFixed(2)} m`);
              break;
            }
          }
        }
      }
      expect(bad).toEqual([]);
    });

    it("los sitios de los retos (puestos 1–4 y 7) y el paso de las entrenadoras no tienen muebles", () => {
      for (const post of STAGED_POSTS) {
        const s = stageFor(L, post)!;
        const spots = [...Object.values(s.her), s.trainer, ...Object.values(s.beside), ...s.trainerVia];
        for (const p of spots) for (const f of F.filter((g) => g.solid)) {
          const near = rectDist(p!.x, p!.z, footprint(f)) < 0.35 && f.y < p!.y + 1.6 && f.y + f.h > p!.y + 0.1;
          expect(near, `${post}: ${f.name} junto a (${p!.x.toFixed(1)}, ${p!.z.toFixed(1)})`).toBe(false);
        }
      }
    });

    it("todo compartimento se recorre: la sala de control de la NBL, la cámara hiperbárica, las consultas, la cabina, la plataforma, el embarcadero", () => {
      const bad: string[] = [];
      for (const c of L.walkChecks) {
        let b = placeAt(L.world, c.pts[0]!.x, c.pts[0]!.y, c.pts[0]!.z);
        if (!b) {
          bad.push(`${c.id}: no empieza en el suelo`);
          continue;
        }
        for (const q of c.pts.slice(1)) {
          b = walk(L.world, b, q);
          if (Math.hypot(b.x - q.x, b.z - q.z) > 0.3 || Math.abs(b.y - q.y) > 0.25) {
            bad.push(`${c.id}: se queda en (${b.x.toFixed(1)}, ${b.y.toFixed(2)}, ${b.z.toFixed(1)}) camino de (${q.x.toFixed(1)}, ${q.y}, ${q.z.toFixed(1)})`);
            break;
          }
        }
      }
      expect(L.walkChecks.length).toBeGreaterThanOrEqual(6);
      expect(bad).toEqual([]);
    });

    it("en cada puerta hay umbral: a pasitos de 2 cm (como anda el «Ir» a muchos fotogramas) no cae al mar bajo la isla", () => {
      const bad: string[] = [];
      for (const fuera of L.graph.points.filter((p) => /^entrenamiento:[a-z-]+:fuera$/.test(p.id))) {
        const dentro = byId.get(fuera.id.replace(/fuera$/, "dentro"));
        if (!dentro) continue;
        let b = placeAt(L.world, fuera.x, fuera.y, fuera.z)!;
        for (let i = 0; i < 2000 && Math.hypot(dentro.x - b.x, dentro.z - b.z) > 0.03; i++) {
          const dx = dentro.x - b.x;
          const dz = dentro.z - b.z;
          const s = Math.min(0.02, Math.hypot(dx, dz)) / Math.hypot(dx, dz);
          b = step(L.world, b, { dx: dx * s, dz: dz * s });
          if (b.motion !== "gravedad") {
            bad.push(`${fuera.id}: al agua en (${b.x.toFixed(2)}, ${b.z.toFixed(2)})`);
            break;
          }
        }
      }
      expect(bad).toEqual([]);
    });

    it("la sala de control de la NBL está en el piso alto, sobre la piscina, y se sube andando por su escalera", () => {
      const a = L.areas.find((q) => q.id === "entrenamiento:nbl-control")!;
      const pool = L.world.waters.find((w) => w.id === "nbl-piscina")!;
      expect(a.centre.y).toBeGreaterThan(4);
      expect(a.centre.z - a.half.z).toBeGreaterThan(pool.z1);
      const top = byId.get(a.point)!;
      expect(placeAt(L.world, top.x, top.y, top.z)?.area).toBe("entrenamiento:nbl-control");
      expect(F.some((f) => f.kind === "vidrio" && f.area === "entrenamiento:nbl" && f.y > 4)).toBe(true);
    });

    it("el control de misión tiene la trinchera más baja y las cuatro filas", () => {
      const ys = new Set(F.filter((f) => f.kind === "consola-fcr" && f.area === "entrenamiento:control").map((f) => f.y));
      expect([...ys].sort((a, b) => a - b)).toEqual([-0.6, -0.3, 0]);
      const plates = F.filter((f) => f.kind === "consola-fcr" && f.text).map((f) => f.text);
      expect(plates.sort()).toEqual(["CAPCOM", "FLIGHT"]);
    });

    it("el optotipo queda a 6,1 m (20 pies) de donde ella lee, a escala real", () => {
      if (k !== 1) return;
      const s = stageFor(L, 2)!;
      expect(Math.abs(s.her["tabla-vista"]!.z - s.anchors.pared!.z)).toBeCloseTo(6.1, 1);
    });

    it("el rendimiento: piezas sin texturas, en pocos materiales", () => {
      expect(F.length).toBeLessThan(2000);
      expect(F.filter((f) => f.plate).length).toBeLessThan(45);
    });
  });
}
