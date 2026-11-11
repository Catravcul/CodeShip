import { LeveledObject } from "../leveled-object";
import { MeasureUnit } from ".";

/**
 * Class representing a generic asteroid.
 */
export class Asteroid {
    /**
     * @type {LeveledObject}
     */
    #leveledObject;
  
    /**
     * @type {MeasureUnit}
     */
    #density;

    /**
     
     * @type {MeasureUnit}
    */
    #radius = new MeasureUnit(0, "m");
  
    /**
     * @type {MeasureUnit}
     */
    #mass = new MeasureUnit(0, "ton");
    
    /**
 * @type {MeasureUnit}
 */
    #gravity = new MeasureUnit(0, "m/s^2");

    /**
     * Get the leveledObject.
     * @returns {LeveledObject} - The leveledObject.
     */
    get leveledObject() {
      return this.#leveledObject;
    }
  
    /**
     * Get the diameter.
     * @returns {MeasureUnit} - The diameter.
     */
    get radius() {
      return this.#radius;
    }
  
    /**
     * Get the mass.
     * @returns {MeasureUnit} - The mass.
     */
    get mass() {
      return this.#mass;
    }

    /**
     * Get the gravity.
     * @returns {MeasureUnit} - The gravity.
     */
    get gravity() {
      return this.#gravity;
    }
  
    /**
     * Create an asteroid.
     * @param {LeveledObject} leveledObject - The leveledObject of the asteroid.
     * @param {number} diameter - The diameter of the asteroid in meters.
     * @param {number} density - The density of the asteroid in kg/m³.
     */
    constructor(leveledObject, diameter, density) {
      this.#leveledObject = leveledObject;
      this.#radius = new MeasureUnit(diameter, "m");
      this.#density = new MeasureUnit(density, "kg/m^3");
      this.#mass = new MeasureUnit(this.calculateMass(), "ton");
      this.#gravity = new MeasureUnit(this.calculateGravity(), "m/s^2");
    }
  
    /**
     * Calculate mass based on diameter.
     * @returns {number} The calculated mass.
     */
    calculateMass() {
      const massKg = this.#density.value * (4 / 3) * Math.PI * Math.pow(this.#radius.value, 3);
      const massMetricTons = massKg / 1000;
  
      return Number.parseFloat(massMetricTons.toFixed(2));
    }

      /**
   * Calculate gravitational acceleration.
   * @returns {number} The calculated gravitational acceleration.
   */
  calculateGravity() {
    const G_kg = 6.67430e-11; // Gravitational constant in m^3 kg^-1 s^-2
    const G_ton = G_kg * 1e3; // Gravitational constant in tons

    const gravity = (G_ton * this.#mass.value) / Math.pow(this.#radius.value, 2);

    return gravity;
  }
  
    /**
     * Calculate a percentage based on the asteroid's mass.
     * @param {number} maxPercentage - The maximum percentage.
     * @returns {number} The calculated percentage.
     */
    calculatePercentage(maxPercentage) {
      return this.#mass.value * (Math.random() * (maxPercentage / 100));
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