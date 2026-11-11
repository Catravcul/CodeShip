import type { Sourced } from "@core/units";

export type MachineId = "bastidores" | "molino" | "procesador-soja" | "biorreactor" | "gallinero" | "cocina" | "enfermeria";

/** A machine of the life-support module, with the real reference it is modelled on. */
export interface MachineSpec {
  readonly id: MachineId;
  readonly name: string;
  readonly basis: Sourced<string>;
  /** The machine's settings as code lines (pseudocode, JS); repairs ask to restore one of them. */
  readonly settings: readonly { readonly name: string; readonly value: number; readonly unit: string; readonly wrong: readonly number[] }[];
  /** How to repair it, in order. */
  readonly repairSteps: readonly string[];
}

/** Below this condition a machine stops working. */
export const BROKEN_BELOW = 0.5;

export class Machine {
  private _condition = 1;

  constructor(readonly spec: MachineSpec) {}

  get id(): MachineId {
    return this.spec.id;
  }
  get condition(): number {
    return this._condition;
  }
  get working(): boolean {
    return this._condition >= BROKEN_BELOW;
  }
  damage(amount: number): void {
    this._condition = Math.max(0, this._condition - Math.max(0, amount));
  }
  repair(): void {
    this._condition = 1;
  }
}
