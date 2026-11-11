/**
 * Check if a parameter is a positive integer.
 * @param {number} param - The parameter to check.
 * @param {string} name - The name of the parameter for error messages.
 * @throws Will throw an error if the parameter is not a positive integer.
 */
export const checkPositiveInteger = (param, name) => {
    if (!Number.isInteger(param) || param < 0) {
      throw new Error(name + " must be a non-negative integer.");
    }
  };
  