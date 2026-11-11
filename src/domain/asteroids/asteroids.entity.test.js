import { LeveledObjectFactory } from "../leveled-object";
import { CTypeAsteroid, STypeAsteroid, MTypeAsteroid } from ".";

describe("Asteroid Classes", () => {
		const factory = new LeveledObjectFactory()
		const leveledObject = factory.createObject()

		/**
		 * 
		 * @param {number} diameter in meters
		 * @param {number} density in kg/m³
		 * @returns 
		 */
		const calculateMass = (diameter, density) => {
			const radius = diameter / 2;
			const massKg = density * (4 / 3) * Math.PI * Math.pow(radius, 3);
			const massMetricTons = massKg / 1000;
	
			return Number.parseFloat(massMetricTons.toFixed(2));
		}

	describe("CTypeAsteroid", () => {
		test("should create a C-Type asteroid with the given diameter", () => {
			const cTypeAsteroid = new CTypeAsteroid(leveledObject,20);
			const minMass = calculateMass(20, 1300)
			const maxMass = calculateMass(20, 1900)
			expect(cTypeAsteroid.getDiameter().value).toBe(20);
			expect(cTypeAsteroid.getMass().value).toBeGreaterThanOrEqual(minMass);
			expect(cTypeAsteroid.getMass().value).toBeLessThanOrEqual(maxMass);
		});

		test("should get components for C-Type asteroid", () => {
			const cTypeAsteroid = new CTypeAsteroid(leveledObject, 20);
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
		test("should create a C-Type asteroid with the given diameter", () => {
			const sTypeAsteroid = new STypeAsteroid(leveledObject, 10);
			const minMass = calculateMass(10, 2700)
			const maxMass = calculateMass(10, 3500)
			expect(sTypeAsteroid.getDiameter().value).toBe(10);
			expect(sTypeAsteroid.getMass().value).toBeGreaterThanOrEqual(minMass);
			expect(sTypeAsteroid.getMass().value).toBeLessThanOrEqual(maxMass);
		});

		test("should get components for C-Type asteroid", () => {
			const sTypeAsteroid = new STypeAsteroid(leveledObject, 10);
			const components = sTypeAsteroid.getComponents();
			expect(components).toHaveProperty("iron");
			expect(components).toHaveProperty("nickel");
			expect(components).toHaveProperty("silicate");
			expect(components).toHaveProperty("waterIce");
		});
	});

	describe("MTypeAsteroid", () => {
		test("should create a M-Type asteroid with the given diameter", () => {
			const mTypeAsteroid = new MTypeAsteroid(leveledObject, 5);
			const minMass = calculateMass(5, 3500)
			const maxMass = calculateMass(5, 4500)
			expect(mTypeAsteroid.getDiameter().value).toBe(5);
			expect(mTypeAsteroid.getMass().value).toBeGreaterThanOrEqual(minMass);
			expect(mTypeAsteroid.getMass().value).toBeLessThanOrEqual(maxMass);
		});

		test("should get components for C-Type asteroid", () => {
			const mTypeAsteroid = new MTypeAsteroid(leveledObject, 5);
			const components = mTypeAsteroid.getComponents();
			expect(components).toHaveProperty("iron");
			expect(components).toHaveProperty("nickel");
			expect(components).toHaveProperty("cobalt");
			expect(components).toHaveProperty("silicate");
		});
	});
});
