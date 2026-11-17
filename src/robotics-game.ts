import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import type { StepAct } from "@modules/chores/domain/step-visual";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { armChore, armMoves } from "@modules/robotics/application/arm-chores";
import type { ExteriorWork } from "@modules/robotics/application/exterior-work";
import type { ArmProcedureId } from "@modules/robotics/data/procedures";
import { CAPTURE, CAMERA_ORU, GRAPPLE_FIXTURES, MBS, RAIL, SSRMS } from "@modules/robotics/data/robotics";
import { Canadarm2 } from "@modules/robotics/domain/arm";
import { ManualCapture } from "@modules/robotics/domain/manual-capture";
import { VisitingVehicle } from "@modules/robotics/domain/visiting-vehicle";
import type { CargoResupply } from "@modules/life-support/application/cargo-resupply";
import type { LanderBerth } from "@modules/station/domain/hangar-berth";
import { DEPLOY_STEPS, type CargoAirlock } from "@modules/station/domain/cargo-airlock";
import type { Fixture } from "@modules/station/domain/interior";
import type { DuelView, SessionText } from "./ui/duel-view";
import type { StationAction, StationInteriorMode } from "./station-interior";
import type { StationOutside } from "./station-outside";
import type { ArmAudit } from "./adapters/three/arm-show";
import type { StepAudit } from "./adapters/three/interior/step-audit";
import "./ui/robotics.css";

/**
 * Canadarm2 and Dextre from the Cupola's robotic workstation (docs/design/brazo-robotico.md): every arm job is
 * a code challenge with the real procedure, played at the RWS (her hands on the controllers) and outside (the
 * arm, seen from the Cupola's windows or an outside camera). The Cygnus waits at the capture point until the
 * arm catches it, by challenge or by hand with the hand controllers, and its cargo goes in once berthed.
 */
const TEXT: SessionText = { title: "", progress: "Pasos", lives: "Intentos", order: "Ordena los pasos", submit: "Hacerlo", ok: "Paso hecho", bad: "Así no: inténtalo otra vez", sheet: true };
/** Seconds her hands on the controllers show before each move (then the arm outside). */
const HANDS_S = 0.9;

export interface RoboticsDeps {
  readonly duel: DuelView;
  readonly outside: StationOutside;
  readonly inside: StationInteriorMode;
  readonly cargo: CargoResupply;
  readonly berth: LanderBerth;
  readonly bishop: CargoAirlock;
  readonly work: ExteriorWork;
  atPort(): boolean;
  landerMassKg(): number;
  say(text: string, seconds?: number): void;
  /** The root DOM element (the hand controllers' overlay). */
  readonly root: HTMLElement;
}

export class RoboticsGame {
  /** The chore open in the sheet (the experience suite's answer key). */
  session: { chore: Chore; run: ChoreRun } | null = null;
  readonly arm = new Canadarm2({ lengthM: SSRMS.lengthM.value, maxPayloadKg: SSRMS.maxPayloadKg.value, rail: RAIL, mbsMPerMin: MBS.speedMPerMin.value }, GRAPPLE_FIXTURES, "mbs-1");
  /** The Cygnus at the capture point or berthed. */
  visitor: VisitingVehicle | null = null;
  private handsLeft = 0;
  private manualRun: ManualCapture | null = null;
  private readonly thc = new THREE.Vector3();
  private readonly pad: HTMLElement;

