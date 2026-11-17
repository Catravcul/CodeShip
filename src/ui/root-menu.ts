import "./root-menu.css";
import { ICON } from "./icons";
import { onWindowState, requestClose, type HudWindow } from "./hud-windows";

export interface RootItem {
  readonly className: string;
  readonly icon: string;
  /** Accessible name and tooltip. */
  readonly label: string;
  /** Keyboard key, shown next to the label with keyboard help on. */
  readonly key?: string;
  /** The window this icon opens: while it is open the icon is an X that closes it (reglas.md §5.8). */
  readonly window?: HudWindow;
  /** Place under the gear, top to bottom: Vista 0, Tareas 1, Áreas 2, the mode's own 10, Trayecto 20. */
  readonly order?: number;
}

/** Retract the shoots after this long without a touch, ms. */
const RETRACT_MS = 5000;
/** A press this long shows the label (phones have no hover), ms. */
const LONG_PRESS_MS = 450;

interface GlobalItem {
  readonly item: RootItem;
  readonly onClick: () => void;
  readonly buttons: HTMLButtonElement[];
  shown: boolean;
}

/** An icon put in every root menu at once (e.g. «Trayecto», only while a trip runs). */
export interface GlobalRootItem {
  show(on: boolean): void;
}

/**
 * The general tree menu (docs/design/reglas.md §5.8, ux-acciones.md §Menú árbol): one root icon, a gear, at the
 * top right of every mode. A tap turns it into an X and sprouts the icons below it: Vista, Tareas and whatever
 * applies now (Trayecto while a trip runs; the cockpit's flight toggles). They fold back after a few seconds or
 * after one is used. An icon that opens a window turns into an X while the window is open, and the menu stays
 * out until it closes. Labels show on hover, on a long press, or always with keyboard help on (body.kbd-help).
 * Every icon is a 44 px target with an accessible name. Hidden while a challenge is open (root-menu.css).
 */
export class RootMenu {
  private static readonly menus: RootMenu[] = [];
  private static readonly globals: GlobalItem[] = [];

  /** Adds an icon to every root menu, present and future; it starts hidden. */
  static global(item: RootItem, onClick: () => void): GlobalRootItem {
    const g: GlobalItem = { item, onClick, buttons: [], shown: false };
    RootMenu.globals.push(g);
    for (const m of RootMenu.menus) m.addGlobal(g);
    return {
      show(on: boolean): void {
        if (g.shown === on) return;
        g.shown = on;
        for (const b of g.buttons) b.classList.toggle("hidden", !on);
        for (const m of RootMenu.menus) m.sync();
      },
    };
  }

  readonly el: HTMLElement;
  private readonly rootBtn: HTMLButtonElement;
  private readonly shoots: HTMLElement;
  private readonly rootLabel: string;
  private timer = 0;
  /** Windows opened from this menu's icons that are open now. */
  private readonly holding = new Set<HudWindow>();

