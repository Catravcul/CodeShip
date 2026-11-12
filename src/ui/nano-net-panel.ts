import type { NanoNetOps, NanoSession } from "@modules/nano-net/application/operations";
import type { NanoSite } from "@modules/nano-net/application/challenges";
import { faultWhat } from "@modules/nano-net/application/challenges";
import { STAGES, type NetEffects, type Stage } from "@modules/nano-net/domain/core";
import type { Chore } from "@modules/chores/domain/chore";
import type { DuelView, SessionText } from "./duel-view";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const STAGE_NAME: Record<Stage, string> = { generar: "Generar nodos", mover: "Mover nodos", cubrir: "Cubrir un área", enlazar: "Enlazar redes" };
const num = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

const actionLabel = (c: Chore): string => {
  if (c.kind === "nano-convertir") return "Convertir en núcleo";
  if (c.kind === "nano-reparar") return c.title.replace(/ de .*$/, "");
  const stage = STAGES.find((s) => c.id.startsWith(`nano-${s}-`));
  return stage ? `Programar: ${STAGE_NAME[stage].toLowerCase()}` : c.title;
};

const sessionText = (c: Chore): SessionText => ({
  title: c.title,
  progress: "Pasos",
  lives: "Intentos",
  order: "Ordena el programa del núcleo",
  submit: "Programar",
  ok: c.kind === "nano-reparar" ? "El núcleo acepta el arreglo" : "El núcleo aprende la línea",
  bad: "El núcleo no lo entiende: inténtalo otra vez",
  sheet: true,
});

/**
 * Compact nano_net status for the cockpit (a pill in the flight bar that opens a small card) and the
 * action button to convert, program or repair a core while landed on it. Challenges open in the
 * shared DuelView as a bottom sheet, so the nodes stay visible above.
 */
export class NanoNetPanel {
  private readonly card: HTMLElement;
  private readonly action: HTMLButtonElement;
  private session: NanoSession | null = null;
  private next: Chore | undefined;
  private open = false;
  private cardKey = "";

  constructor(
    root: HTMLElement,
    private readonly duel: DuelView,
    private readonly pill: HTMLButtonElement,
    private readonly ops: NanoNetOps,
    private readonly site: NanoSite,
  ) {
    this.card = document.createElement("div");
    this.card.className = "nano-card hidden";
    root.appendChild(this.card);
    this.action = document.createElement("button");
    this.action.className = "action nano-action hidden";
    root.appendChild(this.action);
    this.pill.addEventListener("click", () => {
      this.open = !this.open;
      this.cardKey = "";
    });
    this.card.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("[data-close]")) this.open = false;
    });
    this.action.addEventListener("click", () => this.start());
  }

  /** A nano_net challenge is open. */
  get busy(): boolean {
    return this.session !== null;
  }

  private start(): void {
    const chore = this.next;
    if (!chore || this.busy || this.duel.visible) return;
    const session = this.ops.start(chore, this.site);
    this.session = session;
    this.open = false;
    const run = session.run;
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
      sessionText(chore),
      (a) => ({ ok: session.answer(a) }),
    );
  }

  update(landed: boolean, fx: NetEffects, show: boolean): void {
    if (this.session && !this.duel.visible) this.session = null;
    const core = this.ops.net.core(this.site.id);
    const faults = this.ops.net.faults();
    this.pill.textContent = core ? `nano_net ${core.connectedNodes().length}/${core.nodes.length}${faults.length ? ` ⚠${faults.length}` : ""}` : "nano_net";
    this.pill.classList.toggle("limited", faults.length > 0);
    this.next = this.ops.actionsAt(this.site, landed)[0];
    this.action.classList.toggle("hidden", !show || !this.next || this.busy);
    if (this.next) this.action.textContent = actionLabel(this.next);
    this.card.classList.toggle("hidden", !show || !this.open || this.busy);
    if (!this.open) return;

    const key = JSON.stringify([core?.learned, core?.connectedNodes().length, faults.map((f) => f.id), num(fx.warpFactor), num(fx.energyKw), num(fx.safety, 2), landed]);
    if (key === this.cardKey) return;
    this.cardKey = key;
    const stages = STAGES.map((s) => `<li class="${core?.learned.includes(s) ? "on" : ""}">${STAGE_NAME[s]}</li>`).join("");
    const body = core
      ? `<div class="nano-row"><b>${esc(core.name)}</b> · núcleo</div>
         <ol class="nano-stages">${stages}</ol>
         <div class="nano-row">Nodos activos ${core.connectedNodes().length} de ${core.nodes.length}${core.linkedTo ? ` · enlazada con ${esc(core.linkedTo.name)}` : ""}</div>
         ${faults.map((f) => `<div class="nano-row warn">⚠ Avería: ${esc(faultWhat(core, f))}${landed ? "" : " (aterriza para repararla)"}</div>`).join("")}`
      : `<div class="nano-row">Sin núcleos. Persuade un asteroide, aterriza y conviértelo en núcleo.</div>`;
    const here = fx.covered
      ? `<div class="nano-row ok">Dentro de la red: tiempo ×${num(fx.warpFactor, 2)} · ${num(fx.energyKw)} kW · escudo ${Math.round(fx.safety * 100)} %</div>`
      : `<div class="nano-row dim">La nave está fuera de la red</div>`;
    this.card.innerHTML = `<div class="nano-head"><b>nano_net</b><button data-close>✕</button></div>${body}${here}`;
  }
}
