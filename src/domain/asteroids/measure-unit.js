/**
 * Class representing a unit of measurement.
 */
export class MeasureUnit {
    /**
     * @param {number} value - The numerical value of the measurement.
     * @param {string} measure - The unit of measurement (e.g., "m", "kg/m³").
     */
    constructor(value, measure) {
      this.measure = measure;
      this.value = value;
    }
  }