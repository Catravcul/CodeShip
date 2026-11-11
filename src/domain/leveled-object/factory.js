import { checkPositiveInteger } from "../utils";
import { PointsAccumulation, Position, LeveledObject } from "./";

/**
 * Class representing a factory for creating leveled objects.
 */
export class LeveledObjectFactory {
    #physicPoints = new PointsAccumulation(10, 10);
    #mentalPoints = new PointsAccumulation(10, 10);
    #leveledPhysicDefense = 10;
    #leveledMentalDefense = 10;
    #level = 1;
    #experiencePoints = 0;
    #position = new Position(0, 0, 0);
  
    /**
     * Set the physical points accumulation.
     * @param {PointsAccumulation} physicPoints - The physical points accumulation.
     */
    setPhysicPoints = (physicPoints) => {
      this.#physicPoints = physicPoints;
    };
    
    /**
     * Set the mental points accumulation.
     * @param {PointsAccumulation} mentalPoints - The mental points accumulation.
     */
    setMentalPoints = (mentalPoints) => {
      this.#mentalPoints = mentalPoints;
    };
    
    /**
     * Set the leveled physical defense.
     * @param {number} leveledDefense - The leveled physical defense.
     */
    setLeveledPhysicDefense = (leveledDefense) => {
      checkPositiveInteger(leveledDefense, "class LeveledObjectFactory > setLeveledDefense");
      this.#leveledPhysicDefense = leveledDefense;
    };
    
    /**
     * Set the leveled mental defense.
     * @param {number} leveledDefense - The leveled mental defense.
     */
    setLeveledMentalDefense = (leveledDefense) => {
      checkPositiveInteger(leveledDefense, "class LeveledObjectFactory > setLeveledDefense");
      this.#leveledMentalDefense = leveledDefense;
    };
    
    /**
     * Set the level of the leveled object.
     * @param {number} level - The level of the leveled object.
     */
    setLevel = (level) => {
      checkPositiveInteger(level, "class LeveledObjectFactory > setLevel");
      this.#level = level;
    };
    
    /**
     * Set the experience points of the leveled object.
     * @param {number} experiencePoints - The experience points of the leveled object.
     */
    setExperiencePoints = (experiencePoints) => {
      checkPositiveInteger(experiencePoints, "class LeveledObjectFactory > setExperiencePoints");
      this.#experiencePoints = experiencePoints;
    };
    
    /**
     * Set the position of the leveled object.
     * @param {Position} position - The position of the leveled object.
     */
    setPosition = (position) => {
      this.#position = position;
    };
    
    /**
     * Create a LeveledObject using the configured parameters.
     * @returns {LeveledObject} - The created LeveledObject.
     */
    createObject = () =>
      new LeveledObject(
        this.#physicPoints,
        this.#mentalPoints,
        this.#leveledMentalDefense,
        this.#leveledPhysicDefense,
        this.#level,
        this.#experiencePoints,
        this.#position,
      );
  }