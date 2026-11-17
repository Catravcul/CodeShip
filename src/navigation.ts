import type { Vec3 } from "@core/math/vec3";
import { REAL_ONLY } from "@core/realism";
import { MANUAL_CARRIER } from "@modules/navigation/application/carrier-trip";
import type { Rock } from "@modules/celestial/domain/region";
import type { Navigator } from "@modules/navigation/application/navigator";
import type { AutopilotPhase } from "@modules/navigation/application/autopilot";
import { duration, num } from "@modules/navigation/application/trip-chore";
import type { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import type { DuelView, SessionText } from "./ui/duel-view";
import { NavMap } from "./ui/nav-map";
import type { StepVisual } from "@modules/chores/domain/step-visual";

export const TRIP_TEXT: SessionText = {
  title: "Programar el viaje",
  progress: "Plan",
  lives: "Intentos",
  unit: "pasos",
  order: "Ordena la maniobra",
  submit: "Cargar en el piloto automático",
  ok: "Correcto: el ordenador de vuelo lo acepta",
  bad: "El ordenador de vuelo rechaza esa línea",
  sheet: true,
};

export const PHASE: Record<AutopilotPhase, string> = {
  orient: "Orientando la proa",
  burn: "Acelerando",
  coast: "Crucero",
  flip: "Dando la vuelta",
  brake: "Frenando",
  aim: "Apuntando al destino",
  dock: "Acoplando por el eje del puerto",
  arrived: "Llegada",
};
const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]!);

/**
 * Opens a trip's chain of challenges in the shared challenge sheet (also used by the probe's trips).
 * `flying()` turns true once the plan is loaded: the sheet then closes by itself; closing it before
 * calls `abort`.
 */
export function openTripSheet(duel: DuelView, run: ChoreRun, answer: (a: Answer) => boolean, flying: () => boolean, abort: () => void, text: SessionText = TRIP_TEXT, visual?: StepVisual): void {
  // The challenge sheet is shared with chores and the suit-up: chain its close handler.
  const prev = duel.onClose;
  const restore = () => {
    if (duel.onClose === close) duel.onClose = prev;
  };
  const close = () => {
    abort();
    visual?.clear();
    restore();
  };
  duel.onClose = close;
  duel.show(
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
    { ...text, title: run.chore.title },
    (a) => {
      const step = run.step;
      const ok = answer(a);
      // Each step answered right shows what it does at once (the plan builds up before it flies).
      if (ok) visual?.stepDone(step);
      if (run.status === "failed") visual?.clear();
      if (flying()) {
        visual?.finish();
        restore();
        setTimeout(() => duel.hide(), 900);
      }
      return { ok };
    },
  );
}

/**
 * Navigation: the map (on the travel ship's flight deck, NAV page or M there), the trip challenges in
 * the shared challenge sheet and the autopilot strip with its progress and «Tomar el mando». The
 * lander's cockpit has no map (docs/design/accesos.md): M there only says where the map is.
 */
export class NavigationMode {
  readonly map: NavMap;
  private readonly tag: HTMLElement;
  private readonly text: HTMLElement;
  private readonly take: HTMLButtonElement;
  private readonly bar: HTMLElement;
  private message: { text: string; cls: string; until: number } | null = null;
  private lastStatus: string;
  private refreshAt = 0;
  /** Set by main: whether the map may open here as an overlay (it may not in the lander's cockpit). */
  canOpen: () => boolean = () => true;
  /** Set by main: M was pressed where the map cannot open. */
  onBlocked?: () => void;

  /** The mothership's arrival at a station: Starship latches by its nose port (IDSS); the ring ship enters the dry dock (fiction). */
  private berthedText(where: string, carrying: boolean): string {
    const lm = carrying ? " con el módulo de aterrizaje acoplado" : "";
    return REAL_ONLY ? `La Starship ha atracado en ${where} por su puerto de proa${lm}: ganchos cerrados` : `La nodriza ha entrado en el dique seco de ${where}${lm}: los brazos la sujetan`;
  }

