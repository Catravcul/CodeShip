import SpaceshipEntity from "../domain/spaceship.entity";

/**
 * @class
 * @classdesc Represents a service for interacting with a spaceship entity.
 */
class SpaceshipService {
    /**
     * Creates a new SpaceshipService.
     * @param {SpaceshipEntity} spaceship - The spaceship entity to interact with.
     * @param {LocalStorageRepository} storageRepository - The repository for storing and retrieving spaceship data using local storage.
     */
    constructor(spaceship, storageRepository) {
      /**
       * The spaceship entity associated with the service.
       * @type {SpaceshipEntity}
       */
      this.spaceship = spaceship;
  
      /**
       * The repository for storing and retrieving spaceship data using local storage.
       * @type {LocalStorageRepository}
       */
      this.storageRepository = storageRepository;
  
      // Load spaceship data from storage during service initialization
      this.loadFromStorage();
    }
  
    /**
     * Increments the spaceship's experience points by the specified amount.
     * @param {number} amount - The amount of experience points to increment.
     */
    incrementExperiencePoints(amount) {
      this.spaceship.incrementExperiencePoints(amount);
      this.saveToStorage();
    }
  
    /**
     * Gets the current level of the spaceship.
     * @returns {number} The current level.
     */
    getLevel() {
      return this.spaceship.getLevel();
    }
  
    /**
     * Gets the current experience points of the spaceship.
     * @returns {number} The current experience points.
     */
    getExperiencePoints() {
      return this.spaceship.getExperiencePoints();
    }
  
    /**
     * Saves the current spaceship data to local storage.
     */
    saveToStorage() {
      const spaceshipData = {
        level: this.spaceship.getLevel(),
        experiencePoints: this.spaceship.getExperiencePoints(),
      };
      this.storageRepository.save(spaceshipData);
    }
  
    /**
     * Loads spaceship data from local storage during service initialization.
     */
    loadFromStorage() {
      const savedData = this.storageRepository.load();
      if (savedData) {
        this.spaceship = new SpaceshipEntity();
        this.spaceship.level = savedData.level;
        this.spaceship.experiencePoints = savedData.experiencePoints;
      }
    }
  }

  export default SpaceshipService