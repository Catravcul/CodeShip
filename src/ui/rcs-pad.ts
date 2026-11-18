import "./rcs-pad.css";

export type PadAxis = "x" | "y" | "z";

/** One value on the display: green with ✓ inside its limit, amber with ▲ out of it (reglas.md §5.6), plain if it has none. */
export interface RcsCell {
  readonly text: string;
  readonly ok?: boolean;
}

/**
 * What the pad's display shows (Crew Dragon's manual flight page: attitude and per-axis rates, and near a port
 * the range and range rate; the LM's: its FDAI, cross-pointer and tapes on the screen, with these numbers).
 */
export interface RcsRead {
  readonly title: string;
  /** Column heads of the table (the first column is the row's label). */
  readonly head: readonly string[];
  readonly rows: readonly { readonly label: string; readonly cells: readonly RcsCell[] }[];
  /** More lines under the table. */
  readonly lines?: readonly (string | { readonly label: string; readonly cells: readonly RcsCell[] })[];
}

export interface RcsPadOptions {
  /** The craft's class for its own placement. */
  readonly cls: string;
  /** The TTCA's throttle row (the LM's descent engine). */
  readonly throttle?: boolean;
  /** Small print under the buttons: what it is based on. */
  readonly note: string;
  readonly endLabel: string;
  translate(axis: PadAxis, sign: 1 | -1): void;
  rotate(axis: PadAxis, sign: 1 | -1): void;
  stop(): void;
  end(): void;
  throttleStep?(step: 1 | -1 | 0): void;
  /** A guidance screen beside the numbers (the docking camera, the LM's 8-ball and tapes), css px. */
  readonly screen?: { readonly w: number; readonly h: number };
  /** One more button that comes and goes (the LM's «Acoplar» inside a port's reach): `setExtra`. */
  extra?(): void;
  /** «Pasar a automático» (the LM over a body: its landing by program, docs/design/aterrizaje.md): `setAuto`. */
  auto?(): void;
  /** «Cámara»: the next camera of the flight view (the LM's ventral one for landing), since the tree menu gives way. */
  camera?(): void;
}

const cell = (c: RcsCell) => (c.ok === undefined ? `<i>${c.text}</i>` : `<i class="${c.ok ? "ok" : "out"}">${c.ok ? "✓" : "▲"} ${c.text}</i>`);

/**
 * The tap controls of «Manual» (Berón, 2026-11-18), modelled on Crew Dragon's manual flight touchscreen: translation
 * forward/back, up/down, left/right and rotation pitch, yaw, roll, each tap a fixed small step of the RCS, and the
 * display of rates and attitude. On the LM a throttle row adds the descent engine (its TTCA). Every target is 44 px.
 * While it shows, piloting is the challenge on screen: the tree menu hides (body.in-manual-flight).
 */
export class RcsPad {
  readonly el: HTMLElement;
  private readonly read: HTMLElement;
  private readonly canvas: HTMLCanvasElement | undefined;
  private html = "";

