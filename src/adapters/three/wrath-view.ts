import * as THREE from "three";
import type { Vec3 } from "@core/math/vec3";
import type { Projectile } from "@modules/asteroid-wrath/domain/projectile";
import type { RamView, WrathEvent } from "@modules/asteroid-wrath/application/wrath";

const TRAIL = 60;
const v3 = (v: Vec3) => new THREE.Vector3(v.x, v.y, v.z);

interface Shot {
  mesh: THREE.Mesh;
  trail: THREE.Line;
  points: THREE.Vector3[];
  seen: boolean;
}

interface Flash {
  obj: THREE.Object3D;
  age: number;
  life: number;
  grow: number;
  update?: (t: number) => void;
}

const COLOURS = { roca: 0xff8a4a, carga: 0xffc23a, nuclear: 0xd8ffcf } as const;

/**
 * Draws what an angry asteroid throws: rocks, charges and nuclear charges with glowing trails, the
 * bursts (a flash and a cloud of fragments), the radiation pulses (a beam) and a faint shell at the
 * edge of each angry asteroid's reach. Sizes are exaggerated with distance so a 10 cm rock is still
 * seen from a kilometre away.
 */
export class WrathView {
  readonly group = new THREE.Group();
  private readonly shots = new Map<number, Shot>();
  private readonly flashes: Flash[] = [];
  private readonly shells = new Map<string, THREE.Mesh>();
  private readonly ramLines = new Map<string, { aimLine: THREE.Line; trail: THREE.Line; mark: THREE.Mesh }>();
  private clock = 0;
  private readonly rockGeo = new THREE.IcosahedronGeometry(1, 0);
  private readonly ballGeo = new THREE.SphereGeometry(1, 12, 8);

  constructor(scene: THREE.Scene) {
    this.group.name = "wrath";
    scene.add(this.group);
  }

