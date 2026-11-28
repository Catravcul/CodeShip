import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SIM_TANK } from "@modules/sanctuary-one/data/simulacion";
import { SIM_ENTRY_S, simMoment } from "@modules/sanctuary-one/domain/sim-entry";
import type { CubeFigure } from "./interior/figure";

/**
 * The simulation machines' see-through and moving parts (data/simulacion.ts; the solid ones are the «simulador»
 * model): the glass walls, the water, the two door leaves that slide to the sides and the magnetic field's sheet of
 * light in the doorway. And her way in (domain/sim-entry.ts): to the door, the mask, the doors, in, to the centre,
 * floating to half the water's height and opening out in a star while the camera turns round the tank (Cold
 * Sanctuary, VirtualizationTank.Enter; Berón 2026-11-23).
 */
interface Tank {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rot: number;
  /** The floor plan's presentation scale (x and z drawn this many times bigger, core/scale.ts). */
  readonly k: number;
  readonly doors: readonly THREE.Mesh[];
  readonly field: THREE.Mesh;
  readonly g: THREE.Group;
}

/** Floating in the tank, arms and legs open in a star (the end of the entry; and those floating with her). */
export const STAR_POSE = { rootY: 0.95, rootX: 0, torso: 0, headX: -0.1, headY: 0, headZ: 0, shoulderX: [0, 0] as [number, number], shoulderZ: [1.4, -1.4] as [number, number], elbow: [0, 0] as [number, number], hip: [-0.45, 0.45] as [number, number], knee: [0.1, 0.1] as [number, number] };

/** Machines further than this from the camera are not drawn (m). */
const CULL_M = 90;

const T = SIM_TANK;

export class SimTanks {
  private readonly tanks: Tank[] = [];
  private run: { tank: Tank; t: number; from: THREE.Vector3; done: () => void; fired: boolean } | undefined;
  private readonly fadeEl: HTMLDivElement;
  private readonly tmp = new THREE.Vector3();
  private cull = 0;

