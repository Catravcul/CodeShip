import * as THREE from "three";
import { LANDER_CABIN_REAL } from "@modules/lander-cabin/data/cabin";
import { LM } from "@modules/ship/data/apollo-lm";
import { IDSS_CONTACT_LIMITS } from "@modules/mothership/data/mothership";
import { LM_TOUCHDOWN } from "@modules/aerial-sanctuary/data/facts";
import type { Stage } from "@modules/aerial-sanctuary/data/stages";
import type { RigCue } from "@modules/aerial-sanctuary/domain/station-beat";
import { dockPractice, dockTick, type DockPractice } from "@modules/aerial-sanctuary/application/dock-practice";
import { lmAcross, lmStart, lmStep, lmThrottle, type LmSim, type LmSimSpec } from "@modules/aerial-sanctuary/domain/lm-sim";
import { buildLmCabin, type LmCabinGeometry } from "./adapters/three/lm-cabin";
import type { CubeFigure } from "./adapters/three/interior/figure";
import { RcsPad, type RcsRead } from "./ui/rcs-pad";
import { dragonRead, drawDockCamera } from "./ui/dragon-display";
import type { PortGuidance } from "@modules/navigation/application/free-carrier";

/**
 * Post 8's simulators in the SVMF, flown by hand outside the challenge (docs/design/santuario3-puestos.md): Dragon's
 * docking on the same touchscreen pad and display as Starship's «Manual» (rcs-pad.ts, dragon-display.ts), from 12 m
 * to contact with the IDSS limits; and the LM's last 150 m in the LM cockpit's mock-up (lm-cabin.ts, the same cabin
 * and instruments as the lander), with the descent engine's throttle and the RCS's drift taps. And what the Dragon
 * mock-up's screen shows while the challenge is acted (`paint`).
 */
const SPEC: LmSimSpec = {
  dryKg: LM.dryKg.value + LM.apsPropellantKg.value + LM.rcsPropellantKg.value,
  thrustN: LM.dpsThrustN.value,
  minThrottle: LM.dpsMinThrottle.value,
  maxThrottle: 0.6,
  ispS: LM.dpsIspS.value,
  moonG: LM_TOUCHDOWN.moonG.value,
  startAltM: LM_TOUCHDOWN.startAltM.value,
  propKg: LM_TOUCHDOWN.propLeftKg.value,
  touchdown: { verticalMs: LM_TOUCHDOWN.verticalMs.value, horizontalMs: LM_TOUCHDOWN.horizontalMs.value },
};
const n = (v: number, d = 1) => `${v < -0.5 * 10 ** -d ? "−" : ""}${Math.abs(v).toFixed(d).replace(".", ",")}`;

export type SimKind = "acople" | "alunizaje";

export class S3Simulators {
  readonly lm: LmCabinGeometry;
  private readonly dockPad: RcsPad;
  private readonly lmPad: RcsPad;
  private dock: DockPractice | undefined;
  private land: LmSim | undefined;
  private doneT = 0;
  /** Flying from another seat than the simulator's (the launch's Dragon): the scene's camera, not the mock-up's. */
  private ownSeat = false;
  kind: SimKind | undefined;
  /** The practice is over (the scene puts her back). */
  onEnd: (() => void) | undefined;
  /** Something to say on screen (the verdict). */
  onSay: ((text: string) => void) | undefined;

