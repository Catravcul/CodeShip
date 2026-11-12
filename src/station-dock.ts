import type { Mothership } from "@modules/mothership/domain/mothership";
import type { StationStructure } from "@modules/station/domain/structure";
import type { DockTarget } from "@modules/navigation/domain/nav-target";
import { num } from "@modules/navigation/application/trip-chore";

/** The station and the mothership as map destinations that end docked (docs/design/estacion.md). */
export function dockNavTargets(structure: StationStructure, mothership: Mothership, mothershipRadiusM: number): DockTarget[] {
  return [
    {
      kind: "dock",
      id: structure.site.id,
      name: structure.site.name,
      what: "Estación",
      position: structure.position,
      radiusM: structure.boundingRadiusM,
      probePort: structure.portFor("sonda")!,
      carrierPort: structure.portFor("nodriza")!,
    },
    {
      kind: "dock",
      id: mothership.id,
      name: "Nodriza",
      what: "Nave nodriza",
      get position() {
        return mothership.position;
      },
      radiusM: mothershipRadiusM,
      probePort: mothership,
    },
  ];
}

/** `?dev` in the URL keeps the old remote access to the station (for tests and screenshots). */
export const DEV_ACCESS = typeof location !== "undefined" && new URLSearchParams(location.search).has("dev");

const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);

/**
 * Cockpit side of the station: a big «Revisar tareas de la estación» button that shows up only
 * when the ship is docked at the station or within its docking range, in the thumb's reach above
 * the touch pads. Docked, a second button, «Entrar en la estación», takes Doménica inside
 * (docs/design/interiores.md §5). With `?dev`, the flight bar keeps a remote-access button that works anywhere.
 */
export class StationDock {
  private readonly btn: HTMLButtonElement;
  private readonly sub: HTMLElement;
  private readonly devBtn: HTMLButtonElement | undefined;
  private readonly enterBtn: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    addFlightButton: (cls: string, onClick: () => void) => HTMLButtonElement,
    private readonly deps: { open(): void; enter(): void; distanceM(): number; alongside(): boolean; docked(): boolean },
  ) {
    this.btn = document.createElement("button");
    this.btn.className = "station-dock-btn hidden";
    this.btn.innerHTML = `<b>Revisar tareas de la estación</b><small></small>`;
    this.sub = this.btn.querySelector("small")!;
    this.btn.addEventListener("click", () => deps.open());
    root.appendChild(this.btn);
    this.enterBtn = document.createElement("button");
    this.enterBtn.className = "station-enter-btn hidden";
    this.enterBtn.textContent = "Entrar en la estación";
    this.enterBtn.addEventListener("click", () => deps.enter());
    root.appendChild(this.enterBtn);
    if (DEV_ACCESS) this.devBtn = addFlightButton("estacion-btn", () => deps.open());
  }

  /** Each frame: `cockpit` is true while the cockpit is showing with nothing over it. */
  update(cockpit: boolean): void {
    const near = this.deps.alongside();
    const show = cockpit && near;
    this.btn.classList.toggle("hidden", !show);
    this.enterBtn.classList.toggle("hidden", !(show && this.deps.docked()));
    document.body.classList.toggle("station-near", show);
    const sub = this.deps.docked() ? "Atracada" : `A ${km(this.deps.distanceM())} de la estación`;
    if (near && this.sub.textContent !== sub) this.sub.textContent = sub;
    if (this.devBtn) {
      const t = `Estación · ${km(this.deps.distanceM())} (dev)`;
      if (this.devBtn.textContent !== t) this.devBtn.textContent = t;
    }
  }
}
