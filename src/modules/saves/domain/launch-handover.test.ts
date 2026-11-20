import { describe, expect, it } from "vitest";
import { checkHandover, isHandover, launchHandover, HANDOVER_LEVEL } from "./launch-handover";
import { checkSpaceState } from "./space-state";

describe("Del nivel 3 al 6: el paso del lanzamiento", () => {
  it("guarda los días, los puestos y el crucero que falta, como partida del nivel 6", () => {
    const h = launchHandover(12.5, [13, 1, 2, 2, 10], 816);
    expect(h).toEqual({ boardDays: 12.5, fromLaunch: { posts: [1, 2, 10, 13], cruiseDays: 816 } });
    expect(HANDOVER_LEVEL).toBe(6);
    expect(isHandover(h)).toBe(true);
    expect(checkHandover(h)).toBeUndefined();
  });

  it("el nivel 6 lo acepta para reanudar, y rechaza uno roto", () => {
    expect(checkSpaceState(launchHandover(3, [1], 816))).toBeUndefined();
    expect(checkSpaceState({ boardDays: 3, fromLaunch: { posts: [1], cruiseDays: -1 } })).toBe("sin el crucero a Bennu");
    expect(checkSpaceState({ boardDays: -1, fromLaunch: { posts: [], cruiseDays: 1 } })).toBe("sin día a bordo");
    expect(checkSpaceState({ boardDays: 1, fromLaunch: { posts: [99], cruiseDays: 1 } })).toBe("puestos ilegibles");
    expect(isHandover({ boardDays: 1 })).toBe(false);
  });
});