  constructor(parent: HTMLElement, className: string, rootLabel: string) {
    this.rootLabel = rootLabel;
    this.el = document.createElement("div");
    this.el.className = `root-menu ${className}`;
    this.el.innerHTML = `<button class="rm-root" aria-expanded="false" aria-label="${rootLabel}" title="${rootLabel}"><span class="rm-glyph">${ICON.gear}</span><span class="rm-label">${rootLabel}</span></button><div class="rm-shoots" role="group" aria-label="${rootLabel}"></div>`;
    parent.appendChild(this.el);
    this.rootBtn = this.el.querySelector(".rm-root")!;
    this.shoots = this.el.querySelector(".rm-shoots")!;
    this.rootBtn.addEventListener("click", () => this.toggle());
    this.el.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (b && b !== this.rootBtn && this.shoots.contains(b) && !b.dataset.window) this.retractSoon(600);
    });
    // Long press: show the label of the icon under the finger.
    this.el.addEventListener("pointerdown", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (!b || e.pointerType === "mouse") return;
      const t = window.setTimeout(() => {
        b.classList.add("rm-show");
        window.setTimeout(() => b.classList.remove("rm-show"), 1600);
      }, LONG_PRESS_MS);
      const stop = () => window.clearTimeout(t);
      b.addEventListener("pointerup", stop, { once: true });
      b.addEventListener("pointercancel", stop, { once: true });
    });
    onWindowState((id, open) => this.windowChanged(id, open));
    RootMenu.menus.push(this);
    for (const g of RootMenu.globals) this.addGlobal(g);
  }

  /** Adds an icon that sprouts from the root. */
  add(item: RootItem, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = `rm-icon ${item.className}`;
    if (item.window) b.dataset.window = item.window;
    b.dataset.icon = item.icon;
    b.dataset.order = String(item.order ?? 10);
    this.paint(b, item.icon, item.label, item.key);
    b.addEventListener("click", () => (b.classList.contains("rm-open") && item.window ? requestClose(item.window) : onClick()));
    // In order: Vista, Tareas, Áreas, the mode's own, then Trayecto.
    const after = [...this.shoots.children].find((c) => Number((c as HTMLElement).dataset.order) > (item.order ?? 10));
    this.shoots.insertBefore(b, after ?? null);
    this.sync();
    return b;
  }

  /** Changes an icon's accessible name and label (e.g. «Cámara: ventral»). */
  relabel(b: HTMLButtonElement, label: string, key?: string): void {
    if (b.classList.contains("rm-open")) {
      b.dataset.label = label;
      return;
    }
    if (b.getAttribute("aria-label") === label) return;
    b.setAttribute("aria-label", label);
    b.title = label + (key ? ` (${key})` : "");
    b.querySelector(".rm-label")!.innerHTML = `${label}${key ? ` <kbd>${key}</kbd>` : ""}`;
  }

  get open(): boolean {
    return this.el.classList.contains("open");
  }

  toggle(on = !this.open): void {
    if (!on && this.holding.size) return;
    this.el.classList.toggle("open", on);
    this.rootBtn.setAttribute("aria-expanded", String(on));
    const label = on ? `Cerrar ${this.rootLabel.toLowerCase()}` : this.rootLabel;
    this.rootBtn.setAttribute("aria-label", label);
    this.rootBtn.title = label;
    this.rootBtn.querySelector(".rm-glyph")!.innerHTML = on ? ICON.close : ICON.gear;
    this.rootBtn.querySelector(".rm-label")!.textContent = label;
    if (on) this.retractSoon(RETRACT_MS);
  }

  /** The root only shows when something is folded into it. */
  sync(): void {
    const any = [...this.shoots.children].some((c) => !c.classList.contains("hidden"));
    this.rootBtn.classList.toggle("hidden", !any);
    if (!any) {
      this.holding.clear();
      this.toggle(false);
    }
  }

  private addGlobal(g: GlobalItem): void {
    const b = this.add(g.item, g.onClick);
    b.dataset.global = "1";
    b.classList.toggle("hidden", !g.shown);
    g.buttons.push(b);
    this.sync();
  }

  private paint(b: HTMLButtonElement, icon: string, label: string, key?: string): void {
    b.setAttribute("aria-label", label);
    b.title = label + (key ? ` (${key})` : "");
    b.innerHTML = `${icon}<span class="rm-label">${label}${key ? ` <kbd>${key}</kbd>` : ""}</span>`;
  }

  /** A window opened or closed: its icon here becomes an X (and the menu stays out) or goes back. */
  private windowChanged(id: HudWindow, open: boolean): void {
    const mine = [...this.shoots.querySelectorAll<HTMLButtonElement>(`[data-window="${id}"]`)];
    if (!mine.length) return;
    for (const b of mine) {
      if (open === b.classList.contains("rm-open")) continue;
      if (open) {
        b.dataset.label = b.getAttribute("aria-label") ?? "";
        b.classList.add("rm-open");
        this.paint(b, ICON.close, `Cerrar ${(b.dataset.label || id).toLowerCase()}`);
      } else {
        b.classList.remove("rm-open");
        this.paint(b, b.dataset.icon ?? "", b.dataset.label ?? id);
      }
    }
    if (open) {
      this.holding.add(id);
      window.clearTimeout(this.timer);
      this.toggle(true);
    } else {
      this.holding.delete(id);
      if (!this.holding.size) this.retractSoon(600);
    }
  }

  private retractSoon(ms: number): void {
    window.clearTimeout(this.timer);
    if (this.holding.size) return;
    this.timer = window.setTimeout(() => this.toggle(false), ms);
  }
}
