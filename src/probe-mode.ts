import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { ThrustCommand } from "@modules/ship/domain/ship";
import type { ProbeEvent, ProbeOps } from "@modules/subjugation/application/probe-ops";
import { PROBE_TUNING } from "@modules/subjugation/application/probe-ops";
import type { Rapport } from "@modules/subjugation/domain/rapport";
import { PROBE_HULL } from "@modules/ship/data/probe";
import { ProbeModel } from "./adapters/three/probe-model";
import { TouchPilot, mergeCommands } from "./adapters/input/touch";
import { stageDots, nextStepText } from "./ui/rapport-view";

const fmt = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
const dist = (m: number) => (m >= 1000 ? `${fmt(m / 1000, 2)} km` : `${fmt(m, m < 10 ? 2 : 0)} m`);
const WARPS = [1, 10, 100] as const;

export interface ProbeModeDeps {
  readonly probe: ProbeOps;
  /** World direction the release springs push it (away from the travel ship's bay). */
  launchDirection(): Vec3;
  targetName(): string;
  bond(): Rapport;
  /** The target asteroid is angry now. */
  angry(): boolean;
  /** Stage 1 can start now (parked on the target, stage on offer). */
  canStartDuel(): boolean;
  startDuel(): void;
  /** Keyboard flight command (shared with the cockpit). */
  keyboard(): ThrustCommand;
}

/**
 * The probe's console on the travel ship's flight deck: the probe's own camera on the 3D scene,
 * its telemetry, the flight pads (same thrusters model and flight computer as the lander) and the
 * actions: launch, park, enter its mind (stage 1), recover with the arm, or abandon it.
 */
