import { realSeconds } from "@modules/navigation/domain/travel-time";
import { BOARD_TIME_LAPSE } from "@core/board-time";
import "./ui/trip-chip.css";

/**
 * The Starship's cruise from low Earth orbit to Bennu (docs/design/santuario3-lanzamiento.md), when level 6 comes
 * from level 3's launch (game-save.ts `fromLaunch`). The real trip is OSIRIS-REx's, 816 days (licence for the
 * Starship's); it plays at the board's pace with the trips' cap of 10 real minutes (docs/design/viajes.md), and
 * meanwhile she does the tasks on board. The asteroids are out of sight until the Starship arrives by Bennu,
 * where a new game starts.
 */
export interface CruiseHooks {
  /** The asteroids shown (false while cruising). */
  readonly showAsteroids: (on: boolean) => void;
  readonly say: (text: string) => void;
}

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export class BennuCruise {
  readonly totalS: number;
  private leftS: number;
  private readonly el: HTMLElement;
  private readonly timer: number;
  private last = performance.now();

  constructor(root: HTMLElement, readonly cruiseDays: number, private readonly hooks: CruiseHooks) {
    this.totalS = realSeconds(cruiseDays * 86_400, BOARD_TIME_LAPSE);
    this.leftS = this.totalS;
    this.el = document.createElement("div");
    this.el.className = "trip-chip on cruise-chip";
    this.el.setAttribute("role", "status");
    this.el.innerHTML = `<div class="tc-row"><b class="tc-title">Starship → Bennu</b><span class="tc-eta"></span></div><div class="tc-detail">Crucero real: ${cruiseDays} días (como OSIRIS-REx), a ×60 y con el tope de 10 min. Mientras, las tareas de a bordo</div><div class="tc-bar"><i></i></div>`;
    (root.querySelector(".ctx-dock") ?? root).appendChild(this.el);
    hooks.showAsteroids(false);
    this.timer = window.setInterval(() => this.tick(), 250);
    this.paint();
  }

  /** Real seconds left. */
  get left(): number {
    return this.leftS;
  }

  get active(): boolean {
    return this.leftS > 0;
  }

  /** Test hook: arrive now. */
  finishNow(): void {
    this.leftS = 0;
    this.tick();
  }

  private tick(): void {
    const now = performance.now();
    if (!document.hidden) this.leftS = Math.max(0, this.leftS - (now - this.last) / 1000);
    this.last = now;
    this.paint();
    if (this.leftS > 0) return;
    window.clearInterval(this.timer);
    this.el.remove();
    this.hooks.showAsteroids(true);
    this.hooks.say("Llegada a Bennu: la Starship se queda junto al asteroide, donde empieza la expedición");
  }

  private paint(): void {
    this.el.querySelector(".tc-eta")!.textContent = `llega en ${clock(this.leftS)}`;
    (this.el.querySelector(".tc-bar i") as HTMLElement).style.width = `${(((this.totalS - this.leftS) / Math.max(1, this.totalS)) * 100).toFixed(1)}%`;
  }
}
