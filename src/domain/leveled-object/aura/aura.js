import { LeveledObject } from "..";

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