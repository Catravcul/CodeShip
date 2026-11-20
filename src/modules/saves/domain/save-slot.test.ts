import { describe, expect, it } from "vitest";
import { SAVE_FORMAT, readSlot, writeSlot, type Migration, type SaveSlot } from "./save-slot";

const slot = (over: Partial<SaveSlot> = {}): SaveSlot => ({
  id: "1",
  format: SAVE_FORMAT,
  level: 6,
  savedAt: "2026-11-18T10:00:00.000Z",
  boardDay: 3,
  summary: { vehicle: "Starship", place: "Cubierta 1" },
  state: { a: 1, nested: { list: [1, 2, "tres"], none: null } },
  ...over,
});

describe("a saved game (slot): versioned, level-aware, never crashing on bad text", () => {
  it("round-trips: what is written reads back the same", () => {
    const s = slot();
    const r = readSlot("1", writeSlot(s));
    expect(r).toEqual({ ok: true, slot: s, migrated: false });
  });

  it("keeps the level, so a level-3 game reads like a level-6 one (its state is the level's business)", () => {
    const s = slot({ level: 3, summary: { vehicle: "Isla", place: "Helipuerto" }, state: { anything: true } });
    const r = readSlot("1", writeSlot(s));
    expect(r.ok && r.slot.level).toBe(3);
  });

  it("the id comes from where it is kept, not from its text", () => {
    const r = readSlot("7", writeSlot(slot({ id: "1" })));
    expect(r.ok && r.slot.id).toBe("7");
  });

  it("broken text, a non-object or missing fields are «dañada», with the slot's id, and never throw", () => {
    for (const raw of ["{roto", "null", "42", "[]", JSON.stringify({ format: SAVE_FORMAT, level: 6 }), JSON.stringify({ ...slot(), boardDay: "tres" }), JSON.stringify({ ...slot(), summary: null })]) {
      const r = readSlot("2", raw);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.problem).toBe("dañada");
        expect(r.id).toBe("2");
        expect(r.text).toMatch(/dañada/);
      }
    }
  });

  it("the old «codeship.partida» (level and date, no state) is «antigua»: it cannot be resumed", () => {
    const r = readSlot("antigua", JSON.stringify({ level: 6, savedAt: "2026-11-18T09:00:00Z" }));
    expect(r).toMatchObject({ ok: false, problem: "antigua", level: 6 });
  });

  it("a game from a newer version of Codeship is «futura» and is not touched", () => {
    const r = readSlot("3", writeSlot(slot({ format: SAVE_FORMAT + 1 })));
    expect(r).toMatchObject({ ok: false, problem: "futura" });
  });

  it("an older format goes through the migration hook, step by step, and says it was migrated", () => {
    const v1 = { ...slot(), format: 1, day: 5 } as unknown as Record<string, unknown>;
    delete v1.boardDay;
    const migrations: Record<number, Migration> = {
      1: (o) => ({ ...o, format: 2, boardDay: o.day, day: undefined }),
      2: (o) => ({ ...o, format: 3, summary: { ...(o.summary as object), place: "migrado" } }),
    };
    const r = readSlot("1", JSON.stringify(v1), { current: 3, migrations });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.migrated).toBe(true);
      expect(r.slot.format).toBe(3);
      expect(r.slot.boardDay).toBe(5);
      expect(r.slot.summary.place).toBe("migrado");
    }
  });

  it("an older format with no migration, or one whose migration throws, is reported «antigua» or «dañada»", () => {
    const old = JSON.stringify({ ...slot(), format: 1 });
    expect(readSlot("1", old, { current: 2, migrations: {} })).toMatchObject({ ok: false, problem: "antigua" });
    const boom: Migration = () => {
      throw new Error("x");
    };
    expect(readSlot("1", old, { current: 2, migrations: { 1: boom } })).toMatchObject({ ok: false, problem: "dañada" });
  });
});
