import {
  Position,
  checkPositiveInteger,
  PointsAccumulation,
  Aura,
  LeveledObject,
  LeveledObjectFactory,
} from './leveled.entity';

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


  describe('Aura', () => {
    test('Aura should have correct initial values', () => {
      const auraEffect = jest.fn();
      const aura = new Aura(auraEffect, 'Test Aura');
      expect(aura.owner).toBeUndefined();
      expect(aura.allies.size).toBe(0);
      expect(aura.enemies.size).toBe(0);
      expect(aura.name).toBe('Test Aura');
    });
  
    test('Aura effect should be invoked correctly', () => {

      const owner = (new LeveledObjectFactory()).createObject()
      const auraEffect = jest.fn();
      const aura = new Aura(auraEffect, 'Test Aura', owner);
      
      const factory = new LeveledObjectFactory();
      const ally = factory.createObject();
      const enemy = factory.createObject();
  
      aura.allies.add(ally);
      aura.enemies.add(enemy);
  
      aura.effect();
  
      expect(auraEffect).toHaveBeenCalledWith(owner, aura.allies, aura.enemies);
    });
  });
  
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
      const expectedIncrease = 5 * 100 + Math.round(Math.random() * (leveledObject2.level * 15));
      expect(leveledObject2.experiencePoints).toBe(expectedIncrease);
    });
  });
  
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
});