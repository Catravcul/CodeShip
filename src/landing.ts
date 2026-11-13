import * as THREE from "three";
import type { LandingProgram, LandingStatus } from "@modules/navigation/application/landing-program";
import { LANDING_PROGRAM } from "@modules/navigation/application/landing-program";
import type { LandingPhase } from "@modules/navigation/application/landing-guidance";
import { num } from "@modules/navigation/application/trip-chore";
import type { TripChipData } from "./ui/trip-chip";
import type { DuelView, SessionText } from "./ui/duel-view";
import { LandingReadoutView, landingMode } from "./ui/landing-readout";
import { openTripSheet } from "./navigation";
import type { PlanOverlay } from "./adapters/three/plan-overlay";

export const LANDING_TEXT: SessionText = {
  title: "Programar el aterrizaje",
  progress: "Programa",
  lives: "Intentos",
  unit: "pasos",
  order: "Ordena el descenso",
  submit: "Cargar en el ordenador de descenso",
  ok: "Correcto: el ordenador de descenso lo acepta",
  bad: "Esa línea hace el descenso menos preciso",
  sheet: true,
};

export const LANDING_PHASE: Record<LandingPhase, string> = {
  nivelar: "girando la panza al suelo",
  trasladar: "yendo sobre el sitio",
  descender: "bajando",
  frenar: "frenado final",
  posada: "posada",
  rebote: "rebote",
};

export interface LandingUiDeps {
  readonly program: LandingProgram;
  /** Where the readout and the offer go (the cockpit's root, or the probe console). */
  readonly host: HTMLElement;
  /** «lander» or «probe»: placement on screen. */
  readonly kind: "lander" | "probe";
  readonly duel: DuelView;
  /** The craft's own view is on screen now (cockpit or probe console). */
  active(): boolean;
  /** Camera of that view, for the site marker. */
  camera(): THREE.Camera;
  /** Say something to the player (cockpit banner or probe console line). */
  say(text: string): void;
  /** Name of the body below. */
  targetName(): string;
  /** Draws each landing step as it is answered right (site, drift, curve, flare, anchors). */
  readonly overlay?: PlanOverlay;
}

const metres = (m: number) => `${num(m, m < 10 ? 1 : 0)} m`;

/**
 * Landing in the cockpit and the probe console (docs/design/aterrizaje.md): the landing readout and
 * the site marker while in the approach zone, the «Aterrizar con un programa» offer (asked, manual or
 * by program, a player setting), the challenge sheet, and what is said when the program ends.
 */
export class LandingUi {
  private readonly box: HTMLElement;
  private readonly readout: LandingReadoutView;
  private readonly offer: HTMLButtonElement;
  private readonly mark: HTMLElement;
  private last: LandingStatus;
  private wasInZone = false;
  private readonly v = new THREE.Vector3();

  constructor(private readonly d: LandingUiDeps) {
    this.box = document.createElement("div");
    this.box.className = `land-box ${d.kind}`;
    d.host.appendChild(this.box);
    this.readout = new LandingReadoutView(this.box);
    this.offer = document.createElement("button");
    this.offer.className = `land-offer ${d.kind} hidden`;
    this.offer.textContent = "Aterrizar con un programa";
    this.offer.addEventListener("click", () => this.open());
    this.box.appendChild(this.offer);
    this.mark = document.createElement("div");
    this.mark.className = `land-mark ${d.kind}`;
    this.mark.setAttribute("aria-hidden", "true");
    this.mark.innerHTML = "<i></i><span>sitio</span>";
    d.host.appendChild(this.mark);
    this.last = d.program.status;
  }

