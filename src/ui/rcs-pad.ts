import "./rcs-pad.css";

export type PadAxis = "x" | "y" | "z";

/** What the pad's display shows (Crew Dragon's manual flight page: translation rates, attitude and body rates). */
export interface RcsRead {
  readonly title: string;
  /** Velocity in the craft's frame (x right, y up, −z forward), m/s. */
  readonly vBody: { x: number; y: number; z: number };
  /** Attitude, degrees. */
  readonly att: { pitch: number; yaw: number; roll: number };
  /** Body rates, °/s (x pitch, y yaw, z roll). */
  readonly rates: { x: number; y: number; z: number };
  /** More lines (Δv spent, the descent engine's throttle, altitude…). */
  readonly lines?: readonly string[];
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
  /** One more button that comes and goes (the LM's «Acoplar» inside a port's reach): `setExtra`. */
  extra?(): void;
}

const f = (v: number, d: number) => `${v < -0.5 * 10 ** -d ? "−" : "+"}${Math.abs(v).toFixed(d).replace(".", ",")}`;

/**
 * The tap controls of «Manual» (Berón, 2026-11-18), modelled on Crew Dragon's manual flight touchscreen: translation
 * forward/back, up/down, left/right and rotation pitch, yaw, roll, each tap a fixed small step of the RCS, and the
 * display of rates and attitude. On the LM a throttle row adds the descent engine (its TTCA). Every target is 44 px.
 * While it shows, piloting is the challenge on screen: the tree menu hides (body.in-manual-flight).
 */
export class RcsPad {
  readonly el: HTMLElement;
  private readonly read: HTMLElement;
  private html = "";

  constructor(root: HTMLElement, o: RcsPadOptions) {
    this.el = document.createElement("div");
    this.el.className = `rcs-pad ${o.cls} hidden`;
    this.el.setAttribute("role", "group");
    this.el.setAttribute("aria-label", "Pilotaje manual: RCS");
    const b = (act: string, label: string, aria: string) => `<button data-act="${act}" aria-label="${aria}">${label}</button>`;
    this.el.innerHTML = `<div class="rp-read"></div>
      <div class="rp-cap">Trasladar (cada toque, un paso de velocidad)</div>
      <div class="rp-row">${b("t:z:-1", "Adel.", "Trasladar adelante")}${b("t:z:1", "Atrás", "Trasladar atrás")}${b("t:y:1", "Arriba", "Trasladar arriba")}${b("t:y:-1", "Abajo", "Trasladar abajo")}${b("t:x:-1", "Izq.", "Trasladar a la izquierda")}${b("t:x:1", "Der.", "Trasladar a la derecha")}</div>
      <div class="rp-cap">Girar (cada toque, un paso de velocidad de giro)</div>
      <div class="rp-row rot">${b("r:x:1", "Cab. ↑", "Cabeceo arriba")}${b("r:x:-1", "Cab. ↓", "Cabeceo abajo")}${b("r:y:1", "Guiñ. ←", "Guiñada a la izquierda")}${b("r:y:-1", "Guiñ. →", "Guiñada a la derecha")}${b("r:z:1", "Alab. ⟲", "Alabeo a la izquierda")}${b("r:z:-1", "Alab. ⟳", "Alabeo a la derecha")}</div>
      <div class="rp-row end">${o.throttle ? `${b("m:-1", "Motor −", "Bajar el empuje del motor de descenso")}${b("m:1", "Motor +", "Subir el empuje del motor de descenso")}${b("m:0", "Corte", "Apagar el motor de descenso")}` : ""}${b("stop", "Parar", "Anular giros y velocidad")}${b("end", o.endLabel, o.endLabel)}${o.extra ? `<button data-act="extra" hidden></button>` : ""}</div>
      <div class="rp-note">${o.note}</div>`;
    root.appendChild(this.el);
    this.read = this.el.querySelector(".rp-read")!;
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
    });
  }

  /** Show the extra button with this label, or hide it. */
  setExtra(label: string | undefined): void {
    const x = this.el.querySelector<HTMLButtonElement>('[data-act="extra"]');
    if (!x) return;
    x.hidden = !label;
    if (label && x.textContent !== label) x.textContent = label;
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  show(on: boolean): void {
    this.el.classList.toggle("hidden", !on);
    document.body.classList.toggle("in-manual-flight", on || !!document.querySelector(".rcs-pad:not(.hidden)"));
  }

  update(r: RcsRead): void {
    const v = r.vBody;
    const html =
      `<b>${r.title}</b>` +
      `<span>Velocidad adel. ${f(-v.z, 2)} · arriba ${f(v.y, 2)} · der. ${f(v.x, 2)} m/s</span>` +
      `<span>Actitud cab. ${f(r.att.pitch, 1)}° · guiñ. ${f(r.att.yaw, 1)}° · alab. ${f(r.att.roll, 1)}°</span>` +
      `<span>Giro cab. ${f(r.rates.x, 1)} · guiñ. ${f(r.rates.y, 1)} · alab. ${f(r.rates.z, 1)} °/s</span>` +
      (r.lines ?? []).map((l) => `<span>${l}</span>`).join("");
    if (html !== this.html) {
      this.html = html;
      this.read.innerHTML = html;
    }
  }
}
