import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PlacedFixture } from "@modules/aerial-sanctuary/data/fixtures";
import { REALITY_NAME } from "@core/reality";
import { textSign } from "./interior/sign";

/**
 * The training island's equipment, furniture and fixtures (data/fixtures.ts) as models at true size: each kind built
 * from boxes, cylinders and lathes in its own frame (base at y = 0, front towards +z), then turned and placed, and
 * all of them merged into one mesh per kind of material (the colours in the vertices), so the whole island costs about six
 * draw calls on a phone. The pieces with a
 * plate get a small label with their name and their label (real, en desarrollo, licencia).
 */

type Part = { g: THREE.BufferGeometry; m: string };

// Materials by kind: «c» matte, «m» metal, «e» lit (screens, lamps), «g» glass, «t» the lit ceiling, «d» two-sided.
// The colour of each piece goes in its vertices, so the whole island's equipment is one mesh per kind: a handful of
// draw calls however many colours there are.
const cache = new Map<string, THREE.Material>();
function material(kind: string): THREE.Material {
  const hit = cache.get(kind);
  if (hit) return hit;
  const vertexColors = true;
  let m: THREE.Material;
  if (kind === "m") m = new THREE.MeshStandardMaterial({ vertexColors, roughness: 0.4, metalness: 0.6 });
  else if (kind === "e" || kind === "t") m = new THREE.MeshBasicMaterial({ vertexColors });
  else if (kind === "g") m = new THREE.MeshStandardMaterial({ vertexColors, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  else if (kind === "d") m = new THREE.MeshStandardMaterial({ vertexColors, roughness: 0.8, side: THREE.DoubleSide });
  else m = new THREE.MeshStandardMaterial({ vertexColors, roughness: 0.8, metalness: 0.05 });
  cache.set(kind, m);
  return m;
}
/** The colour of a key, as the vertices carry it (the ceiling's light a little dimmer than a screen's). */
function keyColor(key: string): THREE.Color {
  const [kind, hex] = key.split(":") as [string, string];
  const c = new THREE.Color(parseInt(hex, 16));
  return kind === "t" ? c.multiplyScalar(0.85) : c;
}
const C = (c: number) => `c:${c.toString(16).padStart(6, "0")}`;
const Mt = (c: number) => `m:${c.toString(16).padStart(6, "0")}`;
const E = (c: number) => `e:${c.toString(16).padStart(6, "0")}`;
const GL = "g:9fd8ef";

/** A box by its centre and size. */
const B = (w: number, h: number, d: number, x: number, y: number, z: number, m: string): Part => {
  const g = new THREE.BoxGeometry(Math.max(0.005, w), Math.max(0.005, h), Math.max(0.005, d));
  g.translate(x, y, z);
  return { g, m };
};
/** A cylinder standing on (x, y0, z). */
const Cy = (r: number, h: number, x: number, y0: number, z: number, m: string, seg = 12, r2 = r): Part => {
  const g = new THREE.CylinderGeometry(r2, r, h, seg);
  g.translate(x, y0 + h / 2, z);
  return { g, m };
};
/** A cylinder lying along x (or z), its axis at height y. */
const CyX = (r: number, len: number, x: number, y: number, z: number, m: string, seg = 16, alongZ = false): Part => {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (alongZ) g.rotateX(Math.PI / 2);
  else g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return { g, m };
};

const WHITE = C(0xeef1f3);
const STEEL = Mt(0x9aa3ab);
const DARK = C(0x2b2f35);
const GREY = C(0x6f7780);
const SCREEN = E(0x2f88b0);
const SCREEN2 = E(0x3fae7a);
const AMBER = E(0xffb347);
const YELLOW = C(0xf2c200);
const ORANGE = C(0xf26a1b);
const RED = C(0xc0392b);
const BLUE = C(0x2f5f9f);
const WOOD = C(0x8a6a48);
const LAMP = E(0xfff6e0);

/** A chair: seat, back and legs (front +z). */
function chair(w: number, seatH: number, color: string, out: Part[], x = 0, z = 0): void {
  out.push(B(w * 0.9, 0.06, w * 0.9, x, seatH, z, color), B(w * 0.9, 0.5, 0.06, x, seatH + 0.28, z - w * 0.42, color));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) out.push(B(0.035, seatH, 0.035, x + sx! * w * 0.4, seatH / 2, z + sz! * w * 0.4, STEEL));
}

/** A monitor on a desk (front +z). */
const monitor = (x: number, y: number, z: number, w = 0.55, m = SCREEN): Part[] => [B(w, w * 0.62, 0.05, x, y + w * 0.31 + 0.1, z, DARK), B(w * 0.92, w * 0.55, 0.01, x, y + w * 0.31 + 0.1, z + 0.03, m), B(0.06, 0.1, 0.06, x, y + 0.05, z, DARK)];

/** The EMU on its stand: the white suit (legs, HUT with its backpack, arms, helmet with its gold visor) on a frame. */
function emuStand(f: PlacedFixture): Part[] {
  const p: Part[] = [];
  const s = WHITE;
  p.push(B(1.2, 0.08, 1.2, 0, 0.04, 0, YELLOW), Cy(0.06, 2.3, -0.5, 0, -0.5, STEEL, 8), Cy(0.06, 2.3, 0.5, 0, -0.5, STEEL, 8), B(1.1, 0.1, 0.1, 0, 2.25, -0.5, STEEL), B(0.1, 0.1, 0.5, 0, 2.2, -0.25, STEEL));
  for (const sx of [-0.13, 0.13]) p.push(Cy(0.11, 0.85, sx, 0.15, 0.05, s, 10), B(0.22, 0.1, 0.3, sx, 0.1, 0.1, C(0xdddddd)));
  p.push(B(0.5, 0.3, 0.35, 0, 1.1, 0.05, s), B(0.6, 0.6, 0.45, 0, 1.55, 0.05, s), B(0.55, 0.7, 0.3, 0, 1.55, -0.3, C(0xe3e3dc)));
  for (const sx of [-0.38, 0.38]) p.push(Cy(0.08, 0.6, sx, 1.15, 0.05, s, 8), B(0.12, 0.12, 0.12, sx, 1.1, 0.08, C(0xf2f2ee)));
  const helmet = new THREE.SphereGeometry(0.21, 14, 10);
  helmet.translate(0, 2.05, 0.08);
  p.push({ g: helmet, m: s });
  const visor = new THREE.SphereGeometry(0.2, 14, 10, -Math.PI / 2.5, (Math.PI * 2) / 2.5, Math.PI / 4, Math.PI / 2.4);
  visor.rotateY(Math.PI / 2);
  visor.translate(0, 2.05, 0.1);
  p.push({ g: visor, m: Mt(0xc9a43a) });
  p.push(B(0.18, 0.12, 0.05, 0, 1.55, 0.29, C(0x3a6ea5)));
  void f;
  return p;
}

/** A module of the ISS on the bottom: the cylinder, its end cones with the hatch and CBM rings, its cradle. */
function module(f: PlacedFixture, color = WHITE): Part[] {
  const r = f.h / 2;
  const p: Part[] = [CyX(r, f.w, 0, r + 0.1, 0, color, 20)];
  for (const s of [-1, 1]) p.push(CyX(r * 0.55, 0.25, s * (f.w / 2 + 0.12), r + 0.1, 0, STEEL, 16), CyX(r * 0.45, 0.06, s * (f.w / 2 + 0.26), r + 0.1, 0, DARK, 16));
  for (let i = 0; i < 4; i++) p.push(B(0.12, 0.12, f.d * 0.9, -f.w / 2 + 0.4 + (i * (f.w - 0.8)) / 3, r * 2 + 0.12, 0, YELLOW));
  for (const x of [-f.w / 3, f.w / 3]) p.push(B(0.3, 0.6, f.d * 0.8, x, 0.3, 0, STEEL));
  return p;
}

function fixtureParts(f: PlacedFixture): Part[] {
  const { w, d, h } = f;
  const p: Part[] = [];
  switch (f.kind) {
    case "caja":
      return [B(w, h, d, 0, h / 2, 0, C(f.color ?? 0xd9dde2))];
    case "vidrio": {
      p.push(B(w, h, d, 0, h / 2, 0, GL));
      const n = f.n ?? Math.max(1, Math.round(w / 1.5));
      for (let i = 0; i <= n; i++) p.push(B(0.06, h, d + 0.04, -w / 2 + (i * w) / n, h / 2, 0, GREY));
      p.push(B(w, 0.06, d + 0.04, 0, 0.03, 0, GREY), B(w, 0.06, d + 0.04, 0, h - 0.03, 0, GREY));
      return p;
    }
    case "pavimento":
      return [B(w, h, d, 0, h / 2, 0, C(f.color ?? 0x55595e))];
    case "taquillas": {
      const n = f.n ?? 1;
      const cw = w / n;
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + cw * (i + 0.5);
        p.push(B(cw - 0.02, h, d, x, h / 2, 0, i % 2 ? C(0x3f6f9f) : C(0x356391)));
        for (const y of [0.45, 1.35]) p.push(B(cw * 0.5, 0.02, 0.01, x, h * (y / 1.8), d / 2 + 0.005, DARK), B(0.03, 0.08, 0.02, x + cw * 0.3, h * (y / 1.8) - 0.12, d / 2 + 0.01, STEEL));
      }
      return p;
    }
    case "banco":
      p.push(B(w, 0.05, d, 0, h, 0, WOOD));
      for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) p.push(B(0.06, h, d * 0.8, x, h / 2, 0, STEEL));
      return p;
    case "silla":
      chair(w, 0.46, C(0x3a4a5a), p);
      return p;
    case "silla-alta":
      chair(w, 0.8, DARK, p);
      p.push(B(w * 0.8, 0.04, 0.05, 0, 0.35, w * 0.35, STEEL));
      return p;
    case "silla-fcr":
      p.push(Cy(0.03, 0.45, 0, 0, 0, STEEL, 6), B(0.55, 0.05, 0.08, 0, 0.03, 0, DARK), B(0.08, 0.05, 0.55, 0, 0.03, 0, DARK), B(0.52, 0.08, 0.5, 0, 0.48, 0, C(0x2c3e50)), B(0.5, 0.55, 0.08, 0, 0.8, -0.24, C(0x2c3e50)));
      return p;
    case "mesa":
      p.push(B(w, 0.04, d, 0, h - 0.02, 0, C(0xd7cbb4)));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(B(0.04, h - 0.04, 0.04, sx! * (w / 2 - 0.05), (h - 0.04) / 2, sz! * (d / 2 - 0.05), STEEL));
      if (h > 0.6) p.push(...monitor(0, h, -d * 0.2), B(0.45, 0.02, 0.15, 0, h + 0.01, d * 0.15, DARK));
      return p;
    case "archivador":
      p.push(B(w, h, d, 0, h / 2, 0, C(0x8d969e)));
      for (let i = 0; i < 4; i++) p.push(B(w * 0.85, 0.02, 0.01, 0, (h * (i + 0.5)) / 4, d / 2 + 0.005, DARK), B(0.12, 0.025, 0.02, 0, (h * (i + 0.5)) / 4 + 0.08, d / 2 + 0.01, STEEL));
      return p;
    case "estanteria": {
      for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) p.push(B(0.04, h, d, x, h / 2, 0, STEEL));
      const colors = [0x2f5f9f, 0xc0392b, 0xe6c229, 0x3a7d44, 0xeeeeee];
      for (let i = 0; i < 5; i++) {
        const y = 0.1 + (i * (h - 0.2)) / 4;
        p.push(B(w, 0.03, d, 0, y, 0, STEEL));
        if (i < 4) for (let j = 0; j < 4; j++) p.push(B(w / 5, 0.28, d * 0.7, -w / 2 + (w / 4) * (j + 0.5), y + 0.16, 0, C(colors[(i + j) % colors.length]!)));
      }
      return p;
    }
    case "mostrador":
      p.push(B(w, h, d, 0, h / 2, 0, C(0x8fa3b5)), B(w + 0.05, 0.04, d + 0.1, 0, h, 0.05, C(0xe8e2d6)), B(w * 0.8, 0.04, 0.4, 0, 0.75, -d / 2 - 0.15, C(0xe8e2d6)), ...monitor(0.4, 0.75, -d / 2 - 0.2, 0.5));
      return p;
    case "fuente":
      p.push(B(w, 0.5, d, 0, 0.75, 0, Mt(0xc8ced3)), B(0.1, 0.5, 0.1, 0, 0.25, -d / 2 + 0.06, STEEL), Cy(0.03, 0.08, 0.1, 1.0, 0.05, STEEL, 6));
      return p;
    case "lavabo":
      p.push(B(w, h - 0.05, d, 0, (h - 0.05) / 2, 0, C(0xf2efe8)), B(w, 0.05, d, 0, h - 0.025, 0, C(0xbfc5ca)), B(w * 0.5, 0.06, d * 0.5, 0, h - 0.01, 0.02, C(0xffffff)), Cy(0.015, 0.25, 0, h, -d / 2 + 0.06, STEEL, 6), B(w * 0.8, 0.6, 0.02, 0, h + 0.65, -d / 2 + 0.01, C(0xcfe3ee)));
      return p;
    case "armario":
      p.push(B(w, h, d, 0, h / 2, 0, C(0xe9ecee)), B(0.01, h * 0.95, 0.01, 0, h / 2, d / 2 + 0.005, GREY), B(0.03, 0.15, 0.03, -0.05, h * 0.55, d / 2 + 0.02, STEEL), B(0.03, 0.15, 0.03, 0.05, h * 0.55, d / 2 + 0.02, STEEL), B(w * 0.42, h * 0.4, 0.01, -w * 0.23, h * 0.75, d / 2 + 0.006, GL), B(w * 0.42, h * 0.4, 0.01, w * 0.23, h * 0.75, d / 2 + 0.006, GL));
      return p;
    case "camilla-exam":
      p.push(B(w, 0.25, d, 0, h - 0.17, 0, C(0x5b7f9b)), B(w * 0.9, 0.12, d * 0.3, 0, h + 0.0, -d * 0.33, C(0x5b7f9b)), B(w * 0.6, 0.005, d * 0.95, 0, h - 0.04, 0, C(0xffffff)), B(w * 0.8, h - 0.3, d * 0.6, 0, (h - 0.3) / 2, 0, C(0xd5dbe0)), CyX(0.07, w * 0.6, 0, h - 0.1, d / 2 + 0.05, C(0xffffff), 10));
      return p;
    case "ecg":
      p.push(B(w, 0.08, d, 0, 0.12, 0, GREY), Cy(0.03, 0.75, 0, 0.12, 0, STEEL, 6), B(w * 0.9, 0.12, d * 0.8, 0, 0.9, 0, C(0xe8ecef)), B(w * 0.8, 0.25, 0.04, 0, 1.06, -d * 0.15, DARK), B(w * 0.7, 0.2, 0.01, 0, 1.06, -d * 0.12, SCREEN2), B(0.3, 0.02, 0.2, 0, 0.97, d * 0.2, C(0xffffff)));
      for (const s of [-1, 1]) p.push(B(0.02, 0.5, 0.02, s * w * 0.4, 0.62, d * 0.4, C(0x3a6ea5)));
      return p;
    case "ecografo":
      p.push(B(w, 0.85, d * 0.7, 0, 0.45, 0, C(0xeef0f2)), B(w * 0.9, 0.06, d * 0.6, 0, 0.92, d * 0.1, C(0xd7dce0)), B(w * 0.7, 0.03, 0.25, 0, 0.96, d * 0.2, DARK), Cy(0.03, 0.3, 0, 0.92, -d * 0.2, STEEL, 6), ...monitor(0, 1.15, -d * 0.2, 0.5, E(0x9a9a9a)));
      for (const s of [-1, 0, 1]) p.push(B(0.04, 0.12, 0.04, s * 0.18, 0.98, d * 0.32, C(0x5b6670)));
      p.push(Cy(0.05, 0.08, -w / 2 + 0.08, 0, d * 0.3, DARK, 8), Cy(0.05, 0.08, w / 2 - 0.08, 0, -d * 0.3, DARK, 8));
      return p;
    case "audiometro":
      p.push(B(w, 0.04, d, 0, 0.73, 0, C(0xd7cbb4)), B(w * 0.95, 0.7, 0.04, 0, 0.36, -d / 2 + 0.03, C(0xbfb39b)), B(0.4, 0.09, 0.28, -0.2, 0.8, 0, C(0xe9e6df)), B(0.32, 0.04, 0.01, -0.2, 0.82, 0.14, SCREEN2), ...monitor(0.3, 0.75, -0.1, 0.45));
      p.push({ g: new THREE.TorusGeometry(0.09, 0.012, 6, 14, Math.PI).translate(0.25, 0.85, 0.15), m: DARK });
      return p;
    case "monitor-carro":
      p.push(B(w, 0.06, d, 0, 0.2, 0, GREY), B(w, 0.06, d, 0, 0.9, 0, GREY), Cy(0.03, 1.2, -w / 2 + 0.05, 0.2, 0, STEEL, 6), Cy(0.03, 1.2, w / 2 - 0.05, 0.2, 0, STEEL, 6));
      for (const x of [-0.29, 0.29]) p.push(...monitor(x, 1.2, 0, 0.55));
      for (const s of [-1, 1]) for (const t of [-1, 1]) p.push(Cy(0.05, 0.1, s * (w / 2 - 0.08), 0.0, t * (d / 2 - 0.08), DARK, 8));
      p.push(B(0.5, 0.15, 0.4, 0, 1.0, 0, DARK));
      return p;
    case "soporte-emu":
      return emuStand(f);
    case "carro-traje":
      p.push(B(w, 0.05, d, 0, 0.3, 0, STEEL), B(w, 0.05, d, 0, 0.85, 0, STEEL));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(B(0.03, 0.85, 0.03, sx! * (w / 2 - 0.03), 0.43, sz! * (d / 2 - 0.03), STEEL));
      p.push(B(0.35, 0.2, 0.25, -0.25, 0.97, 0, WHITE), B(0.18, 0.12, 0.25, 0.15, 0.94, 0.05, C(0xdcdcdc)), B(0.18, 0.12, 0.25, 0.35, 0.94, -0.05, C(0xdcdcdc)), B(0.4, 0.2, 0.3, 0, 0.42, 0, WHITE));
      return p;
    case "consola-ecs":
      p.push(B(w, h, d, 0, h / 2, 0, C(0x7a8794)), B(w * 0.9, 0.5, 0.02, 0, 1.0, d / 2 + 0.01, DARK));
      for (let i = 0; i < 6; i++) p.push(Cy(0.04, 0.03, -w * 0.35 + i * w * 0.14, 1.0, d / 2 + 0.03, i % 2 ? AMBER : SCREEN2, 8));
      for (let i = 0; i < 3; i++) p.push(B(0.1, 0.1, 0.08, -0.4 + i * 0.4, 0.5, d / 2 + 0.04, YELLOW), B(0.05, 0.5, 0.05, -0.4 + i * 0.4, 0.25, d / 2 + 0.1, C(0x2f6f3f)));
      return p;
    case "botellas": {
      p.push(B(w, 0.05, d, 0, 0.02, 0, STEEL), B(w, 0.05, 0.05, 0, 1.1, -d / 2 + 0.05, STEEL));
      const n = Math.max(2, Math.floor(w / 0.22));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (w / n) * (i + 0.5);
        p.push(Cy(0.09, 0.68, x, 0.05, 0, i % 3 === 0 ? C(0xe8c12a) : C(0xd9d9d9), 10), Cy(0.03, 0.12, x, 0.73, 0, STEEL, 6));
      }
      return p;
    }
    case "puesto-buzos":
      p.push(B(w, 0.05, d, 0, 0.88, 0, C(0x7a8794)));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(B(0.05, 0.86, 0.05, sx! * (w / 2 - 0.05), 0.43, sz! * (d / 2 - 0.05), STEEL));
      p.push(B(0.5, 0.25, 0.35, -0.5, 1.03, -0.1, YELLOW), B(0.2, 0.1, 0.01, -0.5, 1.05, 0.08, SCREEN2), ...monitor(0.35, 0.9, -0.15, 0.5), B(0.25, 0.15, 0.2, 0.0, 0.98, 0.15, DARK));
      for (let i = 0; i < 3; i++) p.push({ g: new THREE.TorusGeometry(0.2, 0.025, 6, 14).rotateX(Math.PI / 2).translate(-0.6 + i * 0.6, 0.5, 0), m: i % 2 ? YELLOW : C(0x2f6f3f) });
      return p;
    case "camaras-buceo":
      p.push(B(w, 0.05, d, 0, 0.88, 0, C(0x7a8794)));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(B(0.05, 0.86, 0.05, sx! * (w / 2 - 0.05), 0.43, sz! * (d / 2 - 0.05), STEEL));
      for (let i = 0; i < 3; i++) p.push(B(0.3, 0.22, 0.3, -0.5 + i * 0.5, 1.02, 0, C(0x1f2f3f)), CyX(0.08, 0.12, -0.5 + i * 0.5, 1.02, 0.2, C(0x5f7f9f), 10, true), B(0.04, 0.04, 0.35, -0.5 + i * 0.5 - 0.15, 1.15, 0, AMBER));
      return p;
    case "grua-pluma": {
      p.push(Cy(0.3, 0.3, 0, 0, 0, C(0x8c949b), 12), Cy(0.18, h, 0, 0, 0, YELLOW, 12), B(0.5, 0.5, 0.5, 0, h, 0, YELLOW));
      const len = 5;
      p.push(B(0.28, 0.4, len, 0, h - 0.2, len / 2, YELLOW), B(0.04, 0.04, 2.2, 0, h - 1.3, len * 0.55 + 0.2, C(0xbbbbbb)));
      const brace = new THREE.BoxGeometry(0.1, 0.1, 2.4);
      brace.rotateX(Math.PI / 4.5);
      brace.translate(0, h - 1.1, 0.9);
      p.push({ g: brace, m: YELLOW });
      p.push(B(0.35, 0.3, 0.45, 0, h - 0.55, len - 0.4, C(0x555555)), Cy(0.012, 2.5, 0, h - 3.2, len - 0.4, DARK, 4), B(0.2, 0.25, 0.15, 0, h - 3.35, len - 0.4, RED));
      return p;
    }
    case "grua-puente": {
      // The girder spans the room along its own z (d); the trolley with its hoist and hook.
      p.push(B(0.5, h, d, -0.35, h / 2, 0, YELLOW), B(0.5, h, d, 0.35, h / 2, 0, YELLOW));
      for (const s of [-1, 1]) p.push(B(1.3, 0.7, 1.0, 0, 0.35, s * (d / 2 - 0.5), C(0xd9a400)));
      p.push(B(1.4, 0.7, 1.6, 0, h + 0.35, -d * 0.15, C(0x555a60)), Cy(0.02, 4.5, 0.25, -4.5, -d * 0.15, DARK, 4), Cy(0.02, 4.5, -0.25, -4.5, -d * 0.15, DARK, 4), B(0.5, 0.45, 0.3, 0, -4.7, -d * 0.15, RED));
      return p;
    }
    case "carril-grua":
      return [B(w, h, d, 0, h / 2, 0, C(0x6c737a)), B(w, 0.06, d * 0.3, 0, h + 0.03, 0, STEEL)];
    case "hiperbarica": {
      // A double-lock chamber (dark-grey steel), its round door at −x open, view ports, valves and the control panel.
      const r = h / 2;
      const shell = new THREE.CylinderGeometry(r, r, w, 28, 1, true);
      shell.rotateZ(Math.PI / 2);
      shell.translate(0, r, 0);
      p.push({ g: shell, m: "d:5a6470" });
      const cap = new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      cap.scale(0.35, 1, 1);
      cap.rotateZ(-Math.PI / 2);
      cap.translate(w / 2, r, 0);
      p.push({ g: cap, m: "d:5a6470" });
      // The near end: a ring round the doorway and the door swung open.
      for (const [zz, ww] of [[-0.9, 0.8], [0.9, 0.8]] as const) p.push(B(0.12, h, ww, -w / 2 + 0.06, r, zz, C(0x5a6470)));
      p.push(B(0.12, h - 2.45, 1.0, -w / 2 + 0.06, 2.45 + (h - 2.45) / 2, 0, C(0x5a6470)), B(0.12, 1.9, 0.9, -w / 2 - 0.45, 1.2, -0.95, C(0x4d5560)));
      for (const x of [-w / 2 + 1.2, -w / 2 + 3.6, w / 2 - 1.5]) for (const s of [-1, 1]) p.push(CyX(0.12, 0.1, x, r + 0.5, s * (r - 0.02), GL, 12, true), CyX(0.16, 0.06, x, r + 0.5, s * (r + 0.01), STEEL, 12, true));
      p.push(B(w - 0.6, 0.06, 1.2, 0.15, 0.5, 0, C(0x8c949b)));
      for (const s of [-1, 1]) p.push(B(w - 1.0, 0.08, 0.38, 0.3, 0.9, s * 0.95, C(0x30506f)));
      for (const s of [-1, 1]) p.push(B(0.06, 2.2, 0.3, -w / 2 + 2.4, 1.3, s * 0.6, "d:4d5560"));
      p.push(B(0.06, h - 2.45, 0.9, -w / 2 + 2.4, 2.45 + (h - 2.45) / 2, 0, "d:4d5560"));
      for (const x of [-2, 0, 2]) p.push(B(0.5, 0.35, 0.35, x, 0.17, 0, C(0x3a3f45)));
      p.push(Cy(0.05, 0.6, -1, h - 0.1, 0, STEEL, 8), Cy(0.08, 0.06, -1, h + 0.5, 0, RED, 10), Cy(0.05, 0.6, 1.5, h - 0.1, 0, STEEL, 8));
      return p;
    }
    case "maqueta-modulo":
      return module(f);
    case "maqueta-viga": {
      const s = w;
      for (const [y, z] of [[0.1, -d / 2], [0.1, d / 2], [h, -d / 2], [h, d / 2]]) p.push(B(s, 0.15, 0.15, 0, y!, z!, C(0xd6d3c8)));
      for (let i = 0; i <= 7; i++) {
        const x = -s / 2 + (i * s) / 7;
        p.push(B(0.12, h, 0.12, x, h / 2, -d / 2, C(0xd6d3c8)), B(0.12, h, 0.12, x, h / 2, d / 2, C(0xd6d3c8)), B(0.12, 0.12, d, x, h, 0, C(0xd6d3c8)));
      }
      p.push(B(s * 0.9, 0.2, 0.6, 0, h + 0.05, 0, YELLOW));
      return p;
    }
    case "maqueta-dragon": {
      const r = w / 2;
      const body = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, 0.5), new THREE.Vector2(r * 0.62, h - 0.6), new THREE.Vector2(r * 0.45, h - 0.3), new THREE.Vector2(0, h)], 24);
      p.push({ g: body, m: WHITE }, B(0.9, 1.0, 0.1, 0, 2.2, r * 0.82, DARK), B(0.4, 0.3, 0.05, 0.9, 2.6, r * 0.75, GL));
      return p;
    }
    case "maqueta-cygnus":
      p.push(CyX(h / 2, w * 0.8, -w * 0.1, h / 2 + 0.1, 0, C(0xd9d9cf), 18), CyX(h / 2 * 0.95, w * 0.2, w * 0.4, h / 2 + 0.1, 0, C(0xc8a55a), 18));
      for (const s of [-1, 1]) p.push(B(0.05, 0.05, 1.2, w * 0.4, h / 2 + 0.1, s * (h / 2 + 0.6), STEEL), CyX(1.0, 0.03, w * 0.4, h / 2 + 0.1, s * (h / 2 + 1.6), C(0x1d3b7a), 12));
      p.push(CyX(0.7, 0.2, -w / 2 - 0.05, h / 2 + 0.1, 0, STEEL, 14));
      return p;
    case "luz-techo":
      return [B(w, h, d, 0, h / 2, 0, LAMP), B(w + 0.04, 0.02, d + 0.04, 0, h, 0, GREY)];
    case "barandilla": {
      const L = Math.max(w, d);
      const alongX = w >= d;
      p.push(alongX ? B(L, 0.05, 0.05, 0, h, 0, STEEL) : B(0.05, 0.05, L, 0, h, 0, STEEL), alongX ? B(L, 0.03, 0.03, 0, h * 0.5, 0, STEEL) : B(0.03, 0.03, L, 0, h * 0.5, 0, STEEL));
      const n = Math.max(1, Math.round(L / 1.2));
      for (let i = 0; i <= n; i++) {
        const t = -L / 2 + (i * L) / n;
        p.push(alongX ? B(0.04, h, 0.04, t, h / 2, 0, STEEL) : B(0.04, h, 0.04, 0, h / 2, t, STEEL));
      }
      return p;
    }
    case "consola-fcr": {
      // A console of the Mission Control: the desk, its sloped panel with three screens, the keyboard shelf, the loop's headset.
      p.push(B(w, 0.72, d * 0.7, 0, 0.36, -d * 0.15, C(0x5d6b78)), B(w, 0.04, d, 0, 0.74, 0, C(0x9aa7b3)), B(w, 0.55, 0.3, 0, 1.0, -d / 2 + 0.15, C(0x4b5763)));
      const n = w > 2 ? 3 : 2;
      for (let i = 0; i < n; i++) p.push(...monitor(-w / 2 + (w / n) * (i + 0.5), 0.76, -d * 0.18, Math.min(0.55, w / n - 0.12), i === 1 ? SCREEN2 : SCREEN));
      p.push(B(w * 0.6, 0.02, 0.18, 0, 0.77, d * 0.28, DARK));
      for (let i = 0; i < 8; i++) p.push(B(0.05, 0.02, 0.05, -w * 0.4 + i * w * 0.11, 0.77, d * 0.08, i % 3 ? C(0xe8e8e8) : AMBER));
      p.push({ g: new THREE.TorusGeometry(0.08, 0.012, 6, 12, Math.PI).translate(w * 0.38, 0.85, d * 0.2), m: DARK });
      return p;
    }
    case "pantallas-frente": {
      // Five big screens across (rear projection), nine small ones above (clocks and numbers), on a dark wall.
      const big = f.n ?? 5;
      const L = Math.max(w, d);
      p.push(B(L, h, 0.12, 0, h / 2, -0.06, C(0x1d232a)));
      const bw = L / big;
      const bigH = h * 0.62;
      const imgs = [E(0x2f6fa8), E(0x3a8f6a), E(0x1f4f8f), E(0x3a8f6a), E(0x2f6fa8)];
      for (let i = 0; i < big; i++) {
        const x = -L / 2 + bw * (i + 0.5);
        p.push(B(bw - 0.25, bigH, 0.02, x, bigH / 2 + 0.05, 0.01, imgs[i % imgs.length]!));
        // A plot on each: the world map's tracks or the trajectories.
        p.push(B(bw * 0.6, 0.03, 0.01, x, bigH * 0.45, 0.025, E(0xe8f0a0)), B(0.03, bigH * 0.5, 0.01, x - bw * 0.2, bigH * 0.5, 0.025, E(0xe8f0a0)));
      }
      const small = big === 5 ? 9 : 0;
      for (let i = 0; i < small; i++) p.push(B(L / small - 0.3, h * 0.2, 0.02, -L / 2 + (L / small) * (i + 0.5), bigH + 0.2 + h * 0.1, 0.01, i % 2 ? E(0xff6a3a) : E(0x3aff8a)));
      if (big !== 5) for (let i = 0; i < big; i++) p.push(B(L / big - 0.2, h * 0.8, 0.02, -L / 2 + (L / big) * (i + 0.5), h / 2, 0.01, SCREEN));
      return p;
    }
    case "consola-camara":
      // The chamber's operators' panel: gauges (altimeter, rate of climb), switches, the intercom and the red dump lever.
      p.push(B(w, 0.9, d, 0, 0.45, 0, C(0x7a8794)), B(w, 0.5, 0.15, 0, 1.15, -d / 2 + 0.1, C(0x5d6b78)));
      for (let i = 0; i < 5; i++) p.push(CyX(0.1, 0.03, -w * 0.4 + i * w * 0.2, 1.17, -d / 2 + 0.19, C(0xf5f5f0), 16, true), CyX(0.105, 0.02, -w * 0.4 + i * w * 0.2, 1.17, -d / 2 + 0.18, DARK, 16, true));
      for (let i = 0; i < 8; i++) p.push(B(0.04, 0.03, 0.06, -w * 0.4 + i * w * 0.11, 0.92, 0.0, i % 2 ? AMBER : SCREEN2));
      p.push(B(0.06, 0.4, 0.06, w * 0.3, 0.55, d / 2 + 0.05, RED), B(0.12, 0.08, 0.12, w * 0.3, 0.78, d / 2 + 0.05, RED), ...monitor(-w * 0.3, 0.9, 0.05, 0.45));
      return p;
    case "asiento-camara":
      // A seat with its O₂ panel on the wall behind (three mask connectors) and the mask on its hose.
      chair(w, 0.45, C(0x3b4e63), p);
      p.push(B(w * 0.85, 0.35, 0.06, 0, 1.25, -d / 2 + 0.03, C(0xc8d0d6)));
      for (let i = 0; i < 3; i++) p.push(Cy(0.025, 0.04, -0.15 + i * 0.15, 1.22, -d / 2 + 0.07, i === 1 ? C(0x2f8f4f) : STEEL, 8));
      p.push(B(0.03, 0.4, 0.03, 0.15, 0.95, -d / 2 + 0.1, C(0x2f8f4f)), B(0.12, 0.1, 0.07, 0.15, 0.72, -d / 2 + 0.12, C(0x6fbf8f)));
      return p;
    case "cinta":
      p.push(B(w, 0.2, d, 0, 0.1, 0, DARK), B(w * 0.8, 0.02, d * 0.85, 0, 0.21, -0.05, C(0x1a1a1a)));
      for (const s of [-1, 1]) p.push(B(0.06, 1.25, 0.06, s * (w / 2 - 0.05), 0.82, d / 2 - 0.15, GREY), B(0.05, 0.05, 0.6, s * (w / 2 - 0.05), 1.05, d / 2 - 0.45, GREY));
      p.push(B(w, 0.25, 0.18, 0, 1.35, d / 2 - 0.15, GREY), B(w * 0.6, 0.15, 0.01, 0, 1.38, d / 2 - 0.25, SCREEN));
      return p;
    case "bici":
      p.push(B(0.12, 0.12, d, 0, 0.06, 0, DARK), B(0.5, 0.06, 0.12, 0, 0.06, d / 2 - 0.1, DARK), B(0.5, 0.06, 0.12, 0, 0.06, -d / 2 + 0.1, DARK), CyX(0.25, 0.08, 0, 0.35, d * 0.25, GREY, 16), B(0.08, 0.7, 0.08, 0, 0.55, -d * 0.2, GREY), B(0.25, 0.06, 0.32, 0, 0.92, -d * 0.2, DARK), B(0.08, 0.9, 0.08, 0, 0.75, d * 0.35, GREY), B(0.5, 0.04, 0.04, 0, 1.2, d * 0.35, DARK), B(0.22, 0.14, 0.04, 0, 1.25, d * 0.33, SCREEN));
      return p;
    case "jaula":
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(B(0.08, h, 0.08, sx! * (w / 2 - 0.04), h / 2, sz! * (d / 2 - 0.04), C(0x2b2f35)));
      for (const sx of [-1, 1]) p.push(B(0.06, 0.06, d, sx * (w / 2 - 0.04), h - 0.03, 0, C(0x2b2f35)), B(0.06, 0.06, d, sx * (w / 2 - 0.04), 0.03, 0, C(0x2b2f35)));
      p.push(B(w, 0.06, 0.06, 0, h - 0.03, -d / 2 + 0.04, C(0x2b2f35)), CyX(0.015, 2.2, 0, 1.4, 0, STEEL, 8));
      for (const s of [-1, 1]) for (const r of [0.22, 0.17]) p.push(CyX(r, 0.05, s * (0.85 - (0.22 - r) * 1.5), 1.4, 0, s > 0 ? RED : BLUE, 18));
      p.push(B(w * 0.95, 0.04, d * 0.95, 0, 0.02, 0, WOOD));
      return p;
    case "mancuernas":
      p.push(B(w, 0.05, d, 0, 0.45, 0.05, DARK), B(w, 0.05, d, 0, 0.8, -0.05, DARK));
      for (const s of [-1, 1]) p.push(B(0.05, 0.8, d, s * (w / 2 - 0.03), 0.4, 0, DARK));
      for (let i = 0; i < 8; i++) for (const y of [0.52, 0.87]) p.push(CyX(0.05 + (i % 4) * 0.008, 0.28, -w / 2 + 0.15 + i * (w - 0.3) / 7, y, 0, C(0x3a3a3a), 10, true));
      return p;
    case "banco-pesas":
      p.push(B(w * 0.6, 0.1, d, 0, h - 0.05, 0, C(0x8b1e2d)), B(0.08, h - 0.1, 0.08, 0, (h - 0.1) / 2, -d * 0.35, STEEL), B(0.08, h - 0.1, 0.08, 0, (h - 0.1) / 2, d * 0.35, STEEL), B(w, 0.05, 0.08, 0, 0.03, -d * 0.4, STEEL), B(w, 0.05, 0.08, 0, 0.03, d * 0.4, STEEL));
      return p;
    case "remo":
      p.push(B(0.12, 0.08, d, 0, 0.3, 0, C(0x30343a)), B(0.4, 0.06, 0.3, 0, 0.36, -0.1, DARK), CyX(0.25, 0.25, 0, 0.45, d / 2 - 0.3, C(0x3a3a3a), 16, false), B(0.5, 0.04, 0.04, 0, 0.6, d / 2 - 0.6, DARK), B(0.2, 0.12, 0.04, 0, 0.85, d / 2 - 0.2, SCREEN));
      for (const s of [-1, 1]) p.push(B(0.12, 0.02, 0.25, s * 0.15, 0.36, d / 2 - 0.8, DARK));
      return p;
    case "polea":
      for (const s of [-1, 1]) p.push(B(0.08, h, 0.08, s * (w / 2 - 0.04), h / 2, -d / 2 + 0.1, C(0x2b2f35)), B(0.25, 1.0, 0.15, s * (w / 2 - 0.2), 0.6, -d / 2 + 0.15, C(0x3a3a3a)));
      p.push(B(w, 0.08, 0.08, 0, h - 0.04, -d / 2 + 0.1, C(0x2b2f35)), B(w, 0.06, d, 0, 0.03, 0, C(0x2b2f35)), Cy(0.008, h - 0.3, -0.3, 0.2, 0, DARK, 4), Cy(0.008, h - 0.3, 0.3, 0.2, 0, DARK, 4), B(0.6, 0.04, 0.04, 0, 1.1, 0.1, DARK));
      return p;
    case "ared":
      // The ARED as the ISS has it (the ground trainer): its platform, the two vacuum cylinders and the bar arm.
      p.push(B(w, 0.15, d, 0, 0.08, 0, C(0xcfd3d6)), B(w * 0.8, 0.04, d * 0.5, 0, 0.17, -0.2, C(0x6f7a84)));
      for (const s of [-1, 1]) p.push(Cy(0.15, 1.3, s * (w / 2 - 0.25), 0.15, d / 2 - 0.35, C(0xdfe3e6), 14), B(0.1, h - 0.2, 0.1, s * (w / 2 - 0.15), (h - 0.2) / 2 + 0.15, -d / 2 + 0.25, STEEL));
      p.push(B(w - 0.3, 0.12, 0.12, 0, h, -d / 2 + 0.25, STEEL), B(0.12, 0.12, d * 0.75, 0, 1.6, -0.05, C(0x8a939b)), CyX(0.02, w * 0.9, 0, 1.5, -0.3, STEEL, 8), B(0.5, 0.4, 0.3, 0, 0.35, d / 2 - 0.35, C(0x6f7a84)));
      return p;
    case "espejo":
      return [B(w, h, d, 0, h / 2, 0, Mt(0xdfe8ee)), B(w + 0.06, 0.04, d + 0.01, 0, h, 0, GREY)];
    case "mets": {
      // The cabin with its four exits cut out and its seats, hung from the gantry's beam by its cables; the gantry posts are in the layout.
      p.push(B(w, h, d, 0, h / 2, 0, C(0xe4e4dc)), B(w + 0.02, 0.2, d + 0.02, 0, h * 0.6, 0, ORANGE));
      for (const s of [-1, 1]) for (const z of [-0.8, 0.8]) p.push(B(0.03, 0.65, 0.6, s * (w / 2 + 0.01), 1.1, z, DARK));
      const half = f.n ?? 7;
      p.push(B(0.5, 0.5, half * 2 + 0.5, 0, 7.75, 0, C(0xd8b02a)), B(0.8, 0.6, 1.0, 0, 7.2, 0, C(0x555a60)));
      for (const z of [-d / 2 + 0.2, d / 2 - 0.2]) p.push(Cy(0.02, 7.2 - h, 0, h, z, DARK, 4));
      return p;
    }
    case "balsa": {
      const ring = new THREE.TorusGeometry(w / 2 - 0.2, 0.2, 8, 22);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, 0.25, 0);
      p.push({ g: ring, m: ORANGE }, Cy(w / 2 - 0.2, 0.05, 0, 0.08, 0, ORANGE, 20));
      const canopy = new THREE.SphereGeometry(w / 2 - 0.25, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2.6);
      canopy.scale(1, 0.6, 1);
      canopy.translate(0, 0.35, 0);
      p.push({ g: canopy, m: "d:e8611a" });
      return p;
    }
    case "izado": {
      // The hoist's rail across the pool, its trolley, the cable down and the horse-collar on it.
      p.push(B(0.3, 0.3, d, 0, 0, 0, C(0x8a8f96)), B(0.6, 0.5, 0.8, 0, -0.4, 0, C(0x555a60)), Cy(0.012, 5.5, 0, -6.15, 0, DARK, 4));
      const collar = new THREE.TorusGeometry(0.3, 0.07, 8, 16);
      collar.translate(0, -6.4, 0);
      p.push({ g: collar, m: ORANGE });
      return p;
    }
    case "silla-socorrista":
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(B(0.06, 1.4, 0.06, sx! * 0.38, 0.7, sz! * 0.38, WHITE));
      p.push(B(0.6, 0.06, 0.5, 0, 1.4, 0, WHITE), B(0.6, 0.6, 0.06, 0, 1.7, -0.25, WHITE), B(0.5, 0.04, 0.3, 0, 0.6, 0.38, WHITE), B(0.5, 0.04, 0.3, 0, 1.0, 0.38, WHITE), Cy(0.03, 0.8, 0.35, 1.4, -0.3, RED, 6));
      return p;
    case "escalerilla":
      for (const s of [-1, 1]) p.push(B(0.04, 1.6, 0.04, s * 0.25, -0.2, 0, STEEL));
      for (const s of [-1, 1]) p.push({ g: new THREE.TorusGeometry(0.2, 0.02, 6, 10, Math.PI).rotateY(Math.PI / 2).translate(s * 0.25, 0.6, -0.2), m: STEEL });
      for (let i = 0; i < 3; i++) p.push(B(0.5, 0.03, 0.08, 0, -0.8 + i * 0.35, 0.02, STEEL));
      return p;
    case "chalecos":
      p.push(B(w, 0.05, 0.05, 0, h - 0.1, -d / 2 + 0.1, STEEL), B(0.05, h, 0.05, -w / 2, h / 2, -d / 2 + 0.1, STEEL), B(0.05, h, 0.05, w / 2, h / 2, -d / 2 + 0.1, STEEL));
      for (let i = 0; i < 5; i++) p.push(B(0.25, 0.55, 0.15, -w / 2 + 0.2 + i * (w - 0.4) / 4, h - 0.5, 0, i % 2 ? ORANGE : YELLOW), Cy(0.13, 0.12, -w / 2 + 0.2 + i * (w - 0.4) / 4, 0.35, 0.05, WHITE, 10));
      p.push(B(w, 0.04, d, 0, 0.3, 0, STEEL));
      return p;
    case "luz-pista":
      return [Cy(0.1, 0.06, 0, 0, 0, STEEL, 8), Cy(0.07, 0.08, 0, 0.05, 0, E(0x2fff6a), 8)];
    case "manga": {
      p.push(Cy(0.08, h, 0, 0, 0, C(0xe8e8e8), 8), Cy(0.3, 0.2, 0, 0, 0, C(0x8a8a84), 10));
      const sock = new THREE.CylinderGeometry(0.18, 0.45, 2.4, 12, 1, true);
      sock.rotateZ(Math.PI / 2);
      sock.translate(1.3, h - 0.3, 0);
      p.push({ g: sock, m: "d:f26a1b" }, Cy(0.05, 0.12, 0, h, 0, E(0xffffff), 6));
      for (const x of [0.6, 1.4]) p.push(CyX(0.42 - (x - 0.2) * 0.12, 0.25, x, h - 0.3, 0, WHITE, 12));
      return p;
    }
    case "foco":
      p.push(Cy(0.08, h, 0, 0, 0, C(0x9aa3ab), 8), B(0.5, 0.3, 0.3, 0, h, 0.1, GREY), B(0.4, 0.2, 0.02, 0, h, 0.26, LAMP));
      return p;
    case "surtidor":
      p.push(B(w, 0.15, d, 0, 0.07, 0, C(0x8a8a84)), B(w * 0.8, h - 0.15, d * 0.7, 0, (h - 0.15) / 2 + 0.15, 0, RED), B(w * 0.5, 0.25, 0.02, 0, 1.4, d * 0.36, E(0xdadada)), CyX(0.2, 0.3, 0, 0.9, d * 0.4, DARK, 14, true), B(0.06, 0.06, 0.4, 0.4, 0.9, d * 0.5, DARK));
      return p;
    case "extintor":
      p.push(Cy(0.1, 0.65, 0, 0.1, 0, RED, 10), B(0.25, 0.1, 0.25, 0, 0.05, 0, C(0x8a8a84)), B(0.1, 0.08, 0.05, 0, 0.8, 0, DARK));
      return p;
    case "rotulo-suelo":
      return [];
    case "farola":
      p.push(Cy(0.09, h, 0, 0, 0, C(0x5b6168), 8), B(0.08, 0.08, 1.2, 0, h - 0.05, 0.55, C(0x5b6168)), B(0.35, 0.12, 0.5, 0, h - 0.12, 1.1, GREY), B(0.3, 0.02, 0.42, 0, h - 0.19, 1.1, LAMP));
      return p;
    case "poste-senal":
      p.push(Cy(0.06, h, 0, 0, 0, C(0x5b6168), 8));
      for (let i = 0; i < 3; i++) p.push(B(1.4, 0.28, 0.04, 0.5 * (i % 2 ? -1 : 1), h - 0.3 - i * 0.4, 0, C(0x1f5f3f)));
      return p;
    case "tussac": {
      const g = new THREE.ConeGeometry(w / 2, h, 6, 1, true);
      g.translate(0, h / 2, 0);
      const g2 = new THREE.ConeGeometry(w / 3, h * 0.8, 5);
      g2.translate(w * 0.25, h * 0.4, -w * 0.1);
      const base = new THREE.CylinderGeometry(w * 0.35, w * 0.45, 0.35, 6);
      base.translate(0, 0.17, 0);
      return [{ g: base, m: C(0x6b5d3f) }, { g, m: "d:8e9a52" }, { g: g2, m: C(0x7d8a45) }];
    }
    case "banco-exterior":
      p.push(B(w, 0.06, 0.45, 0, 0.45, 0, WOOD), B(w, 0.35, 0.05, 0, 0.7, -0.22, WOOD));
      for (const s of [-1, 1]) p.push(B(0.06, 0.45, 0.5, s * (w / 2 - 0.15), 0.22, 0, DARK));
      return p;
    case "papelera":
      return [Cy(0.2, 0.85, 0, 0, 0, C(0x3a5a3a), 10), Cy(0.22, 0.05, 0, 0.85, 0, DARK, 10)];
    case "noray":
      return [Cy(0.15, h, 0, 0, 0, C(0x2b2f35), 10, 0.12), Cy(0.2, 0.06, 0, h, 0, C(0x2b2f35), 10)];
    case "salvavidas": {
      const ring = new THREE.TorusGeometry(0.3, 0.07, 8, 16);
      ring.translate(0, 1.15, 0.05);
      return [B(0.06, h, 0.06, 0, h / 2, -0.03, C(0x5b6168)), { g: ring, m: ORANGE }];
    }
    case "pilote":
      return [Cy(0.2, h, 0, 0, 0, C(0x4a3f33), 8)];
    case "rack-ispr":
      // An ISPR rack trainer: its face with the drawers, switches and a laptop.
      p.push(B(w, h, d, 0, h / 2, 0, C(0xe4e6e2)), B(w * 0.9, h * 0.9, 0.02, 0, h / 2, d / 2 + 0.01, C(0xcfd3cf)));
      for (let i = 0; i < 5; i++) p.push(B(w * 0.8, 0.02, 0.02, 0, 0.2 + i * 0.35, d / 2 + 0.03, GREY));
      p.push(B(0.35, 0.02, 0.25, 0, 1.2, d / 2 + 0.12, DARK), B(0.33, 0.22, 0.01, 0, 1.31, d / 2 + 0.02, SCREEN), B(0.6, 0.06, 0.04, 0, 1.9, d / 2 + 0.03, C(0x3a6ea5)));
      return p;
    case "trineo":
      p.push(B(w, 0.12, d, 0, 0.1, 0, C(0x8a939b)));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(Cy(0.12, 0.05, sx! * (w / 2 - 0.2), 0, sz! * (d / 2 - 0.2), DARK, 10));
      p.push(Cy(0.18, 0.7, -0.4, 0.16, 0, C(0x2f6f9f), 10), B(0.8, 0.5, 0.6, 0.3, 0.42, 0, C(0xd8dcde)), B(0.06, 0.6, 0.06, 0.3, 0.97, 0, STEEL), B(0.5, 0.06, 0.06, 0.3, 1.2, 0, STEEL));
      return p;
    case "banco-trabajo":
      p.push(B(w, 0.05, d, 0, h, 0, WOOD), B(w, 0.6, d * 0.9, 0, 0.35, 0, C(0x3f6f9f)), B(w, 0.8, 0.03, 0, h + 0.5, -d / 2 + 0.02, C(0x8a939b)));
      for (let i = 0; i < 6; i++) p.push(B(0.03, 0.2, 0.03, -w / 2 + 0.3 + i * 0.28, h + 0.6, -d / 2 + 0.05, DARK));
      p.push(B(0.3, 0.15, 0.2, w * 0.3, h + 0.08, 0.1, RED));
      return p;
    case "puerta-industrial": {
      p.push(B(w, h, d, 0, h / 2, 0, C(0xb8bfc6)));
      for (let i = 0; i < 16; i++) p.push(B(w, 0.03, d + 0.02, 0, (i * h) / 16, 0, C(0x8c949b)));
      p.push(B(0.4, h + 0.3, d + 0.15, -w / 2 - 0.2, (h + 0.3) / 2, 0, YELLOW), B(0.4, h + 0.3, d + 0.15, w / 2 + 0.2, (h + 0.3) / 2, 0, YELLOW), B(w + 0.8, 0.5, d + 0.3, 0, h + 0.4, 0, C(0x6c737a)));
      return p;
    }
    case "capsula-orion": {
      // The crew module's cone (Ø 5,02 m, 3,3 m), its heat shield, the side hatch open on −x and its windows.
      const r = w / 2;
      const gap = 0.55;
      // LatheGeometry's angle 0 looks to +z and 3π/2 to −x: the hatch gap is centred there.
      const shell = new THREE.LatheGeometry([new THREE.Vector2(r, 0.6), new THREE.Vector2(r * 0.98, 0.9), new THREE.Vector2(r * 0.45, 0.6 + h - 0.35), new THREE.Vector2(r * 0.35, 0.6 + h)], 28, (3 * Math.PI) / 2 + gap / 2, Math.PI * 2 - gap);
      p.push({ g: shell, m: "d:dfe3e6" });
      p.push(Cy(r, 0.12, 0, 0.5, 0, C(0x6b5a48), 28), Cy(r * 0.35, 0.05, 0, 0.6 + h, 0, C(0xbfc5ca), 16));
      for (const a of [0.9, 1.6, 4.7, 5.4]) {
        const x = Math.sin(a) * r * 0.7;
        const z = Math.cos(a) * r * 0.7;
        p.push(B(0.3, 0.3, 0.05, x, 2.6, z, GL));
      }
      // The stand under it with its four legs and the ring.
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(B(0.2, 0.5, 0.2, sx! * r * 0.6, 0.25, sz! * r * 0.6, YELLOW));
      return p;
    }
    case "escalon":
      p.push(B(w, h, d, 0, h / 2, 0, C(0x8a8f96)), B(w, 0.02, d, 0, h, 0, YELLOW));
      return p;
    case "techo":
      return [B(w, h, d, 0, h / 2, 0, "t:dfe3e6")];
    case "vaso": {
      // White tiles with the dark lane lines of a pool (only on the bottom).
      p.push(B(w, h, d, 0, h / 2, 0, C(0xbfe3ef)));
      if (h < 0.5) for (let i = 1; i < 6; i++) p.push(B(0.25, 0.01, d * 0.9, -w / 2 + (i * w) / 6, h + 0.005, 0, C(0x1f3f6f)));
      return p;
    }
    case "cortina":
      p.push(B(w, 0.03, 0.03, 0, h + 0.05, 0, STEEL));
      for (let i = 0; i < 8; i++) p.push(B(w / 8 + 0.02, h - 0.1, 0.02, -w / 2 + (w / 8) * (i + 0.5), h / 2 + 0.05, (i % 2) * 0.04 - 0.02, C(0x9cc7c4)));
      return p;
    case "tallimetro":
      p.push(B(0.06, h, 0.04, 0, h / 2, -d / 2 + 0.02, C(0xf5f5f0)), B(w, 0.03, d, 0, 1.7, 0, C(0x3a6ea5)), B(w, 0.04, 0.3, 0, 0.02, 0.15, C(0x8a8f96)));
      for (let i = 0; i < 10; i++) p.push(B(0.04, 0.005, 0.01, 0.03, 1.5 + i * 0.05, -d / 2 + 0.045, DARK));
      return p;
    case "diagnostico-pared":
      p.push(B(w, h, 0.04, 0, h / 2, -d / 2 + 0.02, C(0xe8ecef)), B(0.18, 0.18, 0.05, -0.2, h * 0.6, -d / 2 + 0.06, C(0xf5f5f0)), CyX(0.07, 0.01, -0.2, h * 0.6, -d / 2 + 0.09, C(0xffffff), 14, true), B(0.04, 0.12, 0.04, 0.1, h * 0.65, -d / 2 + 0.06, DARK), B(0.04, 0.12, 0.04, 0.22, h * 0.65, -d / 2 + 0.06, DARK), Cy(0.01, 0.35, -0.2, h * 0.05, -d / 2 + 0.07, DARK, 4));
      return p;
    case "carro-paradas":
      p.push(B(w, h - 0.15, d, 0, (h - 0.15) / 2 + 0.1, 0, RED));
      for (let i = 0; i < 4; i++) p.push(B(w * 0.9, 0.01, 0.01, 0, 0.25 + i * 0.2, d / 2 + 0.005, DARK));
      p.push(B(0.35, 0.18, 0.3, 0, h + 0.04, 0, C(0xe8c12a)), B(0.2, 0.1, 0.01, 0, h + 0.06, 0.15, SCREEN2));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(Cy(0.04, 0.08, sx! * (w / 2 - 0.05), 0, sz! * (d / 2 - 0.05), DARK, 6));
      return p;
    case "reloj":
      p.push(CyX(w / 2, d, 0, h / 2, 0, C(0xffffff), 20, true), CyX(w / 2 + 0.02, d * 0.8, 0, h / 2, -0.01, DARK, 20, true), B(0.015, w * 0.35, 0.01, 0, h / 2 + w * 0.15, d / 2 + 0.005, DARK), B(w * 0.3, 0.015, 0.01, w * 0.12, h / 2, d / 2 + 0.005, DARK));
      return p;
    case "pizarra":
      p.push(B(w, h, d, 0, h / 2, 0, C(0xf7f7f2)), B(w + 0.04, 0.04, d + 0.04, 0, 0, 0.02, STEEL));
      for (let i = 0; i < 4; i++) p.push(B(w * (0.3 + 0.12 * (i % 3)), 0.02, 0.005, -w * 0.15, h * (0.8 - i * 0.17), d / 2 + 0.003, i % 2 ? BLUE : RED));
      return p;
    case "tele-pared":
      return [B(w, h, d, 0, h / 2, 0, DARK), B(w * 0.95, h * 0.9, 0.01, 0, h / 2, d / 2 + 0.005, SCREEN)];
    case "planta":
      p.push(Cy(0.2, 0.4, 0, 0, 0, C(0x8a6a48), 10, 0.24));
      for (let i = 0; i < 5; i++) p.push({ g: new THREE.ConeGeometry(0.18, 0.7, 5).translate(Math.cos(i * 1.3) * 0.12, 0.75 + (i % 2) * 0.12, Math.sin(i * 1.3) * 0.12), m: C(0x3f7a3a) });
      return p;
    case "discos":
      p.push(B(w, 0.05, d, 0, 0.025, 0, DARK), Cy(0.04, h, 0, 0, 0, STEEL, 8));
      for (let i = 0; i < 6; i++) {
        const a = (i % 3) * 2.1;
        p.push(CyX(0.22 - (i % 3) * 0.04, 0.04, Math.cos(a) * 0.12, 0.3 + Math.floor(i / 3) * 0.6, Math.sin(a) * 0.12, C(0x222222), 16, i % 2 === 0));
      }
      return p;
    case "cajones-salto":
      p.push(B(w, h, d, 0, h / 2, 0, WOOD), B(w * 0.8, 0.5, d * 0.8, 0, h + 0.25, 0, C(0x9a7a58)), B(w * 0.6, 0.3, d * 0.6, 0, h + 0.65, 0, C(0xa98a68)));
      return p;
    case "elevadora":
      p.push(B(w, 0.3, d, 0, 0.15, 0, C(0xe8a33a)));
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        const bar = new THREE.BoxGeometry(0.06, 0.06, d * 0.95);
        bar.rotateX(s * 0.32);
        bar.translate((w / 2 - 0.1) * (i === 1 ? -1 : 1), 0.55 + i * 0.45, 0);
        p.push({ g: bar, m: C(0x555a60) });
      }
      p.push(B(w, 0.08, d, 0, 1.6, 0, C(0xe8a33a)), B(w, 0.05, 0.05, 0, 2.15, d / 2, STEEL), B(w, 0.05, 0.05, 0, 2.15, -d / 2, STEEL), B(0.05, 0.55, d, w / 2, 1.9, 0, STEEL), B(0.05, 0.55, d, -w / 2, 1.9, 0, STEEL));
      return p;
    case "carro-herramientas":
      p.push(B(w, 0.7, d, 0, 0.45, 0, RED));
      for (let i = 0; i < 4; i++) p.push(B(w * 0.9, 0.01, 0.01, 0, 0.2 + i * 0.16, d / 2 + 0.005, DARK));
      p.push(B(w, 0.04, d, 0, 0.82, 0, DARK), B(0.04, 0.2, 0.04, w / 2 - 0.02, 0.95, 0, STEEL), B(0.3, 0.05, 0.1, -0.1, 0.86, 0, C(0xe8c12a)));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(Cy(0.05, 0.1, sx! * (w / 2 - 0.08), 0, sz! * (d / 2 - 0.08), DARK, 6));
      return p;
    // ── The campus (data/campus-fixtures.ts) ──
    case "cama":
      p.push(B(w, 0.3, d, 0, 0.15, 0, WOOD), B(w - 0.06, 0.22, d - 0.08, 0, 0.41, 0.02, C(0xf3f1ea)), B(w - 0.08, 0.05, d * 0.6, 0, 0.54, 0.25, C(0x3a6ea5)), B(w * 0.7, 0.1, 0.35, 0, 0.57, -d / 2 + 0.3, WHITE), B(w, 0.7, 0.06, 0, 0.35, -d / 2 + 0.03, WOOD));
      return p;
    case "cocina":
      p.push(B(w, h, d, 0, h / 2, 0, C(0xd5d8db)), B(w, 0.04, d, 0, h + 0.02, 0, DARK), B(w * 0.6, h * 0.45, 0.02, 0, h * 0.35, d / 2 + 0.01, DARK));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(Cy(0.11, 0.01, sx! * w * 0.2, h + 0.04, sz! * d * 0.2, C(0x555a60), 10));
      p.push(B(w * 0.8, 0.35, d * 0.7, 0, h + 0.9, -0.05, STEEL));
      return p;
    case "nevera":
      p.push(B(w, h, d, 0, h / 2, 0, WHITE), B(0.03, h * 0.5, 0.03, w / 2 - 0.08, h * 0.55, d / 2 + 0.02, STEEL), B(w, 0.01, 0.01, 0, h * 0.6, d / 2 + 0.005, GREY));
      return p;
    case "sofa":
      p.push(B(w, 0.42, d, 0, 0.21, 0, C(0x5a6b7d)), B(w, 0.45, 0.2, 0, 0.63, -d / 2 + 0.1, C(0x5a6b7d)), B(0.18, 0.25, d, -w / 2 + 0.09, 0.55, 0, C(0x4d5d6e)), B(0.18, 0.25, d, w / 2 - 0.09, 0.55, 0, C(0x4d5d6e)));
      return p;
    case "guantera":
      p.push(B(w, 0.85, d, 0, 0.425, 0, STEEL), B(w, h - 0.85, d * 0.8, 0, 0.85 + (h - 0.85) / 2, -0.05, C(0xb8c0c6)), B(w * 0.85, (h - 0.85) * 0.55, 0.02, 0, 0.85 + (h - 0.85) * 0.5, d * 0.35 + 0.01, GL));
      for (const sx of [-0.25, 0.25]) p.push(CyX(0.08, 0.06, sx * w, 1.3, d * 0.36, DARK, 12, true));
      p.push(B(0.35, 0.35, 0.35, w / 2 + 0.17, 1.2, 0, STEEL));
      return p;
    case "camara-cultivo":
      p.push(B(w, h, d, 0, h / 2, 0, WHITE), B(w * 0.85, h * 0.6, 0.02, 0, h * 0.55, d / 2 + 0.01, C(0xc75bd9)));
      for (let i = 0; i < 3; i++) p.push(B(w * 0.7, 0.12, 0.25, 0, h * 0.35 + i * 0.3, 0.1, C(0x4caf50)));
      return p;
    case "estante-cultivo":
      for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) p.push(B(0.04, h, d, x, h / 2, 0, STEEL));
      for (let i = 0; i < 4; i++) {
        const y = 0.3 + i * 0.5;
        p.push(B(w, 0.03, d, 0, y, 0, STEEL), B(w * 0.9, 0.14, d * 0.8, 0, y + 0.09, 0, C(0x58a55c)), B(w * 0.9, 0.02, 0.06, 0, y + 0.45, 0, C(0xe57cf0)));
      }
      return p;
    case "colmena":
      p.push(B(w, h, d, 0, h / 2, 0, WOOD), B(w * 0.8, h * 0.75, 0.02, 0, h * 0.5, d / 2 + 0.01, GL));
      for (let i = 0; i < 3; i++) p.push(B(w * 0.75, h * 0.2, 0.01, 0, h * 0.25 + i * h * 0.22, d / 2 - 0.02, C(0xe0a526)));
      return p;
    case "insectario":
      for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) p.push(B(0.04, h, d, x, h / 2, 0, STEEL));
      for (let i = 0; i < 4; i++) {
        const y = 0.25 + i * 0.42;
        p.push(B(w, 0.03, d, 0, y, 0, STEEL), B(w * 0.42, 0.3, d * 0.8, -w * 0.24, y + 0.16, 0, GL), B(w * 0.42, 0.3, d * 0.8, w * 0.24, y + 0.16, 0, GL));
        for (let j = 0; j < 4; j++) p.push(Cy(0.03, 0.1, -w * 0.4 + j * w * 0.11, y + 0.02, 0, C(0xd9b36c), 6));
      }
      return p;
    case "impresora-3d":
      p.push(B(w, 0.75, d, 0, 0.375, 0, C(0x3a3f45)), B(w, h - 0.75, d, 0, 0.75 + (h - 0.75) / 2, 0, GL), B(w * 0.9, 0.03, d * 0.9, 0, 0.8, 0, DARK), B(0.15, 0.1, 0.15, 0, h - 0.15, 0, C(0xe67e22)));
      return p;
    case "torno":
      p.push(B(w, 0.8, d, 0, 0.4, 0, C(0x4a6a8a)), CyX(0.15, w * 0.8, 0, 1.05, 0, STEEL), B(0.4, 0.45, d * 0.8, -w / 2 + 0.2, 1.02, 0, C(0x4a6a8a)));
      return p;
    case "fresadora":
      p.push(B(w, 0.9, d, 0, 0.45, 0, C(0x4a6a8a)), B(w * 0.8, 0.08, d * 0.5, 0, 0.95, 0.2, STEEL), B(0.4, h - 0.9, 0.4, 0, 0.9 + (h - 0.9) / 2, -d / 2 + 0.2, C(0x4a6a8a)), B(0.3, 0.45, 0.5, 0, h - 0.5, 0, C(0x4a6a8a)), Cy(0.05, 0.25, 0, h - 0.95, 0.05, STEEL, 8));
      return p;
    case "pupitre":
      p.push(B(w, 0.03, d, 0, h - 0.015, 0, C(0xd7cbb4)), B(w * 0.9, 0.3, 0.02, 0, h - 0.2, d / 2 - 0.02, STEEL));
      for (const sx of [-1, 1]) p.push(B(0.04, h - 0.03, d * 0.8, sx * (w / 2 - 0.05), (h - 0.03) / 2, 0, STEEL));
      return p;
    case "sillon-dental":
      p.push(Cy(0.25, 0.4, 0, 0, 0.2, STEEL, 12), B(w, 0.15, d * 0.6, 0, 0.5, 0.25, C(0x2e86c1)), B(w, 0.6, 0.15, 0, 0.85, -0.25, C(0x2e86c1)), B(0.6, 0.06, 0.4, 0.7, 1.3, 0.2, WHITE), Cy(0.03, 1.2, 0.7, 0, -0.2, STEEL, 6));
      return p;
    case "mesa-reunion":
      p.push(B(w, 0.05, d, 0, h - 0.025, 0, C(0xd7cbb4)), B(0.1, h - 0.05, d * 0.6, -w / 2 + 0.3, (h - 0.05) / 2, 0, STEEL), B(0.1, h - 0.05, d * 0.6, w / 2 - 0.3, (h - 0.05) / 2, 0, STEEL), B(0.35, 0.02, 0.25, -0.5, h + 0.01, 0, C(0xffffff)), B(0.35, 0.02, 0.25, 0.4, h + 0.01, 0.1, C(0x3a6ea5)));
      return p;
  }
}

