import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import { RailGraph, type Handrail } from "@modules/gravity/domain/handrails";
import { ivaStep, type IvaEvent, type IvaState, type IvaWorld } from "@modules/gravity/domain/iva";
import { HopGraph, type LandingPoint } from "@modules/gravity/domain/hops";
import { spineFits, spineHandrails, spineLaunchers, spinePois, type SpinePoi } from "@modules/gravity/data/spine";
import { RING_ELEVATOR, RING_REACH_M } from "@modules/habitat/data/ring-module";
import { HopControl } from "./hop-control";
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
} as const;

const fmt = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
/** Game value: the air in the hub and spine drifts toward the cockpit end at 0,1 m/s (NASA-STD-3001 V2 6107: 0,08–0,61 m/s). */
const AIR = new Vec3(0.1, 0, 0);
/** Body margin from the walls while floating, m. */
const BODY = 0.45;
/** Furthest the third-person camera sits behind her in the hub and spine, m (the tube is 5,5 m across). */
const CAMERA_BACK_M = 3.2;

/** Handrails of the hub and the spine, with a grab point at every point of interest, ladders and launchers (gravity/data/spine.ts). */
export function axisHandrails(L: SpokeLayout): Handrail[] {
  return spineHandrails(L);
}

/** The tag on each thing one can tap in the hub and spine: an amber ring with a dot (shared material). */
function poiIcon(): THREE.SpriteMaterial {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = "#ffc24a";
  ctx.lineWidth = 7;
  ctx.fillStyle = "#1a1206aa";
  ctx.beginPath();
  ctx.arc(32, 32, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffc24a";
  ctx.beginPath();
  ctx.arc(32, 32, 9, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
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
  private readonly hops: HopGraph;
  private readonly world: IvaWorld;
  private readonly hop: HopControl;
  /** The things one can use in the hub and spine, and invisible boxes to tap them. */
  private readonly pois: readonly SpinePoi[];
  private readonly picks: THREE.Object3D[] = [];
  private camera: THREE.Camera | null = null;
  private tap: { id: number; x: number; y: number; t: number } | null = null;
  /** Climbing a ladder this frame (for the HUD). */
  private climbing = false;
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
  /** Where the camera was last frame (to hide hop markers right by it). */
  private readonly eye = new THREE.Vector3();
  private on = false;
  /** Inside the mothership (false in the cockpit and elsewhere: the arrow pad hides). */
  get enabled(): boolean {
    return this.on;
  }
  set enabled(v: boolean) {
    this.on = v;
    if (!v) this.hop?.hide();
  }
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
    this.hops = new HopGraph(this.graph, (q) => this.insideFloat(new THREE.Vector3(q.x, q.y, q.z), BODY), [], spineLaunchers());
    this.hop = new HopControl(container, scene);
    this.hop.setGraph(this.hops);
    this.hop.onArrive = (id) => this.arrived(id);
    // Each point of interest: an invisible sphere to tap (the tap chains hops to its grab point).
    this.pois = spinePois(this.layout);
    // The ladders can be tapped too: she hops to the rung nearest the tap.
    for (const r of this.graph.rails.filter((x) => x.ladder)) {
      const a = new THREE.Vector3(r.a.x, r.a.y, r.a.z);
      const b = new THREE.Vector3(r.b.x, r.b.y, r.b.z);
      const len = a.distanceTo(b);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, len, 6), new THREE.MeshBasicMaterial({ visible: false }));
      hit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      hit.position.copy(a).add(b).multiplyScalar(0.5);
      hit.userData.ladder = r.id;
      scene.add(hit);
      this.picks.push(hit);
    }
    const icon = poiIcon();
    for (const p of this.pois) {
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(p.centre.x, p.centre.y, p.centre.z);
      hit.userData.poi = p.id;
      scene.add(hit);
      this.picks.push(hit);
      // A small round tag on it, so the things one can tap read from down the spine.
      const tag = new THREE.Sprite(icon);
      tag.scale.set(0.3, 0.3, 1);
      const inward = new THREE.Vector3(0, this.layout.axisY - p.centre.y, this.layout.z - p.centre.z);
      if (inward.lengthSq() > 1e-6) inward.normalize().multiplyScalar(0.35);
      else inward.set(-0.35, 0, 0);
      tag.position.set(p.centre.x + inward.x, p.centre.y + inward.y, p.centre.z + inward.z);
      tag.renderOrder = 4;
      scene.add(tag);
    }
    // A short tap on the canvas, on a thing in the hub or spine: she hops there by herself (dragging looks around).
    window.addEventListener("pointerdown", (e) => {
      if (!this.enabled || this.zone !== "eje" || (e.target as HTMLElement).tagName !== "CANVAS") return;
      this.tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    });
    window.addEventListener("pointerup", (e) => {
      const t = this.tap;
      this.tap = null;
      if (!t || t.id !== e.pointerId || !this.enabled || this.zone !== "eje") return;
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 || performance.now() - t.t > 450) return;
      const hit = this.pickAt(e.clientX, e.clientY);
      if (hit?.poi) this.goToPoi(hit.poi);
      else if (hit?.ladder) this.goToLadder(hit.ladder, hit.point);
    });
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
    const m = this.iva.motion;
    const ladder = m.kind === "sujeta" && this.graph.rail(m.rail).ladder;
    const poi = this.heldPoi()?.label;
    return `${where} · ${motionLabel(this.iva, { ...(poi ? { poi } : {}), ...(ladder ? { ladder: true } : {}), climbing: this.climbing })}`;
  }

  /** Every frame. `pos` is the interior's walking position (shared; written when she comes back to the ring). */
  update(dt: number, pos: THREE.Vector3, yaw: number, pitch: number, move: { forward: number; right: number }, busy: boolean): void {
    this.view = { yaw, pitch, pos };
    this.spoke.bearing.rotation.x += this.ring.omegaRadS * dt;
    this.updateBall(dt);
    const L = this.layout;
    if (this.zone === "radio") this.rideCar(dt, pos);
    else if (this.zone === "eje") this.float(dt, yaw, pitch);
    this.spoke.car.position.y = this.zone === "radio" ? this.carY : this.zone === "eje" ? L.topY : 0;
    // Context button.
    this.action = null;
    this.action2 = null;
    let label = "";
    let label2 = "";
    if (!busy && this.zone === "anillo" && Math.hypot(pos.x - RING_ELEVATOR.anchor.x, pos.z - RING_ELEVATOR.anchor.z) < RING_REACH_M) {
      label = "Subir al eje por el radio";
      this.action = () => this.ride("up", pos);
    } else if (this.zone === "eje" && !this.autoDown) {
      // Holding the grab point of a thing shows that thing's action (docs/design/ingravidez.md, «Fase D»).
      const poi = this.heldPoi();
      if (poi?.action === "bajar") {
        label = "Bajar al anillo";
        this.action = () => this.descend();
      } else if (poi?.action === "puente" && this.onFlightDeck) {
        label = "Ir al puente de mando";
        this.action = () => this.onFlightDeck?.();
      } else if (poi?.action === "atraque") {
        const [a, b] = this.endHatches?.() ?? [];
        if (a) [label, this.action] = [a.label, a.go];
        if (b) [label2, this.action2] = [b.label, b.go];
        if (!a) label = "Escotilla cerrada: no hay nada acoplado";
      } else if (poi?.action === "lanzador") {
        const l = this.hops.launchers.find((x) => x.from === this.hops.poiPoint(poi.id)?.rail);
        if (l) {
          label = l.id === "lanzador-popa" ? "Lanzarse a la red de proa" : "Lanzarse a la red de popa";
          this.action = () => this.hop.goTo(this.hops.pointOf(l.to)!.id);
        }
      } else if (poi?.action === "info") {
        label = `${poi.label}: ¿qué es?`;
        this.action = () => this.say(poi.info ?? poi.label);
      }
    }
    this.actionBtn.classList.toggle("hidden", !label);
    this.actionBtn.classList.toggle("info", !this.action);
    this.actionBtn.textContent = label;
    this.actionBtn2.classList.toggle("hidden", !this.action2);
    if (this.actionBtn2.textContent !== label2) this.actionBtn2.textContent = label2;
    this.throwBtn.classList.toggle("hidden", busy || this.zone !== "anillo" || this.ring.omegaRadS === 0);
    this.ui.querySelector(".updown")!.classList.toggle("hidden", this.zone !== "radio");
    if (!(this.enabled && this.zone === "eje")) this.hop.hide();
    document.body.classList.toggle("in-zero-g", this.enabled && this.zone === "eje");
  }

  /** Come aboard through the docking hatch at the end of the spine (floating, weightless). */
  arriveAtHatch(): void {
    this.zone = "eje";
    this.autoDown = false;
    this.hop.cancel();
    // She comes in holding the hatch's own grab bar (its buttons show at once).
    this.iva = this.holdPoint(this.hops.poiPoint("atraque")!);
    this.p.set(this.iva.position.x, this.iva.position.y, this.iva.position.z);
    this.body?.reset();
    this.say("Entras por la escotilla de la espina: 0 g. El anillo está al otro lado del eje");
  }

  /**
   * Go back down to the ring (also used when a chore is picked from the hub): she hops by herself to
   * the elevator's grab bar, and the car takes her down.
   */
  descend(): void {
    if (this.zone === "radio") return this.sendCar("down");
    if (this.zone !== "eje") return;
    const at = this.hops.poiPoint("ascensor")!;
    if (this.hop.holding(this.iva)?.id === at.id) return this.intoCar();
    this.autoDown = true;
    this.hop.goTo(at.id);
  }

  /** From the elevator's grab bar into the car, and down. */
  private intoCar(): void {
    this.autoDown = false;
    this.hop.cancel();
    this.zone = "radio";
    this.carY = this.layout.topY;
    this.carV = 0;
    this.sendCar("down");
  }

  /** A chain of hops arrived at a point. */
  private arrived(id: string): void {
    if (this.autoDown && id === this.hops.poiPoint("ascensor")?.id) return this.intoCar();
    const poi = this.pois.find((p) => this.hops.poiPoint(p.id)?.id === id);
    if (poi) this.say(`${poi.label}: ya estás aquí`);
  }

  /** Hop by herself to a thing of the hub or spine (a tap on it, or the HUD). */
  goToPoi(id: string): boolean {
    const at = this.hops.poiPoint(id);
    if (!at || this.zone !== "eje") return false;
    if (this.hop.holding(this.iva)?.id === at.id) return true;
    const poi = this.pois.find((p) => p.id === id);
    if (poi) this.say(`Saltas hasta: ${poi.label}`);
    return this.hop.goTo(at.id);
  }

  /** The thing whose grab point she holds now, if any. */
  heldPoi(): SpinePoi | undefined {
    const at = this.hop.holding(this.iva);
    return at?.poi ? this.pois.find((p) => p.id === at.poi) : undefined;
  }

  /** Where a thing of the hub or spine is on screen (for the experience suite: taps a player can make). */
  screenPoint(id: string): { x: number; y: number; visible: boolean; behind?: boolean } {
    const p = this.pois.find((q) => q.id === id)?.centre ?? (this.graph.rails.some((r) => r.id === id && r.ladder) ? this.graph.rail(id).a.add(this.graph.rail(id).b).scale(0.5) : undefined);
    if (!p || !this.camera) return { x: -1, y: -1, visible: false };
    const v = new THREE.Vector3(p.x, p.y, p.z).project(this.camera);
    const x = ((v.x + 1) / 2) * window.innerWidth;
    const y = ((1 - v.y) / 2) * window.innerHeight;
    const behind = new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(this.camera.matrixWorldInverse).z > 0;
    return { x, y, visible: !behind && v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1, behind };
  }

  private pickAt(x: number, y: number): { poi?: string; ladder?: string; point: Vec3 } | undefined {
    if (!this.camera) return undefined;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), this.camera);
    const hit = ray.intersectObjects(this.picks, false)[0];
    if (!hit || hit.distance > 25) return undefined;
    const point = new Vec3(hit.point.x, hit.point.y, hit.point.z);
    return { ...(hit.object.userData.poi ? { poi: hit.object.userData.poi as string } : {}), ...(hit.object.userData.ladder ? { ladder: hit.object.userData.ladder as string } : {}), point };
  }

  /** Hop by herself to the rung of a ladder nearest to a point. */
  goToLadder(rail: string, near: Vec3): boolean {
    let best: LandingPoint | undefined;
    for (const q of this.hops.points) if (q.rail === rail && (!best || q.grip.sub(near).length() < best.grip.sub(near).length())) best = q;
    if (!best || this.zone !== "eje") return false;
    this.say("Saltas a la escalera: ▲ ▼ trepan por ella");
    return this.hop.goTo(best.id);
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
        // She comes out of the car holding the elevator's grab bar at the top of the shaft.
        this.iva = this.holdPoint(this.hops.poiPoint("ascensor")!);
        this.p.set(this.iva.position.x, this.iva.position.y, this.iva.position.z);
        this.body?.reset();
        this.say("Ingravidez: las flechas te llevan de asidero en asidero. En el aire no se frena ni se gira hasta llegar");
      } else if (this.carTarget === 0) {
        this.zone = "anillo";
        pos.set(L.x, 0, L.z + 0.9);
        this.say(`De vuelta en el anillo: ${fmt(this.ring.gravityG(L.axisY))} g`);
      }
    }
  }

  /** Holding a landing point (coming in, out of the elevator). */
  private holdPoint(q: LandingPoint): IvaState {
    return { position: q.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: q.rail, t: q.t, hands: 0 } };
  }

  private float(dt: number, yaw: number, pitch: number): void {
    const fwd = new Vec3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const right = new Vec3(Math.cos(yaw), 0, -Math.sin(yaw));
    // Arrows hop from landing point to landing point, climb ladders, or a chosen point is hopped to by
    // itself (docs/design/ingravidez.md, «Fase C: flechas» and «Fase D»).
    const intent = this.hop.update(this.iva, { forward: fwd, right }, this.enabled, dt, this.eye);
    this.climbing = !!intent.along;
    const r = ivaStep(this.iva, intent, this.world, dt);
    this.iva = r.state;
    this.p.set(r.state.position.x, r.state.position.y, r.state.position.z);
    for (const e of r.events) this.tell(e);
    if (intent.hop?.launcher) this.say(`El lanzador te empuja a ${fmt(intent.hop.speed, 1)} m/s: la red del otro extremo te frena`);
  }

  private tell(e: IvaEvent): void {
    const n = (x: number) => fmt(x, 1);
    // Hops (the arrows) say their speed on the HUD line, not in a notice.
    if (e.kind === "pared") this.say("Te paras contra la pared con las manos: desde aquí también puedes impulsarte");
    else if (e.kind === "golpe") this.say(`¡Golpe contra la pared a ${n(e.speed)} m/s! Rebotas`);
    else if (e.kind === "deriva") this.say("A la deriva: no llegas a nada. Solo te mueve el aire de la ventilación, muy despacio");
    else if (e.kind === "sin-impulso")
      this.say(e.why === "en-vuelo" ? "En el aire no puedes cambiar de rumbo: espera al próximo asidero" : e.why === "contra-la-pared" ? "No puedes empujarte hacia la pared que sujetas" : "No hay nada en lo que apoyarse: el aire te llevará a una pared");
  }

  /** Inside the hub, the spine module or the top of the shaft, keeping `margin` from the walls. */
  private insideFloat(q: THREE.Vector3, margin: number): boolean {
    return spineFits(this.layout, q, margin);
  }

  /** Place the avatar and camera off the ring. Returns false on the ring (interior.ts does it). */
  placeCamera(camera: THREE.PerspectiveCamera, rig: THREE.Group, avatar: CubeFigure, yaw: number, pitch: number, third: boolean): boolean {
    this.camera = camera;
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
      this.eye.copy(this.p);
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
    const lift = k === "planeo" || k === "impulso" || k === "agarrando" || k === "salto" ? 0.8 : 0;
    // Back along the view and a little toward the tube's axis (the roomiest place, clear of the
    // lockers and bags on the walls); where a wall is close behind her, further toward the axis.
    const inward = new THREE.Vector3(0, L.axisY - at.y, L.z - at.z);
    const radial = inward.length();
    if (at.y < L.axisY - L.tubeR || radial < 1e-2) inward.set(0, 1, 0);
    inward.normalize();
    // Most of the way to the axis: the camera looks down the middle of the tube with her beside it.
    const toAxis = at.y < L.axisY - L.tubeR ? 0 : 0.6 * radial;
    for (let d = CAMERA_BACK_M; d > 0.4; d -= 0.1) {
      cam.copy(at).addScaledVector(dir, -d).addScaledVector(inward, Math.max(0.25 + lift, toAxis) + Math.max(0, CAMERA_BACK_M - d) * 0.6);
      if (this.insideFloat(cam, 0.6)) break;
    }
    camera.position.copy(cam);
    this.eye.copy(cam);
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
