import CharacterEntity from "../domain/character.entity";

/**
 * @class
 * @classdesc Represents a service for interacting with a character entity.
 */
class CharacterService {
    /**
     * Creates a new CharacterService.
     * @param {CharacterEntity} character - The character entity to interact with.
     * @param {LocalStorageRepository} storageRepository - The repository for storing and retrieving character data using local storage.
     */
    constructor(character, storageRepository) {
      /**
       * The character entity associated with the service.
       * @type {CharacterEntity}
       */
      this.character = character;
  
      /**
       * The repository for storing and retrieving character data using local storage.
       * @type {LocalStorageRepository}
       */
      this.storageRepository = storageRepository;
  
      // Load character data from storage during service initialization
      this.loadFromStorage();
    }
  
    /**
     * Increments the character's experience points by the specified amount.
     * @param {number} amount - The amount of experience points to increment.
     */
    incrementExperiencePoints(amount) {
      this.character.incrementExperiencePoints(amount);
      this.saveToStorage();
    }
  
    /**
     * Gets the current level of the character.
     * @returns {number} The current level.
     */
    getLevel() {
      return this.character.getLevel();
    }
  
    /**
     * Gets the current experience points of the character.
     * @returns {number} The current experience points.
     */
    getExperiencePoints() {
      return this.character.getExperiencePoints();
    }
  
    /**
     * Saves the current character data to local storage.
     */
    saveToStorage() {
      const characterData = {
        level: this.character.getLevel(),
        experiencePoints: this.character.getExperiencePoints(),
      };
      this.storageRepository.save(characterData);
    }
  
    /**
     * Loads character data from local storage during service initialization.
     */
    loadFromStorage() {
      const savedData = this.storageRepository.load();
      if (savedData) {
        this.character = new CharacterEntity();
        this.character.level = savedData.level;
        this.character.experiencePoints = savedData.experiencePoints;
      }
    }
  }

  export default CharacterService