import { CTypeAsteroid, STypeAsteroid, MTypeAsteroid } from "./asteroids";

describe("Asteroid Classes", () => {
	describe("CTypeAsteroid", () => {
		test("should create a C-Type asteroid with the given diameter", () => {
			const cTypeAsteroid = new CTypeAsteroid(15);
			expect(cTypeAsteroid.diameter).toBe(15);
			expect(cTypeAsteroid.mass).toBe(3375);
		});

		test("should calculate mass based on diameter", () => {
			const cTypeAsteroid = new CTypeAsteroid(5);
			expect(cTypeAsteroid.calculateMass()).toBe(125);
		});

		test("should get components for C-Type asteroid", () => {
			const cTypeAsteroid = new CTypeAsteroid(20);
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
			const sTypeAsteroid = new STypeAsteroid(15);
			expect(sTypeAsteroid.diameter).toBe(15);
			expect(sTypeAsteroid.mass).toBe(3375);
		});

		test("should get components for C-Type asteroid", () => {
			const sTypeAsteroid = new STypeAsteroid(20);
			const components = sTypeAsteroid.getComponents();
			expect(components).toHaveProperty("iron");
            expect(components).toHaveProperty("nickel");
			expect(components).toHaveProperty("silicate");
			expect(components).toHaveProperty("waterIce");
		});
	});

	describe("MTypeAsteroid", () => {
		test("should create a C-Type asteroid with the given diameter", () => {
			const mTypeAsteroid = new MTypeAsteroid(15);
			expect(mTypeAsteroid.diameter).toBe(15);
			expect(mTypeAsteroid.mass).toBe(3375);
		});

		test("should get components for C-Type asteroid", () => {
			const mTypeAsteroid = new MTypeAsteroid(20);
			const components = mTypeAsteroid.getComponents();
			expect(components).toHaveProperty("iron");
			expect(components).toHaveProperty("nickel");
			expect(components).toHaveProperty("cobalt");
			expect(components).toHaveProperty("silicate");

            iron: this.calculatePercentage(80),
			nickel: this.calculatePercentage(10),
			cobalt: this.calculatePercentage(5),
			silicate: this.calculatePercentage(5),
		});
	});
});