/** The floors of the training rooms (Cold Sanctuary's islands keep their colours in aerial-models.ts). */
const INTERIOR: Readonly<Record<string, number>> = { nbl: 0x8f979d, "nbl-control": 0x4a5662, "nbl-hiperbarica": 0x8c949b, svmf: 0x868c91, "svmf-destiny": 0xd9dde0, "svmf-orion": 0xd9dde0, control: 0x2f3f5a, gimnasio: 0x3a3f45, medico: 0xb4bcb6, "medico-hipobarica": 0x9aa3ab, supervivencia: 0x9fadb3, centrifuga: 0xb9bec2, "simulador-dragon": 0x868c91, "simulador-dragon-capsula": 0x2b2f35, "simulador-lm": 0x5a5f66, robotica: 0x9aa3ab, "robotica-destiny": 0xd9dde0, trajes: 0xc9ced3 };
export function interiorFloor(area: string): number | undefined {
  const [isl, room] = area.split(":");
  return isl === "entrenamiento" && room ? INTERIOR[room] : undefined;
}

/** A painted mark on the ground (the helipad's weight and size), as one textured quad. */
function paint(f: PlacedFixture): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.font = "bold 72px system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(f.text ?? "", 128, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.d), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(f.x, f.y, f.z);
  return m;
}

