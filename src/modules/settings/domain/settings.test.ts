import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, changeSetting, initialKeyboardHelp, noteFirstInput, parseSettings, serializeSettings } from "./settings";

describe("general settings (docs/design/habitaculo.md §Ajustes)", () => {
  it("HAB-03 keyboard help starts on without touch support and off on a touch device, until the first input says otherwise", () => {
    expect(initialKeyboardHelp({ touchCapable: false })).toBe(true);
    expect(initialKeyboardHelp({ touchCapable: true })).toBe(false);
    expect(initialKeyboardHelp({ touchCapable: true, firstInput: "tecla" })).toBe(true);
    expect(initialKeyboardHelp({ touchCapable: false, firstInput: "toque" })).toBe(false);
    expect(initialKeyboardHelp({ touchCapable: true, firstInput: "raton" })).toBe(true);
  });

  it("HAB-03 the first input sets keyboard help only while the player has not chosen it", () => {
    const fresh = parseSettings(null, { touchCapable: true });
    expect(fresh.keyboardHelp).toBe(false);
    const typed = noteFirstInput(fresh, "tecla");
    expect(typed.keyboardHelp).toBe(true);
    // A second input changes nothing: only the first one decides.
    expect(noteFirstInput(typed, "toque").keyboardHelp).toBe(true);
    const chosen = changeSetting(fresh, "keyboardHelp", false);
    expect(chosen.keyboardHelpChosen).toBe(true);
    expect(noteFirstInput(chosen, "tecla").keyboardHelp).toBe(false);
  });

  it("HAB-03 settings survive a round trip and bad stored values fall back to the defaults", () => {
    const s = changeSetting(changeSetting(changeSetting(changeSetting(DEFAULT_SETTINGS, "names", false), "challengeView", "hud"), "camera", "exterior"), "keyboardHelp", false);
    const back = parseSettings(serializeSettings(s), { touchCapable: true });
    expect(back).toEqual({ ...s, firstInputSeen: true });
    const junk = parseSettings('{"names":"yes","challengeView":"tiny","camera":"moon","sound":0}', { touchCapable: false });
    expect(junk.names).toBe(DEFAULT_SETTINGS.names);
    expect(junk.challengeView).toBe("panel");
    expect(junk.camera).toBe("cabina");
    expect(junk.sound).toBe(true);
    expect(parseSettings("not json", { touchCapable: false }).keyboardHelp).toBe(true);
  });

  it("HAB-14 on foot the view starts in first person (Berón); a stored third person is kept, junk falls back", () => {
    expect(DEFAULT_SETTINGS.walkView).toBe("primera");
    expect(DEFAULT_SETTINGS.camera).toBe("cabina");
    expect(parseSettings(null, { touchCapable: true }).walkView).toBe("primera");
    const third = changeSetting(DEFAULT_SETTINGS, "walkView", "tercera");
    expect(parseSettings(serializeSettings(third), { touchCapable: true }).walkView).toBe("tercera");
    expect(parseSettings('{"walkView":"cenital"}', { touchCapable: true }).walkView).toBe("primera");
  });

  it("HAB-03 the older challenge-view preference is kept when there are no settings yet", () => {
    expect(parseSettings(null, { touchCapable: true, legacyChallengeView: "compacta" }).challengeView).toBe("hud");
    expect(parseSettings(null, { touchCapable: true, legacyChallengeView: "panel" }).challengeView).toBe("panel");
  });

  it("HAB-03 a stored choice is restored as chosen (keyboard help no longer follows the first input)", () => {
    const s = changeSetting(parseSettings(null, { touchCapable: true }), "keyboardHelp", true);
    const back = parseSettings(serializeSettings(s), { touchCapable: true });
    expect(back.keyboardHelp).toBe(true);
    expect(noteFirstInput(back, "toque").keyboardHelp).toBe(true);
  });
  it("HAB-20 «Ir a una tarea» travels the real route by default; teleport is kept as a choice and junk falls back to travel", () => {
    expect(DEFAULT_SETTINGS.taskTravel).toBe("viaje");
    const s = changeSetting(DEFAULT_SETTINGS, "taskTravel", "teletransporte");
    expect(parseSettings(serializeSettings(s), { touchCapable: true }).taskTravel).toBe("teletransporte");
    expect(parseSettings(JSON.stringify({ taskTravel: "volar" }), { touchCapable: true }).taskTravel).toBe("viaje");
    expect(parseSettings(null, { touchCapable: true }).taskTravel).toBe("viaje");
  });
});
