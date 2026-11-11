hello there! show me please a react app, using react context, DDD and Hexagonal architecture, It is going to have a vault modal which has coins=0 able to increase and reduce the value of coins, a character and a spaceship modals which has a experience property, the experience model is going to start with a level = 1 and an experience amount = 0, to increase the level, the experience amount must reach 1000, 
and most have a method to increase the experience amount, the data most be persistant using the local storage


class VaultService {
  constructor(vault) {
    this.vault = vault;
  }

  increaseCoins(amount) {
    this.vault.increaseAmount(amount);
  }

  decreaseCoins(amount) {
    this.vault.decreaseAmount(amount);
  }

  getBalance() {
    return this.vault.getCoins();
  }
}

module.exports = VaultService;

class VaultEntity {
    
    constructor(coins = 0) {
      if (!Number.isInteger(coins) || coins < 0) {
        throw new Error("Initial coins must be a non-negative integer.");
      }
      this.coins = coins;
    }
  
    increaseAmount(amount) {
      if (!Number.isInteger(amount) || amount < 0) {
        throw new Error("Amount to increase must be a non-negative integer.");
      }
      this.coins += amount;
    }
  
    decreaseAmount(amount) {
      if (!Number.isInteger(amount) || amount < 0) {
        throw new Error("Amount to decrease must be a non-negative integer.");
      }
  
      if (amount > this.coins) {
        throw new Error("Insufficient funds to decrease.");
      }
  
      this.coins -= amount;
    }
  
    getCoins() {
      return this.coins;
    }
  }
  
  export default VaultEntity