  constructor(
    root: HTMLElement,
    scene: THREE.Scene,
    private readonly stage: Stage,
    lmAt: { x: number; y: number; z: number },
  ) {
    // The LM's cabin at true size in the LM simulator's hall (like the Apollo LMS of Houston's building 5).
    this.lm = buildLmCabin(LANDER_CABIN_REAL, 1);
    const at = lmAt;
    this.lm.group.position.set(at.x, at.y, at.z);
    this.lm.group.name = "maqueta-lm";
    scene.add(this.lm.group);
    this.dockPad = new RcsPad(root, {
      cls: "s3-sim-pad",
      screen: { w: 112, h: 112 },
      endLabel: "Dejar el simulador",
      note: "Simulador de Crew Dragon: la pantalla táctil del pilotaje manual (la misma que en la Starship) y los límites de contacto del IDSS. Cada toque, un paso (nuestro)",
      translate: (a, s) => this.dock?.run.translate(a, s),
      rotate: (a, s) => this.dock?.run.rotate(a, s),
      stop: () => this.dock?.run.stop(),
      end: () => this.end(),
    });
    this.lmPad = new RcsPad(root, {
      cls: "s3-sim-pad",
      throttle: true,
      endLabel: "Dejar el simulador",
      note: `Simulador del LM: el motor de descenso (${LM.dpsThrustN.value} N, regulable del 10 % al 60 %) y el RCS para la deriva; la actitud la lleva el programa. Tren: ${n(SPEC.touchdown.verticalMs, 2)} m/s en vertical y ${n(SPEC.touchdown.horizontalMs, 2)} m/s de lado`,
      translate: (a, s) => {
        if (!this.land || a === "y") return;
        this.land = lmAcross(this.land, a === "x" ? "x" : "y", a === "z" ? (s === 1 ? -1 : 1) : s);
      },
      rotate: () => this.onSay?.("En el LM la actitud la lleva el programa: aquí, solo el motor y la deriva"),
      throttleStep: (s) => {
        if (this.land) this.land = lmThrottle(SPEC, this.land, s);
      },
      stop: () => {
        if (this.land && !this.land.landed) this.land = { ...this.land, vxMs: 0, vyMs: 0 };
      },
      end: () => this.end(),
    });
  }

  /** Her place at the simulator: the Dragon's commander seat or the LM's commander station. */
  /** The last docking's verdict (the launch's rendezvous by hand reads it when the practice ends). */
  lastDockOk: boolean | undefined;
  private title = "Simulador de Dragon · acople a mano";

  /** `opts` for the launch's rendezvous by hand: from Waypoint 2 (20 m), in her seat in the real Dragon. */
  start(kind: SimKind, her: { rig: THREE.Object3D; fig: CubeFigure }, opts: { fromM?: number; title?: string; seat?: { x: number; y: number; z: number; face: number } } = {}): void {
    this.kind = kind;
    this.doneT = 0;
    this.lastDockOk = undefined;
    this.title = opts.title ?? "Simulador de Dragon · acople a mano";
    this.ownSeat = !!opts.seat;
    if (kind === "acople") {
      this.dock = dockPractice(opts.fromM);
      const seat = opts.seat ?? this.stage.her["dragon-asiento"]!;
      her.rig.position.set(seat.x, seat.y, seat.z);
      her.rig.rotation.set(0, seat.face, 0);
      her.fig.pose("sit-hands");
      this.dockPad.show(true);
    } else {
      this.land = lmStart(SPEC);
      const eye = this.lm.group.localToWorld(this.lm.commanderEye.clone());
      her.rig.position.set(eye.x, this.lm.group.position.y, eye.z);
      her.rig.rotation.set(0, Math.PI, 0);
      her.fig.pose("stand-hands");
      this.lmPad.show(true);
    }
  }

  /**
   * The LM's cabin is drawn only while she is in its hall (or flying it): from outside the hall's walls hide it, and its
   * many meshes would only add draw calls.
   */
  showLm(on: boolean): void {
    this.lm.group.visible = on;
  }

  end(): void {
    if (!this.kind) return;
    this.kind = undefined;
    this.dock = undefined;
    this.land = undefined;
    this.dockPad.show(false);
    this.lmPad.show(false);
    this.onEnd?.();
  }

