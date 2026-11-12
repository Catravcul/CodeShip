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
 * the touch pads. With `?dev`, the flight bar keeps a remote-access button that works anywhere.
 */
export class StationDock {
  private readonly btn: HTMLButtonElement;
  private readonly sub: HTMLElement;
  private readonly devBtn: HTMLButtonElement | undefined;

  constructor(
    root: HTMLElement,
    addFlightButton: (cls: string, onClick: () => void) => HTMLButtonElement,
    private readonly deps: { open(): void; distanceM(): number; alongside(): boolean; docked(): boolean },
  ) {
    this.btn = document.createElement("button");
    this.btn.className = "station-dock-btn hidden";
    this.btn.innerHTML = `<b>Revisar tareas de la estación</b><small></small>`;
    this.sub = this.btn.querySelector("small")!;
    this.btn.addEventListener("click", () => deps.open());
    root.appendChild(this.btn);
    if (DEV_ACCESS) this.devBtn = addFlightButton("estacion-btn", () => deps.open());
  }

  /** Each frame: `cockpit` is true while the cockpit is showing with nothing over it. */
  update(cockpit: boolean): void {
    const near = this.deps.alongside();
    this.btn.classList.toggle("hidden", !(cockpit && near));
    const sub = this.deps.docked() ? "Atracada" : `A ${km(this.deps.distanceM())} · dentro del alcance de atraque`;
    if (near && this.sub.textContent !== sub) this.sub.textContent = sub;
    if (this.devBtn) {
      const t = `Estación · ${km(this.deps.distanceM())} (dev)`;
      if (this.devBtn.textContent !== t) this.devBtn.textContent = t;
    }
  }
}
