import { RootMenu } from "./root-menu";
import { ICON } from "./icons";
import { onCloseRequest, windowState } from "./hud-windows";
import { RETO_ACTS, chooseReto, retoButton } from "./interaction";
import { RetoPicker } from "./reto-picker";

/** The cards of a machine or an area she is at, in every vehicle (walk-room.ts, station-interior.ts). */
const CARD = ".cab-machine";

/**
 * The machine's orange button (reglas.md §5.8, Berón 2026-11-18 and 11-19), the same rule as sanctuary 1's things: a
 * machine whose card gives challenges reads «Reto: <máquina>» and goes through `chooseReto` (one challenge opens
 * straight away; several, or one that is locked, show the choice, RetoPicker, greyed with why). Its card's other
 * buttons (a screen, a hatch) are one more option of that choice, «Ver la máquina». A machine without challenges
 * (a hatch, a screen, a lift) keeps its card: the button, named after it, shows it, and while it is shown it is the X
 * that hides it. The card never opens on its own; another machine (or none) hides it again, so walking on never pops
 * one up. Hidden or shown with body.panel-on (root-menu.css), so the modes keep drawing their cards as before.
 */
export class MachinePanel {
  private on = false;
  private key = "";
  private readonly picker: RetoPicker;

  constructor(root: HTMLElement = document.body) {
    this.picker = new RetoPicker(root);
    onCloseRequest("panel", () => this.set(false));
  }

  /** Each frame: is there a card to show, and is it still the same machine's? */
  tick(): void {
    const card = [...document.querySelectorAll<HTMLElement>(`${CARD}:not(.hidden)`)].find((c) => !c.parentElement?.closest(".hidden"));
    const key = card ? (card.querySelector(".cm-head b")?.textContent ?? "?") : "";
    if (key !== this.key) {
      this.key = key;
      this.set(false);
      if (this.picker.isOpen) this.picker.close();
    }
    const toggle = () => this.set(!this.on);
    const name = key === "?" ? "Panel" : key;
    const retos = card ? [...card.querySelectorAll<HTMLButtonElement>(RETO_ACTS)] : [];
    if (!card) return RootMenu.interact(undefined);
    if (!retos.length || this.on) return RootMenu.interact(retos.length ? retoButton(name, toggle, true) : { icon: ICON.machine, label: name, open: this.on, onClick: toggle });
    RootMenu.interact(retoButton(name, () => this.choose(card, name, retos), this.picker.isOpen));
  }

  /** The orange button of a machine with challenges: its challenges, and its card if it has more to do. */
  private choose(card: HTMLElement, name: string, retos: HTMLButtonElement[]): void {
    if (this.picker.isOpen) return this.picker.close();
    const text = (sel: string) => card.querySelector(sel)?.textContent?.replace(/\s+/g, " ").trim() || undefined;
    const label = (b: HTMLButtonElement) => b.dataset.title ?? [...b.childNodes].filter((n) => n.nodeName !== "KBD").map((n) => n.textContent).join("").trim();
    const options = retos.map((b) => ({
      title: label(b),
      detail: b.dataset.detail ?? text(".cm-who") ?? text(".cm-head small") ?? "",
      ...(b.disabled ? { locked: b.dataset.why ?? text(".cm-why") ?? "No disponible ahora" } : {}),
      run: () => b.click(),
    }));
    const others = [...card.querySelectorAll<HTMLButtonElement>("button")].filter((b) => !b.disabled && !retos.includes(b));
    if (others.length) options.push({ title: "Ver la máquina", detail: others.map(label).join(" · "), run: () => this.set(true) });
    chooseReto(this.picker, name, options);
  }
  private set(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    document.body.classList.toggle("panel-on", on);
    windowState("panel", on);
  }
}
