import "./root-menu.css";

export interface RootItem {
  readonly className: string;
  readonly icon: string;
  /** Accessible name and tooltip. */
  readonly label: string;
  /** Keyboard key, shown next to the label with keyboard help on. */
  readonly key?: string;
  /** Always out (not folded into the root). */
  readonly pinned?: boolean;
}

/** Retract the shoots after this long without a touch, ms. */
const RETRACT_MS = 5000;
/** A press this long shows the label (phones have no hover), ms. */
const LONG_PRESS_MS = 450;

/**
 * Icon buttons that sprout from a root and retract (the 2023 draft's top nav, docs/design/ux-acciones.md
 * §Iconos): only the pinned icons and the root are out; a tap on the root sprouts the rest, and they
 * fold back after a few seconds or after one is used. Labels show on hover, on a long press, or always
 * with keyboard help on (body.kbd-help). Every icon is a 44 px target with an accessible name.
 */
export class RootMenu {
  readonly el: HTMLElement;
  private readonly rootBtn: HTMLButtonElement;
  private readonly shoots: HTMLElement;
  private timer = 0;

  constructor(parent: HTMLElement, className: string, rootLabel: string, rootIcon: string) {
    this.el = document.createElement("div");
    this.el.className = `root-menu ${className}`;
    this.el.innerHTML = `<div class="rm-pinned"></div><div class="rm-shoots" role="group" aria-label="${rootLabel}"></div><button class="rm-root" aria-expanded="false" aria-label="${rootLabel}" title="${rootLabel}">${rootIcon}<span class="rm-label">${rootLabel}</span></button>`;
    parent.appendChild(this.el);
    this.rootBtn = this.el.querySelector(".rm-root")!;
    this.shoots = this.el.querySelector(".rm-shoots")!;
    this.rootBtn.addEventListener("click", () => this.toggle());
    this.el.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (b && b !== this.rootBtn && this.shoots.contains(b)) this.retractSoon(600);
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
  }

  /** Adds an icon. Pinned icons stay out; the rest sprout from the root. */
  add(item: RootItem, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = `rm-icon ${item.className}`;
    b.setAttribute("aria-label", item.label);
    b.title = item.label + (item.key ? ` (${item.key})` : "");
    b.innerHTML = `${item.icon}<span class="rm-label">${item.label}${item.key ? ` <kbd>${item.key}</kbd>` : ""}</span>`;
    b.addEventListener("click", onClick);
    (item.pinned ? this.el.querySelector(".rm-pinned")! : this.shoots).appendChild(b);
    this.sync();
    return b;
  }

  /** Changes an icon's accessible name and label (e.g. «Cámara: ventral»). */
  relabel(b: HTMLButtonElement, label: string, key?: string): void {
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
    if (on) this.retractSoon(RETRACT_MS);
  }

  /** The root only shows when something is folded into it. */
  sync(): void {
    const any = [...this.shoots.children].some((c) => !c.classList.contains("hidden"));
    this.rootBtn.classList.toggle("hidden", !any);
    if (!any) this.toggle(false);
  }

  private retractSoon(ms: number): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.toggle(false), ms);
  }
}
