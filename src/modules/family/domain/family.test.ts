import { describe, expect, it } from "vitest";
import { Bonds, companionship, FAMILY_TUNING, type Member } from "./family";

const hen: Member = { id: "yema", name: "Yema", kind: "gallina", young: false };
const pup: Member = { id: "pepa", name: "Pepa", kind: "perro", young: true };
const cat: Member = { id: "luna", name: "Luna", kind: "gato", young: false };
const cat2: Member = { id: "nube", name: "Nube", kind: "gato", young: false };

describe("Bonds and families", () => {
  it("a strong bond between two species makes a family, with the adopter as mother", () => {
    const b = new Bonds();
    b.nurture("yema", "pepa", FAMILY_TUNING.familyAt);
    const [f] = b.families([hen, pup, cat]);
    expect(f!.members.map((m) => m.id).sort()).toEqual(["pepa", "yema"]);
    expect(f!.motherId).toBe("yema");
  });

  it("families grow through shared members and need two species", () => {
    const b = new Bonds();
    b.add("luna", "nube", 1);
    expect(b.families([cat, cat2])).toHaveLength(0);
    b.add("yema", "pepa", 0.8);
    b.add("luna", "pepa", 0.9);
    expect(b.families([hen, pup, cat, cat2])[0]!.members).toHaveLength(4);
  });

  it("hostile meetings weaken bonds and company grows with family size", () => {
    const b = new Bonds();
    b.add("yema", "pepa", 0.8);
    b.add("yema", "pepa", -FAMILY_TUNING.hostileBondLoss);
    expect(b.families([hen, pup])).toHaveLength(0);
    b.add("yema", "pepa", 0.5);
    expect(companionship(b.families([hen, pup]))).toBeCloseTo(1 / FAMILY_TUNING.fullCompany);
  });
});
