import { PointsAccumulation } from ".";

describe('PointsAccumulation', () => {
    test('increaseCapacity should increase capacity', () => {
      const pointsAccumulation = new PointsAccumulation(10, 5);
      pointsAccumulation.increaseCapacity(5);
      expect(pointsAccumulation.capacity).toBe(15);
    });
  
    test('addPoints should add points within capacity', () => {
      const pointsAccumulation = new PointsAccumulation(10, 5);
      pointsAccumulation.addPoints(3);
      expect(pointsAccumulation.points).toBe(8);
    });
  
    test('addPoints should cap points at capacity', () => {
      const pointsAccumulation = new PointsAccumulation(10, 5);
      pointsAccumulation.addPoints(10);
      expect(pointsAccumulation.points).toBe(10);
    });
  
    test('removePoints should remove points without going negative', () => {
      const pointsAccumulation = new PointsAccumulation(10, 5);
      pointsAccumulation.removePoints(8);
      expect(pointsAccumulation.points).toBe(0);
    });
})