import {
  Position,
  PointsAccumulation,
  LeveledObject,
  LeveledObjectFactory,
} from '.';

  describe('LeveledObject', () => {
    test('should create a LeveledObject with correct properties', () => {
      // Create a Position instance
      const position = new Position(10, 20, 30);
  
      // Create PointsAccumulation instances for physic and mental points
      const physicPoints = new PointsAccumulation(100, 80);
      const mentalPoints = new PointsAccumulation(120, 90);
  
      // Set other properties for LeveledObject
      const leveledMentalDefense = 5;
      const leveledPhysicDefense = 3;
      const level = 10;
      const experiencePoints = 1200;
  
      // Create a LeveledObject instance
      const leveledObject = new LeveledObject(
        physicPoints,
        mentalPoints,
        leveledMentalDefense,
        leveledPhysicDefense,
        level,
        experiencePoints,
        position
      );
  
      // Assertions
      expect(leveledObject.position.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
      expect(leveledObject.physicPoints.points).toBe(80);
      expect(leveledObject.mentalPoints.points).toBe(90);
      expect(leveledObject.leveledPhysicDefense).toBe(3);
      expect(leveledObject.leveledMentalDefense).toBe(5);
      expect(leveledObject.level).toBe(10);
      expect(leveledObject.experiencePoints).toBe(1200);
    });
  
    test('LeveledObject receiveLeveledDamage should reduce points correctly', () => {
      const factory = new LeveledObjectFactory();
      factory.setPhysicPoints(new PointsAccumulation(10, 10));
      factory.setMentalPoints(new PointsAccumulation(10, 10));
      factory.setLeveledPhysicDefense(5);
      factory.setLeveledMentalDefense(0)
      const leveledObject = factory.createObject();
  
      leveledObject.receiveLeveledDamage({ level: 1 }, 12, 2);
  
      expect(leveledObject.leveledPhysicDefense).toBe(5)
      expect(leveledObject.level).toBe(1)
      expect(leveledObject.physicPoints.points).toBe(3);
      expect(leveledObject.mentalPoints.points).toBe(8);
    });
  
    test('LeveledObject leveledExperienceIncrease should increase experience correctly', () => {
      const factory = new LeveledObjectFactory();
      factory.setLevel(10);
      const leveledObject1 = factory.createObject();
  
      factory.setLevel(5);
      const leveledObject2 = factory.createObject();
  
      leveledObject2.leveledExperienceIncrease(leveledObject1);
  
      // The increase should be based on the difference in levels
      const expectedIncrease = 17 * 10 * 5 * 5
      expect(leveledObject2.experiencePoints).toBe(expectedIncrease);
      
    });

    test('LeveledObject leveledExperienceIncrease should increase the experience as much to levelup with an experience base of 0, if the level is lower by 6 to the leveled experience', () => {
      const factory = new LeveledObjectFactory();
      factory.setLevel(11);
      const leveledObject1 = factory.createObject();
  
      factory.setLevel(5);
      const leveledObject2 = factory.createObject();
  
      leveledObject2.leveledExperienceIncrease(leveledObject1);
  
      expect(leveledObject2.level).toBe(6);
    });

    test('LeveledObject leveledExperienceIncrease should increase experience with an addition up to the 16%', () => {
      const factory = new LeveledObjectFactory();
      factory.setLevel(5);
      const leveledObject1 = factory.createObject();
  
      factory.setLevel(5);
      const leveledObject2 = factory.createObject();
  
      leveledObject2.leveledExperienceIncrease(leveledObject1);
  
      // The increase should be based on the difference in levels
      const minAddition = (5 * 6)
      const maxAddition = (5 * 16);

      const maxBoundary = (100 * 5) + maxAddition
      const minBoundary = (100 * 5) + minAddition
      
      expect(leveledObject2.experiencePoints).toBeGreaterThanOrEqual(minBoundary);
      expect(leveledObject2.experiencePoints).toBeLessThanOrEqual(maxBoundary);
    });
  });
  