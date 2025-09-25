import { Character } from './character.js';

// Enemy types with different stats
export const ENEMY_TYPES = {
  GOBLIN: {
    name: 'Goblin',
    health: 30,
    damage: 8,
    shield: 1,
    spriteIndex: 0,
    goldDrop: [10, 20, 30]
  },
  ORC: {
    name: 'Orc',
    health: 50,
    damage: 12,
    shield: 3,
    spriteIndex: 1,
    goldDrop: [20, 40, 60]
  },
  SKELETON: {
    name: 'Skeleton',
    health: 40,
    damage: 10,
    shield: 2,
    spriteIndex: 2,
    goldDrop: [15, 30, 45]
  },
  TROLL: {
    name: 'Troll',
    health: 80,
    damage: 18,
    shield: 6,
    spriteIndex: 3,
    goldDrop: [50, 100, 150]
  },
  DEMON: {
    name: 'Demon',
    health: 60,
    damage: 15,
    shield: 4,
    spriteIndex: 4,
    goldDrop: [30, 60, 90]
  },
  DRAGON: {
    name: 'Dragon',
    health: 120,
    damage: 25,
    shield: 8,
    spriteIndex: 5,
    goldDrop: [100, 200, 300]
  }
};

// Enemy class extending Character
export class Enemy extends Character {
  constructor(type, x, y) {
    const enemyType = ENEMY_TYPES[type] || ENEMY_TYPES.GOBLIN;
    super(enemyType.health, enemyType.damage, enemyType.shield);
    
    this.type = type;
    this.name = enemyType.name;
    this.spriteIndex = enemyType.spriteIndex;
    this.goldDrop = enemyType.goldDrop;
    this.x = x;
    this.y = y;
    this.sprite = null;
  }

  // Get random gold drop amount
  getGoldDrop() {
    const dropAmounts = this.goldDrop;
    return dropAmounts[Math.floor(Math.random() * dropAmounts.length)];
  }

  // Set enemy sprite
  setSprite(sprite) {
    this.sprite = sprite;
  }

  // Get enemy info for display
  getEnemyInfo() {
    return {
      ...this.getStats(),
      name: this.name,
      type: this.type,
      position: { x: this.x, y: this.y },
      spriteIndex: this.spriteIndex
    };
  }

  // Get a random enemy type
  static getRandomType() {
    const types = Object.keys(ENEMY_TYPES);
    return types[Math.floor(Math.random() * types.length)];
  }
}