  update(dt: number): void {
    if (this.kind === "acople" && this.dock) {
      const was = this.dock.contact;
      const g = dockTick(this.dock, dt);
      this.dockPad.update(dragonRead(this.dock.run, g, this.title));
      const sc = this.dockPad.screen(true);
      if (sc) drawDockCamera(sc.g, sc.w, sc.h, g);
      if (!was && this.dock.contact) this.lastDockOk = this.dock.contact.ok;
      if (!was && this.dock.contact) this.onSay?.(this.dock.contact.ok ? "Contacto dentro de los límites del IDSS: acoplada" : `Contacto fuera de los límites: ${this.dock.contact.out.join(" · ")}. Se aparta y se repite`);
      if (this.dock.contact && (this.doneT += dt) > 4) this.end();
    } else if (this.kind === "alunizaje" && this.land) {
      const was = this.land.landed;
      this.land = lmStep(SPEC, this.land, dt);
      this.lmPad.update(this.read(this.land));
      const m = this.land;
      this.lm.instruments.update({ altitudeM: m.altM, altRateMs: m.vzMs, forwardMs: m.vyMs, lateralMs: m.vxMs, upBody: { x: 0, y: 1, z: 0 }, propellant: m.propKg / SPEC.propKg, thrust: m.throttle, missionS: m.t, program: 66, warnings: m.propKg < SPEC.propKg * 0.1 ? ["DES QTY"] : [], contact: !!m.landed }, m.t);
      if (!was && m.landed) this.onSay?.(m.landed.ok ? `Contacto: ${n(-m.landed.vzMs)} m/s y ${n(m.landed.acrossMs)} m/s de lado, dentro del tren. Posada` : `Golpe: ${n(-m.landed.vzMs)} m/s y ${n(m.landed.acrossMs)} m/s de lado (el tren aguanta ${n(SPEC.touchdown.verticalMs, 2)} y ${n(SPEC.touchdown.horizontalMs, 2)})`);
      if (m.landed && (this.doneT += dt) > 4) this.end();
    }
  }

  private read(m: LmSim): RcsRead {
    const okV = -m.vzMs <= SPEC.touchdown.verticalMs;
    const across = Math.hypot(m.vxMs, m.vyMs);
    return {
      title: "Simulador del LM · P66, a mano",
      head: ["altura", "vertical", "de lado"],
      rows: [{ label: "", cells: [{ text: `${n(m.altM)} m` }, { text: `${n(m.vzMs)} m/s`, ok: okV }, { text: `${n(across, 2)} m/s`, ok: across <= SPEC.touchdown.horizontalMs }] }],
      lines: [`Motor ${Math.round(m.throttle * 100)} % · propelente ${Math.round(m.propKg)} kg (${Math.round(m.propKg / ((m.throttle || 0.3) * SPEC.thrustN / (SPEC.ispS * 9.80665)))} s)`, `Adelante ${n(m.vyMs, 2)} · derecha ${n(m.vxMs, 2)} m/s`],
    };
  }

  /** The camera at the simulator: in the capsule, at her side; in the LM, the commander's eye on his panels. */
  eye(pos: THREE.Vector3, at: THREE.Vector3): boolean {
    if (this.kind === "acople" && this.ownSeat) return false;
    if (this.kind === "acople") {
      // Over her shoulder in the capsule, at the touchscreen.
      const seat = this.stage.her["dragon-asiento"]!;
      const P = this.stage.anchors.pantalla!;
      const back = new THREE.Vector3(seat.x - P.x, 0, seat.z - P.z).normalize();
      pos.set(seat.x, seat.y + 1.75, seat.z).addScaledVector(back, 1.5).add(new THREE.Vector3(-back.z, 0, back.x).multiplyScalar(0.7));
      at.set(seat.x, seat.y + 1.1, seat.z).lerp(new THREE.Vector3(P.x, P.y, P.z), 0.55);
      return true;
    }
    if (this.kind === "alunizaje") {
      this.lm.group.localToWorld(pos.copy(this.lm.commanderEye));
      this.lm.group.localToWorld(at.copy(this.lm.commanderEye).add(new THREE.Vector3(0, -0.35, -1)));
      return true;
    }
    return false;
  }

  get busy(): boolean {
    return !!this.kind;
  }
}

/**
 * What the Dragon mock-up's screen shows at each beat of the challenge: the launch's climb, the abort, the docking
 * camera closing on the port, an injected failure with its procedure, and the reentry's g.
 */