  /** Open the landing challenges (from the offer, or by itself with the «por programa» setting). */
  open(): void {
    const p = this.d.program;
    const can = p.canProgram();
    if (!can.ok) {
      this.d.say(can.reason ?? "");
      return;
    }
    const run = p.startProgramming();
    openTripSheet(
      this.d.duel,
      run,
      (a) => p.answer(a),
      () => p.status === "flying",
      () => {
        if (p.status === "programming") p.cancel();
      },
      LANDING_TEXT,
      this.d.overlay?.visual(() => p.sketch()),
    );
  }

  /** The trip chip's data while the program flies (the live preview follows the craft). */
  chip(who: string): TripChipData | undefined {
    const pr = this.d.program.progress();
    if (!pr) return undefined;
    const total = pr.etaS;
    return {
      who,
      goal: `aterrizaje en ${this.d.targetName()}`,
      etaRealS: total / Math.max(1, pr.lapse),
      fraction: Math.max(0, Math.min(1, 1 - pr.clearanceM / LANDING_PROGRAM.zoneM)),
      detail: `${LANDING_PHASE[pr.phase]} · ${metres(pr.clearanceM)} del suelo · ${num(pr.speedMs, 2)} m/s${pr.lapse > 1 ? ` · ×${num(pr.lapse)}` : ""}`,
    };
  }

  /** Each frame, after the craft's physics ran. */
  update(): void {
    const d = this.d;
    const p = d.program;
    p.update();
    this.events();
    const zone = p.inZone();
    if (zone && !this.wasInZone && p.status !== "flying") {
      const mode = landingMode();
      if (mode === "programa" && d.active() && !d.duel.visible) this.open();
      else if (mode === "preguntar") d.say("Zona de aterrizaje: pósala a mano con los indicadores X, Y, Z o pulsa «Aterrizar con un programa»");
    }
    this.wasInZone = zone;
    const r = d.active() ? p.readout() : undefined;
    if (!r || (!zone && !p.active)) {
      this.readout.hide();
      this.offer.classList.add("hidden");
      this.mark.classList.remove("on");
      return;
    }
    const pr = p.progress();
    this.readout.render(r, p.siteRadiusM, pr ? `Programa · ${LANDING_PHASE[pr.phase]}` : "Aterrizaje");
    // While the program flies, the trip chip has «Mando» to take over.
    this.offer.classList.toggle("hidden", p.active || p.status === "programming" || !p.canProgram().ok);
    this.offer.classList.toggle("primary", landingMode() !== "manual");
    this.placeMark();
  }

  /** The site on screen: a ring on the ground where the craft should land. */
  private placeMark(): void {
    const site = this.d.program.siteWorld();
    if (!site) return void this.mark.classList.remove("on");
    const cam = this.d.camera();
    this.v.set(site.x, site.y, site.z).project(cam);
    const on = this.v.z < 1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1;
    this.mark.classList.toggle("on", on);
    if (!on) return;
    this.mark.style.transform = `translate(${((this.v.x + 1) / 2) * window.innerWidth}px, ${((1 - this.v.y) / 2) * window.innerHeight}px)`;
  }

  private events(): void {
    const p = this.d.program;
    const s = p.status;
    if (s === this.last) return;
    const prev = this.last;
    this.last = s;
    const name = this.d.targetName();
    const say = this.d.say;
    if (s === "flying") say(`Programa cargado: baja sola al sitio en ${name}${p.mistakes ? ` (menos preciso: ${p.mistakes} ${p.mistakes === 1 ? "fallo" : "fallos"})` : ""}`);
    if (s === "landed") say(`Posada por programa a ${metres(p.missM() ?? 0)} del centro del sitio`);
    if (s === "bounced") say(`Rebote: el programa tocó a ${num(LANDING_PROGRAM.touchdownMs[p.mistakes] ?? 0, 2)} m/s (más de 0,10). Vuelve a programarlo o pósala a mano`);
    if (s === "manual" && prev === "flying") say("Mando manual: el programa de aterrizaje se ha desconectado");
    if (s === "failed" && prev === "programming") say("El programa no compila: pósala a mano o vuelve a programarlo");
  }
}