  /** Projectiles in flight now, events since the last frame, and the angry asteroids' reach shells. */
  update(dt: number, camera: THREE.Camera, projectiles: readonly Projectile[], events: readonly WrathEvent[], shells: readonly { id: string; centre: Vec3; radiusM: number; level: number }[], rams: readonly RamView[] = []): void {
    this.clock += dt;
    for (const s of this.shots.values()) s.seen = false;
    const cam = camera.getWorldPosition(new THREE.Vector3());
    for (const p of projectiles) {
      let s = this.shots.get(p.id);
      if (!s) s = this.addShot(p);
      s.seen = true;
      const pos = v3(p.position);
      s.mesh.position.copy(pos);
      const apparent = Math.max(p.radiusM, cam.distanceTo(pos) * 0.01);
      s.mesh.scale.setScalar(apparent);
      s.mesh.rotation.x += dt * 2;
      s.mesh.rotation.y += dt * 1.3;
      s.points.push(pos.clone());
      if (s.points.length > TRAIL) s.points.shift();
      s.trail.geometry.setFromPoints(s.points);
    }
    for (const [id, s] of this.shots) if (!s.seen) this.removeShot(id, s);
    for (const e of events) {
      if (e.type === "burst") this.burst(v3(e.position), e.kind, e.radiusM);
      if (e.type === "pulse") this.beam(v3(e.from), v3(e.to));
      if (e.type === "jet") this.jet(v3(e.from), v3(e.to));
      if (e.type === "ram-hit") this.impact(v3(e.position), e.fraction);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]!;
      f.age += dt;
      const t = f.age / f.life;
      f.update?.(t);
      if (t >= 1) {
        this.group.remove(f.obj);
        this.flashes.splice(i, 1);
      }
    }
    this.updateShells(shells);
    this.updateRams(rams, cam);
  }

  /**
   * A ram: a red line from the asteroid to where it aims (blinking while it winds up, solid once it
   * charges), a ring on the aim point and a streak along the way it has come.
   */
  private updateRams(rams: readonly RamView[], cam: THREE.Vector3): void {
    const live = new Set(rams.map((r) => r.asteroidId));
    for (const [id, l] of this.ramLines)
      if (!live.has(id)) {
        this.group.remove(l.aimLine, l.trail, l.mark);
        for (const o of [l.aimLine, l.trail, l.mark]) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
        this.ramLines.delete(id);
      }
    for (const r of rams) {
      let l = this.ramLines.get(r.asteroidId);
      if (!l) {
        const mat = (c: number, o: number) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, depthTest: false });
        const aimLine = new THREE.Line(new THREE.BufferGeometry(), mat(0xff3a2a, 1));
        const trail = new THREE.Line(new THREE.BufferGeometry(), mat(0xffb347, 0.8));
        const mark = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
        for (const o of [aimLine, trail, mark]) {
          o.frustumCulled = false;
          o.renderOrder = 10;
        }
        this.group.add(aimLine, trail, mark);
        l = { aimLine, trail, mark };
        this.ramLines.set(r.asteroidId, l);
      }
      const at = v3(r.at);
      const aim = v3(r.aim);
      l.aimLine.geometry.setFromPoints([at, aim]);
      l.trail.geometry.setFromPoints([v3(r.from), at]);
      l.trail.visible = r.phase === "embistiendo";
      const blink = r.phase === "preparando" ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.clock * 12)) : 1;
      (l.aimLine.material as THREE.LineBasicMaterial).opacity = blink;
      l.mark.position.copy(aim);
      l.mark.lookAt(cam);
      l.mark.scale.setScalar(Math.max(r.dodgeM * 0.15, cam.distanceTo(aim) * 0.04));
      (l.mark.material as THREE.MeshBasicMaterial).opacity = blink;
    }
  }

  /** The asteroid hits a craft: a white-orange flash that swells and fades. */
  private impact(at: THREE.Vector3, fraction: number): void {
    const ball = new THREE.Mesh(this.ballGeo, new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    ball.position.copy(at);
    this.group.add(ball);
    const size = 10 + 40 * Math.min(1, fraction);
    this.flashes.push({
      obj: ball,
      age: 0,
      life: 1.5,
      grow: size,
      update: (t) => {
        ball.scale.setScalar(Math.max(1, size * Math.sqrt(t)));
        (ball.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      },
    });
  }

  private addShot(p: Projectile): Shot {
    const colour = COLOURS[p.kind];
    const mesh = new THREE.Mesh(
      p.kind === "roca" ? this.rockGeo : this.ballGeo,
      p.kind === "roca" ? new THREE.MeshStandardMaterial({ color: 0x4a3c34, emissive: colour, emissiveIntensity: 0.6, roughness: 1, flatShading: true }) : new THREE.MeshBasicMaterial({ color: colour }),
    );
    const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.75, depthWrite: false }));
    trail.frustumCulled = false;
    // A glow around it so it reads at any distance.
    const glow = new THREE.Mesh(this.ballGeo, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(2.6);
    mesh.add(glow);
    this.group.add(mesh, trail);
    const s = { mesh, trail, points: [], seen: true };
    this.shots.set(p.id, s);
    return s;
  }

  private removeShot(id: number, s: Shot): void {
    this.group.remove(s.mesh, s.trail);
    s.trail.geometry.dispose();
    for (const o of [s.mesh, ...s.mesh.children]) ((o as THREE.Mesh).material as THREE.Material).dispose();
    (s.trail.material as THREE.Material).dispose();
    this.shots.delete(id);
  }

  private burst(at: THREE.Vector3, kind: "carga" | "nuclear", radiusM: number): void {
    const colour = kind === "nuclear" ? 0xeaffe0 : 0xffb347;
    const ball = new THREE.Mesh(this.ballGeo, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    ball.position.copy(at);
    this.group.add(ball);
    this.flashes.push({
      obj: ball,
      age: 0,
      life: kind === "nuclear" ? 2.5 : 1.2,
      grow: radiusM,
      update: (t) => {
        ball.scale.setScalar(Math.max(0.5, radiusM * Math.sqrt(t)));
        (ball.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      },
    });
    // Fragment cloud: points flying out at the same speed in every direction.
    const n = 120;
    const dirs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      dirs.set([r * Math.cos(a), u, r * Math.sin(a)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: colour, size: 3, sizeAttenuation: false, transparent: true, depthWrite: false }));
    pts.position.copy(at);
    pts.frustumCulled = false;
    this.group.add(pts);
    this.flashes.push({
      obj: pts,
      age: 0,
      life: 2,
      grow: radiusM,
      update: (t) => {
        for (let i = 0; i < n * 3; i++) pos[i] = dirs[i]! * radiusM * 1.6 * t;
        geo.attributes.position!.needsUpdate = true;
        (pts.material as THREE.PointsMaterial).opacity = 1 - t;
      },
    });
  }

  private beam(from: THREE.Vector3, to: THREE.Vector3): void {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc58bff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.frustumCulled = false;
    this.group.add(line);
    this.flashes.push({ obj: line, age: 0, life: 0.8, grow: 0, update: (t) => ((line.material as THREE.LineBasicMaterial).opacity = 1 - t) });
  }

  /** A comet's jet: a pale cone of gas and dust from the vent toward the target, fading out. */
  private jet(from: THREE.Vector3, to: THREE.Vector3): void {
    const len = from.distanceTo(to);
    const geo = new THREE.ConeGeometry(Math.tan(Math.PI / 18) * len, len, 24, 1, true);
    // The cone's apex at the vent, opening toward the target.
    geo.translate(0, -len / 2, 0);
    geo.rotateX(Math.PI);
    const cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    cone.position.copy(from);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    cone.frustumCulled = false;
    this.group.add(cone);
    this.flashes.push({ obj: cone, age: 0, life: 3, grow: 0, update: (t) => ((cone.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t)) });
  }

  private updateShells(shells: readonly { id: string; centre: Vec3; radiusM: number; level: number }[]): void {
    const live = new Set(shells.map((s) => s.id));
    for (const [id, m] of this.shells)
      if (!live.has(id)) {
        this.group.remove(m);
        this.shells.delete(id);
      }
    for (const s of shells) {
      let m = this.shells.get(s.id);
      if (!m) {
        m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: 0xff4a3a, wireframe: true, transparent: true, opacity: 0.12, depthWrite: false }));
        this.shells.set(s.id, m);
        this.group.add(m);
      }
      m.position.set(s.centre.x, s.centre.y, s.centre.z);
      m.scale.setScalar(s.radiusM);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.05 + 0.12 * s.level;
    }
  }
}
