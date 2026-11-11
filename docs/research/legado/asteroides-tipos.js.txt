import { Asteroid, AsteroidDensity } from ".";
import { LeveledObject } from "../leveled-object";

/**
 * Class representing a C-Type (Carbonaceous) asteroid.
 * @extends Asteroid
 */
export class CTypeAsteroid extends Asteroid {
  /**
   * Create a C-Type asteroid.
   * @param {LeveledObject} leveledObject - The leveledObject of the asteroid.
   * @param {number} diameter - The diameter of the asteroid in meters.
   */
  constructor(leveledObject, diameter) {
    const density = AsteroidDensity.getDefaultCTypeDensity();
    super(leveledObject, diameter, density);
  }

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
export class STypeAsteroid extends Asteroid {
  /**
   * Create an S-Type asteroid.
   * @param {LeveledObject} leveledObject - The leveledObject of the asteroid.
   * @param {number} diameter - The diameter of the asteroid in meters.
   */
  constructor(leveledObject, diameter) {
    const density = AsteroidDensity.getDefaultSTypeDensity();
    super(leveledObject, diameter, density);
  }

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
export class MTypeAsteroid extends Asteroid {
  /**
   * Create an M-Type asteroid.
   * @param {LeveledObject} leveledObject - The leveledObject of the asteroid.
   * @param {number} diameter - The diameter of the asteroid in meters.
   */
  constructor(leveledObject, diameter) {
    const density = AsteroidDensity.getDefaultMTypeDensity();
    super(leveledObject, diameter, density);
  }

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
