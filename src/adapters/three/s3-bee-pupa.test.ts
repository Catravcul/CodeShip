import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BEE_TOTAL_DAYS, CELL } from "@modules/aerial-sanctuary/domain/abeja";
import type { PupaPlan } from "@modules/aerial-sanctuary/data/pupa-abeja";
import { BeePupaView } from "./s3-bee-pupa";

/** Berón 2026-11-28: «empieza a crecer muchísimo con una forma rara saliendo de los límites del contenedor amarillo». */
describe("la abeja dibujada cabe en su celda en cada etapa", () => {
  const L = 40;
  const r = (CELL.width * L) / Math.sqrt(3);
  const plan: PupaPlan = { x: 10, z: -20, y0: 5, r, h: CELL.depth * L, beeLength: L, gallery: { x0: 0, x1: 1, z0: 0, z1: 1 }, galleryY: 5 };
  const view = new BeePupaView(plan);
  const M = new THREE.Matrix4();
  const c = new THREE.Vector3();

  it("ninguna caja (huevo, larva, prepupa, pupa, adulta) sale del tubo ni del fondo hasta que roe el opérculo", () => {
    for (let i = 0; i < 1000; i++) {
      const k = i / 1000;
      view.update(k, i * 0.37);
      expect(view.root.getObjectByName("pupa-abeja-abeja")).toBeDefined();
      const mesh = view.root.getObjectByName("pupa-abeja-abeja") as THREE.InstancedMesh;
      for (let j = 0; j < mesh.count; j++) {
        mesh.getMatrixAt(j, M);
        for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) {
          c.set(sx, sy, sz).applyMatrix4(M);
          // The cell stands upright: its axis is world y from y0; across, its inscribed circle (stricter than the hexagon).
          const across = Math.hypot(c.x - plan.x, c.z - plan.z) / L;
          const up = (c.y - plan.y0) / L;
          const at = `día ${(k * BEE_TOTAL_DAYS).toFixed(2)}, caja ${j}`;
          expect(across, at).toBeLessThanOrEqual(CELL.width / 2 + 1e-6);
          expect(up, at).toBeGreaterThanOrEqual(-1e-6);
          expect(up, at).toBeLessThanOrEqual(CELL.depth + 1e-6);
        }
      }
    }
  });
});