  constructor(
    root: HTMLElement,
    private readonly nav: Navigator,
    private readonly duel: DuelView,
    opts: { title: string; boundaryRadiusM: number; rocks: readonly Rock[]; shipPosition(): Vec3; shipNose(): Vec3; carrierPosition?(): Vec3 },
  ) {
    this.map = new NavMap(root, { nav, ...opts, onProgram: () => this.program(), onHand: () => this.flash(`Pilotaje manual de la Starship hacia ${nav.target.name}: da el empuje con +0,1 m/s`, "done") });
    // Hand flying the mothership (reglas.md §3.6): her speed commands, in short translation burns.
    this.hand = document.createElement("div");
    this.hand.className = "carrier-hand hidden";
    this.hand.setAttribute("role", "group");
    this.hand.setAttribute("aria-label", "Pilotaje manual de la nave");
    this.hand.innerHTML = `<div class="ch-read"></div><div class="ch-btns"><button data-dv="-0.1" aria-label="Frenar 0,1 m/s">−0,1 m/s</button><button data-dv="stop" aria-label="Parar la nave">Parar</button><button data-dv="0.1" aria-label="Acelerar 0,1 m/s">+0,1 m/s</button></div><div class="ch-note">Mandos de la Starship: en desarrollo (SpaceX no los ha publicado). Encendidos cortos, como en las operaciones de proximidad</div>`;
    root.appendChild(this.hand);
    this.handRead = this.hand.querySelector(".ch-read")!;
    this.hand.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-dv]");
      const m = nav.manualCarrier;
      if (!b || !m) return;
      const ok = b.dataset.dv === "stop" ? m.hold() : m.command(Number(b.dataset.dv));
      if (!ok) this.flash(m.refused ?? "No enciende", "bad");
    });
    this.tag = document.createElement("div");
    this.tag.className = "autopilot-tag";
    this.tag.innerHTML = `<div class="ap-row"><span class="ap-text"></span><button class="ap-take">Tomar el mando</button></div><div class="ap-bar"><i></i></div>`;
    root.appendChild(this.tag);
    this.text = this.tag.querySelector(".ap-text")!;
    this.take = this.tag.querySelector(".ap-take")!;
    this.bar = this.tag.querySelector(".ap-bar")!;
    this.take.addEventListener("click", () => nav.cancel());
    this.lastStatus = nav.status;
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM" && !e.repeat) this.toggle();
      if (e.code === "Escape" && this.map.visible && !this.map.embedded) this.map.close();
    });
  }

  /** Set by main: she is at the mothership's controls (the flight deck), where the hand-flying panel shows. */
  atControls?: () => boolean;
  private readonly hand: HTMLElement;
  private readonly handRead: HTMLElement;

  get mapOpen(): boolean {
    return this.map.visible;
  }

  /** While the map or the trip challenges are up, the pilot's hands are off the controls. */
  get blocksInput(): boolean {
    return this.map.visible || this.nav.status === "programming";
  }

  /** Set by main: the step visual of the trip about to be programmed (route, burn, arrival, braking point). */
  stepVisual?: () => StepVisual | undefined;

  /** Set by main: M and «Mapa» go somewhere else first (the deck's navigation panel); true if handled. */
  toggleOverride?: () => boolean;

  toggle(): void {
    if (this.toggleOverride?.()) return;
    if (this.map.visible) this.map.close();
    else if (this.canOpen()) this.map.open();
    else this.onBlocked?.();
  }

  /** Open the trip challenges for the current target. */
  program(): void {
    const can = this.nav.canProgram();
    if (!can.ok) {
      this.flash(can.reason ?? "", "bad");
      return;
    }
    const run = this.nav.startProgramming();
    const nav = this.nav;
    openTripSheet(
      this.duel,
      run,
      (a) => nav.answer(a),
      () => nav.status === "autopilot" || nav.status === "carrier",
      () => {
        if (nav.status === "programming") nav.cancel();
      },
      TRIP_TEXT,
      this.stepVisual?.(),
    );
  }

  private flash(text: string, cls: string, seconds = 6): void {
    this.message = { text, cls, until: performance.now() + seconds * 1000 };
  }

  /** Each frame, with the real frame time (the trip's time-lapse is the navigator's own). */
  update(dtS: number, held = false): void {
    const nav = this.nav;
    nav.update(dtS, held);
    const now = performance.now();
    if (nav.status !== this.lastStatus) {
      if (nav.status === "arrived") this.flash(`Llegada: a ${km(nav.approachM)} de ${nav.target.name}. Aterriza a mano con los indicadores o con «Aterrizar con un programa» (retos)`, "done", 10);
      if (nav.status === "autopilot" && this.lastStatus === "carrier") this.flash("La nodriza ha aparcado: el módulo de aterrizaje se desacopla y sigue solo", "done");
      if (nav.status === "docked")
        this.flash(this.lastStatus === "carrier" ? this.berthedText(nav.target.name, nav.carrying) : `Módulo acoplado a ${nav.target.name}`, "done", 10);
      if (nav.status === "manual" && this.lastStatus === "carrier" && nav.parkedByHand) this.flash(`La Starship ha aparcado junto a ${nav.target.name}: baja en el módulo desde el puesto del comandante, a mano o con un programa`, "done", 10);
      if (nav.status === "manual" && this.lastStatus === "docking") this.flash("Acople cancelado: tienes los mandos", "bad");
      if (nav.status === "failed") this.flash("El plan no compila: vuela a mano o vuelve a programarlo desde el mapa de la nave de viaje", "bad");
      if (nav.status === "manual" && this.lastStatus === "autopilot") this.flash("Mando manual: el piloto automático se ha desconectado", "bad");
      this.lastStatus = nav.status;
    }
    if (this.map.visible && now > this.refreshAt) {
      this.refreshAt = now + 700;
      this.map.tick();
    }
    const p = nav.progress();
    let text = "";
    let cls = "";
    if (p) {
      const who = p.manual ? "Pilotaje manual" : p.vehicle === "carrier" ? "Nodriza en viaje" : "Piloto automático";
      const lapse = p.lapse > 1 ? ` · cámara rápida ×${num(p.lapse)}` : "";
      text = `${who} → ${nav.target.name}\n${PHASE[p.phase]} · ${num(p.speedMS, p.speedMS < 1 ? 2 : 1)} m/s · faltan ${km(p.remainingM)} · ${duration(p.etaS)} de vuelo, llega en ${duration(p.etaRealS)}${lapse}`;
      (this.bar.firstElementChild as HTMLElement).style.width = `${(p.fraction * 100).toFixed(1)}%`;
    } else if (this.message && now < this.message.until) {
      text = this.message.text;
      cls = this.message.cls;
    }
    const className = `autopilot-tag ${cls} ${text ? "on" : ""}`;
    if (this.tag.className !== className) this.tag.className = className;
    if (this.text.textContent !== text) this.text.textContent = text;
    this.take.hidden = !p;
    this.bar.hidden = !p;
    const takeLabel = p?.manual ? "Dejar de pilotar" : "Tomar el mando";
    if (this.take.textContent !== takeLabel) this.take.textContent = takeLabel;
    this.updateHand();
  }

  /** The hand-flying panel: range to the parking point, speed and what to do next. */
  private updateHand(): void {
    // Only at the controls (the flight deck); away from them the ship coasts at the speed she gave it.
    const m = this.nav.manualCarrier && (this.atControls?.() ?? true) ? this.nav.manualCarrier : undefined;
    this.hand.classList.toggle("hidden", !m);
    document.body.classList.toggle("in-carrier-hand", !!m);
    if (!m) return;
    const r = m.remainingM;
    const v = m.speedMs;
    const window_ = MANUAL_CARRIER.arriveM;
    const hint =
      Math.abs(r) <= window_
        ? Math.abs(v) <= MANUAL_CARRIER.holdMs
          ? "En el punto de espera"
          : "¡Estás en el punto: Parar!"
        : r < 0
          ? "Te has pasado: da empuje hacia atrás (−)"
          : v <= 0
            ? "Da empuje (+): 0,4 m/s como Hayabusa2"
            : `Para en ${km(Math.max(0, r - window_))}: llegas en ${duration(r / v)} de vuelo`;
    const html = `<b>Starship a mano → ${esc(this.nav.target.name)}</b><span>${r >= 0 ? "faltan" : "pasada"} ${km(Math.abs(r))} · ${num(v, 2)} m/s · Δv gastado ${num(m.spentMs, 1)} m/s</span><span class="ch-hint">${hint}</span>`;
    if (this.handRead.innerHTML !== html) this.handRead.innerHTML = html;
  }
}
