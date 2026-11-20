import { describe, expect, it } from "vitest";
import { AUTO_SAVE, AutoSave } from "./auto-save";

describe("saving on its own: every so often and at the moments that matter", () => {
  it("saves once the interval has passed, and not before", () => {
    const a = new AutoSave();
    expect(a.due(AUTO_SAVE.everyS - 1)).toBeUndefined();
    expect(a.due(AUTO_SAVE.everyS)).toBe("cada-rato");
    a.saved(AUTO_SAVE.everyS);
    expect(a.due(AUTO_SAVE.everyS + 10)).toBeUndefined();
    expect(a.due(2 * AUTO_SAVE.everyS)).toBe("cada-rato");
  });

  it("a key moment (arrival, end of a challenge, waking up) saves at once, but not twice in a few seconds", () => {
    const a = new AutoSave();
    a.saved(0);
    a.mark("llegada");
    expect(a.due(AUTO_SAVE.minGapS)).toBe("llegada");
    a.saved(AUTO_SAVE.minGapS);
    a.mark("reto");
    expect(a.due(AUTO_SAVE.minGapS + 1)).toBeUndefined();
    // It is kept, not lost: it saves as soon as the gap has passed.
    expect(a.due(2 * AUTO_SAVE.minGapS)).toBe("reto");
  });

  it("the page being hidden (a phone locking, the tab closing) saves right away, whatever the gap", () => {
    const a = new AutoSave();
    a.saved(10);
    a.mark("ocultar");
    expect(a.due(10.5)).toBe("ocultar");
  });
});
