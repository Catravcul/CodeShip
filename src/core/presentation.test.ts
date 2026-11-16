import { describe, expect, it } from "vitest";
import { DEFAULT_PRESENTATION, presentationFrom, SCALE_FACTOR } from "./presentation";

describe("SET-10 presentation layer: true-size data, drawn scale and spacing as settings", () => {
  it("defaults to the measured comfortable scale and the 2 m spacing", () => {
    expect(presentationFrom(null)).toEqual(DEFAULT_PRESENTATION);
    expect(SCALE_FACTOR[DEFAULT_PRESENTATION.interiorScale]).toBe(1.5);
    expect(DEFAULT_PRESENTATION.spacing).toBe("amplia");
  });

  it("reads the player's choice from the stored settings, ignoring anything unknown", () => {
    expect(presentationFrom(JSON.stringify({ interiorScale: "real", spacing: "real", sound: false }))).toEqual({ interiorScale: "real", spacing: "real" });
    expect(SCALE_FACTOR.real).toBe(1);
    expect(presentationFrom(JSON.stringify({ interiorScale: "3x" }))).toEqual(DEFAULT_PRESENTATION);
    expect(presentationFrom("{roto")).toEqual(DEFAULT_PRESENTATION);
  });
});
