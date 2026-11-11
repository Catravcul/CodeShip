import { LeveledObjectFactory } from "../leveled-object";
import { CTypeAsteroid, STypeAsteroid, MTypeAsteroid } from ".";

describe("Asteroid Classes", () => {
  const factory = new LeveledObjectFactory();
  const leveledObject = factory.createObject();

  /**
   * @param {number} radius in meters
   * @param {number} density in kg/m³
   * @returns {number} The calculated mass.
   */
  const calculateMass = (radius, density) => {
    const massKg = density * (4 / 3) * Math.PI * Math.pow(radius, 3);
    const massMetricTons = massKg / 1000;

    return Number.parseFloat(massMetricTons.toFixed(2));
  };

  /**
   * @param {number} radius in meters
   * @param {number} mass in metric tons
   * @returns {number} The calculated gravitational acceleration.
   */
  const calculateGravity = (radius, mass) => {
    const G_kg = 6.67430e-11; // Gravitational constant in m^3 kg^-1 s^-2
    const G_ton = G_kg * 1e3; // Gravitational constant in tons

    return ((G_ton * mass) / Math.pow(radius, 2));
  };

  describe("CTypeAsteroid", () => {
    test("should create a C-Type asteroid with the given radius", () => {
      const cTypeAsteroid = new CTypeAsteroid(leveledObject, 2);
      const minMass = calculateMass(2, 1300);
      const maxMass = calculateMass(2, 1900);
      const expectedGravity = calculateGravity(2, cTypeAsteroid.mass.value);

      expect(cTypeAsteroid.radius.value).toBe(2);
      expect(cTypeAsteroid.mass.value).toBeGreaterThanOrEqual(minMass);
      expect(cTypeAsteroid.mass.value).toBeLessThanOrEqual(maxMass);
      expect(cTypeAsteroid.gravity.value).toBe(expectedGravity);
    });

    test("should get components for C-Type asteroid", () => {
      const cTypeAsteroid = new CTypeAsteroid(leveledObject, 2);
      const components = cTypeAsteroid.getComponents();
      expect(components).toHaveProperty("carbon");
      expect(components).toHaveProperty("silicate");
      expect(components).toHaveProperty("waterIce");
      expect(components).toHaveProperty("aminoAcids");
      expect(components).toHaveProperty("sugars");
      expect(components).toHaveProperty("hydrocarbons");
    });
  });

  describe("STypeAsteroid", () => {
    test("should create a S-Type asteroid with the given radius", () => {
      const sTypeAsteroid = new STypeAsteroid(leveledObject, 10);
      const minMass = calculateMass(10, 2700);
      const maxMass = calculateMass(10, 3500);
      const expectedGravity = calculateGravity(10, sTypeAsteroid.mass.value);

      expect(sTypeAsteroid.radius.value).toBe(10);
      expect(sTypeAsteroid.mass.value).toBeGreaterThanOrEqual(minMass);
      expect(sTypeAsteroid.mass.value).toBeLessThanOrEqual(maxMass);
      expect(sTypeAsteroid.gravity.value).toBe(expectedGravity);
    });

    test("should get components for S-Type asteroid", () => {
      const sTypeAsteroid = new STypeAsteroid(leveledObject, 10);
      const components = sTypeAsteroid.getComponents();
      expect(components).toHaveProperty("iron");
      expect(components).toHaveProperty("nickel");
      expect(components).toHaveProperty("silicate");
      expect(components).toHaveProperty("waterIce");
    });
  });

  describe("MTypeAsteroid", () => {
    test("should create an M-Type asteroid with the given radius", () => {
      const mTypeAsteroid = new MTypeAsteroid(leveledObject, 5);
      const minMass = calculateMass(5, 3500);
      const maxMass = calculateMass(5, 4500);
      const expectedGravity = calculateGravity(5, mTypeAsteroid.mass.value);

      expect(mTypeAsteroid.radius.value).toBe(5);
      expect(mTypeAsteroid.mass.value).toBeGreaterThanOrEqual(minMass);
      expect(mTypeAsteroid.mass.value).toBeLessThanOrEqual(maxMass);
      expect(mTypeAsteroid.gravity.value).toBe(expectedGravity);
    });

    test("should get components for M-Type asteroid", () => {
      const mTypeAsteroid = new MTypeAsteroid(leveledObject, 5);
      const components = mTypeAsteroid.getComponents();
      expect(components).toHaveProperty("iron");
      expect(components).toHaveProperty("nickel");
      expect(components).toHaveProperty("cobalt");
      expect(components).toHaveProperty("silicate");
    });
  });
});
