import { describe, expect, it } from "vitest";
import { LEGACY_KEY, MAX_SLOTS, SaveBook, SLOT_PREFIX, type KeyValueStore } from "./save-book";
import { SAVE_FORMAT, writeSlot } from "../domain/save-slot";

/** localStorage in memory; `full` makes every write throw like a full quota. */
class MemoryStore implements KeyValueStore {
  readonly map = new Map<string, string>();
  full = false;
  get(k: string) {
    return this.map.get(k) ?? null;
  }
  set(k: string, v: string) {
    if (this.full) throw new Error("QuotaExceededError");
    this.map.set(k, v);
  }
  remove(k: string) {
    this.map.delete(k);
  }
  keys() {
    return [...this.map.keys()];
  }
}

let clock = Date.parse("2026-11-18T10:00:00Z");
const now = () => new Date((clock += 60_000));
const book = (store = new MemoryStore()) => ({ store, book: new SaveBook(store, { now, playable: (level) => level === 6 }) });
const game = (day = 1, place = "Cubierta 1") => ({ level: 6, boardDay: day, summary: { vehicle: "Starship", place }, state: { day } });

describe("the saved games on this device (slots in localStorage)", () => {
  it("starts empty: no slots, nothing to continue", () => {
    const { book: b } = book();
    expect(b.list()).toEqual({ slots: [], problems: [] });
    expect(b.latest()).toBeUndefined();
  });

  it("a new game takes the first free slot, and saving again writes over its own slot only", () => {
    const { book: b, store } = book();
    const a = b.newSlot()!;
    expect(a).toBe("1");
    expect(b.save(a, game(1)).ok).toBe(true);
    const c = b.newSlot()!;
    expect(c).toBe("2");
    b.save(c, game(4, "Destiny"));
    b.save(a, game(2));
    expect(store.keys().sort()).toEqual([`${SLOT_PREFIX}1`, `${SLOT_PREFIX}2`]);
    const l = b.list().slots;
    expect(l.map((s) => s.id)).toEqual(["1", "2"]);
    expect(l[0]!.boardDay).toBe(2);
    expect(l[0]!.format).toBe(SAVE_FORMAT);
  });

  it("«Continuar» is the newest saved game of a playable level", () => {
    const { book: b } = book();
    b.save("1", game(1));
    b.save("2", { ...game(9), level: 3 });
    b.save("3", game(5));
    expect(b.latest()?.id).toBe("3");
    b.save("1", game(2));
    expect(b.latest()?.id).toBe("1");
  });

  it("a level-3 game is kept and listed, but does not continue while level 3 cannot be played", () => {
    const { book: b } = book();
    b.save("1", { ...game(1), level: 3 });
    expect(b.list().slots.map((s) => s.level)).toEqual([3]);
    expect(b.latest()).toBeUndefined();
    expect(b.canResume(b.list().slots[0]!)).toBe(false);
  });

  it("deletes a slot; its number is free again", () => {
    const { book: b } = book();
    b.save("1", game());
    b.save("2", game());
    b.remove("1");
    expect(b.list().slots.map((s) => s.id)).toEqual(["2"]);
    expect(b.newSlot()).toBe("1");
  });

  it(`holds ${MAX_SLOTS} slots: with all of them taken a new game has no slot (nothing is written over)`, () => {
    const { book: b } = book();
    for (let i = 0; i < MAX_SLOTS; i++) b.save(b.newSlot()!, game(i + 1));
    expect(b.newSlot()).toBeUndefined();
    expect(b.list().slots).toHaveLength(MAX_SLOTS);
  });

  it("a corrupt slot, the old kept game and other keys are reported or ignored, never thrown", () => {
    const { book: b, store } = book();
    b.save("1", game());
    store.set(`${SLOT_PREFIX}2`, "{roto");
    store.set(LEGACY_KEY, JSON.stringify({ level: 6, savedAt: "2026-11-18T09:00:00Z" }));
    store.set("codeship.ajustes", "{}");
    const l = b.list();
    expect(l.slots.map((s) => s.id)).toEqual(["1"]);
    expect(l.problems.map((p) => [p.id, p.problem])).toEqual([
      ["2", "dañada"],
      ["antigua", "antigua"],
    ]);
    // The broken one can be deleted, the old one too; its number is taken until then.
    expect(b.newSlot()).toBe("3");
    b.remove("2");
    b.remove("antigua");
    expect(store.get(LEGACY_KEY)).toBeNull();
    expect(b.list().problems).toEqual([]);
  });

  it("a write that fails (storage full, private mode) is reported, not thrown", () => {
    const { book: b, store } = book();
    store.full = true;
    const r = b.save("1", game());
    expect(r.ok).toBe(false);
    expect(!r.ok && r.why).toMatch(/No se pudo guardar/);
  });

  it("reads one slot for resuming, with what is wrong if it cannot", () => {
    const { book: b, store } = book();
    b.save("1", game(3));
    expect(b.load("1")).toMatchObject({ ok: true, slot: { boardDay: 3 } });
    store.set(`${SLOT_PREFIX}1`, writeSlot({ id: "1", format: SAVE_FORMAT + 5, level: 6, savedAt: "x", boardDay: 1, summary: { vehicle: "", place: "" }, state: {} }));
    expect(b.load("1")).toMatchObject({ ok: false, problem: "futura" });
    expect(b.load("9")).toMatchObject({ ok: false, problem: "dañada" });
  });
});
