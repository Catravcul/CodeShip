import type { Chore } from "@modules/chores/domain/chore";
import type { StepVisual } from "@modules/chores/domain/step-visual";
import { choreVisuals } from "@modules/chores/application/step-visuals";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { PROCESSES } from "@modules/kitchen/data/processes";
import type { StationPanel } from "@modules/station/domain/interior";
import type { StationSession } from "@modules/station/application/station-ops";
import type { StationInteriorMode } from "./station-interior";
import type { ChoreMode } from "./station-screen";

/** What each solved step of a station chore looks like: the same sources as the ring's (step-visuals.ts). */
const STEP_VISUALS = choreVisuals({ recipes: RECIPES, processes: PROCESSES });

/** The tab whose machines do each kind of station chore (when she did not open it from one). */
const PANEL_OF: Readonly<Record<ChoreMode, StationPanel>> = { refinar: "materiales", fabricar: "fabricacion", repostar: "propelente", importar: "materiales", ajustar: "vida" };

/**
 * Step visuals at the station (docs/design/vida-a-bordo.md, «Pasos visibles»; PX-20): the galley's
 * dishes and the machines' chores (fabricate, refine, refuel, import, the biology lab) acted out by
 * Doménica at their fixture in the station's interior, through the shared `StepVisual` port.
 * `inside()`: she is in the station (the screen was opened from one of its machines); from outside
 * (the screen from the lander's dock) there is nobody at the machine to show.
 */
export function stationStepVisuals(station: StationInteriorMode, inside: () => boolean) {
  const acts = (chore: Chore) => (i: number) => STEP_VISUALS.acts(chore, i) ?? [];
  return {
    /** A crew area's chore (the galley): at its fixture, which has the area's id. */
    crew(chore: Chore, area: string): StepVisual | undefined {
      return station.stepVisual(area, acts(chore));
    },
    /** A machine's chore from the station screen: at the machine she opened it from, or the first of its tab. */
    machine(session: StationSession, mode: ChoreMode): StepVisual | undefined {
      if (!inside()) return undefined;
      const plan = station.interior;
      const near = station.nearFixture();
      const held = near ? plan.fixture(near) : undefined;
      const own = held?.action.kind === "panel" && (held.action.panel === PANEL_OF[mode] || (mode === "importar" && held.action.panel === "materiales")) ? held : undefined;
      const fixture = own ?? plan.fixturesFor(PANEL_OF[mode])[0] ?? plan.fixturesFor("materiales")[0];
      if (!fixture) return undefined;
      // She goes to that machine first (the screen hides the interior meanwhile).
      if (fixture !== held) station.placeAt(fixture.id);
      return station.stepVisual(fixture.id, acts(session.chore));
    },
  };
}