  constructor(root: HTMLElement, o: RcsPadOptions) {
    this.el = document.createElement("div");
    this.el.className = `rcs-pad ${o.cls} hidden`;
    this.el.setAttribute("role", "group");
    this.el.setAttribute("aria-label", "Pilotaje manual: RCS");
    const b = (act: string, label: string, aria: string) => `<button data-act="${act}" aria-label="${aria}">${label}</button>`;
    this.el.innerHTML = `<div class="rp-top">${o.screen ? `<canvas class="rp-screen" style="width:${o.screen.w}px;height:${o.screen.h}px"></canvas>` : ""}<div class="rp-read"></div></div>
      <div class="rp-cap">Trasladar (cada toque, un paso de velocidad)</div>
      <div class="rp-row">${b("t:z:-1", "Adel.", "Trasladar adelante")}${b("t:z:1", "Atrás", "Trasladar atrás")}${b("t:y:1", "Arriba", "Trasladar arriba")}${b("t:y:-1", "Abajo", "Trasladar abajo")}${b("t:x:-1", "Izq.", "Trasladar a la izquierda")}${b("t:x:1", "Der.", "Trasladar a la derecha")}</div>
      <div class="rp-cap">Girar (cada toque, un paso de velocidad de giro)</div>
      <div class="rp-row rot">${b("r:x:1", "Cab. ↑", "Cabeceo arriba")}${b("r:x:-1", "Cab. ↓", "Cabeceo abajo")}${b("r:y:1", "Guiñ. ←", "Guiñada a la izquierda")}${b("r:y:-1", "Guiñ. →", "Guiñada a la derecha")}${b("r:z:1", "Alab. ⟲", "Alabeo a la izquierda")}${b("r:z:-1", "Alab. ⟳", "Alabeo a la derecha")}</div>
      ${o.extra || o.auto ? `<div class="rp-row more" hidden>${o.auto ? `<button data-act="auto" hidden>Pasar a automático</button>` : ""}${o.extra ? `<button data-act="extra" hidden></button>` : ""}</div>` : ""}
      <div class="rp-row end">${o.throttle ? `${b("m:-1", "Motor −", "Bajar el empuje del motor de descenso")}${b("m:1", "Motor +", "Subir el empuje del motor de descenso")}${b("m:0", "Corte", "Apagar el motor de descenso")}` : ""}${o.camera ? b("cam", "Cámara", "Cambiar de cámara") : ""}${b("stop", "Parar", "Anular giros y velocidad")}${b("end", o.endLabel, o.endLabel)}</div>
      <div class="rp-note">${o.note}</div>`;
    root.appendChild(this.el);
    this.read = this.el.querySelector(".rp-read")!;
    this.canvas = this.el.querySelector<HTMLCanvasElement>(".rp-screen") ?? undefined;
    this.el.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-act]")?.dataset.act;
      if (!a) return;
      const [k, axis, sign] = a.split(":");
      if (k === "t") o.translate(axis as PadAxis, Number(sign) as 1 | -1);
      else if (k === "r") o.rotate(axis as PadAxis, Number(sign) as 1 | -1);
      else if (k === "m") o.throttleStep?.(Number(axis) as 1 | -1 | 0);
      else if (k === "stop") o.stop();
      else if (k === "end") o.end();
      else if (k === "extra") o.extra?.();
      else if (k === "auto") o.auto?.();
      else if (k === "cam") o.camera?.();
    });
  }

  /** Show the extra button with this label, or hide it. */
  setExtra(label: string | undefined): void {
    const x = this.el.querySelector<HTMLButtonElement>('[data-act="extra"]');
    if (!x) return;
    x.hidden = !label;
    if (label && x.textContent !== label) x.textContent = label;
    this.moreRow();
  }

  /** Show «Pasar a automático» (the landing by program is on offer) or hide it. */
  setAuto(on: boolean): void {
    const x = this.el.querySelector<HTMLButtonElement>('[data-act="auto"]');
    if (!x) return;
    x.hidden = !on;
    this.moreRow();
  }

  /** The row of the buttons that come and go shows only with one of them. */
  private moreRow(): void {
    const row = this.el.querySelector<HTMLElement>(".rp-row.more");
    if (row) row.hidden = ![...row.querySelectorAll("button")].some((b) => !b.hidden);
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  show(on: boolean): void {
    this.el.classList.toggle("hidden", !on);
    this.unfocused = false;
    this.syncFocus();
  }

  private unfocused = false;
  /**
   * Landed and anchored she is not flying: the pad shrinks to its engine row (to lift off) and is no challenge, so
   * the tree menu comes back.
   */
  setFlying(flying: boolean): void {
    if (this.unfocused === !flying) return;
    this.unfocused = !flying;
    this.syncFocus();
  }

  private syncFocus(): void {
    this.el.classList.toggle("flying", this.visible && !this.unfocused);
    // Not flying, only the engine and «Dejar» stay (to lift off), small at the bottom.
    this.el.classList.toggle("rest", this.visible && this.unfocused);
    document.body.classList.toggle("in-manual-flight", !!document.querySelector(".rcs-pad.flying:not(.hidden)"));
    document.body.classList.toggle("has-rcs-pad", !!document.querySelector(".rcs-pad:not(.hidden)"));
  }

  /**
   * The guidance screen to draw on (sized for the device's pixels, in css px), or undefined when it is off
   * (`on` false hides it: Dragon's display away from every port has no camera).
   */
  screen(on = true): { g: CanvasRenderingContext2D; w: number; h: number } | undefined {
    const c = this.canvas;
    if (!c) return undefined;
    c.hidden = !on;
    if (!on) return undefined;
    const w = c.clientWidth, h = c.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(w * dpr)) c.width = Math.round(w * dpr);
    if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr);
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h };
  }

  update(r: RcsRead): void {
    // What it takes at the bottom, for the context column above it (acciones.css).
    const h = `${this.el.offsetHeight}px`;
    if (document.documentElement.style.getPropertyValue("--rcs-pad-h") !== h) document.documentElement.style.setProperty("--rcs-pad-h", h);
    const row = (l: { label: string; cells: readonly RcsCell[] }) => `<tr><th>${l.label}</th>${l.cells.map((c) => `<td>${cell(c)}</td>`).join("")}</tr>`;
    const html =
      `<b>${r.title}</b><table><tr><th></th>${r.head.map((h) => `<th>${h}</th>`).join("")}</tr>${r.rows.map(row).join("")}</table>` +
      (r.lines ?? []).map((l) => (typeof l === "string" ? `<span>${l}</span>` : `<span>${l.label} ${l.cells.map(cell).join(" · ")}</span>`)).join("");
    if (html !== this.html) {
      this.html = html;
      this.read.innerHTML = html;
    }
  }
}
