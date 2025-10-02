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
  healthPotion: { x: 2, y: 10 }, // Health potion sprite (bottle)
  gems: [
    { x: 10, y: 10 }, // Diamond gem
    { x: 11, y: 10 }, // Ruby gem
    { x: 12, y: 10 }, // Emerald gem
  ],
  floorTextures: [
    { x: 0, y: 6 },   // Floor texture variant 1
    { x: 1, y: 6 },   // Floor texture variant 2
    { x: 2, y: 6 },   // Floor texture variant 3
    { x: 3, y: 6 },   // Floor texture variant 4
    { x: 4, y: 6 },   // Floor texture variant 5
    { x: 5, y: 6 },   // Floor texture variant 6
  ],
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

  // Create sprite from tilesheet coordinates (always use 32x32 for cutting from original tilesheet)
  createSpriteFromTilesheet(coordX, coordY) {
    if (!this.textures.fulltilesheet) {
      console.error('Fulltilesheet not loaded');
      return null;
    }

    // Always use 32x32 for cutting from the original tilesheet
    const ORIGINAL_TILE_SIZE = 32;
    const texture = new PIXI.Texture(
      this.textures.fulltilesheet,
      new PIXI.Rectangle(coordX * ORIGINAL_TILE_SIZE, coordY * ORIGINAL_TILE_SIZE, ORIGINAL_TILE_SIZE, ORIGINAL_TILE_SIZE)
    );
    return texture;
  }

  // Create enemy sprite
  createEnemySprite(gridX, gridY, enemyType = 0, tileSize) {
    const enemyCoords = spriteCoords.enemies[enemyType] || spriteCoords.enemies[0];
    const texture = this.createSpriteFromTilesheet(enemyCoords.x, enemyCoords.y);
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
    const texture = this.createSpriteFromTilesheet(goldCoords.x, goldCoords.y);
    if (!texture) return null;
    
    const sprite = new PIXI.Sprite(texture);
    sprite.width = tileSize;
    sprite.height = tileSize;
    sprite.x = gridX * tileSize;
    sprite.y = gridY * tileSize;
    return sprite;
  }

  // Create health potion sprite
  createHealthPotionSprite(gridX, gridY, tileSize) {
    const potionCoords = spriteCoords.healthPotion;
    const texture = this.createSpriteFromTilesheet(potionCoords.x, potionCoords.y);
    if (!texture) return null;
    
    const sprite = new PIXI.Sprite(texture);
    sprite.width = tileSize;
    sprite.height = tileSize;
    sprite.x = gridX * tileSize;
    sprite.y = gridY * tileSize;
    return sprite;
  }

  // Create gem sprite (for additional collectibles)
  createGemSprite(gridX, gridY, gemType = 0, tileSize) {
    const gemCoords = spriteCoords.gems[gemType] || spriteCoords.gems[0];
    const texture = this.createSpriteFromTilesheet(gemCoords.x, gemCoords.y);
    if (!texture) return null;
    
    const sprite = new PIXI.Sprite(texture);
    sprite.width = tileSize;
    sprite.height = tileSize;
    sprite.x = gridX * tileSize;
    sprite.y = gridY * tileSize;
    return sprite;
  }

  // Create floor texture sprite
  createFloorTextureSprite(gridX, gridY, textureType = 0, tileSize) {
    const floorCoords = spriteCoords.floorTextures[textureType] || spriteCoords.floorTextures[0];
    const texture = this.createSpriteFromTilesheet(floorCoords.x, floorCoords.y);
    if (!texture) return null;
    
    const sprite = new PIXI.Sprite(texture);
    sprite.width = tileSize;
    sprite.height = tileSize;
    sprite.x = gridX * tileSize;
    sprite.y = gridY * tileSize;
    return sprite;
  }
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