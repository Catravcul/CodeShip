import { CameraStick } from "../adapters/input/camera-stick";
import { mapGestures } from "./map-gestures";
import { ICON } from "./icons";
import { clampElevation, clampZoom, turnBy, type MapLimits, type MapView } from "./map-window-model";
import "./nav-map.css";
import "./map-window.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** One row of the list under the map: what it is, what it is for, and its action button (44 px). */
export interface MapOption {
  readonly id: string;
  readonly name: string;
  /** A short tag after the name («Aquí»). */
  readonly tag?: string;
  /** A line under the name (what kind of thing it is). */
  readonly sub?: string;
  readonly desc: string;
  /** The action button's text («Ir», «Jugar»). */
  readonly action: string;
  readonly actionLabel: string;
  readonly pickLabel: string;
  /** Whether a tap picks it; default yes. */
  readonly selectable?: boolean;
  /** Why its action cannot be done now: shown in the row, with the lock, and the button is off. */
  readonly locked?: string;
}

export interface MapWindowOptions {
  /** Classes of the window (always with `nav-map`, whose styles it shares). */
  readonly className: string;
  /** Its name, for the screen reader only (no text over the map: Berón, 2026-11-18). */
  readonly label: string;
  /** A title at the left of the tools (the start screen's «Codeship»); none in the in-game windows. */
  readonly title?: string;
  readonly canvasLabel?: string;
  readonly hint: string;
  /** The first view, and the tilt «Inclinada» goes back to. */
  readonly view: MapView;
  readonly limits: MapLimits;
  /** More tool buttons, before the gear (Navigation's «Misiones»). */
  readonly tools?: string;
  /** The gear that swaps the list for the window's settings (reglas.md §5.8); only when it has any. */
  readonly gear?: { readonly className?: string; readonly label: string; readonly backLabel: string; readonly settingsClass?: string };
  /** Its ×'s name (none on the start screen: it closes by choosing). */
  readonly closeLabel?: string;
  /** The panel under the map (`.nav-side`), as HTML. */
  readonly side: string;
  /** Draw the map: the canvas is sized (CSS px `w` × `h`) and cleared. */
  draw(g: CanvasRenderingContext2D, w: number, h: number): void;
  /** A tap on the map, in canvas px. */
  tap(x: number, y: number): void;
  /** A click on anything that is not the window's own tools. */
  click?(target: HTMLElement): void;
  /** Its × was pressed. */
  onClose?(): void;
  /** The gear swapped the list for the settings (`true`) or back. */
  settings?(on: boolean): void;
}

/**
 * The map window (Berón, 2026-11-18: one model for the start screen, each island's navigation machine, space
 * Navigation, Áreas and, later, the missions). On top a 3D map that a finger turns and a pinch zooms (reglas.md
 * §5.7, its one exception), with its camera joystick «Girar», + / − and «Cenital»; a tap on it picks. Under it,
 * the options, each with its description and a 44 px action button, the locked ones with why. A gear swaps the
 * list for the window's settings when it has any (reglas.md §5.8).
 */
export class MapWindow {
  readonly el: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly side: HTMLElement;
  readonly settingsBox: HTMLElement | undefined;
  readonly view: MapView;
  private inSettings = false;
  private readonly camStick: CameraStick;

  constructor(
    root: HTMLElement,
    private readonly o: MapWindowOptions,
  ) {
    this.view = { ...o.view };
    this.el = document.createElement("div");
    this.el.className = `nav-map map-window ${o.className} hidden`;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", o.label);
    const gear = o.gear ? `<button class="mw-gear ${o.gear.className ?? ""}" data-view aria-label="${esc(o.gear.label)}" title="${esc(o.gear.label)}">${ICON.gear}</button>` : "";
    const close = o.closeLabel ? `<button class="x" data-act="close" data-close aria-label="${esc(o.closeLabel)}">×</button>` : "";
    const title = o.title ? `<h1 class="mw-title">${esc(o.title)}</h1>` : "";
    this.el.innerHTML = `
      <div class="nav-head">${title}<div class="nav-tools"><button data-act="zin" aria-label="Acercar">+</button><button data-act="zout" aria-label="Alejar">−</button><button data-act="view">Cenital</button>${o.tools ?? ""}${gear}${close}</div></div>
      <div class="nav-body"><div class="nav-canvas"><canvas${o.canvasLabel ? ` aria-label="${esc(o.canvasLabel)}"` : ""}></canvas><div class="nav-hint">${esc(o.hint)}</div></div>
        <div class="nav-side">${o.side}</div></div>${o.gear ? `<div class="mw-settings ${o.gear.settingsClass ?? ""} hidden"></div>` : ""}`;
    root.appendChild(this.el);
    this.canvas = this.el.querySelector("canvas")!;
    this.side = this.el.querySelector(".nav-side")!;
    this.settingsBox = this.el.querySelector<HTMLElement>(".mw-settings") ?? undefined;
    this.el.addEventListener("click", (e) => this.onClick(e.target as HTMLElement));
    // A tap picks; a finger drag turns the map and a pinch zooms it (reglas.md §5.7, its one exception), and so
    // does its camera joystick.
    mapGestures(this.canvas, {
      rotate: (dx, dy) => {
        turnBy(this.view, dx, dy, o.limits);
        this.draw();
      },
      zoom: (f) => this.setZoom(this.view.zoom * f),
      tap: (x, y) => {
        const r = this.canvas.getBoundingClientRect();
        o.tap(x - r.left, y - r.top);
      },
    });
    this.camStick = new CameraStick(this.el.querySelector(".nav-canvas")!, "nav-look", (yaw, pitch) => {
      this.view.yaw -= yaw;
      this.view.elevation = clampElevation(this.view.elevation - pitch, o.limits);
      this.draw();
    }, { label: "Girar" });
    this.camStick.show(true);
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.setZoom(this.view.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    });
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  /** Whether the gear has swapped the list for the settings. */
  get settingsShown(): boolean {
    return this.inSettings;
  }

