import type { MindDuel } from "@modules/mind-duel/domain/duel";
import type { Answer, CodeBlock, Exercise } from "@modules/mind-duel/domain/exercise";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Stable pseudo-random order for the tray, so the solution is never shown in order. */
function trayOrder(ex: Exercise & { kind: "order" }): CodeBlock[] {
  const blocks = [...ex.blocks];
  let h = 0;
  for (const c of ex.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  for (let i = blocks.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [blocks[i], blocks[j]] = [blocks[j]!, blocks[i]!];
  }
  if (blocks.every((b, i) => b.id === ex.solution[i]) && blocks.length > 1) blocks.push(blocks.shift()!);
  return blocks;
}

/**
 * Mobile-first duel screen. Tap a block in the tray to place it; tap a placed block to send it back.
 * Every block shows Spanish pseudocode or JavaScript.
 */
export class DuelView {
  private readonly el: HTMLElement;
  private showJs = false;
  private placed: string[] = [];
  private feedback: { ok: boolean; text: string } | null = null;

  constructor(
    root: HTMLElement,
    private readonly asteroidName: string,
    private readonly onAnswer: (a: Answer) => { ok: boolean },
  ) {
    this.el = document.createElement("div");
    this.el.className = "duel hidden";
    root.appendChild(this.el);
    this.el.addEventListener("click", (e) => this.onClick(e));
  }

  private duel: MindDuel | undefined;

  show(duel: MindDuel): void {
    this.duel = duel;
    this.placed = [];
    this.feedback = null;
    this.el.classList.remove("hidden");
    document.body.classList.add("in-duel");
    this.render();
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  hide(): void {
    this.el.classList.add("hidden");
    document.body.classList.remove("in-duel");
  }

  private face(b: CodeBlock): string {
    return esc(this.showJs ? b.js : b.pseudo);
  }

  private onClick(e: Event): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!t || !this.duel) return;
    const ex = this.duel.current;
    const act = t.dataset.act;
    if (act === "toggle") this.showJs = !this.showJs;
    if (ex?.kind === "order" && act === "place" && t.dataset.id) this.placed.push(t.dataset.id);
    if (ex?.kind === "order" && act === "unplace" && t.dataset.id) this.placed = this.placed.filter((id) => id !== t.dataset.id);
    if (ex?.kind === "order" && act === "submit") this.submit({ kind: "order", order: this.placed });
    if (ex?.kind === "choice" && act === "choose") this.submit({ kind: "choice", index: Number(t.dataset.index) });
    this.render();
  }

  private submit(a: Answer): void {
    const { ok } = this.onAnswer(a);
    this.feedback = ok ? { ok, text: "La idea encaja: el asteroide se deja persuadir" } : { ok, text: "La idea se rechaza: pierde paciencia" };
    this.placed = [];
  }

  private meter(label: string, value: number, max: number, cls: string): string {
    const cells = Array.from({ length: max }, (_, i) => `<span class="cell ${i < value ? "on" : ""}"></span>`).join("");
    return `<div class="meter ${cls}"><span class="label">${label}</span>${cells}</div>`;
  }

  private render(): void {
    const d = this.duel!;
    const ex = d.current;
    const head = `
      <div class="duel-head">
        <div class="duel-title">Mente de ${esc(this.asteroidName)}</div>
        ${this.meter("Persuasión", d.persuasion, d.profile.persuasionGoal, "persuasion")}
        ${this.meter("Paciencia", d.patience, d.profile.patience, "patience")}
      </div>
      ${this.feedback ? `<div class="feedback ${this.feedback.ok ? "ok" : "bad"}">${this.feedback.text}</div>` : ""}`;

    if (!ex) {
      this.el.innerHTML = head;
      return;
    }

    const toggle = `<button class="toggle" data-act="toggle">${this.showJs ? "Ver pseudocódigo" : "Ver JavaScript"}</button>`;
    let body = "";
    if (ex.kind === "order") {
      const byId = new Map(ex.blocks.map((b) => [b.id, b]));
      const slots = ex.solution
        .map((_, i) => {
          const id = this.placed[i];
          const b = id ? byId.get(id) : undefined;
          return b
            ? `<button class="block placed" data-act="unplace" data-id="${b.id}"><span class="n">${i + 1}</span>${this.face(b)}</button>`
            : `<div class="block slot"><span class="n">${i + 1}</span></div>`;
        })
        .join("");
      const tray = trayOrder(ex)
        .filter((b) => !this.placed.includes(b.id))
        .map((b) => `<button class="block" data-act="place" data-id="${b.id}">${this.face(b)}</button>`)
        .join("");
      const full = this.placed.length === ex.solution.length;
      body = `
        <div class="question">Ordena el pensamiento</div>
        <div class="slots">${slots}</div>
        <div class="tray">${tray}</div>
        <button class="submit" data-act="submit" ${full ? "" : "disabled"}>Enviar idea</button>`;
    } else {
      const code = ex.code.map((b) => `<div class="code-line">${this.face(b)}</div>`).join("");
      const options = ex.options.map((o, i) => `<button class="option" data-act="choose" data-index="${i}">${esc(o)}</button>`).join("");
      body = `
        ${code ? `<div class="code">${code}</div>` : ""}
        <div class="question">${esc(ex.question)}</div>
        <div class="options">${options}</div>`;
    }
    this.el.innerHTML = `${head}<div class="idea">«${esc(ex.idea)}»</div>${toggle}${body}`;
  }
}
