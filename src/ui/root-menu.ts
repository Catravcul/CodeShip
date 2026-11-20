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
  /** Place under the gear, top to bottom: Vista 0, Tareas 1, Áreas 2, Panel 3, the mode's own 10, Trayecto 20. */
  readonly order?: number;
  /** Its job is also on the Switch pad (Vista, Tareas or Misiones, Áreas: ui/game-pad.ts): while the pad shows, it hides here. */
  readonly pad?: boolean;
}

/** A press this long shows the label (phones have no hover), ms. */
const LONG_PRESS_MS = 450;

interface GlobalItem {
  readonly item: RootItem;
  readonly onClick: () => void;
  readonly buttons: HTMLButtonElement[];
  shown: boolean;
}

/** What she can do right here (a machine's challenge, a plant's care, a panel): the orange button under the root. */
export interface Interaction {
  readonly icon: string;
  /** Always shown beside it: it is an alert, not a hidden label. */
  readonly label: string;
  readonly onClick: () => void;
  /** Shown as an X while what it opened is open. */
  readonly open?: boolean;
}

/** An icon put in every root menu at once (e.g. «Trayecto», only while a trip runs). */
export interface GlobalRootItem {
  show(on: boolean): void;
}

/**
 * The general tree menu (docs/design/reglas.md §5.8, ux-acciones.md §Menú árbol): one root icon, a gear, at the
 * top right of every mode. A tap turns it into an X and sprouts the icons below it: Vista, Tareas and whatever
 * applies now (Trayecto while a trip runs; the cockpit's flight toggles). Only its own X folds it: it can stay
 * out for good. It hides for a moment during a challenge (manual piloting included) and under the full-screen
 * windows (Tareas, Misiones, Áreas), and comes back as it was (root-menu.css). An icon that opens a smaller
 * window (Trayecto) turns into an X while the window is open. Labels show on hover, on a long press, or always with keyboard help on (body.kbd-help).
 * Every icon is a 44 px target with an accessible name. Hidden while a challenge is open (root-menu.css).
 */
export class RootMenu {
  private static readonly menus: RootMenu[] = [];
  private static readonly globals: GlobalItem[] = [];
  private static current: Interaction | undefined;

  /**
   * The interaction button (reglas.md §5.8, Berón 2026-11-19): outside the menu, just under its root, orange, with
   * its label always out, while there is something to use right here; `undefined` hides it.
   */
  static interact(i: Interaction | undefined): void {
    const same = i && RootMenu.current && i.label === RootMenu.current.label && i.icon === RootMenu.current.icon && !!i.open === !!RootMenu.current.open;
    RootMenu.current = i;
    // The pad takes the same callback every time (its own button's job may be newer).
    RootMenu.padInteract?.(i);
    if (same) return;
    for (const m of RootMenu.menus) m.paintAct();
  }

  /**
   * With the Switch pad on (Berón 2026-11-20: «el botón de reto debe migrar a los mandos de switch»), the interaction
   * goes to its Y button (ui/game-pad.ts sets this) and the orange button under the root stays hidden.
   */
  static padInteract: ((i: Interaction | undefined) => void) | undefined;

  /** The interaction now (the pad paints it when it comes back). */
  static get interaction(): Interaction | undefined {
    return RootMenu.current;
  }

  /** The pad came or went (ui/game-pad.ts): each root shows only if something not on the pad is folded into it. */
  static syncAll(): void {
    for (const m of RootMenu.menus) {
      m.sync();
      m.paintAct();
    }
  }

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
  private readonly act: HTMLButtonElement;
  private readonly rootLabel: string;

  constructor(parent: HTMLElement, className: string, rootLabel: string) {
    this.rootLabel = rootLabel;
    this.el = document.createElement("div");
    this.el.className = `root-menu ${className}`;
    this.el.innerHTML = `<button class="rm-root" aria-expanded="false" aria-label="${rootLabel}" title="${rootLabel}"><span class="rm-glyph">${ICON.gear}</span><span class="rm-label">${rootLabel}</span></button><button class="rm-act hidden"></button><div class="rm-shoots" role="group" aria-label="${rootLabel}"></div>`;
    parent.appendChild(this.el);
    this.rootBtn = this.el.querySelector(".rm-root")!;
    this.shoots = this.el.querySelector(".rm-shoots")!;
    this.act = this.el.querySelector(".rm-act")!;
    this.act.addEventListener("click", () => RootMenu.current?.onClick());
    // Only its own X closes it (reglas.md §5.8): using an icon never folds it.
    this.rootBtn.addEventListener("click", () => this.toggle());
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
    this.paintAct();
  }

  private paintAct(): void {
    const i = RootMenu.current;
    // On the pad's Y while the pad is out.
    this.act.classList.toggle("hidden", !i || document.body.classList.contains("has-switch-pad"));
    if (!i) return;
    const label = i.open ? `Cerrar: ${i.label}` : i.label;
    this.act.classList.toggle("rm-open", !!i.open);
    this.act.setAttribute("aria-label", label);
    this.act.title = label;
    this.act.innerHTML = `${i.open ? ICON.close : i.icon}<span class="rm-act-label">${label}</span>`;
  }

  /** Adds an icon that sprouts from the root. */
  add(item: RootItem, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = `rm-icon ${item.className}`;
    if (item.window) b.dataset.window = item.window;
    if (item.pad) b.dataset.pad = "1";
    b.dataset.icon = item.icon;
    b.dataset.order = String(item.order ?? 10);
    this.paint(b, item.icon, item.label, item.key);
    b.addEventListener("click", () => (b.classList.contains("rm-open") && item.window ? requestClose(item.window) : onClick()));
    // In order: Vista, Tareas, Áreas, Panel, the mode's own, then Trayecto.
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
    this.el.classList.toggle("open", on);
    this.rootBtn.setAttribute("aria-expanded", String(on));
    const label = on ? `Cerrar ${this.rootLabel.toLowerCase()}` : this.rootLabel;
    this.rootBtn.setAttribute("aria-label", label);
    this.rootBtn.title = label;
    this.rootBtn.querySelector(".rm-glyph")!.innerHTML = on ? ICON.close : ICON.gear;
    this.rootBtn.querySelector(".rm-label")!.textContent = label;
  }

  /** The root only shows when something is folded into it (open or not, it keeps its state); the pad's icons do not count. */
  sync(): void {
    // With the Switch pad, what is on it (Vista, Tareas, Áreas…) does not count: the gear stays only for the rest (Trayecto).
    const padOn = document.body.classList.contains("has-switch-pad");
    const any = [...this.shoots.children].some((c) => !c.classList.contains("hidden") && !(padOn && (c as HTMLElement).dataset.pad));
    this.rootBtn.classList.toggle("hidden", !any);
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

  /** A window opened or closed: its icon here becomes an X that closes it, or goes back. The menu stays as it was. */
  private windowChanged(id: HudWindow, open: boolean): void {
    for (const b of this.shoots.querySelectorAll<HTMLButtonElement>(`[data-window="${id}"]`)) {
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
  }
}
