import { Position } from ".";

describe('Position', () => {
    test('getPosition should return current position', () => {
      const position = new Position(1, 2, 3);
      expect(position.getPosition()).toEqual({ x: 1, y: 2, z: 3 });
    });
  
    test('setPosition should update the position', () => {
      const position = new Position(1, 2, 3);
      position.setPosition(4, 5, 6);
      expect(position.getPosition()).toEqual({ x: 4, y: 5, z: 6 });
    });
  
    test('distance should calculate Euclidean distance', () => {
      const position = new Position(0, 0, 0);
      const distance = position.distance(3, 4, 5);
      expect(distance).toBeCloseTo(7.071, 3); // Close enough due to floating point precision
    });
  });