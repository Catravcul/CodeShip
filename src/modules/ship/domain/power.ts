import type { Equipment } from "./equipment";

/** Solar output at `au` from the Sun of a panel that gives `wattsAt1Au` at 1 AU (inverse square), W. */
export const solarOutputW = (wattsAt1Au: number, au: number): number => wattsAt1Au / (au * au);

export interface PowerLine {
  readonly id: string;
  readonly name: string;
  /** Positive if it produces, negative if it draws, W. */
  readonly watts: number;
}

/** Production against consumption of everything fitted, and how long the battery lasts. */
export interface PowerBudget {
  readonly producedW: number;
  readonly drawnW: number;
  /** Produced minus drawn, W. */
  readonly netW: number;
  readonly storageWh: number;
  /** Whether the storage refills when there is a surplus. */
  readonly rechargeable: boolean;
  /** Hours the storage covers the deficit; Infinity if there is no deficit. */
  readonly enduranceH: number;
  readonly lines: readonly PowerLine[];
}

/** Power budget at `sunAu` from the Sun. */
export function powerBudget(list: readonly Equipment[], sunAu: number): PowerBudget {
  const lines = list.filter((e) => e.powerW !== 0).map((e): PowerLine => ({ id: e.id, name: e.name, watts: e.solar && e.powerW > 0 ? solarOutputW(e.powerW, sunAu) : e.powerW }));
  const producedW = lines.reduce((s, l) => s + Math.max(0, l.watts), 0);
  const drawnW = lines.reduce((s, l) => s + Math.max(0, -l.watts), 0);
  const stores = list.filter((e) => (e.storageWh ?? 0) > 0);
  const storageWh = stores.reduce((s, e) => s + e.storageWh!, 0);
  const netW = producedW - drawnW;
  return {
    producedW,
    drawnW,
    netW,
    storageWh,
    rechargeable: stores.length > 0 && stores.every((e) => e.rechargeable !== false),
    enduranceH: netW >= 0 ? Infinity : storageWh / -netW,
    lines,
  };
}
