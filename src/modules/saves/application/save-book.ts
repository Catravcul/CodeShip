import { SAVE_FORMAT, readSlot, writeSlot, type ReadSlot, type SaveSlot } from "../domain/save-slot";

/** The storage the slots live in (localStorage in the browser; a map in tests). Writes may throw (quota, private mode). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

/** Each slot is its own key, so a broken one never takes the others with it. */
export const SLOT_PREFIX = "codeship.partida.";
/** The first kept game (level and date only, before slots): listed as «antigua» so it can be deleted. */
export const LEGACY_KEY = "codeship.partida";
/** The id the old kept game is listed under. */
export const LEGACY_ID = "antigua";
/** How many games a device keeps: a new game never writes over one of them on its own. */
export const MAX_SLOTS = 5;

export type SlotNotice = Extract<ReadSlot, { ok: false }>;
export type NewGame = Omit<SaveSlot, "id" | "format" | "savedAt">;

/**
 * The saved games of this device (docs/design/partidas.md): list them (newest first), the one «Continuar»
 * resumes, write one, delete one, and the free slot of a new game. Unreadable slots are reported, never thrown.
 */
export class SaveBook {
  constructor(
    private readonly store: KeyValueStore,
    private readonly o: { now: () => Date; playable: (level: number) => boolean },
  ) {}

  private ids(): string[] {
    let keys: string[] = [];
    try {
      keys = this.store.keys();
    } catch {
      return [];
    }
    return keys.filter((k) => k.startsWith(SLOT_PREFIX) && k.length > SLOT_PREFIX.length).map((k) => k.slice(SLOT_PREFIX.length));
  }

  private raw(key: string): string | null {
    try {
      return this.store.get(key);
    } catch {
      return null;
    }
  }

  /** Every kept game, newest first, and the ones that cannot be resumed with why. */
  list(): { slots: SaveSlot[]; problems: SlotNotice[] } {
    const slots: SaveSlot[] = [];
    const problems: SlotNotice[] = [];
    for (const id of this.ids().sort((a, b) => a.localeCompare(b, "es", { numeric: true }))) {
      const r = this.load(id);
      if (r.ok) slots.push(r.slot);
      else problems.push(r);
    }
    const legacy = this.raw(LEGACY_KEY);
    if (legacy !== null) {
      const r = readSlot(LEGACY_ID, legacy);
      problems.push(r.ok ? { ok: false, id: LEGACY_ID, problem: "antigua", text: "Partida de una versión antigua" } : r);
    }
    slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    return { slots, problems };
  }

  /** Whether a kept game can be resumed now: its level is playable. */
  canResume(s: SaveSlot): boolean {
    return this.o.playable(s.level);
  }

  /** The game «Continuar» resumes: the newest one of a playable level. */
  latest(): SaveSlot | undefined {
    return this.list().slots.find((s) => this.canResume(s));
  }

  /** One slot, read for resuming. */
  load(id: string): ReadSlot {
    const raw = this.raw(SLOT_PREFIX + id);
    if (raw === null) return { ok: false, id, problem: "dañada", text: "No hay ninguna partida en esa ranura" };
    return readSlot(id, raw);
  }

  /** The first free slot for a new game, or none when all are taken (a broken slot still takes its number). */
  newSlot(): string | undefined {
    const taken = new Set(this.ids());
    for (let i = 1; i <= MAX_SLOTS; i++) if (!taken.has(String(i))) return String(i);
    return undefined;
  }

  /** Write the game into its slot (its own: never another one). */
  save(id: string, g: NewGame): { ok: true; slot: SaveSlot } | { ok: false; why: string } {
    const slot: SaveSlot = { ...g, id, format: SAVE_FORMAT, savedAt: this.o.now().toISOString() };
    try {
      this.store.set(SLOT_PREFIX + id, writeSlot(slot));
      return { ok: true, slot };
    } catch (e) {
      return { ok: false, why: `No se pudo guardar la partida: ${e instanceof Error && /quota/i.test(e.message + e.name) ? "el almacenamiento del navegador está lleno" : "el navegador no deja guardar (¿modo privado?)"}` };
    }
  }

  /** Delete a kept game (the old one too). */
  remove(id: string): void {
    try {
      this.store.remove(id === LEGACY_ID ? LEGACY_KEY : SLOT_PREFIX + id);
    } catch {
      /* nothing to delete */
    }
  }
}
