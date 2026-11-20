import { OpenLoopEcs, LIOH_CO2_WARN_MMHG, type OpenLoopEvent } from "@modules/life-support/domain/open-loop";
import { LM_LIFE_SUPPORT } from "@modules/life-support/data/lm-ecs";

const nf = (v: number, d = 1) => v.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });

/**
 * The lander's own life support (docs/design/modulo-lunar-juventas.md, «Soporte vital»): the Apollo LM's
 * open-loop ECS (life-support/domain/open-loop.ts) on board time, counting only the crew aboard. Docked,
 * the host (Starship, the station) tops it up through the hatch: licence, the LM carried all it used.
 */
export class LanderEcs {
  readonly ecs = new OpenLoopEcs(LM_LIFE_SUPPORT);
  private lastH: number | null = null;

  constructor(
    private readonly deps: {
      crewAboard(): number;
      docked(): boolean;
      say(text: string, seconds?: number): void;
    },
  ) {}

  /** Board hours (absolute): advance the ECS by what passed since the last call. */
  tick(hours: number): void {
    const dt = this.lastH === null ? 0 : hours - this.lastH;
    this.lastH = hours;
    this.ecs.setCrewAboard(this.deps.crewAboard());
    if (this.deps.docked()) {
      this.ecs.replenish();
      return;
    }
    for (const e of this.ecs.advance(dt)) this.deps.say(this.text(e), 7);
  }

  private text(e: OpenLoopEvent): string {
    if (e.kind === "cartucho-agotado") return "Módulo: el cartucho de LiOH está saturado. Cámbialo en el panel del ECS";
    if (e.kind === "co2-alto") return `Módulo: CO₂ en ${nf(e.mmHg)} mmHg. Cambia el cartucho de LiOH ya`;
    return `Módulo: se acabó ${e.what === "agua" ? "el agua" : e.what === "baterías" ? "la batería" : "el O₂"}`;
  }

  /** The cabin's ECS panel offers what. */
  state(): { cartridgeLeft: number; cartridges: number; canReplenish: boolean } {
    const r = this.ecs.readout();
    return { cartridgeLeft: r.cartridgeLeft, cartridges: r.cartridges - 1, canReplenish: this.deps.docked() };
  }

  /** For the task list: the cartridge needs changing. */
  facts(): { cartridgeLow: boolean; enduranceH: number; limit: string } {
    const r = this.ecs.readout();
    return { cartridgeLow: r.cartridgeLeft <= 0.25 && r.cartridges > 1, enduranceH: r.enduranceH, limit: r.limit };
  }

  changeCartridge(): string {
    return this.ecs.changeCartridge() ?? "Cartucho de LiOH nuevo: el CO₂ vuelve a bajar";
  }

  replenish(): string {
    this.ecs.replenish();
    return "O₂, agua, batería y cartuchos repuestos desde el anfitrión (licencia: el LM no repostaba)";
  }

  /** The cabin was emptied for an EVA. */
  repressurise(): void {
    this.ecs.repressurise();
  }

  screen(): string[] {
    const r = this.ecs.readout();
    return [
      `O₂ ${nf(r.o2Kg)} kg · agua ${nf(r.waterKg, 0)} kg`,
      `LiOH ${Math.round(r.cartridgeLeft * 100)} % · ${r.cartridges - 1} de repuesto`,
      `CO₂ ${nf(r.ppCO2MmHg)} mmHg${r.ppCO2MmHg > LIOH_CO2_WARN_MMHG ? " ⚠" : ""}`,
      `Batería ${nf(r.batteryWh / 1000, 0)} kWh`,
      `Autonomía ${nf(r.enduranceH, 0)} h (${r.limit})`,
    ];
  }

  html(): string {
    const r = this.ecs.readout();
    return `<div><b>ECS del módulo lunar</b> · ${r.crewAboard} a bordo</div><ul>${this.screen()
      .map((l) => `<li>${l}</li>`)
      .join("")}</ul><div class="muted">Circuito abierto como el del LM: el O₂ se gasta, el CO₂ lo atrapan cartuchos de LiOH que se cambian a mano y el agua se evapora en el sublimador para enfriar. Datos: NASA TN D-6724.</div>`;
  }
}
