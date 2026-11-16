import * as THREE from "three";
import { WORLD_SCALE } from "@core/scale";
import type { StepVisual } from "@modules/chores/domain/step-visual";
import { rackSpec } from "@modules/life-support/data/eclss-machines";
import type { RackKind } from "@modules/life-support/domain/eclss";

/**
 * The kit of rack-sized life-support machines (docs/design/soporte-vital.md, «Kit 3D»): one model per
 * `RackKind`, built at the rack's REAL size (ISPR 2,0 × 1,05 × 0,86 m) times the presentation scale the
 * host passes (default: the current `WORLD_SCALE` of src/core/scale.ts, read at call time; nothing is baked).
 *
 * Local frame: origin at the centre of the rack's front, +z out of the front into the aisle, +y up;
 * the body goes back into the wall (−z). Place it with `mountOnWall`.
 *
 * Every mesh carries `userData.fixture` when the host gives a fixture id, so taps reach the interactable.
 */
export type RackState = "ok" | "aviso" | "averia" | "apagado";

export interface EclssRackModel {
  readonly kind: RackKind;
  readonly group: THREE.Group;
  /** Status lamp on the front (top right); `broken` glows red until it is changed. */
  setState(s: RackState, broken?: string): void;
  /** Steps of a repair, acted out on the rack: a lamp per step and the part being changed (the StepVisual port). */
  repairVisual(part: string, steps: number): StepVisual;
  /** Fades the flashes; call every frame while it is on screen. */
  tick(dt: number): void;
  /** Named parts (ORUs) of this rack: «lechos», «soplante», «bomba»… */
  readonly parts: ReadonlyMap<string, THREE.Mesh>;
}

const STATE_COLOR: Readonly<Record<RackState, number>> = { ok: 0x3ddc84, aviso: 0xffb347, averia: 0xff4040, apagado: 0x2a2f36 };
const PANEL = 0xd9dee4;
const DARK = 0x39424e;

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...extra });
const basic = (color: number) => new THREE.MeshBasicMaterial({ color });

/** Which part of a rack a failure's spare is (adapters only: a look, not a rule). */
export const PART_OF_FAILURE: Readonly<Record<string, string>> = {
  "cdra-lechos": "lechos",
  "cdra-valvula": "soplante",
  "tccs-lioh": "tccs",
  "oga-bomba": "bomba",
  "oga-domo-h2": "domo",
  "sabatier-compresor": "sabatier",
  "upa-destilacion": "destilacion",
  "upa-pcpa": "pcpa",
  "wpa-lecho-mf": "lecho-mf",
  "wpa-separador": "separador",
  "bpa-bolsa": "bolsa",
  "itcs-bomba": "bomba",
  "incendios-detector": "detector",
};

/**
 * One life-support rack model. `scale` multiplies the real size (the presentation layer's choice);
 * `size` overrides the real size when the host has its own fixture box (already real or already scaled: say which with `scale`).
 */