/** Every fixture, merged by material; with a plate over the named ones. */
export function buildFixtures(fixtures: readonly PlacedFixture[]): THREE.Group {
  const root = new THREE.Group();
  root.name = "equipamiento";
  const buckets = new Map<string, THREE.BufferGeometry[]>();
  const m4 = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const sc = new THREE.Matrix4();
  for (const f of fixtures) {
    if (f.kind === "rotulo-suelo") {
      root.add(paint(f));
      continue;
    }
    const parts = fixtureParts(f);
    rot.makeRotationY((f.rot * Math.PI) / 2);
    sc.makeScale(f.plan ?? 1, 1, f.plan ?? 1);
    m4.makeTranslation(f.x, f.y, f.z).multiply(rot).multiply(sc);
    for (const p of parts) {
      const g = p.g.index ? p.g.toNonIndexed() : p.g;
      g.applyMatrix4(m4);
      // Keep only what every geometry has, so they merge.
      for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
      const col = keyColor(p.m);
      const n = g.attributes.position!.count;
      const rgb = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) rgb.set([col.r, col.g, col.b], i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
      const kind = p.m.split(":")[0]!;
      const list = buckets.get(kind) ?? [];
      list.push(g);
      buckets.set(kind, list);
      if (g !== p.g) p.g.dispose();
    }
    if (f.plate) {
      const s = textSign(`${f.text && f.kind === "consola-fcr" ? f.text : f.name} · ${REALITY_NAME[f.reality]}`);
      s.scale.multiplyScalar(f.kind === "maqueta-modulo" || f.kind === "capsula-orion" || f.kind === "mets" ? 1.4 : 0.85);
      s.position.set(f.x, f.y + Math.min(f.h, 3.2) + 0.45, f.z);
      s.name = `placa:${f.name}`;
      root.add(s);
    }
  }
  for (const [key, geos] of buckets) {
    const merged = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material(key));
    mesh.name = `equipo-${key}`;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
  return root;
}
