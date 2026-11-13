import "./trip-chip.css";

/** What the chip shows about the trip flying now. */
export interface TripChipData {
  /** «Nodriza», «Módulo», «Sonda». */
  readonly who: string;
  readonly goal: string;
  /** Second line: phase, speed, distance left, game duration and lapse. */
  readonly detail: string;
  /** Real seconds left. */
  readonly etaRealS: number;
  /** 0..1. */
  readonly fraction: number;
}

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return t < 60 ? `${t} s` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * The trip chip (docs/design/viajes.md): on screen wherever the player is (cockpit, deck, interior,
 * station) while a vehicle flies itself in time-lapse. Real-time ETA, a progress bar, «Ver» for the
 * live preview and «Tomar el mando».
 */
export class TripChip {
  private readonly el: HTMLElement;
  private readonly title: HTMLElement;
  private readonly eta: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly viewBtn: HTMLButtonElement;
  private last = "";
  onView?: () => void;
  onTake?: () => void;

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "trip-chip";
    this.el.innerHTML = `<div class="tc-row"><b class="tc-title"></b><span class="tc-eta"></span><button class="tc-view" aria-pressed="false">Ver</button><button class="tc-take">Mando</button></div><div class="tc-detail"></div><div class="tc-bar"><i></i></div>`;
    root.appendChild(this.el);
    this.title = this.el.querySelector(".tc-title")!;
    this.eta = this.el.querySelector(".tc-eta")!;
    this.detail = this.el.querySelector(".tc-detail")!;
    this.bar = this.el.querySelector(".tc-bar i")!;
    this.viewBtn = this.el.querySelector(".tc-view")!;
    this.viewBtn.addEventListener("click", () => this.onView?.());
    const take = this.el.querySelector<HTMLButtonElement>(".tc-take")!;
    take.title = "Tomar el mando: el piloto automático se desconecta";
    take.addEventListener("click", () => this.onTake?.());
  }

  /** Each frame; `undefined` hides it. `viewing`: the live preview is open. */
  update(d: TripChipData | undefined, viewing: boolean): void {
    const on = !!d;
    this.el.classList.toggle("on", on);
    document.body.classList.toggle("on-trip", on);
    if (!d) return;
    const key = `${d.who}|${d.goal}|${clock(d.etaRealS)}|${d.detail}|${viewing}`;
    if (key !== this.last) {
      this.last = key;
      this.title.textContent = `${d.who} → ${d.goal}`;
      this.eta.textContent = `llega en ${clock(d.etaRealS)}`;
      this.detail.textContent = d.detail;
      this.viewBtn.textContent = viewing ? "Ocultar" : "Ver";
      this.viewBtn.setAttribute("aria-pressed", String(viewing));
    }
    this.bar.style.width = `${(Math.max(0, Math.min(1, d.fraction)) * 100).toFixed(1)}%`;
  }
}