  show(on: boolean): void {
    this.el.classList.toggle("hidden", !on);
  }

  setZoom(z: number): void {
    this.view.zoom = clampZoom(z, this.o.limits);
    this.draw();
  }

  /** Show the list (`false`) or the settings (`true`): the gear turns into a list icon that goes back. */
  showSettings(on: boolean): void {
    const g = this.o.gear;
    if (!g) return;
    this.inSettings = on;
    const btn = this.el.querySelector<HTMLElement>("[data-view]")!;
    btn.innerHTML = on ? ICON.tasks : ICON.gear;
    btn.setAttribute("aria-label", on ? g.backLabel : g.label);
    btn.title = btn.getAttribute("aria-label")!;
    this.el.classList.toggle("mw-in-settings", on);
    this.settingsBox?.classList.toggle("hidden", !on);
  }

  /** Size the canvas to its box and draw the map, if it is on screen. */
  draw(): void {
    const c = this.canvas;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    this.o.draw(g, w, h);
  }

  private onClick(t: HTMLElement): void {
    if (this.o.closeLabel && t.closest("[data-close]")) return this.o.onClose?.();
    if (this.o.gear && t.closest("[data-view]")) {
      this.showSettings(!this.inSettings);
      this.o.settings?.(this.inSettings);
      return this.el.querySelector<HTMLElement>("[data-view]")?.focus();
    }
    const act = t.closest<HTMLElement>("[data-act]");
    if (act?.dataset.act === "zin") return this.setZoom(this.view.zoom * 1.5);
    if (act?.dataset.act === "zout") return this.setZoom(this.view.zoom / 1.5);
    if (act?.dataset.act === "view") {
      this.view.elevation = this.view.elevation > 1.5 ? this.o.view.elevation : Math.PI / 2;
      act.textContent = this.view.elevation > 1.5 ? "Inclinada" : "Cenital";
      return this.draw();
    }
    this.o.click?.(t);
  }
}

/**
 * The options list (`.mw-list`): each row picks with a tap and has its action button; a locked one says why
 * with a lock (shape and colour, reglas.md §5.6) and its button is off. `cls` adds a window's own classes
 * (`ar` → `ar-row`, `ar-pick`) and `goAttr` names the action's data attribute (`data-go` by default).
 */
export function optionsHtml(options: readonly MapOption[], o: { cls?: string; goAttr?: string } = {}): string {
  const k = (base: string) => `mw-${base}${o.cls ? ` ${o.cls}-${base}` : ""}`;
  const goAttr = o.goAttr ?? "go";
  return options
    .map((n) => {
      const off = n.selectable === false;
      const lock = n.locked ? `<i class="mw-lock"><b aria-hidden="true">⊘</b> ${esc(n.locked)}</i>` : "";
      const pick = `<button class="${k("pick")}" data-pick="${esc(n.id)}" aria-label="${esc(n.pickLabel)}"${off ? ` aria-disabled="true"` : ""}><b>${esc(n.name)}${n.tag ? ` <em>${esc(n.tag)}</em>` : ""}</b>${n.sub ? `<small>${esc(n.sub)}</small>` : ""}<span>${esc(n.desc)}</span>${lock}</button>`;
      const go = `<button class="tb-go mw-go" data-${goAttr}="${esc(n.id)}" aria-label="${esc(n.actionLabel)}"${n.locked ? " disabled" : ""}>${esc(n.action)}</button>`;
      return `<div class="${k("row")}${n.locked ? " locked" : ""}${off ? " off" : ""}" data-row="${esc(n.id)}">${pick}${go}</div>`;
    })
    .join("");
}

/** Mark the picked row of a list built by `optionsHtml`. */
export function markPicked(host: HTMLElement, picked: string | undefined): void {
  for (const r of host.querySelectorAll<HTMLElement>(".mw-row")) {
    const on = r.dataset.row === picked;
    r.classList.toggle("on", on);
    r.querySelector(".mw-pick")?.setAttribute("aria-pressed", String(on));
  }
}
