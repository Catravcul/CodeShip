import type { CruiseClock } from "@modules/navigation/domain/cruise";
import type { TripStatus } from "./ui/trip-chip";
import "./ui/trip-chip.css";

/**
 * The Starship's cruise from low Earth orbit to Bennu (docs/design/santuario3-lanzamiento.md), when level 6 comes
 * from level 3's launch (game-save.ts `fromLaunch`). The real trip is OSIRIS-REx's, 816 days (licence for the
 * Starship's); it plays at the board's pace with the trips' cap of 10 real minutes (docs/design/viajes.md), and
 * meanwhile she does the tasks on board. The asteroids are out of sight until the Starship arrives by Bennu,
 * where a new game starts. Its clock (navigation/domain/cruise.ts) is saved with the game: a reload in
 * mid-cruise goes on at the same point (docs/design/partidas.md, «Viajes en marcha»).
 */
export interface CruiseHooks {
  /** The asteroids shown (false while cruising). */
  readonly showAsteroids: (on: boolean) => void;
  readonly say: (text: string) => void;
  /**
   * Whether the chip shows now: only at the Starship's pilot seat, as every trip chip (reglas.md §3.8); elsewhere
   * the tree menu's «Trayecto» shows the cruise (`status`). Always, if not given.
   */
  readonly atConsole?: () => boolean;
}

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export class BennuCruise {
  private readonly el: HTMLElement;
  private readonly timer: number;
  private last = performance.now();

  constructor(
    root: HTMLElement,
    readonly clock: CruiseClock,
    private readonly hooks: CruiseHooks,
  ) {
    this.el = document.createElement("div");
    this.el.className = "trip-chip cruise-chip";
    this.el.setAttribute("role", "status");
    this.el.innerHTML = `<div class="tc-row"><b class="tc-title">Starship → Bennu</b><span class="tc-eta"></span></div><div class="tc-detail">Crucero real: ${clock.cruiseDays} días (como OSIRIS-REx), a ×60 y con el tope de 10 min. Mientras, las tareas de a bordo</div><div class="tc-bar"><i></i></div>`;
    (root.querySelector(".ctx-dock") ?? root).appendChild(this.el);
    hooks.showAsteroids(false);
    this.timer = window.setInterval(() => this.tick(), 250);
    this.paint();
  }

  get totalS(): number {
    return this.clock.totalS;
  }

  /** Real seconds left. */
  get left(): number {
    return this.clock.leftS;
  }

  get active(): boolean {
    return this.clock.active;
  }

  /** What the HUD's «Trayecto» window shows while it cruises (reglas.md §5.9). */
  status(): TripStatus | undefined {
    if (!this.active) return undefined;
    return { vehicle: "Starship", destination: "Bennu", etaRealS: this.clock.leftS, phase: "Crucero", fraction: this.clock.fraction };
  }

  /** Test hook: arrive now. */
  finishNow(): void {
    this.clock.advance(Infinity);
    this.tick();
  }

  private tick(): void {
    const now = performance.now();
    // The game's time does not run while the page is hidden or closed (docs/design/partidas.md).
    if (!document.hidden) this.clock.advance((now - this.last) / 1000);
    this.last = now;
    this.paint();
    if (this.clock.active) return;
    window.clearInterval(this.timer);
    this.el.remove();
    this.hooks.showAsteroids(true);
    this.hooks.say("Llegada a Bennu: la Starship se queda junto al asteroide, donde empieza la expedición");
  }

  private paint(): void {
    this.el.classList.toggle("on", this.hooks.atConsole?.() ?? true);
    this.el.querySelector(".tc-eta")!.textContent = `llega en ${clock(this.clock.leftS)}`;
    (this.el.querySelector(".tc-bar i") as HTMLElement).style.width = `${(this.clock.fraction * 100).toFixed(1)}%`;
  }
}