export class ProbeMode {
  readonly camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.02, 2e6);
  readonly model = new ProbeModel(PROBE_HULL);
  private readonly ui: HTMLElement;
  private readonly tele: HTMLElement;
  private readonly rapport: HTMLElement;
  private readonly msg: HTMLElement;
  private readonly title: HTMLElement;
  private readonly btn: Record<"launch" | "assist" | "duel" | "recover" | "abandon" | "warp", HTMLButtonElement>;
  private readonly touch: TouchPilot;
  private msgUntil = 0;
  private warpIdx = 0;
  private cmd: ThrustCommand = { mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.ZERO };
  private html = new Map<HTMLElement, string>();
  active = false;
  onExit?: () => void;

  constructor(
    root: HTMLElement,
    scene: THREE.Scene,
    private readonly deps: ProbeModeDeps,
  ) {
    scene.add(this.model.root);
    this.ui = document.createElement("div");
    this.ui.className = "probe-ui hidden";
    this.ui.innerHTML = `
      <div class="pr-top"><b class="pr-title"></b><span class="pr-cam">Cámara de la sonda · mando a distancia desde la nodriza (retardo despreciable)</span><button class="pr-exit">Volver al puente</button></div>
      <div class="pr-tele"></div>
      <div class="pr-rapport"></div>
      <div class="pr-msg"></div>
      <div class="pr-actions">
        <button data-act="launch" class="primary">Lanzar sonda</button>
        <button data-act="duel" class="primary">Entrar en su mente · fase 1</button>
        <button data-act="assist">Aterrizaje: manual</button>
        <button data-act="recover">Recuperar con el brazo</button>
        <button data-act="warp">Tiempo ×1</button>
        <button data-act="abandon" class="danger">Abandonar la sonda</button>
      </div>`;
    root.appendChild(this.ui);
    this.tele = this.ui.querySelector(".pr-tele")!;
    this.rapport = this.ui.querySelector(".pr-rapport")!;
    this.msg = this.ui.querySelector(".pr-msg")!;
    this.title = this.ui.querySelector(".pr-title")!;
    const b = (k: string) => this.ui.querySelector<HTMLButtonElement>(`[data-act="${k}"]`)!;
    this.btn = { launch: b("launch"), assist: b("assist"), duel: b("duel"), recover: b("recover"), abandon: b("abandon"), warp: b("warp") };
    this.touch = new TouchPilot(this.ui);
    this.ui.querySelector(".pr-exit")!.addEventListener("click", () => this.exit());
    this.ui.addEventListener("click", (e) => this.onClick(e));
    window.addEventListener("keydown", (e) => {
      if (!this.active || e.repeat) return;
      if (e.code === "Escape") this.exit();
      if (e.code === "KeyG") this.btn.assist.click();
    });
  }

  /** Time warp asked for from the console. */
  get warpRequested(): number {
    return WARPS[this.warpIdx]!;
  }

  /** Pilot command for the probe this frame (pads and keyboard). */
  command(): ThrustCommand {
    return this.active ? this.cmd : { mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.ZERO };
  }

  enter(): void {
    this.active = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-probe");
    this.resize();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.ui.classList.add("hidden");
    document.body.classList.remove("in-probe");
    this.warpIdx = 0;
    this.onExit?.();
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  say(text: string, seconds = 4): void {
    this.msg.textContent = text;
    this.msg.classList.add("on");
    this.msgUntil = performance.now() + seconds * 1000;
  }

  private onClick(e: Event): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!t) return;
    const p = this.deps.probe;
    switch (t.dataset.act) {
      case "launch":
        if (p.launch(this.deps.launchDirection())) this.say("Muelles sueltos: la sonda se separa a 0,08 m/s");
        break;
      case "assist":
        p.flight.landingAssist = !p.flight.landingAssist;
        break;
      case "duel":
        if (this.deps.canStartDuel()) this.deps.startDuel();
        break;
      case "recover":
        if (!p.recover()) this.say(`El brazo agarra a menos de ${PROBE_TUNING.captureRangeM} m de la bahía y a menos de ${fmt(PROBE_TUNING.captureSpeedMs)} m/s`);
        break;
      case "warp":
        this.warpIdx = (this.warpIdx + 1) % WARPS.length;
        break;
      case "abandon":
        p.abandon();
        break;
    }
  }

  /** Messages for what happened to the probe (also shown when the console is closed, on the next open). */
  onEvent(e: ProbeEvent): void {
    const name = this.deps.targetName();
    switch (e.type) {
      case "posada":
        return this.say(`Sonda posada en ${name}: las anclas sujetan. Ya puedes entrar en su mente`, 6);
      case "despegada":
        return this.say("La sonda despega");
      case "recuperada":
        return this.say("El brazo la agarra y la guarda en su bahía: batería cargada", 6);
      case "sacudida":
        return this.say(`¡${name} sacude la sonda! Aléjala o abandónala`, 6);
      case "perdida":
        return this.say(e.why === "abandonada" ? "Sonda abandonada" : e.why === "destruida" ? "Sonda destruida por los escombros" : "Sonda sin batería: perdida", 6);
      case "lanzada":
        return;
    }
  }

  /** Pose the model every frame; while active also read the pads, aim the camera and draw the console. */
  update(dt: number, warp: number, warpNote: string): void {
    const p = this.deps.probe;
    const s = p.flight.state;
    this.model.root.visible = p.status !== "sin-sonda";
    this.model.root.position.set(s.position.x, s.position.y, s.position.z);
    this.model.root.quaternion.set(s.orientation.x, s.orientation.y, s.orientation.z, s.orientation.w);
    this.cmd = mergeCommands(this.deps.keyboard(), this.touch.command());
    const firing = this.active && p.out && (this.cmd.mainThrottle > 0 || this.cmd.translation.length() > 0);
    this.model.update(dt, firing);
    if (!this.active) return;
    // Chase camera a little behind and above it, looking along its nose.
    const behind = s.toWorld(new Vec3(0, 0.3, 1.25)).add(s.position);
    const ahead = s.toWorld(new Vec3(0, 0.05, -3)).add(s.position);
    const up = s.toWorld(Vec3.Y);
    this.camera.position.set(behind.x, behind.y, behind.z);
    this.camera.up.set(up.x, up.y, up.z);
    this.camera.lookAt(ahead.x, ahead.y, ahead.z);
    this.render(warp, warpNote);
    if (performance.now() > this.msgUntil) this.msg.classList.remove("on");
  }

  private set(el: HTMLElement, html: string): void {
    if (this.html.get(el) === html) return;
    this.html.set(el, html);
    el.innerHTML = html;
  }

  private render(warp: number, warpNote: string): void {
    const d = this.deps;
    const p = d.probe;
    const f = p.flight;
    const t = f.telemetry();
    const ship = f.ship;
    const fuel = ship.propellantKg("Hydrazine");
    const bat = p.batteryWh / p.spec.batteryWh;
    const bay = p.bayRange();
    this.set(this.title, `${ship.name} · ${p.status === "sin-sonda" ? "sin sondas a bordo" : `${p.onBoard} a bordo`}`);
    const status = { estibada: "En su bahía de la nodriza", "en-vuelo": "En vuelo", posada: `Posada en ${d.targetName()}`, "sin-sonda": "No quedan sondas: repón en la estación" }[p.status];
    const near = p.status === "en-vuelo" && t.clearance < 60;
    this.set(
      this.tele,
      `<span><b>${status}</b></span>
       <span>${esc(d.targetName())} a ${dist(Math.max(0, t.distanceToSurface))}</span>
       <span>cierre ${fmt(t.closingSpeed)} m/s</span>
       <span>Δv ${fmt(t.deltaV, 0)} m/s · ${fmt(fuel, 2)} kg de hidracina</span>
       <span class="${bat < 0.2 ? "warn" : ""}">batería ${Math.round(bat * 100)} %</span>
       <span class="${t.hullIntegrity < 0.5 ? "bad" : ""}">casco ${Math.round(t.hullIntegrity * 100)} %</span>
       <span>bahía a ${dist(bay.distanceM)}</span>
       ${warp > 1 || warpNote ? `<span>${warpNote || `tiempo ×${warp}`}</span>` : ""}
       ${near ? `<span class="warn">${t.tiltDeg > 30 ? `Gira la panza al suelo (${fmt(t.tiltDeg, 0)}°): asistente con G` : "Posa las patas a menos de 0,10 m/s"}</span>` : ""}`,
    );
    const angry = d.angry();
    const r = d.bond();
    this.rapport.classList.toggle("angry", angry);
    this.set(this.rapport, `<b>${esc(d.targetName())}</b> · confianza ${Math.round(r.trust * 100)} %<div class="rp-dots">${stageDots(r)}</div><small>${esc(nextStepText(r, angry))}</small>`);
    const show = (b: HTMLButtonElement, on: boolean) => b.classList.toggle("hidden", !on);
    show(this.btn.launch, p.canLaunch);
    show(this.btn.duel, p.status === "posada" && !angry);
    this.btn.duel.disabled = !d.canStartDuel();
    this.btn.duel.textContent = d.canStartDuel() ? "Entrar en su mente · fase 1" : r.next === "sonda" ? "Entrar en su mente · fase 1" : "Fase 1 ya hecha aquí";
    show(this.btn.assist, p.out);
    this.btn.assist.textContent = `Aterrizaje: ${f.landingAssist ? "auto" : "manual"}`;
    this.btn.assist.classList.toggle("on", f.landingAssist);
    show(this.btn.recover, p.status === "en-vuelo");
    this.btn.recover.classList.toggle("primary", p.canRecover);
    this.btn.recover.textContent = p.canRecover ? "Recuperar con el brazo" : `Recuperar: acércala (${dist(bay.distanceM)})`;
    show(this.btn.abandon, p.out);
    show(this.btn.warp, p.status === "en-vuelo");
    this.btn.warp.textContent = `Tiempo ×${this.warpRequested}`;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
