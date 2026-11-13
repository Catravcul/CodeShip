import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import { discRails, RailGraph, tubeRails, type Handrail } from "@modules/gravity/domain/handrails";
import { IVA, ivaStep, startAt, type IvaEvent, type IvaState, type IvaWorld } from "@modules/gravity/domain/iva";
import { ZeroGControls } from "../../input/zero-g-controls";
import type { CubeFigure } from "./figure";
import { buildRails, FloatingBody, motionLabel } from "./zero-g-body";
import { buildSpoke, spokeLayout, type SpokeHandles, type SpokeLayout } from "./spoke";

/** Where Doménica is: on the ring floor (walking), in the spoke elevator, or floating at the axis. */
export type GravityZone = "anillo" | "radio" | "eje";

/** Game tuning for riding the spoke elevator (floating uses the shared rail movement, gravity/domain/iva.ts). */
const TUNING = {
  /**
   * Elevator: top speed and acceleration. Kept slow on purpose: riding a spoke at v gives a sideways
   * Coriolis push of 2ωv (0.17 g at 2 m/s and 4 rpm), so the 52 m ride takes about half a minute.
   */
  carSpeed: 2,
  carAccel: 0.5,
  /** Going down for a chore picked in 0 g: she pulls herself hand over hand along the rails (game value, brisker than a free glide). */
  railPull: 1.5,
} as const;

const fmt = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
/** Game value: the air in the hub and spine drifts toward the cockpit end at 0,1 m/s (NASA-STD-3001 V2 6107: 0,08–0,61 m/s). */
const AIR = new Vec3(0.1, 0, 0);
/** Body margin from the walls while floating, m. */
const BODY = 0.45;

/**
 * Handrails of the hub and the spine (docs/design/ingravidez.md): eight rows round the wall (one every ~1,5 m), one bar
 * per rack bay, separate on each side of the bearing; bars round the hatches at both ends; and an
 * upright bar at the top of the shaft, by the ladder, to hold on when the elevator arrives.
 */
