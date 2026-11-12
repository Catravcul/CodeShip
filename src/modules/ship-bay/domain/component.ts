import type { PartSlot } from "@modules/ship/domain/refit";
import type { Attention } from "./attention";

export type ComponentKind = "casco" | "motor" | "rcs" | "tanque" | "energia" | "bateria" | "escudo" | "sistemas" | "maquina" | "cubierta" | "despensa" | "propulsor" | "equipo-nodriza";

/** A line of the spec sheet: a real value with where it comes from, or a game value marked as such. */
export interface Spec {
  readonly label: string;
  readonly value: string;
  readonly source?: string;
}

export interface Issue {
  readonly text: string;
  readonly attention: Attention;
}

/** One selectable part of the ship as the bay shows it: state, what is wrong and its spec sheet. */
export interface ComponentStatus {
  readonly id: string;
  readonly kind: ComponentKind;
  readonly name: string;
  /** 0..1 when the part has a condition (hull, machines, beds). */
  readonly health?: number;
  /** Fill level for tanks and stores. */
  readonly level?: { readonly amount: number; readonly capacity: number; readonly unit: string };
  readonly attention: Attention;
  readonly issues: readonly Issue[];
  readonly specs: readonly Spec[];
  /** Slot it occupies when it can be swapped for another part. */
  readonly slot?: PartSlot;
}