  constructor(
    scene: THREE.Scene,
    at: readonly { readonly x: number; readonly y: number; readonly z: number; readonly rot?: number; readonly plan?: number }[],
    root: HTMLElement,
  ) {
    const glass = new THREE.MeshStandardMaterial({ color: 0xd1efff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const water = new THREE.MeshStandardMaterial({ color: 0x409ee0, transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: 0x8cd9ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    const r = T.half;
    const h = T.water;
    const y0 = T.base;
    const box = (w: number, hh: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m);
      b.position.set(x, y, z);
      return b;
    };
    for (const p of at) {
      const g = new THREE.Group();
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = p.rot ?? 0;
      g.scale.set(p.plan ?? 1, 1, p.plan ?? 1);
      // The back and side glass and the fixed glass beside the doorway, merged into one mesh; the water.
      const side = r - T.door - 0.11;
      const panes = [box(r * 2, h, 0.03, glass, 0, y0 + h / 2, r), box(0.03, h, r * 2, glass, -r, y0 + h / 2, 0), box(0.03, h, r * 2, glass, r, y0 + h / 2, 0), ...[-1, 1].map((s) => box(side, h, 0.03, glass, s * (T.door + 0.11 + side / 2), y0 + h / 2, -r))];
      g.add(new THREE.Mesh(mergeGeometries(panes.map((b) => (b.updateMatrix(), b.geometry.applyMatrix4(b.matrix)))), glass));
      g.add(box(r * 1.96, h - 0.02, r * 1.96, water, 0, y0 + h / 2, 0));
      // The glass lid: one sees the floating people from above too.
      g.add(box(r * 2, 0.03, r * 2, glass, 0, y0 + h + 0.04, 0));
      const field = box(T.door * 2, h - 0.1, 0.01, glow, 0, y0 + (h - 0.1) / 2, -r + 0.01);
      field.visible = false;
      const doors = [-1, 1].map((s) => box(T.door, h - 0.1, 0.03, glass, (s * T.door) / 2, y0 + (h - 0.1) / 2, -r - 0.07));
      g.add(field, ...doors);
      scene.add(g);
      this.tanks.push({ x: p.x, y: p.y, z: p.z, rot: p.rot ?? 0, k: p.plan ?? 1, doors, field, g });
    }
    this.fadeEl = document.createElement("div");
    this.fadeEl.style.cssText = "position:fixed;inset:0;background:#02131c;opacity:0;pointer-events:none;z-index:30;transition:none";
    root.appendChild(this.fadeEl);
  }

  /** The nearest tank to a point (its index), within `within` m. */
  nearest(x: number, z: number, within = 4, y?: number): number | undefined {
    let best: number | undefined;
    let d = within;
    this.tanks.forEach((t, i) => {
      // One machine on every floor: only the one on her floor.
      if (y !== undefined && Math.abs(t.y - y) > 3) return;
      const e = Math.hypot(t.x - x, t.z - z);
      if (e < d) [d, best] = [e, i];
    });
    return best;
  }

  get active(): boolean {
    return !!this.run;
  }

  /** She goes in from `from`; `done` once she is in the simulation (the screen faded). */
  enter(i: number, from: { x: number; y: number; z: number }, done: () => void): void {
    const tank = this.tanks[i];
    if (!tank) return done();
    this.run = { tank, t: 0, from: new THREE.Vector3(from.x, from.y, from.z), done, fired: false };
  }

  /** A point in the tank's frame (x to its right, z to its back; the door at −z) in the world. */
  private world(t: Tank, lx: number, ly: number, lz: number, out: THREE.Vector3): THREE.Vector3 {
    const c = Math.cos(t.rot);
    const s = Math.sin(t.rot);
    return out.set(t.x + (lx * c + lz * s) * t.k, t.y + ly, t.z + (-lx * s + lz * c) * t.k);
  }

  /** One frame of her way in; false when there is none. */
  frame(dt: number, camera: THREE.PerspectiveCamera, rig: THREE.Object3D, avatar: CubeFigure): boolean {
    // Not drawn from far away (its glass and water are see-through: costly to draw for nothing). Every few frames.
    if ((this.cull = (this.cull + 1) % 12) === 0) for (const t of this.tanks) t.g.visible = camera.position.distanceTo(this.tmp.set(t.x, t.y, t.z)) < CULL_M;
    const run = this.run;
    if (!run) return false;
    run.t += dt;
    const m = simMoment(run.t);
    const t = run.tank;
    const r = T.half;
    // Her way: start → in front of the door → just inside → the centre; floating up to half the water.
    const front = this.world(t, 0, 0, T.front.z, new THREE.Vector3());
    const inside = this.world(t, 0, T.base, -r + 0.6, new THREE.Vector3());
    const centre = this.world(t, 0, T.base, 0, new THREE.Vector3());
    const p = this.tmp;
    if (m.along <= 1) p.copy(run.from).lerp(front, m.along);
    else if (m.along <= 2) p.copy(front).lerp(inside, m.along - 1);
    else p.copy(inside).lerp(centre, Math.min(1, m.along - 2));
    // Floating «hasta la mitad vertical»: her middle (0,9 m over her feet) rises to half the water's height.
    p.y += Math.max(0, (m.rise / 0.5) * (T.water * 0.5 - 0.9));
    rig.position.copy(p);
    // Facing the tank's back (into it).
    rig.rotation.y = t.rot;
    rig.visible = true;
    // The doors slide to the sides; the field holds the water while they are open.
    t.doors.forEach((d, k) => (d.position.x = ((k ? 1 : -1) * T.door) / 2 + (k ? 1 : -1) * T.door * 1.05 * m.doors));
    t.field.visible = m.doors > 0.02;
    avatar.wearMask(m.mask);
    const moving = m.phase === "acercarse" || m.phase === "entrar" || m.phase === "centro";
    if (moving) avatar.walk(run.t * 7, 1);
    else {
      const s = m.star;
      // Taking the mask: a hand to the face; floating: arms and legs opening out in a star.
      const hand = m.phase === "mascara" ? Math.sin(Math.PI * m.k) : 0;
      avatar.poseAngles({
        rootY: 0.95,
        rootX: 0,
        torso: 0,
        headX: -0.1 * s,
        headY: 0,
        headZ: 0,
        shoulderX: [-1.6 * hand, 0],
        shoulderZ: [0.1 + 1.3 * s + 0.2 * hand, -0.1 - 1.3 * s],
        elbow: [-1.8 * hand, 0],
        // (The legs open front and back: the figure's hips turn only that way.)
        hip: [-0.45 * s, 0.45 * s],
        knee: [0.1 * s, 0.1 * s],
      });
    }
    // The camera: from in front, then all round the tank (Cold Sanctuary's orbiting shot).
    const a = m.orbit;
    // (The pad's buttons cover the screen's lower part: the tank is framed a little above the middle.)
    const look = this.world(t, 0, T.base - T.water * 0.3, 0, new THREE.Vector3());
    const cam = this.world(t, -Math.sin(a) * T.half * 2.2, T.base + T.water * 0.7, -Math.cos(a) * T.half * 2.2, new THREE.Vector3());
    camera.position.copy(cam);
    camera.lookAt(look);
    this.fadeEl.style.opacity = String(m.fade);
    if (run.t >= SIM_ENTRY_S && !run.fired) {
      run.fired = true;
      // Out of the tank (the simulation shows the area), the doors shut; the fade lifts.
      this.run = undefined;
      avatar.wearMask(false);
      t.doors.forEach((d, k) => (d.position.x = ((k ? 1 : -1) * T.door) / 2));
      t.field.visible = false;
      setTimeout(() => (this.fadeEl.style.opacity = "0"), 350);
      run.done();
    }
    return true;
  }

  /** Where someone floats in it (a spot of SIM_SPOTS, or its middle): world position and the tank's facing. */
  floatAt(i: number, spot?: { x: number; z: number }): { x: number; y: number; z: number; yaw: number } | undefined {
    const t = this.tanks[i];
    if (!t) return undefined;
    const p = this.world(t, spot?.x ?? 0, T.base + T.water * 0.5 - 0.9, spot?.z ?? 0, new THREE.Vector3());
    return { x: p.x, y: p.y, z: p.z, yaw: t.rot };
  }

  /** Where she comes out: in front of its door. */
  frontOf(i: number): { x: number; y: number; z: number } | undefined {
    const t = this.tanks[i];
    return t ? this.world(t, 0, 0, T.front.z, new THREE.Vector3()) : undefined;
  }
}
