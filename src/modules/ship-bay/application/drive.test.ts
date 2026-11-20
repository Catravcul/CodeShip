import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { NODRIZA } from "@modules/mothership/data/mothership";
import { X3 } from "@modules/mothership/data/thrusters";
import { Mothership } from "@modules/mothership/domain/mothership";
import { driveStatus, mountIdOf } from "./drive";

describe("the mothership's thruster mounts in the bay", () => {
  it("one part per mount, with the real spec and the whole drive", () => {
    const list = driveStatus(new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY));
    expect(list.map((c) => c.id)).toEqual(["propulsor:dorsal", "propulsor:ventral"]);
    expect(list.map((c) => mountIdOf(c.id))).toEqual(["dorsal", "ventral"]);
    expect(list[0]!.attention).toBe("ok");
    expect(list[0]!.specs.find((s) => s.label === "Modelo")!.source).toMatch(/^https:\/\/\S+$/);
    expect(list[0]!.specs.find((s) => s.label === "Empuje total")!.value).toBe("97,2 N");
  });

  it("warns about idle units the reactor cannot feed and about empty mounts", () => {
    const m = new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
    m.refit("dorsal", X3, 21);
    m.refit("ventral", X3, 0);
    const [dorsal, ventral] = driveStatus(m);
    expect(dorsal!.issues[0]!.text).toMatch(/3 de 21 no pueden encenderse/);
    expect(ventral!.issues[0]!.text).toMatch(/Vacío/);
  });
});
