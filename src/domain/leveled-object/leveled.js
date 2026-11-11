import { checkPositiveInteger } from "../utils";
import { Position, Aura, PointsAccumulation } from "./";

/**
 * Class representing a leveled object with various attributes.
 */
export class LeveledObject {
  #position = new Position(0, 0, 0);

  /**
   * Get the position of the leveled object.
   * @returns {Position} - The position of the leveled object.
   */
  get position() {
    return this.#position;
  }

  #physicPoints = new PointsAccumulation(10,10);

  /**
   * Get the physical points of the leveled object.
   * @returns {PointsAccumulation} - The physical points of the leveled object.
   */
  get physicPoints() {
    return this.#physicPoints;
  }

  #mentalPoints = new PointsAccumulation(10,10);

  /**
   * Get the mental points of the leveled object.
   * @returns {PointsAccumulation} - The mental points of the leveled object.
   */
  get mentalPoints() {
    return this.#mentalPoints;
  }

  #leveledMentalDefense = 0;

  /**
   * Get the leveled mental defense of the leveled object.
   * @returns {number} - The leveled mental defense of the leveled object.
   */
  get leveledMentalDefense() {
    return this.#leveledMentalDefense;
  }

  #leveledPhysicDefense = 0;

  /**
   * Get the leveled physical defense of the leveled object.
   * @returns {number} - The leveled physical defense of the leveled object.
   */
  get leveledPhysicDefense() {
    return this.#leveledPhysicDefense;
  }

  #level = 1;

  /**
   * Get the level of the leveled object.
   * @returns {number} - The level of the leveled object.
   */
  get level() {
    return this.#level;
  }

  #experiencePoints = 0;
  /**
   * Get the experience points of the leveled object.
   * @returns {number} - The experience points of the leveled object.
   */
  get experiencePoints() {return this.#experiencePoints}

  #auras = new Set();

  /**
   * Get the auras affecting the leveled object.
   * @returns {Set<Aura>} - The auras affecting the leveled object.
   */
  get auras() {
    return this.#auras;
  }

  /**
   * Create a LeveledObject.
   * @param {PointsAccumulation} physicPoints - The physical points of the leveled object.
   * @param {PointsAccumulation} mentalPoints - The mental points of the leveled object.
   * @param {number} leveledMentalDefense - The leveled mental defense of the leveled object.
   * @param {number} leveledPhysicDefense - The leveled physical defense of the leveled object.
   * @param {number} level - The level of the leveled object.
   * @param {number} experiencePoints - The experience points of the leveled object.
   * @param {Position} position - The position of the leveled object.
   */
  constructor(
    physicPoints,
    mentalPoints,
    leveledMentalDefense,
    leveledPhysicDefense,
    level,
    experiencePoints,
    position,
  ) {
    this.#physicPoints = physicPoints;
    this.#mentalPoints = mentalPoints;
    checkPositiveInteger(leveledMentalDefense, "class LeveledObject > constructor > leveledMentalDefense");
    this.#leveledMentalDefense = leveledMentalDefense;
    checkPositiveInteger(leveledPhysicDefense, "class LeveledObject > constructor > leveledPhysicDefense");
    this.#leveledPhysicDefense = leveledPhysicDefense;
    checkPositiveInteger(level, "class LeveledObject > constructor > level");
    if (level > 1) this.#level = level;
    checkPositiveInteger(experiencePoints, "class LeveledObject > constructor > experiencePoints");
    this.rawExperienceIncrease(experiencePoints);
    this.#position = position;
  }

  /**
   * Receive leveled damage.
   * @param {LeveledObject} param0 - The object causing the damage.
   * @param {number} physicDamage - The amount of physical damage.
   * @param {number} mentalDamage - The amount of mental damage.
   */
  receiveLeveledDamage = ({ level }, physicDamage, mentalDamage) => {
    checkPositiveInteger(physicDamage, "class LeveledObject > receiveLeveledDamage");
    checkPositiveInteger(mentalDamage, "class LeveledObject > receiveLeveledDamage");

    const getDamageResidue = (leveledDefense, damage) => {
      const levelDifference = (this.#level - level);
      const leveledAddition = (levelDifference * 0.025 * leveledDefense);
      const reducer = leveledDefense + leveledAddition;
      const damageResidue = (damage - reducer);
      if (damageResidue > 0) return damageResidue
      return 0
    };
    const mentalDamageResidue = getDamageResidue(
      this.#leveledMentalDefense,
      mentalDamage,
    );
    const physicDamageResidue = getDamageResidue(
      this.#leveledPhysicDefense,
      physicDamage,
    );
    this.#mentalPoints.removePoints(mentalDamageResidue)
    this.#physicPoints.removePoints(physicDamageResidue)
  };

  #levelup = () => (this.#level += 1);

  /**
   * Increase experience points.
   * @param {number} amount - The amount to increase experience points.
   */
  rawExperienceIncrease = (amount) => {
    checkPositiveInteger(amount, "class LeveledObject > rawExperienceIncrease");
    this.#experiencePoints += amount;

    while (this.#experiencePoints > this.#level * 1000) {
      this.#experiencePoints -= this.#level * 1000;
      this.#levelup();
    }
  };

  /**
   * Increase experience points based on another leveled object
   * @param {LeveledObject} leveledObj - The leveled object from which to calculate experience increase.
   */
  leveledExperienceIncrease = ({level}) => {
    if (level > this.#level) {
      const levelDifference = level - this.#level
      const totalAddition = levelDifference * 17 * 10 * this.#level
      this.rawExperienceIncrease(totalAddition);
    }
    else if (level > this.#level - 5) {
      const initialAddition = (level * 6)
      const randomAddition = Math.round(Math.random() * (level * 10));
      const totalAddition = initialAddition + randomAddition + (level * 100)
      this.rawExperienceIncrease(totalAddition);
    }
  };
}
