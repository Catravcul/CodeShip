import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { NODRIZA } from "@modules/mothership/data/mothership";
import { STARSHIP } from "@modules/mothership/data/starship";
import { SHIELD_NONE } from "@modules/mothership/data/equipment";
import { Mothership } from "@modules/mothership/domain/mothership";
import { equipmentPartId, equipmentSlotOf, mothershipEquipmentStatus } from "./mothership-equipment";

describe("mothership equipment in the bay", () => {
  it("shows the auxiliary power and the shield; a bare habitat warns about the career limit", () => {
    const m = new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
    const list = mothershipEquipmentStatus(m);
    expect(list.map((c) => c.id)).toEqual([equipmentPartId("energia-auxiliar"), equipmentPartId("blindaje")]);
    expect(list.every((c) => c.attention === "ok")).toBe(true);
    m.fitEquipment(SHIELD_NONE);
    const shield = mothershipEquipmentStatus(m)[1]!;
    expect(shield.attention).toBe("aviso");
    expect(shield.specs.find((s) => s.label === "Dosis dentro")!.value).toMatch(/^523 mSv/);
  });

  it("maps bay ids back to slots", () => {
    expect(equipmentSlotOf(equipmentPartId("blindaje"))).toBe("blindaje");
    expect(equipmentSlotOf("propulsor:dorsal")).toBeUndefined();
  });
});

describe("NAV-15 Starship in the bay: no reactor, no electric thrusters, no twin ring", () => {
  it("its auxiliary power lists no reactor and nothing about thrusters firing", () => {
    const text = mothershipEquipmentStatus(new Mothership(STARSHIP, Vec3.ZERO, Quat.IDENTITY))
      .flatMap((c) => c.specs.map((x) => `${x.label} ${x.value}`))
      .join(" · ");
    expect(text).not.toMatch(/Reactor|encienden|anillo/);
  });
});
