class MeasureUnit {
	measure
	value
	/**
	 * 
	 * @param {string} measure 
	 * @param {number} value 
	 */
	constructor (value, measure) {
		this.measure = measure
		this.value = value
	}
}

/**
 * Class representing a generic asteroid.
 */
class Asteroid {
	density = new MeasureUnit(Number.parseFloat((1300 + (Math.random() * 3200)).toFixed(1)), 'kg/m³')
	diameter = new MeasureUnit(0, 'm')
	/**
	 * Create an asteroid.
	 * @param {number} diameter - The diameter of the asteroid in kilometers.
	 */
	constructor(diameter) {
		/** @member {number} */
		this.diameter = new MeasureUnit(diameter, 'm');
		/** @member {number} */
		this.mass = new MeasureUnit(this.calculateMass(), 'ton');
	}

	/**
	 * Calculate mass based on diameter.
	 * @returns {number} The calculated mass.
	 */
	calculateMass() {
		const radius = this.diameter.value / 2;
		const massKg = this.density.value * (4 / 3) * Math.PI * Math.pow(radius, 3);
		const massMetricTons = massKg / 1000;

		return massMetricTons;
	}

	/**
	 * Calculate a percentage based on the asteroid's mass.
	 * @param {number} maxPercentage - The maximum percentage.
	 * @returns {number} The calculated percentage.
	 */
	calculatePercentage(maxPercentage) {
		return this.mass * (Math.random() * (maxPercentage / 100));
	}

	/**
	 * Get the elements or components of the asteroid.
	 * @abstract
	 * @returns {Object} An object representing the components.
	 */
	getComponents() {
		// To be implemented by specific asteroid types
		throw new Error("Not implemented");
	}
}

/**
 * Class representing a C-Type (Carbonaceous) asteroid.
 * @extends Asteroid
 */
class CTypeAsteroid extends Asteroid {
	density = new MeasureUnit(Number.parseFloat((1300 + (Math.random() * 600)).toFixed(1)), 'kg/m³')
	/**
	 * Get the components of the C-Type asteroid.
	 * @returns {Object} An object representing the components.
	 */
	getComponents() {
		return {
			carbon: this.calculatePercentage(10),
			silicate: this.calculatePercentage(50),
			waterIce: this.calculatePercentage(25),
			aminoAcids: this.calculatePercentage(7),
			sugars: this.calculatePercentage(5),
			hydrocarbons: this.calculatePercentage(3),
		};
	}
}

/**
 * Class representing an S-Type (Stony) asteroid.
 * @extends Asteroid
 */
class STypeAsteroid extends Asteroid {
	density = new MeasureUnit(Number.parseFloat((2700 + (Math.random() * 800)).toFixed(1)), 'kg/m³')
	/**
	 * Get the components of the S-Type asteroid.
	 * @returns {Object} An object representing the components.
	 */
	getComponents() {
		return {
			silicate: this.calculatePercentage(60),
			iron: this.calculatePercentage(20),
			nickel: this.calculatePercentage(10),
			waterIce: this.calculatePercentage(10),
		};
	}
}

/**
 * Class representing an M-Type (Metallic) asteroid.
 * @extends Asteroid
 */
class MTypeAsteroid extends Asteroid {
	density = new MeasureUnit(Number.parseFloat((3500 + (Math.random() * 1000)).toFixed(1)), 'kg/m³')
	/**
	 * Get the components of the M-Type asteroid.
	 * @returns {Object} An object representing the components.
	 */
	getComponents() {
		return {
			iron: this.calculatePercentage(80),
			nickel: this.calculatePercentage(10),
			cobalt: this.calculatePercentage(5),
			silicate: this.calculatePercentage(5),
		};
	}
}

export { Asteroid, CTypeAsteroid, STypeAsteroid, MTypeAsteroid };
