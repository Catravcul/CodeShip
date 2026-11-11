import VaultEntity from "../domain/vault.entity";

/**
 * @class
 * @classdesc Represents a service for interacting with a vault entity.
 */
class VaultService {
  /**
   * Creates a new VaultService.
   * @param {VaultEntity} vault - The vault entity to interact with.
   * @param {StorageRepository} storageRepository - The repository for storing and retrieving data.
   */
  constructor(vault, storageRepository) {
    /**
     * The vault entity associated with the service.
     * @type {VaultEntity}
     */
    this.vault = vault;

    /**
     * The repository for storing and retrieving data.
     * @type {StorageRepository}
     */
    this.storageRepository = storageRepository;

    // Load data from storage during service initialization
    this.loadFromStorage();
  }

  /**
   * Increases the coins in the vault by the specified amount.
   * @param {number} amount - The amount of coins to increase.
   */
  increaseCoins(amount) {
    this.vault.increaseAmount(amount);
    this.saveToStorage();
  }

  /**
   * Decreases the coins in the vault by the specified amount.
   * @param {number} amount - The amount of coins to decrease.
   */
  decreaseCoins(amount) {
    this.vault.decreaseAmount(amount);
    this.saveToStorage();
  }

  /**
   * Gets the current balance of coins in the vault.
   * @returns {number} The current balance of coins.
   */
  getBalance() {
    return this.vault.getCoins();
  }

  /**
   * Saves the current vault data to storage.
   */
  saveToStorage() {
    const vaultData = {
      coins: this.vault.getCoins(),
    };
    this.storageRepository.save('vaultData', vaultData);
  }

  /**
   * Loads vault data from storage during service initialization.
   */
  loadFromStorage() {
    const savedData = this.storageRepository.load('vaultData');
    if (savedData) {
      this.vault = new VaultEntity(savedData.coins);
    }
  }
}

export default VaultService