export function eclssRackModel(kind: RackKind, opts: { scale?: number; size?: { w: number; h: number; d: number }; fixtureId?: string } = {}): EclssRackModel {
  const k = opts.scale ?? WORLD_SCALE;
  const real = opts.size ?? rackSpec(kind).size;
  const W = real.w * k;
  const H = real.h * k;
  const D = real.d * k;
  const g = new THREE.Group();
  g.name = `eclss-${kind}`;
  const parts = new Map<string, THREE.Mesh>();

  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, part?: string) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    if (part) parts.set(part, mesh);
    return mesh;
  };
  const cyl = (r: number, h: number, x: number, y: number, z: number, m: THREE.Material, part?: string, axis: "x" | "y" | "z" = "y") => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m);
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    g.add(mesh);
    if (part) parts.set(part, mesh);
    return mesh;
  };
  // Shell: the rack's body sunk in the wall, a front frame and a slightly recessed face.
  const isRack = rackSpec(kind).bays > 0;
  box(W, H, D, 0, 0, -D / 2, std(isRack ? 0xb9c1ca : 0x9aa6b6));
  if (isRack) for (const s of [-1, 1]) box(0.04 * k, H, 0.04 * k, (s * (W - 0.04 * k)) / 2, 0, 0.01 * k, std(DARK));
  const face = 0.02 * k;
  const u = (f: number) => f * W; // across, from the centre
  const v = (f: number) => f * H; // up, from the centre

  switch (kind) {
    case "ar": {
      // CDRA: four beds in a row (two desiccant, two zeolite), the blower above; TCCS cylinder below.
      box(u(0.9), v(0.08), face, 0, v(0.44), face, std(0x2f7f8f));
      for (let i = 0; i < 4; i++) box(u(0.19), v(0.3), 0.06 * k, u(-0.33 + i * 0.22), v(0.1), 0.03 * k, std(i < 2 ? 0xc8b98a : 0x8fa8b8));
      const lechos = box(u(0.86), v(0.34), 0.02 * k, 0, v(0.1), 0.005 * k, std(0x6f7c8a), "lechos");
      lechos.renderOrder = -1;
      cyl(u(0.12), 0.05 * k, u(-0.25), v(0.33), 0.03 * k, std(DARK), "soplante", "z");
      cyl(u(0.13), u(0.6), 0, v(-0.25), 0.1 * k, std(0x9aa0a8), "tccs", "x");
      break;
    }
    case "ogs": {
      // OGA: the cell stack (thin plates), the hydrogen dome, the recirculation pump; Sabatier reactor below.
      for (let i = 0; i < 10; i++) box(u(0.42), v(0.012), 0.08 * k, u(-0.2), v(0.18 + i * 0.022), 0.04 * k, std(i % 2 ? 0xe9edf1 : 0x6c7a89));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(u(0.14), 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), std(0xf2f4f6));
      dome.rotation.x = Math.PI / 2;
      dome.position.set(u(0.22), v(0.28), 0.02 * k);
      g.add(dome);
      parts.set("domo", dome);
      cyl(u(0.08), 0.1 * k, u(0.22), v(0.02), 0.05 * k, std(0x4c7f9f), "bomba", "z");
      cyl(u(0.1), v(0.28), u(-0.15), v(-0.25), 0.1 * k, std(0xb0b6bd), "sabatier");
      box(u(0.3), v(0.18), 0.04 * k, u(0.2), v(-0.25), 0.02 * k, std(0x8a929e));
      break;
    }
    case "wrs": {
      // Two racks: UPA (distillation drum, PCPA) on the left; WPA beds and gas separator, BPA bag on the right.
      box(0.03 * k, H, 0.03 * k, 0, 0, 0.015 * k, std(DARK));
      cyl(u(0.09), v(0.12), u(-0.25), v(0.22), 0.1 * k, std(0xc0c6cc), "destilacion", "z");
      box(u(0.12), v(0.1), 0.06 * k, u(-0.35), v(-0.05), 0.03 * k, std(0x5d6b79), "pcpa");
      box(u(0.3), v(0.18), 0.03 * k, u(-0.25), v(-0.3), 0.02 * k, std(0xe8d76a));
      for (let i = 0; i < 3; i++) cyl(u(0.03), v(0.32), u(0.12 + i * 0.08), v(0.15), 0.06 * k, std(0x7fb0d8), i === 0 ? "lecho-mf" : undefined);
      cyl(u(0.035), v(0.1), u(0.38), v(0.25), 0.06 * k, std(0x9aa6b6), "separador");
      box(u(0.3), v(0.2), 0.08 * k, u(0.25), v(-0.28), 0.04 * k, std(0xcfc6b0), "bolsa");
      break;
    }
    case "itcs": {
      // Coolant loops: low (4 °C, blue) and moderate (17 °C, orange), the pump package between them.
      for (const [y, c] of [
        [0.3, 0x3a7bd5],
        [-0.3, 0xe08a3a],
      ] as const) {
        cyl(0.03 * k, u(0.85), 0, v(y), 0.06 * k, std(c), undefined, "x");
        for (const s of [-1, 1]) cyl(0.03 * k, v(0.25), u(s * 0.42), v(y * 0.6), 0.06 * k, std(c));
      }
      cyl(u(0.13), u(0.3), 0, 0, 0.1 * k, std(0x5d6b79), "bomba", "x");
      break;
    }
    case "incendios": {
      // CO₂ extinguisher (red), oxygen mask on its bracket, the smoke detector above.
      cyl(u(0.16), v(0.6), u(-0.15), v(-0.05), 0.12 * k, std(0xd8282a));
      box(u(0.3), v(0.18), 0.08 * k, u(0.2), v(0.05), 0.05 * k, std(0xf2c14e));
      box(u(0.4), v(0.1), 0.05 * k, 0, v(0.4), 0.03 * k, std(0xf2f2f2), "detector");
      break;
    }
    case "galeria": {
      // Hot-water dispenser with its needle, and the food warmer's drawer.
      box(u(0.4), v(0.3), 0.08 * k, u(-0.2), v(0.2), 0.04 * k, std(0xe6e9ec));
      cyl(0.015 * k, 0.12 * k, u(-0.2), v(0.02), 0.08 * k, std(DARK), undefined, "z");
      box(u(0.42), v(0.32), 0.1 * k, u(0.22), v(-0.2), 0.05 * k, std(0x8a929e), "calentador");
      break;
    }
    case "refugio": {
      // A crew quarter lined with water bags: soft blue pillows all over its front.
      for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) box(u(0.28), v(0.17), 0.06 * k, u(-0.3 + i * 0.3), v(-0.36 + j * 0.18), 0.03 * k, std(0x3d7fd1, { roughness: 0.4 }));
      break;
    }
    case "consola": {
      box(W * 0.95, H * 0.08, D * 0.9, 0, -H * 0.4, D / 2, std(DARK));
      box(W * 0.95, H * 0.7, 0.02 * k, 0, 0, 0.03 * k, basic(0x0b1c2a));
      box(W * 0.85, H * 0.55, 0.01 * k, 0, 0.02 * H, 0.045 * k, basic(0x1d6f8a));
      break;
    }
  }
  if (isRack) box(W * 0.98, H * 0.98, 0.005 * k, 0, 0, -0.005 * k, std(PANEL));

  // Status lamp and a row of step lamps for repairs (one per step, lit as each is done).
  const lamp = box(0.08 * k, 0.08 * k, 0.03 * k, W / 2 - 0.1 * k, H / 2 - 0.1 * k, 0.03 * k, basic(STATE_COLOR.ok));
  const steps: THREE.Mesh[] = [];
  const flashes = new Map<THREE.Mesh, { t: number; base: THREE.Color }>();
  const flash = (m: THREE.Mesh, t = 0.6) => {
    const mat = m.material as THREE.MeshStandardMaterial;
    if (!flashes.has(m) && mat.emissive) flashes.set(m, { t, base: mat.emissive.clone() });
    else if (flashes.has(m)) flashes.get(m)!.t = t;
  };

  if (opts.fixtureId) g.traverse((o) => (o.userData.fixture = opts.fixtureId));

  const model: EclssRackModel = {
    kind,
    group: g,
    parts,
    setState(s, broken) {
      (lamp.material as THREE.MeshBasicMaterial).color.setHex(STATE_COLOR[s]);
      for (const [name, m] of parts) if (!flashes.has(m)) (m.material as THREE.MeshStandardMaterial).emissive?.setHex(name === broken ? 0x661010 : 0x000000);
    },
    repairVisual(part, n) {
      const target = parts.get(part);
      const clearSteps = () => {
        for (const m of steps) g.remove(m);
        steps.length = 0;
      };
      clearSteps();
      const size = Math.min(0.07 * k, (H * 0.8) / Math.max(1, n) - 0.02 * k);
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.02 * k), basic(STATE_COLOR.apagado));
        m.position.set(-W / 2 + 0.09 * k, H / 2 - 0.15 * k - i * (size + 0.03 * k), 0.035 * k);
        if (opts.fixtureId) m.userData.fixture = opts.fixtureId;
        g.add(m);
        steps.push(m);
      }
      const tint = (c: number) => {
        const mat = target?.material as THREE.MeshStandardMaterial | undefined;
        mat?.emissive?.setHex(c);
      };
      tint(0x661010);
      return {
        stepDone: (i) => {
          (steps[i]?.material as THREE.MeshBasicMaterial | undefined)?.color.setHex(STATE_COLOR.ok);
          if (target) flash(target);
        },
        partDone: () => {
          if (target) flash(target, 0.3);
        },
        finish: () => {
          tint(0x000000);
          model.setState("ok");
        },
        clear: () => {
          tint(0x000000);
          clearSteps();
        },
      };
    },
    tick(dt) {
      for (const [m, f] of flashes) {
        f.t -= dt;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (f.t <= 0) {
          mat.emissive.copy(f.base);
          flashes.delete(m);
        } else mat.emissive.setRGB(0.2 + f.t, 0.6 * f.t + 0.2, 0.2);
      }
    },
  };
  return model;
}

/**
 * Puts a rack on a wall: its front centre at `front` (host frame, drawn metres), facing the aisle along
 * `aisle` (unit vector out of the wall). Returns the group for chaining.
 */
export function mountOnWall(model: EclssRackModel, front: THREE.Vector3, aisle: THREE.Vector3): THREE.Group {
  const n = aisle.clone().normalize();
  const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(up, n).normalize();
  const y = new THREE.Vector3().crossVectors(n, x);
  model.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, n));
  model.group.position.copy(front);
  return model.group;
}
