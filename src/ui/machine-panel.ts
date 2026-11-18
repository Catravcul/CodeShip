import { RootMenu, type GlobalRootItem } from "./root-menu";
import { ICON } from "./icons";
import { onCloseRequest, windowState } from "./hud-windows";

/** The cards of a machine or an area she is at, in every vehicle (walk-room.ts, station-interior.ts). */
const CARD = ".cab-machine";

/**
 * «Panel» in the tree menu (reglas.md §5.8, Berón 2026-11-18): the card of the machine or area she is at never
 * opens on its own. The menu's «Panel» shows it, and is there only while there is one to show; while it is shown
 * the icon is the X that hides it. Another machine (or none) hides it again, so walking on never pops one up.
 * Hidden or shown with body.panel-on (root-menu.css), so the modes keep drawing their cards as before.
 */
export class MachinePanel {
  private readonly item: GlobalRootItem;
  private on = false;
  private key = "";

  constructor() {
    this.item = RootMenu.global({ className: "panel-btn", icon: ICON.machine, label: "Panel", window: "panel", order: 3 }, () => this.set(true));
    onCloseRequest("panel", () => this.set(false));
  }

  /** Each frame: is there a card to show, and is it still the same machine's? */
  tick(): void {
    const card = [...document.querySelectorAll<HTMLElement>(`${CARD}:not(.hidden)`)].find((c) => !c.parentElement?.closest(".hidden"));
    const key = card ? (card.querySelector(".cm-head b")?.textContent ?? "?") : "";
    if (key !== this.key) {
      this.key = key;
      this.set(false);
    }
    this.item.show(!!card);
  }

  private set(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    document.body.classList.toggle("panel-on", on);
    windowState("panel", on);
  }
}
