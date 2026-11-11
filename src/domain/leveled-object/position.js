import { checkPositiveInteger } from "../utils";

/**
 * Class representing a 3D position.
 */
export class Position {
    #x;
    #y;
    #z;
  
    /**
     * Create a Position.
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @param {number} z - The z-coordinate.
     */
    constructor(x, y, z) {
      checkPositiveInteger(x, 'class Position > constructor > x')
      checkPositiveInteger(y, 'class Position > constructor > y')
      checkPositiveInteger(z, 'class Position > constructor > z')
      this.#x = x;
      this.#y = y;
      this.#z = z;
    }
  
    /**
     * Get the current position.
     * @returns {{x: number, y: number, z: number}} - The current position.
     */
    getPosition = () => ({ x: this.#x, y: this.#y, z: this.#z });
  
    /**
     * Set the position.
     * @param {number} x - The new x-coordinate.
     * @param {number} y - The new y-coordinate.
     * @param {number} z - The new z-coordinate.
     */
    setPosition = (x, y, z) => {
      this.#x = x;
      this.#y = y;
      this.#z = z;
    };

  /**
   * Calculate the Euclidean distance between two 3D points.
   * @param {number} x - The x-coordinate of the other point.
   * @param {number} y - The y-coordinate of the other point.
   * @param {number} z - The z-coordinate of the other point.
   * @returns {number} - The distance between the points.
   */
  distance = (x, y, z) => {
    const dx = this.#x - x;
    const dy = this.#y - y;
    const dz = this.#z - z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
}