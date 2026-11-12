import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import type { CubeFigure } from "./figure";
import { buildSpoke, spokeLayout, type SpokeHandles, type SpokeLayout } from "./spoke";

/** Where Doménica is: on the ring floor (walking), in the spoke elevator, or floating at the axis. */
export type GravityZone = "anillo" | "radio" | "eje";

/** Game tuning for moving about in microgravity and riding the spoke elevator. */
const TUNING = {
  /** Push from the handrails, m/s², and the most she lets herself drift. */
  floatPush: 0.9,
  floatMaxSpeed: 1.6,
  /** Holding the rails lightly: drift fades by this fraction per second without input. */
  floatDamping: 0.35,
  /**
   * Elevator: top speed and acceleration. Kept slow on purpose: riding a spoke at v gives a sideways
   * Coriolis push of 2ωv (0.17 g at 2 m/s and 4 rpm), so the 52 m ride takes about half a minute.
   */
  carSpeed: 2,
  carAccel: 0.5,
} as const;

const fmt = (v: number, d = 2) => v.toFixed(d).replace(".", ",");

/**
 * Gravity zones of the interior: the spoke elevator, the floating hub/spine and the HUD line with
 * the gravity felt where Doménica is. The ring floor keeps the walking code in interior.ts.
 */
export class GravityZones {
  zone: GravityZone = "anillo";
  readonly layout: SpokeLayout;
  private readonly spoke: SpokeHandles;
  /** Body centre while floating (eje), car floor while riding (radio). */
  private readonly p = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private carY = 0;
  private carV = 0;
  private carTarget = 0;
  private autoDown = false;
  private upDown = 0;
  private readonly keys = new Set<string>();
  private readonly ui: HTMLElement;
  private readonly actionBtn: HTMLButtonElement;
  private readonly throwBtn: HTMLButtonElement;
  private action: (() => void) | null = null;
  private ball: { mesh: THREE.Mesh; points: THREE.Vector3[]; t: number; total: number; note: string } | null = null;
  private readonly ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2d32c, roughness: 0.6 }));
  private view = { yaw: 0, pitch: 0, pos: new THREE.Vector3() };
  enabled = false;
  /** Called when she goes through the hatch at the end of the spine. */
  onCockpit?: () => void;
  /** Called at the side hatch of the spine module that leads to the mothership's flight deck. */
  onFlightDeck?: () => void;

  constructor(
    container: HTMLElement,
    scene: THREE.Scene,
    readonly ring: SpinRing,
    roomHalfL: number,
    roomHeight: number,
    private readonly say: (text: string) => void,
  ) {
    this.layout = spokeLayout(ring, roomHalfL);
    this.spoke = buildSpoke(this.layout, ring, roomHeight);
    scene.add(this.spoke.group);
    this.ballMesh.visible = false;
    scene.add(this.ballMesh);
    this.ui = document.createElement("div");
    this.ui.className = "zones-ui";
    this.ui.innerHTML = `<button class="zone-btn hidden"></button><button class="throw-btn hidden">Lanzar pelota</button><div class="updown hidden"><button class="zg-up" aria-label="Subir">▲</button><button class="zg-down" aria-label="Bajar">▼</button></div>`;
    container.appendChild(this.ui);
    this.actionBtn = this.ui.querySelector(".zone-btn")!;
    this.throwBtn = this.ui.querySelector(".throw-btn")!;
    this.actionBtn.addEventListener("click", () => this.action?.());
    this.throwBtn.addEventListener("click", () => this.throwBall());
    for (const [cls, dir] of [
      [".zg-up", 1],
      [".zg-down", -1],
    ] as const) {
      const b = this.ui.querySelector<HTMLButtonElement>(cls)!;
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.upDown = dir;
        if (this.zone === "radio") this.sendCar(dir > 0 ? "up" : "down");
      });
      const stop = () => this.upDown === dir && (this.upDown = 0);
      b.addEventListener("pointerup", stop);
      b.addEventListener("pointerleave", stop);
      b.addEventListener("pointercancel", stop);
    }
    window.addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (this.zone === "radio" && (e.code === "KeyR" || e.code === "KeyF")) this.sendCar(e.code === "KeyR" ? "up" : "down");
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }

  /** The elevator column in the room is solid. */
  blocks(x: number, z: number): boolean {
    return Math.hypot(x - this.layout.x, z - this.layout.z) < this.layout.carR + 0.35;
  }

  /** Gravity felt at a walking position (feet on the floor) or, off the ring, where she is now, in g. */
  gravityG(): number {
    const L = this.layout;
    if (this.zone === "anillo") return this.ring.gravityG(L.axisY);
    if (this.zone === "radio") return this.ring.gravityG(L.axisY - this.carY);
    if (this.p.x > L.hubHalfX) return 0; // the spine does not turn
    return this.ring.gravityG(Math.hypot(this.p.y - L.axisY, this.p.z - L.z));
  }

  /** One HUD line: gravity here, the ring's spin and, in the spoke, the Coriolis push. */
  hudLine(): string {
    const g = this.gravityG();
    const spin = `anillo a ${fmt(this.ring.rpm, 1)} rpm, r = ${this.ring.spec.floorRadiusM} m`;
    if (this.zone === "anillo") {
      const head = this.ring.gravityAtHeight(1.6) / this.ring.gravityAtHeight(0);
      return `Gravedad ${fmt(g)} g en los pies, ${fmt(g * head)} g en la cabeza · ${spin}`;
    }
    if (this.zone === "radio") {
      const cor = this.ring.coriolis(new Vec3(0, this.carV, 0)).length();
      return `Radio: ${fmt(this.layout.axisY - this.carY, 0)} m del eje · gravedad ${fmt(g)} g${cor > 0.01 ? ` · Coriolis ${fmt(cor)} m/s² hacia un lado` : ""}`;
    }
    return this.p.x > this.layout.hubHalfX ? "Espina: no gira · 0 g (ingravidez)" : `Eje: ${fmt(g, 3)} g · aún gira con el anillo`;
  }

  /** Every frame. `pos` is the interior's walking position (shared; written when she comes back to the ring). */
  update(dt: number, pos: THREE.Vector3, yaw: number, pitch: number, move: { forward: number; right: number }, busy: boolean): void {
    this.view = { yaw, pitch, pos };
    this.spoke.bearing.rotation.x += this.ring.omegaRadS * dt;
    this.updateBall(dt);
    const L = this.layout;
    if (this.zone === "radio") this.rideCar(dt, pos);
    else if (this.zone === "eje") this.float(dt, yaw, pitch, move);
    this.spoke.car.position.y = this.zone === "radio" ? this.carY : this.zone === "eje" ? L.topY : 0;
    // Context button.
    this.action = null;
    let label = "";
    if (!busy && this.zone === "anillo" && Math.hypot(pos.x - L.x, pos.z - L.z) < 1.25) {
      label = "Subir al eje por el radio";
      this.action = () => this.ride("up", pos);
    } else if (this.zone === "eje" && !this.autoDown && this.p.distanceTo(new THREE.Vector3(L.x, L.axisY - 0.6, L.z)) < 1.4) {
      label = "Bajar al anillo";
      this.action = () => this.descend();
    } else if (this.zone === "eje" && this.onFlightDeck && Math.abs(this.p.x - L.deckHatchX) < 1.6) {
      label = "Ir al puente de mando";
      this.action = () => this.onFlightDeck?.();
    } else if (this.zone === "eje" && this.p.x > L.moduleEndX - 2.5) {
      label = "Ir a la cabina de la sonda";
      this.action = () => this.onCockpit?.();
    }
    this.actionBtn.classList.toggle("hidden", !this.action);
    this.actionBtn.textContent = label;
    this.throwBtn.classList.toggle("hidden", busy || this.zone !== "anillo" || this.ring.omegaRadS === 0);
    this.ui.querySelector(".updown")!.classList.toggle("hidden", this.zone === "anillo");
    document.body.classList.toggle("in-zero-g", this.enabled && this.zone === "eje");
  }

  /** Go back down to the ring (also used when a chore is picked from the hub). */
  descend(): void {
    if (this.zone === "radio") return this.sendCar("down");
    if (this.zone === "eje") this.autoDown = true;
  }

  private ride(dir: "up" | "down", pos: THREE.Vector3): void {
    this.zone = "radio";
    this.carY = dir === "up" ? 0 : this.layout.topY;
    this.carV = 0;
    pos.set(this.layout.x, 0, this.layout.z);
    this.sendCar(dir);
    if (dir === "up") this.say("Subes por el radio: la gravedad baja con la distancia al eje (a = ω²r)");
  }

  private sendCar(dir: "up" | "down"): void {
    this.carTarget = dir === "up" ? this.layout.topY : 0;
  }

  private rideCar(dt: number, pos: THREE.Vector3): void {
    const L = this.layout;
    const to = this.carTarget - this.carY;
    const want = Math.sign(to) * Math.min(TUNING.carSpeed, Math.sqrt(2 * TUNING.carAccel * Math.abs(to)));
    const dv = Math.max(-TUNING.carAccel * dt, Math.min(TUNING.carAccel * dt, want - this.carV));
    this.carV += dv;
    this.carY += this.carV * dt;
    if (Math.abs(this.carTarget - this.carY) < 0.02 && Math.abs(this.carV) < 0.15) {
      this.carY = this.carTarget;
      this.carV = 0;
      if (this.carTarget === L.topY) {
        this.zone = "eje";
        this.p.set(L.x, L.axisY - 0.5, L.z);
        this.v.set(0, 0.25, 0);
        this.say("Ingravidez: muévete con el mando y ▲▼; el pasamanos te frena");
      } else if (this.carTarget === 0) {
        this.zone = "anillo";
        pos.set(L.x, 0, L.z + 0.9);
        this.say(`De vuelta en el anillo: ${fmt(this.ring.gravityG(L.axisY))} g`);
      }
    }
  }

  private float(dt: number, yaw: number, pitch: number, move: { forward: number; right: number }): void {
    const L = this.layout;
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    const up = Math.max(-1, Math.min(1, this.upDown + k("KeyR") + k("Space") - k("KeyF") - k("ShiftLeft")));
    let push: THREE.Vector3;
    if (this.autoDown) {
      // Pull herself along the rails to the hatch over the spoke, then into the car.
      const hatch = new THREE.Vector3(L.x, L.topY + 1.2, L.z);
      const to = hatch.clone().sub(this.p);
      if (to.length() < 0.25) {
        this.autoDown = false;
        this.zone = "radio";
        this.carY = L.topY;
        this.carV = 0;
        this.sendCar("down");
        return;
      }
      push = to.normalize().multiplyScalar(TUNING.floatPush * 2);
      this.v.multiplyScalar(Math.exp(-2 * dt));
    } else {
      const fwd = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const camUp = new THREE.Vector3().crossVectors(right, fwd).normalize();
      push = fwd.multiplyScalar(move.forward).addScaledVector(right, move.right).addScaledVector(camUp, up).multiplyScalar(TUNING.floatPush);
      if (push.lengthSq() === 0) this.v.multiplyScalar(Math.exp(-TUNING.floatDamping * dt));
    }
    // In the rotating hub, centrifugal and Coriolis still act (weakly); the spine does not turn.
    if (this.p.x <= L.hubHalfX) {
      const a = this.ring.apparentAcceleration(new Vec3(0, this.p.y - L.axisY, this.p.z - L.z), new Vec3(this.v.x, this.v.y, this.v.z));
      push.add(new THREE.Vector3(a.x, a.y, a.z));
    }
    this.v.addScaledVector(push, dt);
    if (this.v.length() > TUNING.floatMaxSpeed) this.v.setLength(TUNING.floatMaxSpeed);
    const prev = this.p.clone();
    this.p.addScaledVector(this.v, dt);
    if (!this.insideFloat(this.p, 0.45)) {
      this.p.copy(prev);
      this.v.multiplyScalar(-0.3);
    }
  }

  /** Inside the hub, the spine module or the top of the shaft, keeping `margin` from the walls. */
  private insideFloat(q: THREE.Vector3, margin: number): boolean {
    const L = this.layout;
    const r = Math.hypot(q.y - L.axisY, q.z - L.z);
    const tube = q.x > -L.hubHalfX + margin && q.x < L.moduleEndX - margin && r < L.tubeR - margin;
    const shaft = Math.hypot(q.x - L.x, q.z - L.z) < L.shaftR - Math.min(margin, 0.3) && q.y > L.topY + 0.9 && q.y <= L.axisY;
    return tube || shaft;
  }

  /** Place the avatar and camera off the ring. Returns false on the ring (interior.ts does it). */
  placeCamera(camera: THREE.PerspectiveCamera, rig: THREE.Group, avatar: CubeFigure, yaw: number, pitch: number, third: boolean): boolean {
    if (this.zone === "anillo") return false;
    const L = this.layout;
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    rig.visible = third;
    if (this.zone === "radio") {
      rig.position.set(L.x, this.carY, L.z);
      rig.rotation.set(0, yaw + Math.PI, 0);
      avatar.pose("stand");
      avatar.update(1 / 60, 10);
      if (!third) {
        camera.position.set(L.x, this.carY + 1.6, L.z);
        camera.rotation.set(pitch, yaw, 0, "YXZ");
        return true;
      }
      // From low in the car, looking up the shaft past her: the spoke runs up to the axis.
      const side = new THREE.Vector3(-Math.sin(yaw + 0.9), 0, -Math.cos(yaw + 0.9)).multiplyScalar(0.7);
      const portrait = camera.aspect < 1;
      camera.position.set(L.x + side.x, this.carY + (portrait ? 0.9 : 0.25), L.z + side.z);
      camera.up.set(0, 1, 0);
      camera.lookAt(L.x - side.x * 0.3, this.carY + (portrait ? 8 : 4.5), L.z - side.z * 0.3);
      return true;
    }
    // Floating: body roughly along the look direction, in the neutral posture astronauts relax into.
    avatar.pose("float");
    avatar.update(1 / 60, 4);
    const tilt = Math.max(0.2, Math.min(2.6, 1.3 - pitch));
    rig.quaternion.setFromEuler(new THREE.Euler(tilt, yaw + Math.PI, 0, "YXZ"));
    const centre = new THREE.Vector3(0, 0.9, 0).applyQuaternion(rig.quaternion);
    rig.position.copy(this.p).sub(centre);
    if (!third) {
      camera.position.copy(this.p);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      return true;
    }
    const cam = new THREE.Vector3();
    for (let d = 2.4; d > 0.4; d -= 0.1) {
      cam.copy(this.p).addScaledVector(dir, -d).add(new THREE.Vector3(0, 0.25, 0));
      if (this.insideFloat(cam, 0.15)) break;
    }
    camera.position.copy(cam);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.p.clone().addScaledVector(dir, 1.2));
    return true;
  }

  /** Throw the ball from her hand: on a spinning floor its path bends (Coriolis). */
  private throwBall(): void {
    const { yaw, pitch, pos } = this.view;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const speed = 4;
    const lift = Math.max(0.3, Math.min(0.9, 0.45 + pitch));
    const v = new Vec3(fwd.x * speed * Math.cos(lift), speed * Math.sin(lift), fwd.z * speed * Math.cos(lift));
    const h = 1.3;
    const r = this.ring.release(new Vec3(0, h, 0), v, 40);
    if (!r) return;
    const flat = this.ring.flatLanding(new Vec3(0, h, 0), v);
    const start = pos.clone().addScaledVector(fwd, 0.35);
    const off = Math.hypot(r.landing.x - flat.x, r.landing.z - flat.z);
    const along = r.landing.z - flat.z;
    this.ball = {
      mesh: this.ballMesh,
      points: r.points.map((q) => new THREE.Vector3(start.x + q.x, Math.max(0.06, q.y), start.z + q.z)),
      t: 0,
      total: r.timeS,
      note: `Coriolis: la pelota cae a ${fmt(off * 100, 0)} cm de donde caería sin giro (${along < 0 ? "hacia atrás del giro" : "hacia delante del giro"})`,
    };
    this.ballMesh.visible = true;
  }

  private updateBall(dt: number): void {
    const b = this.ball;
    if (!b) return;
    b.t = Math.min(b.total, b.t + dt);
    const f = (b.t / b.total) * (b.points.length - 1);
    const i = Math.min(b.points.length - 2, Math.floor(f));
    b.mesh.position.lerpVectors(b.points[i]!, b.points[i + 1]!, f - i);
    if (b.t >= b.total) {
      this.say(b.note);
      this.ball = null;
    }
  }
}
