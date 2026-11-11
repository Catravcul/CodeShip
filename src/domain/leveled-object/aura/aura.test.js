import { Aura, LeveledObjectFactory } from "..";

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