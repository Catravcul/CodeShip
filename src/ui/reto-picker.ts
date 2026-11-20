import "./reto-picker.css";
import { ICON } from "./icons";

export interface PickOption {
  readonly title: string;
  /** One line under it: why now, what it gives. */
  readonly detail: string;
  /** Locked (outside its hours): shown greyed with the reason. */
  readonly locked?: string;
}

/**
 * The choice of challenge when a thing offers several (a kitchen strip: kéfir, yogur or tempeh; an animal: feed
 * it or program its mind). A bottom sheet over the scene, like the challenge sheet it leads to; its own X.
 */
export class RetoPicker {
  private readonly el: HTMLElement;
  private onPick?: (i: number) => void;

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "reto-picker hidden";
    this.el.setAttribute("role", "dialog");
    root.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!b) return;
      if (b.classList.contains("rp-close")) return this.close();
      const i = Number(b.dataset.i);
      if (Number.isNaN(i) || b.disabled) return;
      const f = this.onPick;
      this.close();
      f?.(i);
    });
  }

  get isOpen(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(title: string, options: readonly PickOption[], onPick: (i: number) => void): void {
    this.onPick = onPick;
    const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    this.el.setAttribute("aria-label", title);
    this.el.innerHTML = `<div class="rp-head"><b>${esc(title)}</b><button class="rp-close" aria-label="Cerrar">${ICON.close}</button></div>${options
      .map((o, i) => `<button class="rp-opt" data-i="${i}"${o.locked ? " disabled" : ""}><b>${esc(o.title)}</b><span>${esc(o.locked ?? o.detail)}</span></button>`)
      .join("")}`;
    this.el.classList.remove("hidden");
    document.body.classList.add("in-reto-picker");
  }

  close(): void {
    this.el.classList.add("hidden");
    document.body.classList.remove("in-reto-picker");
    this.onPick = undefined;
  }
}
