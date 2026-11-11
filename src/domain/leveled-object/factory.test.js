import { LeveledObjectFactory, PointsAccumulation, Position } from ".";

describe('LeveledObjectFactory', () => {
    test('LeveledObjectFactory should create LeveledObject with correct values', () => {
      const factory = new LeveledObjectFactory();
      factory.setPhysicPoints(new PointsAccumulation(10, 5));
      factory.setMentalPoints(new PointsAccumulation(15, 8));
      factory.setLeveledPhysicDefense(3);
      factory.setLeveledMentalDefense(2);
      factory.setLevel(7);
      factory.setExperiencePoints(500);
      factory.setPosition(new Position(1, 2, 3));
  
      const leveledObject = factory.createObject();
  
      expect(leveledObject.physicPoints.capacity).toBe(10);
      expect(leveledObject.mentalPoints.capacity).toBe(15);
      expect(leveledObject.leveledPhysicDefense).toBe(3);
      expect(leveledObject.leveledMentalDefense).toBe(2);
      expect(leveledObject.level).toBe(7);
      expect(leveledObject.experiencePoints).toBe(500);
      expect(leveledObject.position.getPosition()).toEqual({ x: 1, y: 2, z: 3 });
    });
  });