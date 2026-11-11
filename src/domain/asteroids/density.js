/**
 * Class representing the density values for different types of asteroids.
 */
export class AsteroidDensity {
    /**
     * Default measure for asteroid density.
     * @type {string}
     */
    static #measure = 'kg/m³';
  
    /**
     * Get the measure for asteroid density.
     * @returns {string} - The measure for asteroid density.
     */
    static get measure() {
      return this.#measure;
    }
  
    /**
     * Get the default density for C-Type (Carbonaceous) asteroid.
     * @returns {number} - The density value for C-Type asteroid.
     */
    static getDefaultCTypeDensity = () => Number.parseFloat((1300 + Math.random() * 600).toFixed(1));
  
    /**
     * Get the default density for M-Type (Metallic) asteroid.
     * @returns {number} - The density value for M-Type asteroid.
     */
    static getDefaultMTypeDensity = () => Number.parseFloat((3500 + Math.random() * 1000).toFixed(1));
  
    /**
     * Get the default density for S-Type (Stony) asteroid.
     * @returns {number} - The density value for S-Type asteroid.
     */
    static getDefaultSTypeDensity = () => Number.parseFloat((2700 + Math.random() * 800).toFixed(1));
  }