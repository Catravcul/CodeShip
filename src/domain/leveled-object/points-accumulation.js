import { checkPositiveInteger } from "../utils";

/**
 * Class representing points accumulation with capacity.
 */
export class PointsAccumulation {
    #capacity;
    get capacity () {return this.#capacity}
    #points;
    get points () {return this.#points}
  
    /**
     * Create a PointsAccumulation.
     * @param {number} capacity - The capacity of points accumulation.
     * @param {number} points - The current points.
     */
    constructor(capacity, points) {
      checkPositiveInteger(capacity, "class PointsAccumulation > constructor > capacity");
      checkPositiveInteger(points, "class PointsAccumulation > constructor > points");
      this.#capacity = capacity;
      this.#points = points;
    }
  
    /**
     * Increase the capacity of points accumulation.
     * @param {number} amount - The amount by which to increase the capacity.
     */
    increaseCapacity(amount) {
      checkPositiveInteger(amount, "class PointsAccumulation > increaseCapacity");
      this.#capacity += amount;
    }
  
    /**
     * Add points to the accumulation.
     * @param {number} amount - The amount of points to add.
     */
    addPoints(amount) {
      checkPositiveInteger(amount, "class PointsAccumulation > addPoints");
      this.#points += amount;
      if (this.#points > this.#capacity)
        this.#points = this.#capacity;
    }
  
    /**
     * Remove points from the accumulation.
     * @param {number} amount - The amount of points to remove.
     */
    removePoints(amount) {
      checkPositiveInteger(amount, "class PointsAccumulation > removePoints");
      this.#points -= amount;
      if (this.#points < 0) this.#points = 0;
    }
  }
  