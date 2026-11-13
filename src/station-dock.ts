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

/** `?dev` in the URL keeps a remote access to the station screen (for tests and screenshots). */
export const DEV_ACCESS = typeof location !== "undefined" && new URLSearchParams(location.search).has("dev");

const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);

/**
 * Cockpit side of the station. The station's tasks (bay, blueprints, fabrication, refinery) open only
 * from inside it (docs/design/accesos.md): docked at its port, the lander's hatch button reads
 * «Entrar en la estación». Only with `?dev` the flight bar keeps a remote-access button that works anywhere.
 */
export class StationDock {
  private readonly devBtn: HTMLButtonElement | undefined;

  constructor(
    addFlightButton: (cls: string, onClick: () => void) => HTMLButtonElement,
    private readonly deps: { open(): void; distanceM(): number },
  ) {
    if (DEV_ACCESS) this.devBtn = addFlightButton("estacion-btn", () => deps.open());
  }

  /** Each frame (only the dev button has anything to update). */
  update(): void {
    if (!this.devBtn) return;
    const t = `Estación · ${km(this.deps.distanceM())} (dev)`;
    if (this.devBtn.textContent !== t) this.devBtn.textContent = t;
  }
}
