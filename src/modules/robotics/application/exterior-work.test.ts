import { describe, expect, it } from "vitest";
import { ExteriorWork, EXTERIOR_ROUTE } from "./exterior-work";
import { CAMERA_ORU } from "../data/robotics";

describe("Work outside, routed as on the ISS", () => {
  it("the station's arrays, radiators and shields are spacewalks", () => {
    for (const r of Object.values(EXTERIOR_ROUTE)) expect(r.kind).toBe("eva");
  });

  it("plans one spacewalk at a time and clears it when done", () => {
    const w = new ExteriorWork();
    const j = w.planComponent("alas", "iROSA", "iROSA");
    expect(typeof j).toBe("object");
    expect(w.planComponent("escudo", "mmod", "escudo")).toMatch(/Ya hay un paseo/);
    expect(w.evaJob?.site).toBe("alas");
    expect(w.complete("eva:alas")?.componentId).toBe("iROSA");
    expect(w.evaJob).toBeUndefined();
  });

  it("the camera wears out with board hours (radiation) and Dextre's job appears once", () => {
    const w = new ExteriorWork(2);
    w.tick(1);
    expect(w.list()).toHaveLength(0);
    w.tick(1);
    w.tick(5);
    expect(w.list().map((j) => j.kind)).toEqual(["dextre"]);
    expect(w.drainEvents()).toHaveLength(1);
    w.complete("brazo:dextre-camara");
    expect(w.cameraHours).toBe(0);
    w.tick(CAMERA_ORU.lifeH.value - 1);
    expect(w.list()).toHaveLength(0);
  });
});