  constructor(private readonly d: RoboticsDeps) {
    this.pad = document.createElement("div");
    this.pad.className = "arm-thc hidden";
    this.pad.setAttribute("aria-label", "Mandos del brazo: THC");
    const btn = (id: string, label: string, aria: string) => `<button data-thc="${id}" aria-label="${aria}">${label}</button>`;
    this.pad.innerHTML = `<p class="arm-read"></p><div class="arm-pad">${btn("up", "▲", "Subir la punta")}${btn("left", "◀", "Punta a la izquierda")}${btn("right", "▶", "Punta a la derecha")}${btn("down", "▼", "Bajar la punta")}${btn("in", "Acercar", "Acercar la punta")}${btn("out", "Alejar", "Alejar la punta")}</div><div class="arm-acts"><button data-arm="disparar" class="primary">Disparar: capturar</button><button data-arm="salir">Dejarlo al reto</button></div>`;
    d.root.appendChild(this.pad);
    const set = (id: string | undefined, k: number) => {
      if (!id) return;
      const c = this.d.outside.view.camera;
      const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
      const fwd = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 2).negate();
      const q = this.d.outside.root.quaternion.clone().invert();
      const axis = { up, down: up.clone().negate(), right, left: right.clone().negate(), in: fwd, out: fwd.clone().negate() }[id as "up"];
      if (axis) this.thc.copy(axis.applyQuaternion(q).multiplyScalar(k));
    };
    this.pad.addEventListener("pointerdown", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-thc]");
      if (t) set(t.dataset.thc, 1);
    });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) this.pad.addEventListener(ev, () => this.thc.set(0, 0, 0));
    this.pad.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-arm]")?.dataset.arm;
      if (a === "disparar") this.fire();
      if (a === "salir") this.stopManual("Mandos sueltos: el Cygnus sigue en deriva libre, esperando");
    });
  }

  /** The Cygnus berthed on its CBM now, if any. */
  get berthedCygnus(): VisitingVehicle | null {
    return this.visitor?.phase === "atracado" ? this.visitor : null;
  }

  /** Why no other Cygnus can be ordered now (its CBM is taken until this one is released). */
  cygnusOrderBlocker(): string | undefined {
    const b = this.berthedCygnus;
    return b ? `El ${b.name} sigue atracado en el CBM: el próximo despega cuando se suelte (estancia real de ${CAPTURE.stayDays.value} días)` : undefined;
  }

  /** The Cygnus as drawn outside. */
  cygnusState(): "fuera" | "punto" | "atracado" {
    const v = this.visitor;
    if (!v) return "fuera";
    return v.phase === "atracado" ? "atracado" : "punto";
  }

  /** The RWS's own actions (before the station life's: cameras, catalogue). */
  actions(f: Fixture): StationAction[] {
    if (f.action.kind !== "brazo") return [];
    const out: StationAction[] = [];
    if (this.d.cargo.awaitingCapture)
      out.push({ id: "brazo:captura", label: "Capturar el Cygnus (por reto)", enabled: true }, { id: "brazo:mano", label: "Capturar el Cygnus a mano (RHC/THC)", enabled: true });
    const berthed = this.berthedCygnus;
    if (berthed) {
      const why = berthed.releaseBlocker(STAY_H);
      out.push({ id: "brazo:suelta-cygnus", label: `Desatracar y soltar el ${berthed.name}`, enabled: !why, ...(why ? { why } : {}) });
    }
    const dextre = this.d.work.job("brazo:dextre-camara");
    if (dextre) out.push({ id: "brazo:dextre-camara", label: "Dextre: cambiar la cámara de P1", enabled: true });
    return out;
  }

  /** The RWS's actions that are arm jobs now (the station life's buttons start these challenges). */
  act(f: Fixture, id: string): boolean {
    if (f.action.kind !== "brazo") return false;
    if (id === "brazo:mano") return this.manual(), true;
    if (id.startsWith("brazo:")) return this.startChore(id), true;
    if (id === "atracar") return this.startChore("brazo:atraque-modulo"), true;
    if (id === "desatracar") return this.startChore("brazo:desatraque-modulo"), true;
    if (id === "soltar") return this.startChore("brazo:bishop"), true;
    return false;
  }

  /** The task list's arm jobs (at the RWS). */
  taskFacts(): { id: string; title: string; detail: string; category: "estacion"; area: string }[] {
    const out: { id: string; title: string; detail: string; category: "estacion"; area: string }[] = [];
    const c = this.d.cargo.awaitingCapture;
    if (c) out.push({ id: "brazo:captura", title: `Capturar el ${c.vehicle.name} con Canadarm2`, detail: "Cupola · puesto robótico · espera a 10 m", category: "estacion", area: "cupula" });
    const b = this.berthedCygnus;
    if (b && !b.releaseBlocker(STAY_H)) out.push({ id: "brazo:suelta-cygnus", title: `Desatracar y soltar el ${b.name}`, detail: "Cupola · puesto robótico · terminó su estancia", category: "estacion", area: "cupula" });
    if (this.d.work.job("brazo:dextre-camara")) out.push({ id: "brazo:dextre-camara", title: "Dextre: cambiar la cámara de P1", detail: "Cupola · puesto robótico · la radiación quemó píxeles", category: "estacion", area: "cupula" });
    return out;
  }

  /** Why an arm job cannot start now. */
  private blocker(p: ArmProcedureId): string | undefined {
    if (p === "captura" && !this.d.cargo.awaitingCapture) return "No hay ningún carguero esperando en el punto de captura";
    if (p === "atraque-modulo") {
      if (this.d.berth.onCbm) return "El módulo ya está atracado en el CBM";
      if (!this.d.atPort()) return "El módulo no está acoplado a la estación: acóplalo en su IDA de cenit";
      if (this.visitor?.phase === "atracado" && this.visitor.cbm === "unity-nadir") return "El CBM de nadir de Unity está ocupado por el Cygnus";
      if (this.d.landerMassKg() > SSRMS.maxPayloadKg.value) return `Pesa ${Math.round(this.d.landerMassKg() / 1000)} t: Canadarm2 mueve como mucho 116 t`;
    }
    if (p === "desatraque-modulo" && !this.d.berth.onCbm) return "El módulo ya está en su IDA";
    if (p === "bishop" && !this.d.bishop.at("bishop").length) return "La Bishop está vacía: entra en ella y sujeta la sonda o un cubesat a su placa";
    if (p === "dextre-camara" && !this.d.work.job("brazo:dextre-camara")) return "La cámara de P1 funciona bien";
    if (p === "suelta-cygnus") return this.berthedCygnus ? this.berthedCygnus.releaseBlocker(STAY_H) : "No hay ningún Cygnus atracado";
    return undefined;
  }

  /** Start an arm challenge (task list, the RWS card). False if `id` is not the arm's. */
  startChore(id: string): boolean {
    if (!id.startsWith("brazo:")) return false;
    const p = id.slice(6) as ArmProcedureId;
    if (this.d.duel.visible) return true;
    const why = this.blocker(p);
    if (why) return this.d.say(why, 6), true;
    const chore = armChore(p, { landerKg: this.d.landerMassKg(), rideM: Math.abs(CAMERA_ORU.at.x - this.arm.mbsX) });
    const run = new ChoreRun(chore);
    this.session = { chore, run };
    if (p === "captura") this.ensureVisitor();
    // Her hands on the RWS's controllers in the Cupola…
    const hands = this.d.inside.stepVisual("cupula", (i) => armMoves(chore, i).map((): StepAct => ({ action: "programar", place: "objetivo" })));
    // …and the arm outside, seen from the windows or an outside camera.
    this.d.outside.beginProcedure(p);
    this.handsLeft = HANDS_S * 1.5;
    const prev = this.d.duel.onClose;
    this.d.duel.onClose = () => {
      this.d.duel.onClose = prev;
      this.d.duel.onRightPick = undefined;
      hands?.clear();
      this.session = null;
      const ok = run.status === "done";
      if (ok) this.apply(p);
      this.d.outside.endProcedure(ok);
      if (!ok) this.d.say("No salió: el brazo vuelve a su sitio y nada ha cambiado", 5);
    };
    const play = (index: number, part?: number) => {
      const moves = armMoves(chore, index);
      this.d.outside.playMoves(part === undefined ? moves : moves.slice(part, part + 1));
      this.handsLeft = HANDS_S;
    };
    let picked = { index: -1, n: 0 };
    this.d.duel.show(
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
      { ...TEXT, title: chore.title },
      (ans: Answer) => {
        const index = run.step;
        const ok = run.submit(ans);
        if (ok) {
          hands?.stepDone(index);
          // The blocks placed one by one already played; the rest play now.
          const moves = armMoves(chore, index);
          const from = picked.index === index ? picked.n : 0;
          if (from < moves.length) this.d.outside.playMoves(moves.slice(from));
          this.handsLeft = HANDS_S;
          picked = { index: -1, n: 0 };
        }
        return { ok };
      },
    );
    this.d.duel.onRightPick = (exId, slot) => {
      if (run.current?.id !== exId) return;
      hands?.partDone?.(run.step, slot);
      play(run.step, slot);
      picked = { index: run.step, n: slot + 1 };
    };
    return true;
  }

  /** The real effect of a finished job on the station. */
  private apply(p: ArmProcedureId): void {
    const s = (t: string, sec = 7) => this.d.say(t, sec);
    switch (p) {
      case "captura":
        return this.berthVisitor();
      case "atraque-modulo": {
        const why = this.d.berth.berth(this.d.atPort(), { massKg: this.d.landerMassKg(), maxKg: SSRMS.maxPayloadKg.value });
        return s(why ?? "Módulo atracado en el CBM de nadir de Unity con sus 16 pernos, como un Cygnus (licencia: el LM no lleva CBM)");
      }
      case "desatraque-modulo": {
        const why = this.d.berth.unberth();
        return s(why ?? "El módulo vuelve a su IDA de cenit: ya puedes volver a su cabina");
      }
      case "bishop": {
        const r = this.d.bishop.deploy();
        return s("why" in r ? r.why : `Bishop: ${DEPLOY_STEPS.length} pasos hechos. ${r.released.map((i) => i.name).join(" y ")} ya vuela${r.released.length > 1 ? "n" : ""} sola${r.released.length > 1 ? "s" : ""}`, 8);
      }
      case "suelta-cygnus": {
        const v = this.berthedCygnus;
        const why = v?.release(STAY_H);
        if (!v || why) return s(why ?? "No hay ningún Cygnus atracado");
        this.visitor = null;
        return s(`${v.name} suelto: se aleja solo y reentrará sobre el Pacífico. El CBM queda libre para el próximo`, 8);
      }
      case "dextre-camara":
        this.d.work.complete("brazo:dextre-camara");
        return s("Dextre ha cambiado la cámara de P1: imagen limpia otra vez. La vieja vuelve en el próximo carguero", 7);
    }
  }

  private ensureVisitor(): VisitingVehicle | null {
    const m = this.d.cargo.awaitingCapture;
    if (!m) return null;
    if (!this.visitor || this.visitor.phase === "atracado") {
      this.visitor = new VisitingVehicle(m.vehicle.id, m.vehicle.name, m.massKg + 1800);
      this.visitor.arrive();
    }
    return this.visitor;
  }

  /** Free drift, capture, first and second stage: berthed, its cargo goes in. */
  private berthVisitor(): void {
    const v = this.ensureVisitor();
    if (!v) return;
    if (v.phase === "punto-captura") v.freeDrift();
    if (v.phase === "deriva-libre") v.capture();
    const unity = !this.d.berth.onCbm;
    v.firstStage(unity ? "unity-nadir" : "harmony-nadir", true);
    v.secondStage();
    this.d.cargo.unload();
    this.d.say(`${v.name} atracado en el CBM de nadir de ${unity ? "Unity" : "Harmony"} con sus ${CAPTURE.bolts.value} pernos: su carga pasa a la despensa`, 8);
  }

  /** Each frame (main.ts): the hand controllers, and which view shows (her hands, then the arm). */
  update(dt: number): void {
    this.handsLeft = Math.max(0, this.handsLeft - dt);
    const m = this.manualRun;
    if (!m) return;
    const show = this.d.outside.armShow;
    const off = show.grappleOffset;
    m.step(new Vec3(this.thc.x, this.thc.y, this.thc.z), dt);
    const tip = new THREE.Vector3(m.tip.x, m.tip.y, m.tip.z);
    const cyg = new THREE.Vector3(m.target.x, m.target.y, m.target.z).sub(m.caught ? new THREE.Vector3() : off);
    show.manual(tip, m.caught ? null : cyg);
    const read = this.pad.querySelector(".arm-read");
    if (read) read.textContent = `Al vástago: ${fmt(m.distanceM)} m · velocidad ${fmt(m.closingMs)} m/s · el LEE atrapa a menos de ${fmt(CAPTURE.envelopeM.value)} m y ${fmt(CAPTURE.closeSpeedMs.value)} m/s`;
  }

  /** While an arm challenge plays: her hands at the RWS show (main.ts draws the interior instead of outside). */
  get showingHands(): boolean {
    return !!this.session && this.handsLeft > 0;
  }

  /** Capture by hand: the RHC/THC at the RWS, seen through the Cupola's nadir window. */
  manual(): void {
    const v = this.ensureVisitor();
    if (!v) return this.d.say("No hay ningún carguero esperando", 5);
    if (v.phase === "punto-captura") v.freeDrift();
    const show = this.d.outside.armShow;
    const cap = show.capturePointNow;
    const g = cap.clone().add(show.grappleOffset);
    const base = show.labBase;
    const tip = g.clone().add(new THREE.Vector3(3.5, 2.5, 1.5));
    this.manualRun = new ManualCapture(
      { tipSpeedMs: SSRMS.tipSpeedMs.value, envelopeM: CAPTURE.envelopeM.value, closeSpeedMs: CAPTURE.closeSpeedMs.value, reachM: SSRMS.lengthM.value },
      new Vec3(base.x, base.y, base.z),
      new Vec3(tip.x, tip.y, tip.z),
      new Vec3(g.x, g.y, g.z),
      new Vec3(CAPTURE.freeDriftMs.value, 0, 0),
    );
    this.d.outside.manualOn = true;
    this.d.outside.view.show("Captura a mano · ventana de nadir de la Cupola");
    const view = this.d.outside.view;
    const prev = view.onClose;
    // «×» on the view lets go of the controllers.
    view.onClose = () => {
      view.onClose = prev;
      if (this.manualRun) this.stopManual("Mandos sueltos: el Cygnus sigue en deriva libre, esperando");
    };
    this.pad.classList.remove("hidden");
    document.body.classList.add("arm-manual");
    this.d.say("Deriva libre: el Cygnus apaga sus propulsores. Lleva el LEE al accesorio de agarre y dispara", 6);
  }

  private fire(): void {
    const m = this.manualRun;
    if (!m) return;
    const r = m.close();
    if (!r.ok) return this.d.say(r.why, 5);
    const v = this.visitor;
    if (v?.phase === "deriva-libre") v.capture();
    this.stopManual("¡Capturado! Desde tierra, el control de misión lleva el Cygnus al CBM y aprieta los pernos");
    // Real: after capture, the ground berths it with the arm (NASA, Cygnus XL 2026).
    this.berthVisitor();
  }

  private stopManual(said: string): void {
    this.manualRun = null;
    this.thc.set(0, 0, 0);
    this.pad.classList.add("hidden");
    document.body.classList.remove("arm-manual");
    this.d.outside.manualOn = false;
    this.d.outside.view.close();
    this.d.say(said, 7);
  }

  /** In manual capture now. */
  get manualActive(): boolean {
    return !!this.manualRun;
  }
  /** Test hook (the suite plays it with taps): the manual capture's numbers. */
  manualState(): { distanceM: number; closingMs: number; caught: boolean } | undefined {
    const m = this.manualRun;
    return m ? { distanceM: m.distanceM, closingMs: m.closingMs, caught: m.caught } : undefined;
  }

  /** The live audit of the step on stage: her hands at the RWS and the arm outside. */
  audit(sheetTop: number): { hands?: StepAudit; arm?: ArmAudit } {
    const hands = this.d.inside.stepAudit(sheetTop);
    const arm = this.d.outside.armAudit(sheetTop);
    return { ...(hands ? { hands } : {}), ...(arm ? { arm } : {}) };
  }

  /** Board hours pass (main.ts). */
  tick(hours: number): void {
    this.d.work.tick(hours);
    const b = this.berthedCygnus;
    if (b) {
      const before = b.releaseBlocker(STAY_H);
      b.tick(hours);
      if (before && !b.releaseBlocker(STAY_H)) this.d.say(`${b.name}: terminó su estancia (${CAPTURE.stayDays.value} días, como el NG-19). Desatrácalo y suéltalo desde la Cupola`, 7);
    }
    for (const e of this.d.work.drainEvents()) if (e.kind === "averia-camara") this.d.say(`Cámara de P1 con píxeles quemados por la radiación: Dextre puede cambiarla desde la Cupola`, 7);
  }
}

/** A Cygnus's stay berthed, board hours (NG-19). */
const STAY_H = CAPTURE.stayDays.value * 24;
const fmt = (x: number) => (Math.round(x * 100) / 100).toLocaleString("es-ES");
