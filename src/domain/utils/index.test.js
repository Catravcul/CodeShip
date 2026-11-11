import { checkPositiveInteger } from ".";

describe('checkPositiveInteger', () => {
    test('should not throw for positive integer', () => {
      expect(() => checkPositiveInteger(5, 'testParam')).not.toThrow();
    });
  
    test('should throw for non-integer', () => {
      expect(() => checkPositiveInteger(5.5, 'testParam')).toThrow('testParam must be a non-negative integer.');
    });
  
    test('should throw for negative integer', () => {
      expect(() => checkPositiveInteger(-5, 'testParam')).toThrow('testParam must be a non-negative integer.');
    });
  });