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

/**
 * Class representing a 3D position.
 */
export class Position {
  #x;
  #y;
  #z;

  /**
   * Create a Position.
   * @param {number} x - The x-coordinate.
   * @param {number} y - The y-coordinate.
   * @param {number} z - The z-coordinate.
   */
  constructor(x, y, z) {
    checkPositiveInteger(x, 'class Position > constructor > x')
    checkPositiveInteger(y, 'class Position > constructor > y')
    checkPositiveInteger(z, 'class Position > constructor > z')
    this.#x = x;
    this.#y = y;
    this.#z = z;
  }

  /**
   * Get the current position.
   * @returns {{x: number, y: number, z: number}} - The current position.
   */
  getPosition = () => ({ x: this.#x, y: this.#y, z: this.#z });

  /**
   * Set the position.
   * @param {number} x - The new x-coordinate.
   * @param {number} y - The new y-coordinate.
   * @param {number} z - The new z-coordinate.
   */
  setPosition = (x, y, z) => {
    this.#x = x;
    this.#y = y;
    this.#z = z;
  };

  /**
   * Calculate the Euclidean distance between two 3D points.
   * @param {number} x - The x-coordinate of the other point.
   * @param {number} y - The y-coordinate of the other point.
   * @param {number} z - The z-coordinate of the other point.
   * @returns {number} - The distance between the points.
   */
  distance = (x, y, z) => {
    const dx = this.#x - x;
    const dy = this.#y - y;
    const dz = this.#z - z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
}

/**
 * Class representing points accumulation with capacity.
 */
export class PointsAccumulation {
  #capacity;
  get capacity () {return this.#capacity}
  #points;
  get points () {return this.#points}

  /**
   * Create a PointsAccumulation.
   * @param {number} capacity - The capacity of points accumulation.
   * @param {number} points - The current points.
   */
  constructor(capacity, points) {
    checkPositiveInteger(capacity, "class PointsAccumulation > constructor > capacity");
    checkPositiveInteger(points, "class PointsAccumulation > constructor > points");
    this.#capacity = capacity;
    this.#points = points;
  }

  /**
   * Increase the capacity of points accumulation.
   * @param {number} amount - The amount by which to increase the capacity.
   */
  increaseCapacity(amount) {
    checkPositiveInteger(amount, "class PointsAccumulation > increaseCapacity");
    this.#capacity += amount;
  }

  /**
   * Add points to the accumulation.
   * @param {number} amount - The amount of points to add.
   */
  addPoints(amount) {
    checkPositiveInteger(amount, "class PointsAccumulation > addPoints");
    this.#points += amount;
    if (this.#points > this.#capacity)
      this.#points = this.#capacity;
  }

  /**
   * Remove points from the accumulation.
   * @param {number} amount - The amount of points to remove.
   */
  removePoints(amount) {
    checkPositiveInteger(amount, "class PointsAccumulation > removePoints");
    this.#points -= amount;
    if (this.#points < 0) this.#points = 0;
  }
}

/**
 * Class representing an aura with effects on leveled objects.
 */
export class Aura {
  /**
   * @type {LeveledObject}
   */
  #owner;

  /**
   * Get the owner of the aura.
   * @returns {LeveledObject} - The owner of the aura.
   */
  get owner() {
    return this.#owner;
  }

  /**
   * @type {Set<LeveledObject>}
   */
  #allies = new Set();

  /**
   * Get the allies affected by the aura.
   * @returns {Set<LeveledObject>} - The allies affected by the aura.
   */
  get allies() {
    return this.#allies;
  }

  /**
   * @type {Set<LeveledObject>}
   */
  #enemies = new Set();

  /**
   * Get the enemies affected by the aura.
   * @returns {Set<LeveledObject>} - The enemies affected by the aura.
   */
  get enemies() {
    return this.#enemies;
  }

  #effect;

  /**
   * Get the effect function of the aura.
   * @returns {function} - The effect function of the aura.
   */
  get effect() {
    return () => this.#effect(this.#owner, this.#allies, this.#enemies);
  }

  #name;

  /**
   * Get the name of the aura.
   * @returns {string} - The name of the aura.
   */
  get name() {
    return this.#name;
  }

  /**
   * Create an Aura.
   * @param {function} effect - The effect function of the aura.
   * @param {string} name - The name of the aura.
   * @param {LeveledObject} owner The owner of the aura.
   */
  constructor(effect, name, owner) {
    this.#effect = effect;
    this.#name = name;
    this.#owner = owner
  }
}

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
   * Increase experience points based on another leveled object, plus a random up to the 15% of the level * 100
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

