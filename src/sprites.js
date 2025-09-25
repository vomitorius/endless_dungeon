import * as PIXI from 'pixi.js';

// Sprite coordinates in the fulltilesheet (32x32 tiles, coordinates are 0-based)
export const spriteCoords = {
  enemies: [
    { x: 0, y: 1 },   // First enemy type - second row, first column
    { x: 1, y: 1 },   // Second enemy type  
    { x: 2, y: 1 },   // Third enemy type
    { x: 3, y: 1 },   // Fourth enemy type
    { x: 4, y: 1 },   // Fifth enemy type
    { x: 5, y: 1 },   // Sixth enemy type
  ],
  gold: { x: 0, y: 10 }, // Gold coin sprite
};

// Texture management
export class SpriteManager {
  constructor() {
    this.textures = {};
    this.tileSize = 32;
  }

  // Load all textures
  async loadTextures() {
    try {
      // Load individual texture files for basic sprites
      const names = ['knight', 'wall', 'door', 'finish'];
      for (const name of names) {
        this.textures[name] = await PIXI.Assets.load(`/img/${name}.png`);
      }
      
      // Load the full tilesheet for enemies and gold
      this.textures.fulltilesheet = await PIXI.Assets.load('/img/fulltilesheet.png');
      console.log('Textures loaded successfully');
    } catch (error) {
      console.error('Error loading textures:', error);
      throw error;
    }
  }

  // Create sprite from tilesheet coordinates
  createSpriteFromTilesheet(coordX, coordY, tileSize = 32) {
    if (!this.textures.fulltilesheet) {
      console.error('Fulltilesheet not loaded');
      return null;
    }

    const baseTexture = this.textures.fulltilesheet.baseTexture;
    const rectangle = new PIXI.Rectangle(
      coordX * tileSize,
      coordY * tileSize,
      tileSize,
      tileSize,
    );
    return new PIXI.Texture(baseTexture, rectangle);
  }

  // Create enemy sprite
  createEnemySprite(gridX, gridY, enemyType = 0, tileSize) {
    const enemyCoords = spriteCoords.enemies[enemyType] || spriteCoords.enemies[0];
    const texture = this.createSpriteFromTilesheet(enemyCoords.x, enemyCoords.y, tileSize);
    if (!texture) return null;
    
    const sprite = new PIXI.Sprite(texture);
    sprite.width = tileSize;
    sprite.height = tileSize;
    sprite.x = gridX * tileSize;
    sprite.y = gridY * tileSize;
    return sprite;
  }

  // Create gold sprite
  createGoldSprite(gridX, gridY, tileSize) {
    const goldCoords = spriteCoords.gold;
    const texture = this.createSpriteFromTilesheet(goldCoords.x, goldCoords.y, tileSize);
    if (!texture) return null;
    
    const sprite = new PIXI.Sprite(texture);
    sprite.width = tileSize;
    sprite.height = tileSize;
    sprite.x = gridX * tileSize;
    sprite.y = gridY * tileSize;
    return sprite;
  }

  // Create generic sprite
  createSprite(type, gridX, gridY, tileSize) {
    // Use individual texture files for basic sprites (wall, door, knight, finish)
    if (this.textures[type]) {
      const sprite = new PIXI.Sprite(this.textures[type]);
      sprite.width = tileSize;
      sprite.height = tileSize;
      sprite.x = gridX * tileSize;
      sprite.y = gridY * tileSize;
      return sprite;
    } else {
      console.warn(`Texture not found for sprite type: ${type}`);
      return null;
    }
  }

  // Update tile size
  setTileSize(size) {
    this.tileSize = size;
  }

  // Get textures for external use
  getTextures() {
    return this.textures;
  }
}