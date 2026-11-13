import * as THREE from "three";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { Asteroid } from "@modules/celestial/domain/asteroid";
import { HATCH_BODY, type Eva, type EvaEvent } from "@modules/eva/application/eva";
import { SAFETY_TETHER_M } from "@modules/eva/data/suit";
import { NO_EVA_INPUT, heightAbove, type EvaInput } from "@modules/eva/domain/surface-motion";
import { Walker } from "./adapters/input/walker";
import { ShipModel } from "./adapters/three/ship-model";
import { SuitFigure } from "./adapters/three/eva/suit-figure";
import type { DuelView, SessionText } from "./ui/duel-view";

const SUIT_UP_TEXT: SessionText = {
  title: "Ponerse el traje y salir",
  progress: "Pasos",
  order: "Ordena la preparación",
  submit: "Hacerlo",
  ok: "Comprobado",
  bad: "Así no: repásalo antes de abrir la escotilla",
  sheet: true,
};

/** Camera distance behind her and puff pool size. */
const CAM_DIST_M = 4.2;
const PUFFS = 90;

const v3 = (v: Vec3) => new THREE.Vector3(v.x, v.y, v.z);
const hms = (s: number) => {
  const m = Math.max(0, Math.floor(s / 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`;
};
const fmt = (v: number, d = 2) => v.toFixed(d).replace(".", ",");

/**
 * Walking (crawling) outside on the asteroid: third-person view of Doménica in her suit next to the
 * landed ship, with the tether, dust puffs and a HUD for the suit. All rules live in the Eva use case.
 */
export class EvaMode {
  private readonly walker: Walker;
  private readonly figure = new SuitFigure();
  private readonly rig = new THREE.Group();
  private readonly ship = new ShipModel();
  private readonly tether: THREE.Line;
  private readonly tetherPts: Float32Array;
  private readonly markers: THREE.Group[] = [];
  private readonly puffs: THREE.Points;
  private readonly puffLocal: { p: Vec3; v: Vec3; age: number }[] = [];
  private readonly ui: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly sampleBtn: HTMLButtonElement;
  private readonly jumpBtn: HTMLButtonElement;
  private readonly downBtn: HTMLButtonElement;
  private toastUntil = 0;
  private camFwd = Vec3.Z;
  private heading = Vec3.Z;
  private up = Vec3.Y;
  private elevation = 0.35;
  private stride = 0;
  private puffClock = 0;
  private held = { up: false, down: false, reel: false };
  private keys = new Set<string>();
  private pushPending = false;
  private clock = 0;
  active = false;
  /** Called when she is back aboard. */
  onExit?: () => void;
  /** Whether lying down opens a duel now (stage 3 on offer here). Set by main. */
  canSubjugate?: () => boolean;
  /** She lay down on the asteroid: start the stage 3 duel. Set by main. */
  onLieDown?: () => void;
  private readonly lieBtn: HTMLButtonElement;

  private get asteroid(): Asteroid {
    return this.eva.asteroid;
  }

  constructor(
    root: HTMLElement,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly eva: Eva,
    private readonly duel: DuelView,
  ) {
    this.walker = new Walker(root, { move: "eva-move", look: "eva-look", moveLabel: "Moverse" });
    this.rig.add(this.figure.root);
    // Airlock hatch on the ship's flank, where the tether is clipped.
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.4, metalness: 0.5, emissive: 0x0a1a10 }));
    const out = Math.sign(HATCH_BODY.x);
    hatch.position.set(HATCH_BODY.x + 0.02 * out, HATCH_BODY.y + 0.2, HATCH_BODY.z);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x5dff9a }));
    lamp.position.set(HATCH_BODY.x + 0.05 * out, HATCH_BODY.y + 0.72, HATCH_BODY.z);
    this.ship.root.add(hatch, lamp);
    this.ship.thrust({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.ZERO }, 0);

    this.tetherPts = new Float32Array(32 * 3);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(this.tetherPts, 3));
    this.tether = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffd23f }));
    this.tether.frustumCulled = false;

    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PUFFS * 3), 3));
    pg.setAttribute("color", new THREE.BufferAttribute(new Float32Array(PUFFS * 3), 3));
    this.puffs = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.puffs.frustumCulled = false;

    this.ui = document.createElement("div");
    this.ui.className = "eva-ui hidden";
    this.ui.innerHTML = `<div class="eva-hud"></div><button class="eva-back">Volver a la nave</button>
      <div class="eva-actions"><button class="eva-lie hidden">Tumbarse sobre el asteroide</button><button class="eva-sample hidden">Tomar muestra</button><button class="eva-reel">Recoger cable</button><button class="eva-down">Bajar</button><button class="eva-jump">Impulso</button></div>
      <div class="eva-toast"></div>`;
    root.appendChild(this.ui);
    this.hud = this.ui.querySelector(".eva-hud")!;
    this.toast = this.ui.querySelector(".eva-toast")!;
    this.sampleBtn = this.ui.querySelector(".eva-sample")!;
    this.jumpBtn = this.ui.querySelector(".eva-jump")!;
    this.downBtn = this.ui.querySelector(".eva-down")!;
    this.lieBtn = this.ui.querySelector(".eva-lie")!;
    this.lieBtn.addEventListener("click", () => this.toggleLie());
    this.ui.querySelector(".eva-back")!.addEventListener("click", () => this.eva.requestReturn());
    this.sampleBtn.addEventListener("click", () => this.eva.collect());
    const hold = (el: Element, on: () => void, off: () => void) => {
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        on();
      });
      for (const ev of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(ev, off);
    };
    hold(this.jumpBtn, () => this.pressUp(), () => (this.held.up = false));
    hold(this.downBtn, () => (this.held.down = true), () => (this.held.down = false));
    hold(this.ui.querySelector(".eva-reel")!, () => (this.held.reel = true), () => (this.held.reel = false));
    window.addEventListener("keydown", (e) => {
      if (!this.active || e.repeat) return;
      this.keys.add(e.code);
      if (e.code === "Space") this.pressUp();
      if (e.code === "Enter") this.eva.collect();
      if (e.code === "KeyB") this.eva.requestReturn();
      if (e.code === "KeyT") this.toggleLie();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());

    // The suit-up sheet shares the challenge screen with the chores: chain its close handler.
    const prev = duel.onClose;
    duel.onClose = () => {
      if (this.eva.phase === "preparando") this.eva.cancelSuitUp();
      else prev?.();
    };
  }

  /** "Tumbarse sobre el asteroide": full body contact; with stage 3 on offer it opens the duel. */
  private toggleLie(): void {
    if (this.eva.lying) {
      this.eva.standUp();
      return;
    }
    if (!this.eva.lieDown()) return;
    if (this.canSubjugate?.()) this.onLieDown?.();
    else this.say(`Tumbada sobre ${this.asteroid.data.name}. Su mente aún no se abre a este contacto`, 4500);
  }

  /** Say something on the suit's toast (from main: duel results). */
  tell(text: string, ms = 5000): void {
    this.say(text, ms);
  }

  /** "Salir de la nave": the suit-up chain, then outside. */
  startSuitUp(): void {
    if (!this.eva.canLeave) return;
    const run = this.eva.suitUp();
    this.duel.show(
      {
        get current() {
          return run.current;
        },
        get progress() {
          return run.step;
        },
        goal: run.steps,
        get lives() {
          return run.mistakesLeft;
        },
        maxLives: run.maxMistakes,
      },
      SUIT_UP_TEXT,
      (a) => {
        const ok = this.eva.answer(a);
        if (this.eva.outside) setTimeout(() => this.enter(), 600);
        return { ok };
      },
    );
  }

  /** Debug and tests: outside straight away. */
  skipSuitUp(): void {
    if (!this.eva.canLeave) return;
    this.eva.stepOutside();
    this.enter();
  }

  private enter(): void {
    this.duel.hide();
    const ax = this.eva.shipAxes;
    this.up = ax.up;
    // Look along the ship's flank, away from the hatch side a little, so ship and Bennu both show.
    this.camFwd = ax.forward.scale(-1).add(ax.right.scale(-0.9 * Math.sign(HATCH_BODY.x))).normalize();
    this.heading = this.camFwd;
    this.elevation = 0.35;
    this.active = true;
    this.walker.enabled = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-eva");
    this.scene.add(this.rig, this.ship.root, this.tether, this.puffs);
    for (const m of this.markers) this.scene.remove(m);
    this.markers.length = 0;
    for (const s of this.eva.spots) {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: s.sample.id === "fosfatos" ? 0xd8d4c4 : 0x6a625a, roughness: 0.9, flatShading: true }));
      rock.position.y = 0.08;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0x5fe3ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      g.add(rock, ring);
      this.markers.push(g);
      this.scene.add(g);
    }
    this.say(`Fuera. En ${this.asteroid.data.name} un paso normal te lanzaría al espacio: avanza agarrada a las rocas`);
  }

  private leave(): void {
    this.active = false;
    this.walker.enabled = false;
    this.ui.classList.add("hidden");
    document.body.classList.remove("in-eva");
    this.scene.remove(this.rig, this.ship.root, this.tether, this.puffs, ...this.markers);
    this.onExit?.();
  }

  private pressUp(): void {
    if (this.eva.body?.mode === "agarrada") this.pushPending = true;
    else this.held.up = true;
  }

  private say(text: string, ms = 3500): void {
    this.toast.textContent = text;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + ms;
  }

  private onEvent(e: EvaEvent): void {
    switch (e.type) {
      case "a-la-deriva":
        return this.say("¡A la deriva! Vas más rápido que la velocidad de escape. El cable te sujeta: recoge cable o frena con el SAFER", 5000);
      case "agarrada":
        return this.say("Agarrada al regolito");
      case "cable-tenso":
        return this.say(`Cable tenso: ${fmt(SAFETY_TETHER_M.value, 1)} m desde la escotilla`);
      case "muestra":
        return this.say(`${e.sample.name}: ${e.sample.finding.value}`, 6500);
      case "volver":
        return this.say("Queda poco oxígeno: vuelve a la nave", 5000);
      case "reserva":
        return this.say("Oxígeno de reserva: el traje te lleva de vuelta", 5000);
      case "tumbada":
        return this.say("Tumbada boca abajo, brazos abiertos: todo el cuerpo toca la roca");
      case "lanzada":
        return this.say("¡Te lanza! El cable te sujeta y el torno te devuelve a la escotilla", 6000);
      case "dentro":
        return this.leave();
    }
  }

  update(dt: number, timeS: number): void {
    if (!this.active) return;
    this.clock += dt;
    const body = this.eva.body;
    const q = this.asteroid.orientationAt(timeS);
    if (body) {
      // Look: yaw turns the camera around her local up; pitch raises or lowers it.
      const look = this.walker.look(dt);
      const n = body.normal;
      this.up = this.up.scale(0.9).add(n.scale(0.1)).normalize();
      this.camFwd = Quat.fromAxisAngle(this.up, look.yaw).rotate(this.camFwd);
      this.camFwd = this.camFwd.sub(this.up.scale(this.camFwd.dot(this.up))).normalize();
      this.elevation = Math.max(-0.15, Math.min(1.35, this.elevation - look.pitch));
      const right = this.camFwd.cross(this.up);
      const m = this.walker.move();
      const dir = this.camFwd.scale(m.forward).add(right.scale(m.right));
      const k = (c: string) => (this.keys.has(c) ? 1 : 0);
      const vert = (this.held.up || k("Space") ? 1 : 0) - (this.held.down || k("KeyF") ? 1 : 0);
      const floating = body.mode === "flotando";
      const input: EvaInput = {
        ...NO_EVA_INPUT,
        move: floating ? Vec3.ZERO : dir,
        jet: floating ? dir.add(this.up.scale(vert)) : Vec3.ZERO,
        pushOff: this.pushPending && !floating,
        reel: this.held.reel || k("KeyR") === 1,
      };
      this.pushPending = false;
      this.eva.update(dt, input);
      if (dir.length() > 0.05) this.heading = dir.normalize();
      this.figure.jetting(floating && input.jet.length() > 0 && body.jetDeltaVLeft > 0);
      if (this.eva.body) {
        const crawling = !floating && body.velocity.length() > 0.01;
        this.stride += body.velocity.length() * dt * 14;
        if (this.eva.lying) this.figure.lie(this.clock);
        else if (floating) this.figure.float(this.clock);
        else this.figure.crawl(this.stride, crawling ? 1 : 0.2);
        this.figure.update(dt, floating ? 1.5 : 6);
        this.puffClock += dt;
        if (crawling && this.puffClock > 0.3) {
          this.puffClock = 0;
          this.spawnPuffs(body.position.add(this.heading.scale(0.45)), 3, 0.03);
        }
      }
    }
    for (const e of this.eva.drainEvents()) {
      if (e.type === "agarrada" && this.eva.body) this.spawnPuffs(this.eva.body.position, 14, 0.06);
      this.onEvent(e);
    }
    if (!this.active || !this.eva.body) return;
    this.place(q, timeS, dt);
    this.renderHud();
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  private spawnPuffs(at: Vec3, n: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      const r = new Vec3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5);
      const v = this.tangentToWorldish(r).scale(speed * (0.4 + Math.random()));
      if (this.puffLocal.length >= PUFFS) this.puffLocal.shift();
      this.puffLocal.push({ p: at.add(this.up.scale(0.05)), v, age: 0 });
    }
  }

  /** A random direction expressed around her local up (y = along up). */
  private tangentToWorldish(r: Vec3): Vec3 {
    const right = this.camFwd.cross(this.up);
    return right.scale(r.x).add(this.up.scale(r.y)).add(this.camFwd.scale(r.z));
  }

  /** Put figure, ship, tether, samples, puffs and camera in the (inertial) scene. */
  private place(q: Quat, timeS: number, dt: number): void {
    const body = this.eva.body!;
    const toW = (p: Vec3) => v3(this.asteroid.toWorld(p, timeS));
    const dirW = (d: Vec3) => v3(q.rotate(d));
    const upW = dirW(this.up);
    const fwdW = dirW(this.heading.sub(this.up.scale(this.heading.dot(this.up))).normalize());
    const feet = toW(body.position);
    this.rig.position.copy(feet);
    this.rig.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(upW.clone().cross(fwdW).normalize(), upW, fwdW));

    // The landed ship, at the pose the flight computer keeps it in.
    const s = this.eva.flight.state;
    this.ship.root.position.set(s.position.x, s.position.y, s.position.z);
    this.ship.root.quaternion.set(s.orientation.x, s.orientation.y, s.orientation.z, s.orientation.w);

    // Tether: from the hatch to her waist, a loose curve while slack.
    const a = toW(this.eva.hatch);
    const b = feet.clone().addScaledVector(upW, body.mode === "agarrada" ? 0.45 : 0.8);
    const slack = Math.max(0, SAFETY_TETHER_M.value - a.distanceTo(b));
    const mid = a.clone().add(b).multiplyScalar(0.5).addScaledVector(upW, -Math.min(1.2, slack * 0.12));
    for (let i = 0; i < 32; i++) {
      const t = i / 31;
      const p = a.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(mid, 2 * t * (1 - t)).addScaledVector(b, t * t);
      this.tetherPts.set([p.x, p.y, p.z], i * 3);
    }
    this.tether.geometry.attributes.position!.needsUpdate = true;
    (this.tether.material as THREE.LineBasicMaterial).color.setHex(body.tetherTaut ? 0xff7a3f : 0xffd23f);

    this.eva.spots.forEach((sp, i) => {
      const g = this.markers[i];
      if (!g) return;
      g.visible = !sp.collected;
      g.position.copy(toW(sp.position));
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirW(sp.position.normalize()));
      g.children[1]!.scale.setScalar(1 + 0.15 * Math.sin(this.clock * 3 + i));
    });

    const pos = this.puffs.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.puffs.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < PUFFS; i++) {
      const pf = this.puffLocal[i];
      if (pf) {
        // Dust has no air to slow it: it keeps drifting until it fades from view.
        pf.age += dt;
        pf.p = pf.p.add(pf.v.scale(dt));
        const w = toW(pf.p);
        const life = Math.max(0, 1 - pf.age / 4);
        pos.setXYZ(i, w.x, w.y, w.z);
        col.setXYZ(i, 0.55 * life, 0.5 * life, 0.45 * life);
      } else col.setXYZ(i, 0, 0, 0);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    // Third-person camera behind her, never under the ground nor inside the ship and its wings.
    const target = body.position.add(this.up.scale(0.7));
    const ax = this.eva.shipAxes;
    const shipL = this.asteroid.toLocal(new Vec3(s.position.x, s.position.y, s.position.z), timeS);
    const inShip = (p: Vec3) => {
      // Hull (3 × 2 × 5 m plus nose) and the solar wings, in the ship's frame, with a margin.
      const d = p.sub(shipL);
      const x = Math.abs(d.dot(ax.right));
      const y = d.dot(ax.up);
      const z = -d.dot(ax.forward);
      const hull = x < 1.8 && y < 1.3 && z > -3.7 && z < 3.2;
      const wing = x < 5.9 && Math.abs(y) < 0.35 && Math.abs(z - 0.6) < 1.0;
      return hull || wing;
    };
    const camAt = (d: number) => target.sub(this.camFwd.scale(d * Math.cos(this.elevation))).add(this.up.scale(d * Math.sin(this.elevation)));
    let d = CAM_DIST_M;
    while (d > 1.2 && inShip(camAt(d))) d -= 0.2;
    let camL = camAt(d);
    if (inShip(camL)) camL = camL.add(this.up.scale(1.3 - camL.sub(shipL).dot(ax.up) + 0.2));
    const h = heightAbove(this.eva.world, camL);
    if (h < 0.4) camL = camL.add(camL.normalize().scale(0.4 - h));
    this.camera.position.copy(toW(camL));
    this.camera.up.copy(upW);
    // Aim a little above her so she sits in the lower half, clear of the HUD and messages.
    this.camera.lookAt(toW(target.add(this.up.scale(0.8))));
  }

  private renderHud(): void {
    const e = this.eva;
    const b = e.body!;
    const s = e.suit;
    const bar = (label: string, v: number, warn = false) =>
      `<div class="bar ${warn ? "warn" : ""}"><span>${label}</span><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></div>`;
    const floating = b.mode === "flotando";
    const speed = b.velocity.length();
    const status = b.escaping
      ? `<div class="alert">¡A LA DERIVA! ${fmt(b.inertialVelocity.length())} m/s &gt; escape ${fmt(b.escapeSpeedMs)} m/s</div>`
      : floating
        ? `<div>Flotando a ${fmt(b.heightM, 1)} m · ${fmt(speed, 3)} m/s</div>`
        : `<div>Agarrada al regolito${speed > 0.01 ? " · avanzando" : ""}</div>`;
    const taken = e.spots.filter((x) => x.collected).length;
    const total = e.phase === "volviendo" ? `<div class="ok">Volviendo a la escotilla…</div>` : "";
    this.hud.innerHTML = `
      <div class="ititle">Paseo por ${e.asteroid.data.name} · ${e.suitSpec.name}</div>
      <div class="small">Fuera ${hms(e.elapsedS)} · tiempo ×${e.timeScale}</div>
      ${bar(`O₂ ${s.onSecondary ? `reserva ${Math.round(s.secondaryOxygen * 100)} %` : hms(s.oxygen * e.suitSpec.primaryOxygenS.value)}`, s.onSecondary ? s.secondaryOxygen : s.oxygen, s.status !== "nominal")}
      ${bar(`Filtro CO₂ ${Math.round(s.co2Scrubber * 100)} %`, s.co2Scrubber)}
      ${bar(`Batería ${Math.round(s.battery * 100)} %`, s.battery)}
      ${bar(`SAFER Δv ${fmt(b.jetDeltaVLeft)} m/s`, b.jetDeltaVLeft / e.jetpack.deltaVMs.value, b.jetDeltaVLeft < 0.5)}
      <div class="${b.tetherTaut ? "warn" : ""}">Nave a ${fmt(e.distanceToHatch, 1)} m · cable ${fmt(SAFETY_TETHER_M.value, 1)} m</div>
      ${status}${total}
      <div class="small">g ${Math.round(e.localGravity * 1e6)} µm/s² · escape ${fmt(b.escapeSpeedMs)} m/s</div>
      <div class="small">Muestras ${taken}/${e.spots.length}${e.collectedG ? ` · ${e.collectedG} g` : ""}</div>`;
    this.lieBtn.classList.toggle("hidden", !(e.canLieDown || e.lying));
    this.lieBtn.textContent = e.lying ? "Levantarse" : this.canSubjugate?.() ? "Tumbarse sobre el asteroide · fase 3" : "Tumbarse sobre el asteroide";
    const near = e.nearSample;
    this.sampleBtn.classList.toggle("hidden", !near);
    if (near) this.sampleBtn.textContent = `Tomar muestra: ${near.sample.name}`;
    this.jumpBtn.textContent = floating ? "Subir" : "Impulso";
    this.downBtn.classList.toggle("hidden", !floating);
    (this.ui.querySelector(".eva-back") as HTMLButtonElement).textContent = e.canBoard ? "Entrar en la nave" : "Volver a la nave";
  }
}
