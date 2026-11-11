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