import { Character } from './character.js';

// Player class extending Character
export class Player extends Character {
  constructor() {
    // Player stats: Health: 100, Damage: 20, Shield: 5
    super(100, 20, 5);
    this.goldCollected = 0;
    this.x = 0;
    this.y = 0;
    this.sprite = null;
  }

  // Player-specific methods
  collectGold(amount) {
    this.goldCollected += amount;
  }

  // Set player position
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  // Set player sprite
  setSprite(sprite) {
    this.sprite = sprite;
  }

  // Get player-specific stats
  getPlayerStats() {
    return {
      ...this.getStats(),
      gold: this.goldCollected,
      position: { x: this.x, y: this.y }
    };
  }

  // Reset player for new game
  reset() {
    this.health = this.maxHealth;
    this.isAlive = true;
    this.goldCollected = 0;
    this.x = 0;
    this.y = 0;
    this.sprite = null;
  }
}