export function axisHandrails(L: SpokeLayout): Handrail[] {
  return [
    ...tubeRails("cubo", L.axisY, L.z, L.tubeR, -L.hubHalfX + 0.2, L.hubHalfX - 0.2, 8, Math.PI / 8),
    ...tubeRails("espina", L.axisY, L.z, L.tubeR, L.hubHalfX + 0.2, L.moduleEndX - 0.2, 8, Math.PI / 8),
    ...discRails("cubo-fondo", -L.hubHalfX, 1, L.axisY, L.z, 1.1),
    ...discRails("espina-fondo", L.moduleEndX, -1, L.axisY, L.z, 1.1),
    { id: "pozo", a: new Vec3(L.x, L.topY + 1.15, L.z - L.shaftR + 0.08), b: new Vec3(L.x, L.axisY - L.tubeR - 0.1, L.z - L.shaftR + 0.08), normal: new Vec3(0, 0, 1) },
  ];
}

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
  /** Floating at the axis: rails only (docs/design/ingravidez.md). */
  private iva: IvaState = { position: Vec3.ZERO, velocity: Vec3.ZERO, motion: { kind: "deriva" } };
  private readonly graph: RailGraph;
  private readonly world: IvaWorld;
  private readonly zg: ZeroGControls;
  private body: FloatingBody | null = null;
  private carY = 0;
  private carV = 0;
  private carTarget = 0;
  private autoDown = false;
  private upDown = 0;
  private readonly keys = new Set<string>();
  private readonly ui: HTMLElement;
  private readonly actionBtn: HTMLButtonElement;
  private readonly actionBtn2: HTMLButtonElement;
  private action2: (() => void) | null = null;
  private readonly throwBtn: HTMLButtonElement;
  private action: (() => void) | null = null;
  private ball: { mesh: THREE.Mesh; points: THREE.Vector3[]; t: number; total: number; note: string } | null = null;
  private readonly ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2d32c, roughness: 0.6 }));
  private view = { yaw: 0, pitch: 0, pos: new THREE.Vector3() };
  enabled = false;
  /**
   * The docking hatches at the end of the spine, as they are now: down to the lander when it is
   * docked here, across to the station when the ship is berthed there. Empty: the hatch is shut.
   */
  endHatches?: () => readonly { label: string; go: () => void }[];
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
    this.graph = new RailGraph(axisHandrails(this.layout));
    scene.add(buildRails(this.graph.rails));
    this.world = {
      graph: this.graph,
      fits: (q) => this.insideFloat(new THREE.Vector3(q.x, q.y, q.z), BODY),
      // In the rotating hub, centrifugal and Coriolis still act (weakly); the spine does not turn.
      extra: (q, v) => (q.x <= this.layout.hubHalfX ? this.ring.apparentAcceleration(new Vec3(0, q.y - this.layout.axisY, q.z - this.layout.z), v) : Vec3.ZERO),
      air: () => AIR,
    };
    this.ballMesh.visible = false;
    scene.add(this.ballMesh);
    this.ui = document.createElement("div");
    this.ui.className = "zones-ui";
    this.ui.innerHTML = `<button class="zone-btn hidden"></button><button class="zone-btn zone-btn2 hidden"></button><button class="throw-btn hidden">Lanzar pelota</button><div class="updown hidden"><button class="zg-up" aria-label="Subir">▲</button><button class="zg-down" aria-label="Bajar">▼</button></div>`;
    container.appendChild(this.ui);
    this.zg = new ZeroGControls(container);
    this.actionBtn = this.ui.querySelector(".zone-btn")!;
    this.throwBtn = this.ui.querySelector(".throw-btn")!;
    this.actionBtn2 = this.ui.querySelector(".zone-btn2")!;
    this.actionBtn.addEventListener("click", () => this.action?.());
    this.actionBtn2.addEventListener("click", () => this.action2?.());
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
    const where = this.p.x > this.layout.hubHalfX ? "Espina: no gira · 0 g (ingravidez)" : `Eje: ${fmt(g, 3)} g · aún gira con el anillo`;
    return `${where} · ${motionLabel(this.iva)}`;
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
    this.action2 = null;
    let label = "";
    let label2 = "";
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
      const [a, b] = this.endHatches?.() ?? [];
      if (a) [label, this.action] = [a.label, a.go];
      if (b) [label2, this.action2] = [b.label, b.go];
      if (!a && this.p.x > L.moduleEndX - 1.2) label = "Escotilla cerrada: no hay nada acoplado";
    }
    this.actionBtn.classList.toggle("hidden", !label);
    this.actionBtn.classList.toggle("info", !this.action);
    this.actionBtn.textContent = label;
    this.actionBtn2.classList.toggle("hidden", !this.action2);
    if (this.actionBtn2.textContent !== label2) this.actionBtn2.textContent = label2;
    this.throwBtn.classList.toggle("hidden", busy || this.zone !== "anillo" || this.ring.omegaRadS === 0);
    this.ui.querySelector(".updown")!.classList.toggle("hidden", this.zone !== "radio");
    const floating = this.enabled && this.zone === "eje" && !this.autoDown;
    this.zg.show(floating, floating && this.iva.motion.kind === "planeo" && !!this.graph.nearest(this.iva.position, IVA.reachM));
    document.body.classList.toggle("in-zero-g", this.enabled && this.zone === "eje");
  }

  /** Come aboard through the docking hatch at the end of the spine (floating, weightless). */
  arriveAtHatch(): void {
    const L = this.layout;
    this.zone = "eje";
    this.autoDown = false;
    // She comes in holding the bars round the hatch.
    this.iva = startAt(this.graph, new Vec3(L.moduleEndX - 1.6, L.axisY, L.z));
    this.p.set(this.iva.position.x, this.iva.position.y, this.iva.position.z);
    this.body?.reset();
    this.say("Entras por la escotilla de la espina: 0 g. El anillo está al otro lado del eje");
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
        // She comes out of the car holding the bar by the ladder.
        this.iva = startAt(this.graph, new Vec3(L.x, L.axisY - 0.5, L.z));
        this.p.set(this.iva.position.x, this.iva.position.y, this.iva.position.z);
        this.body?.reset();
        this.say("Ingravidez: agárrate a los asideros e impúlsate. En el aire no se frena ni se gira hasta el siguiente asidero");
      } else if (this.carTarget === 0) {
        this.zone = "anillo";
        pos.set(L.x, 0, L.z + 0.9);
        this.say(`De vuelta en el anillo: ${fmt(this.ring.gravityG(L.axisY))} g`);
      }
    }
  }

  private float(dt: number, yaw: number, pitch: number, move: { forward: number; right: number }): void {
    const L = this.layout;
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
      this.p.addScaledVector(to.normalize(), Math.min(to.length(), TUNING.railPull * dt));
      this.iva = { position: new Vec3(this.p.x, this.p.y, this.p.z), velocity: new Vec3(to.x, to.y, to.z).scale(TUNING.railPull), motion: { kind: "planeo" } };
      return;
    }
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    const up = Math.max(-1, Math.min(1, this.upDown + k("KeyR") - k("KeyF")));
    const fwd = new Vec3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const right = new Vec3(Math.cos(yaw), 0, -Math.sin(yaw));
    const camUp = right.cross(fwd).normalize();
    const stick = fwd.scale(move.forward).add(right.scale(move.right)).add(camUp.scale(up));
    const strength = this.zg.takePush();
    const push = strength ? { dir: stick.length() > 0.2 ? stick : fwd, strength } : undefined;
    const r = ivaStep(this.iva, { ...(push ? { push } : {}), along: stick, grab: this.zg.takeGrab() }, this.world, dt);
    this.iva = r.state;
    this.p.set(r.state.position.x, r.state.position.y, r.state.position.z);
    for (const e of r.events) this.tell(e);
  }

  private tell(e: IvaEvent): void {
    const n = (x: number) => fmt(x, 1);
    if (e.kind === "impulso" && e.speed > IVA.glide.suave) this.say(`Impulso fuerte: ${n(e.speed)} m/s, unos ${Math.round(e.forceN)} N en los brazos`);
    else if (e.kind === "agarra" && e.speed > 0.7) this.say(`Llegas a ${n(e.speed)} m/s: frenas con unos ${Math.round(e.forceN)} N en los brazos`);
    else if (e.kind === "pared") this.say("Te paras contra la pared con las manos: desde aquí también puedes impulsarte");
    else if (e.kind === "golpe") this.say(`¡Golpe contra la pared a ${n(e.speed)} m/s! Rebotas`);
    else if (e.kind === "deriva") this.say("A la deriva: no llegas a nada. Solo te mueve el aire de la ventilación, muy despacio");
    else if (e.kind === "sin-impulso")
      this.say(e.why === "en-vuelo" ? "En el aire no puedes cambiar de rumbo: espera al próximo asidero o pulsa «Agarrarse»" : e.why === "contra-la-pared" ? "No puedes empujarte hacia la pared que sujetas" : "No hay nada en lo que apoyarse: el aire te llevará a una pared");
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
    // Floating: holding rails, pushing off, gliding head first (docs/design/ingravidez.md).
    this.body ??= new FloatingBody(rig);
    this.body.update(avatar, this.iva, this.graph, dir, 1 / 60);
    if (!third) {
      camera.position.copy(this.p);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      return true;
    }
    // Follow her body as drawn (a hand on a rail shifts it off the physics point).
    const seen = this.body.centre();
    const at = this.insideFloat(seen, 0.15) ? seen : this.p;
    const cam = new THREE.Vector3();
    // In flight, from a little higher, so her stretched-out body reads from the side and not only from her soles.
    const k = this.iva.motion.kind;
    const lift = k === "planeo" || k === "impulso" || k === "agarrando" ? 0.8 : 0;
    // Back along the view; where a wall is close behind her, also rise above her to keep her in sight.
    for (let d = 2.4; d > 0.4; d -= 0.1) {
      cam.copy(at).addScaledVector(dir, -d).add(new THREE.Vector3(0, 0.25 + lift + Math.max(0, 2.4 - d) * 0.6, 0));
      if (this.insideFloat(cam, 0.15)) break;
    }
    camera.position.copy(cam);
    camera.up.set(0, 1, 0);
    camera.lookAt(at.clone().addScaledVector(dir, 1.2));
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
