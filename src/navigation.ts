import type { Vec3 } from "@core/math/vec3";
import type { Rock } from "@modules/celestial/domain/region";
import type { Navigator } from "@modules/navigation/application/navigator";
import type { AutopilotPhase } from "@modules/navigation/application/autopilot";
import { duration, num } from "@modules/navigation/application/trip-chore";
import { CARRIER_TIMELAPSE } from "@modules/navigation/application/carrier-trip";
import type { DuelView, SessionText } from "./ui/duel-view";
import { NavMap } from "./ui/nav-map";

const TRIP_TEXT: SessionText = {
  title: "Programar el viaje",
  progress: "Plan",
  lives: "Intentos",
  order: "Ordena la maniobra",
  submit: "Cargar en el piloto automático",
  ok: "Correcto: el ordenador de vuelo lo acepta",
  bad: "El ordenador de vuelo rechaza esa línea",
  sheet: true,
};

const PHASE: Record<AutopilotPhase, string> = {
  orient: "Orientando la proa",
  burn: "Acelerando",
  coast: "Crucero",
  flip: "Dando la vuelta",
  brake: "Frenando",
  aim: "Apuntando al asteroide",
  arrived: "Llegada",
};
const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);

/**
 * Cockpit side of navigation: the map (flight-bar button «Mapa» or M), the trip challenges in the
 * shared challenge sheet and the autopilot strip with its progress and «Tomar el mando».
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
  /** Set by main: whether the cockpit is showing (not inside, in the bay, on EVA or in a duel). */
  canOpen: () => boolean = () => true;

  constructor(
    root: HTMLElement,
    private readonly nav: Navigator,
    private readonly duel: DuelView,
    opts: { title: string; boundaryRadiusM: number; rocks: readonly Rock[]; shipPosition(): Vec3; shipNose(): Vec3; carrierPosition?(): Vec3 },
  ) {
    this.map = new NavMap(root, { nav, ...opts, onProgram: () => this.program() });
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

  get mapOpen(): boolean {
    return this.map.visible;
  }

  /** While the map or the trip challenges are up, the pilot's hands are off the controls. */
  get blocksInput(): boolean {
    return this.map.visible || this.nav.status === "programming";
  }

  /** Set by main: M and «Mapa» go somewhere else first (the deck's navigation panel); true if handled. */
  toggleOverride?: () => boolean;

  toggle(): void {
    if (this.toggleOverride?.()) return;
    if (this.map.visible) this.map.close();
    else if (this.canOpen()) this.map.open();
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
    // The challenge sheet is shared with chores and the suit-up: chain its close handler.
    const prev = this.duel.onClose;
    const restore = () => {
      if (this.duel.onClose === close) this.duel.onClose = prev;
    };
    const close = () => {
      if (nav.status === "programming") nav.cancel();
      restore();
    };
    this.duel.onClose = close;
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
      { ...TRIP_TEXT, title: run.chore.title },
      (a) => {
        const ok = nav.answer(a);
        if (nav.status === "autopilot" || nav.status === "carrier") {
          restore();
          setTimeout(() => this.duel.hide(), 900);
        }
        return { ok };
      },
    );
  }

  private flash(text: string, cls: string, seconds = 6): void {
    this.message = { text, cls, until: performance.now() + seconds * 1000 };
  }

  /** Each frame, with the real frame time and the time warp the pilot asked for. */
  update(dtS: number, warp = 1): void {
    const nav = this.nav;
    nav.update(dtS, warp);
    const now = performance.now();
    if (nav.status !== this.lastStatus) {
      if (nav.status === "arrived") this.flash(`Llegada: a ${km(nav.approachM)} de ${nav.target.name}. Tienes los mandos: aterriza y entra en su mente`, "done", 10);
      if (nav.status === "autopilot" && this.lastStatus === "carrier") this.flash("La nodriza ha aparcado: la sonda se desacopla y sigue sola", "done");
      if (nav.status === "failed") this.flash("El plan no compila: vuela a mano o vuelve a programarlo desde el mapa", "bad");
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
      const who = p.vehicle === "carrier" ? "Nodriza en viaje" : "Piloto automático";
      const lapse = p.vehicle === "carrier" ? ` · cámara rápida ×${CARRIER_TIMELAPSE * warp}` : "";
      text = `${who} → ${nav.target.name}\n${PHASE[p.phase]} · ${num(p.speedMS, p.speedMS < 1 ? 2 : 1)} m/s · faltan ${km(p.remainingM)} · ${duration(p.etaS)}${lapse}${p.phase === "coast" ? " · X acelera el tiempo" : ""}`;
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
  }
}