export function paintSimScreen(g: CanvasRenderingContext2D, w: number, h: number, show: Extract<RigCue, { kind: "pantalla" }>["show"], t: number): void {
  const title = (text: string, color = "#9fd8ff") => {
    g.fillStyle = color;
    g.font = "bold 26px sans-serif";
    g.fillText(text, 18, 36);
  };
  const line = (text: string, y: number, color = "#e6f3ff") => {
    g.fillStyle = color;
    g.font = "20px sans-serif";
    g.fillText(text, 18, y);
  };
  switch (show) {
    case "lanzamiento": {
      const s = Math.floor(t * 20);
      title(`Lanzamiento · T+ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
      const alt = Math.min(1, t / 2.2);
      g.fillStyle = "#1d5a70";
      g.fillRect(w - 70, 50, 30, h - 70);
      g.fillStyle = "#58d6ff";
      g.fillRect(w - 70, h - 20 - (h - 70) * alt, 30, (h - 70) * alt);
      line("Falcon 9: ascenso nominal", 80);
      line("Cuenta atrás, despegue y separación de etapas", 112);
      return;
    }
    case "aborto":
      g.fillStyle = Math.floor(t * 4) % 2 ? "#5a0d0d" : "#8a1414";
      g.fillRect(0, 0, w, h);
      title("ABORTO", "#ffffff");
      line("Los SuperDraco apartan la cápsula del cohete", 80);
      line("Paracaídas y amerizaje: ensayo superado", 112);
      return;
    case "acople": {
      const r = Math.max(0, 10 - t * 4.5);
      const gd: PortGuidance = { name: "IDA", rangeM: r, closingMs: 0.08, right: 0.12 * Math.max(0, 1 - t / 2), up: -0.06 * Math.max(0, 1 - t / 2), errDeg: { x: 0.3, y: -0.5 * Math.max(0, 1 - t / 2), z: 0 } };
      g.save();
      g.translate(w - h, 0);
      drawDockCamera(g, h, h, gd);
      g.restore();
      title("Acople a mano");
      line(`Distancia ${r.toFixed(1).replace(".", ",")} m`, 80);
      line(`Cierre 0,08 m/s (${String(IDSS_CONTACT_LIMITS.closingMinMs).replace(".", ",")}–${String(IDSS_CONTACT_LIMITS.closingMaxMs).replace(".", ",")})`, 112);
      return;
    }
    case "fallo":
      g.fillStyle = "#3a2a05";
      g.fillRect(0, 0, w, h);
      title("ALARMA · fallo inyectado", "#ffc24a");
      line("Fuga en un circuito de refrigeración", 80);
      line("1. Leer la alarma  2. Su procedimiento  3. Confirmar", 112);
      return;
    case "reentrada": {
      g.fillStyle = `rgb(${120 + Math.floor(60 * Math.sin(t * 6))},40,10)`;
      g.fillRect(0, 0, w, h);
      title("Reentrada", "#ffffff");
      line(`${(4 + Math.min(1, t / 2.2)).toFixed(1).replace(".", ",")} g sobre el pecho`, 80);
      line("Paracaídas y amerizaje", 112);
      return;
    }
    case "alunizaje":
      title("LM · alunizaje");
      return;
  }
}

/**
 * Dragon's display in the launch's rendezvous by challenge (s3-launch.ts): the step in words and, inside the 400 m
 * sphere, the docking camera on the Starship's port at that waypoint's range (on its axis: the challenge flies it right).
 */
export function paintRendezvous(g: CanvasRenderingContext2D, w: number, h: number, cue: { readonly step: string; readonly rangeM?: number }): void {
  if (cue.rangeM !== undefined) drawDockCamera(g, w, h, { name: "Starship", rangeM: cue.rangeM, closingMs: 0, right: 0, up: 0, errDeg: { x: 0, y: 0, z: 0 } });
  else {
    g.fillStyle = "#04080c";
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = "#04080cc0";
  g.fillRect(0, h - 58, w, 58);
  g.fillStyle = "#9fd8ff";
  g.font = "bold 20px sans-serif";
  g.fillText(cue.rangeM !== undefined ? `Starship · ${Math.round(cue.rangeM)} m` : "Crew Dragon · cita en órbita", 14, h - 34);
  g.fillStyle = "#e6f3ff";
  g.font = "16px sans-serif";
  g.fillText(cue.step.slice(0, 48), 14, h - 12);
}
