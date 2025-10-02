import * as PIXI from 'pixi.js';
import Dungeoneer from 'dungeoneer';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Combat } from './combat.js';
import { SpriteManager } from './sprites.js';
import { MovementSystem } from './movement.js';
import { getResponsiveCanvasSize, calculateTileSize, generateRandomGold, getDirectionFromKeyCode } from './utils.js';

// Core game variables
let app;
let mapContainer;
let dungeon = null;
let tileSize = 32;
let speed = tileSize;
let currentLevel = 1; // Track current level
let isGameOver = false; // Prevent double game over triggers

// Game systems
let player = null;
let enemies = [];
let goldItems = [];
let healthPotions = []; // Add health potions array
let spriteManager = null;
let movementSystem = null;
let combatSystem = null;
let enemyAI = null;

// UI and interaction
let isAttacking = false;
let touchStartX = null;
let touchStartY = null;

// Canvas management
function setResponsiveCanvasSize() {
  const { width, height } = getResponsiveCanvasSize();
  app.renderer.resize(width, height);
  const canvasElement = app.view;
  if (canvasElement && canvasElement.style) {
    canvasElement.style.maxWidth = '100%';
    canvasElement.style.height = 'auto';
  }
}

// Enemy AI system for Diablo-like movement
class EnemyAI {
  constructor() {
    this.moveInterval = 1000; // Move every 1 second
    this.lastMoveTime = 0;
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    this.update();
  }

  stop() {
    this.isRunning = false;
  }

  update() {
    if (!this.isRunning || !player || !dungeon) {
      if (this.isRunning) {
        setTimeout(() => this.update(), 100);
      }
      return;
    }

    const currentTime = Date.now();
    if (currentTime - this.lastMoveTime >= this.moveInterval) {
      this.moveEnemies();
      this.lastMoveTime = currentTime;
    }

    setTimeout(() => this.update(), 100);
  }

  moveEnemies() {
    const playerGridX = Math.floor(player.x / tileSize);
    const playerGridY = Math.floor(player.y / tileSize);

    enemies.forEach(enemy => {
      if (!enemy.isAlive) return;

      // Calculate distance to player
      const distance = Math.abs(enemy.x - playerGridX) + Math.abs(enemy.y - playerGridY);
      
      // Only move if player is within 8 tiles (visible range)
      if (distance <= 8) {
        this.moveEnemyTowardsPlayer(enemy, playerGridX, playerGridY);
      }
    });
    
    // Clean up orphaned health bars after enemy movement
    if (combatSystem) {
      combatSystem.cleanupOrphanedHealthBars();
    }
  }

  moveEnemyTowardsPlayer(enemy, playerGridX, playerGridY) {
    const dx = playerGridX - enemy.x;
    const dy = playerGridY - enemy.y;

    // If adjacent to player, attack instead of move
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
      this.enemyAttackPlayer(enemy);
      return;
    }

    // Calculate next move
    let targetX = enemy.x;
    let targetY = enemy.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      targetX += dx > 0 ? 1 : -1;
    } else if (dy !== 0) {
      targetY += dy > 0 ? 1 : -1;
    }

    // Check if target position is valid
    if (this.canMoveToPosition(targetX, targetY, enemy)) {
      enemy.x = targetX;
      enemy.y = targetY;
      if (enemy.sprite) {
        enemy.sprite.x = targetX * tileSize;
        enemy.sprite.y = targetY * tileSize;
      }
    }
  }

  canMoveToPosition(x, y, movingEnemy) {
    // Check bounds
    if (x < 0 || x >= dungeon.tiles.length || y < 0 || y >= dungeon.tiles[0].length) {
      return false;
    }

    // Check if tile is walkable
    const tileType = dungeon.tiles[x][y].type;
    if (tileType === 'wall') {
      return false;
    }

    // Check if another enemy is already there
    const enemyAtPos = enemies.find(enemy => 
      enemy !== movingEnemy && enemy.x === x && enemy.y === y && enemy.isAlive
    );
    if (enemyAtPos) {
      return false;
    }

    // Check if player is there (they can occupy same space for combat)
    const playerGridX = Math.floor(player.x / tileSize);
    const playerGridY = Math.floor(player.y / tileSize);
    if (x === playerGridX && y === playerGridY) {
      return false;
    }

    return true;
  }

  async enemyAttackPlayer(enemy) {
    // Enemy attacks player - simulate combat
    console.log(`${enemy.name} attacks player!`);
    
    // Show enemy health bar during attack
    if (combatSystem) {
      combatSystem.showEnemyHealthBar(enemy);
      combatSystem.recentCombatEnemies.add(enemy);
      
      // Hide health bar after a delay if enemy moves away
      setTimeout(() => {
        const playerGridX = Math.floor(player.x / tileSize);
        const playerGridY = Math.floor(player.y / tileSize);
        const distance = Math.abs(enemy.x - playerGridX) + Math.abs(enemy.y - playerGridY);
        
        if (distance > 1) {
          combatSystem.hideEnemyHealthBar(enemy);
        }
        combatSystem.recentCombatEnemies.delete(enemy);
      }, 2000);
    }
    
    const damage = Math.max(1, enemy.damage - player.shield);
    const damageResult = player.takeDamage(damage);
    
    // Update health display
    updateHealthDisplay();
    
    if (!player.isAlive && !isGameOver) {
      console.log('Player defeated by enemy AI!');
      setTimeout(() => {
        showGameOverScreen();
      }, 500);
    }
  }
}

function placeFinishTile() {
  if (!dungeon) return;
  
  // Find a random floor tile far from player
  const floorTiles = [];
  const playerGridX = Math.floor(player.x / tileSize);
  const playerGridY = Math.floor(player.y / tileSize);
  
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      if (dungeon.tiles[i][j].type === 'floor') {
        const distance = Math.abs(i - playerGridX) + Math.abs(j - playerGridY);
        if (distance > 5) { // At least 5 tiles away
          floorTiles.push({ x: i, y: j });
        }
      }
    }
  }
  
  if (floorTiles.length > 0) {
    const finishTile = floorTiles[Math.floor(Math.random() * floorTiles.length)];
    dungeon.tiles[finishTile.x][finishTile.y].type = 'finish';
    const finishSprite = spriteManager.createSprite('finish', finishTile.x, finishTile.y, tileSize);
    if (finishSprite) {
      mapContainer.addChild(finishSprite);
    }
  }
}

async function startGame() {
  tileSize = calculateTileSize();
  speed = tileSize;
  setResponsiveCanvasSize();

  // Initialize game systems
  if (!spriteManager) {
    spriteManager = new SpriteManager();
    await spriteManager.loadTextures();
  }
  
  if (!movementSystem) {
    movementSystem = new MovementSystem();
  }
  
  if (!combatSystem) {
    combatSystem = new Combat();
  }
  
  if (!enemyAI) {
    enemyAI = new EnemyAI();
  }
  
  spriteManager.setTileSize(tileSize);
  
  // Create or update gold counter display
  updateGoldDisplay();

  const maxTilesWidth = Math.floor(app.renderer.width / tileSize);
  const maxTilesHeight = Math.floor(app.renderer.height / tileSize);

  const dungeonWidth = Math.max(
    15,
    2 * Math.floor((maxTilesWidth - 1) / 2) + 1,
  );
  const dungeonHeight = Math.max(
    11,
    2 * Math.floor((maxTilesHeight - 1) / 2) + 1,
  );

  dungeon = Dungeoneer.build({
    width: dungeonWidth,
    height: dungeonHeight,
  });

  mapContainer.removeChildren();
  
  // Initialize player if not exists
  if (!player) {
    player = new Player();
  } else {
    player.reset();
  }
  
  enemies = [];
  goldItems = [];
  healthPotions = []; // Reset health potions

  let playerPlaced = false;
  
  // Place walls and doors with some variations
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      const tile = dungeon.tiles[i][j].type;
      if (tile === 'wall') {
        // 20% chance to use a wall variation
        if (Math.random() < 0.2) {
          const variationType = Math.floor(Math.random() * 3);
          const sprite = spriteManager.createWallVariationSprite(i, j, variationType, tileSize);
          if (sprite) {
            mapContainer.addChild(sprite);
          }
        } else {
          const sprite = spriteManager.createSprite(tile, i, j, tileSize);
          if (sprite) {
            mapContainer.addChild(sprite);
          }
        }
      } else if (tile === 'door') {
        const sprite = spriteManager.createSprite(tile, i, j, tileSize);
        if (sprite) {
          mapContainer.addChild(sprite);
        }
      } else if (tile === 'floor') {
        // 10% chance to add floor decoration
        if (Math.random() < 0.1) {
          const decorationType = Math.floor(Math.random() * 5);
          const sprite = spriteManager.createFloorDecorationSprite(i, j, decorationType, tileSize);
          if (sprite) {
            mapContainer.addChild(sprite);
          }
        }
      }
    }
  }

  // Place player in first available floor tile
  for (let i = 0; i < dungeon.tiles.length && !playerPlaced; i++) {
    for (let j = 0; j < dungeon.tiles[i].length && !playerPlaced; j++) {
      if (dungeon.tiles[i][j].type === 'floor') {
        playerPlaced = true;
        player.setPosition(i * tileSize, j * tileSize);
        const knightSprite = spriteManager.createSprite('knight', i, j, tileSize);
        if (knightSprite) {
          player.setSprite(knightSprite);
          mapContainer.addChild(knightSprite);
        }
      }
    }
  }

  // Place enemies on random floor tiles
  const floorTiles = [];
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      if (dungeon.tiles[i][j].type === 'floor') {
        // Don't place enemy where player is
        const playerGridX = Math.floor(player.x / tileSize);
        const playerGridY = Math.floor(player.y / tileSize);
        if (!(i === playerGridX && j === playerGridY)) {
          floorTiles.push({ x: i, y: j });
        }
      }
    }
  }

  // Place 3-5 enemies randomly with varied types
  const numEnemies = Math.min(Math.floor(Math.random() * 3) + 3, floorTiles.length);
  for (let i = 0; i < numEnemies; i++) {
    const randomIndex = Math.floor(Math.random() * floorTiles.length);
    const tile = floorTiles.splice(randomIndex, 1)[0];
    const enemyType = Enemy.getRandomType();
    
    const enemy = new Enemy(enemyType, tile.x, tile.y);
    const enemySprite = spriteManager.createEnemySprite(tile.x, tile.y, enemy.spriteIndex, tileSize);
    if (enemySprite) {
      enemy.setSprite(enemySprite);
      mapContainer.addChild(enemySprite);
    }
    
    enemies.push(enemy);
  }

  // Place health potions randomly on the map (2-3 potions per level)
  const remainingFloorTiles = [];
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      if (dungeon.tiles[i][j].type === 'floor') {
        // Don't place where player is
        const playerGridX = Math.floor(player.x / tileSize);
        const playerGridY = Math.floor(player.y / tileSize);
        // Don't place where enemies are
        const enemyAtPos = enemies.find(enemy => enemy.x === i && enemy.y === j);
        if (!(i === playerGridX && j === playerGridY) && !enemyAtPos) {
          remainingFloorTiles.push({ x: i, y: j });
        }
      }
    }
  }

  // Place 2-3 health potions randomly
  const numPotions = Math.min(Math.floor(Math.random() * 2) + 2, remainingFloorTiles.length);
  for (let i = 0; i < numPotions; i++) {
    const randomIndex = Math.floor(Math.random() * remainingFloorTiles.length);
    const tile = remainingFloorTiles.splice(randomIndex, 1)[0];
    
    const potion = {
      x: tile.x,
      y: tile.y,
      healAmount: 25 + Math.floor(Math.random() * 26), // Heal 25-50 HP
      sprite: null
    };
    
    const potionSprite = spriteManager.createHealthPotionSprite(tile.x, tile.y, tileSize);
    if (potionSprite) {
      potion.sprite = potionSprite;
      mapContainer.addChild(potionSprite);
    }
    
    healthPotions.push(potion);
  }

  // Place gems randomly on the map (3-5 gems per level for additional gold)
  const numGems = Math.min(Math.floor(Math.random() * 3) + 3, remainingFloorTiles.length);
  for (let i = 0; i < numGems; i++) {
    const randomIndex = Math.floor(Math.random() * remainingFloorTiles.length);
    const tile = remainingFloorTiles.splice(randomIndex, 1)[0];
    const gemType = Math.floor(Math.random() * 3); // Random gem type (0-2)
    
    // Gems give more gold than regular drops
    const gemGoldAmounts = [100, 200, 500]; // Diamond, Ruby, Emerald
    const goldAmount = gemGoldAmounts[gemType];
    
    const gemSprite = spriteManager.createGemSprite(tile.x, tile.y, gemType, tileSize);
    if (gemSprite) {
      const gemItem = {
        x: tile.x,
        y: tile.y,
        amount: goldAmount,
        sprite: gemSprite
      };
      goldItems.push(gemItem);
      mapContainer.addChild(gemSprite);
    }
  }

  // Note: Finish tile will be placed when all enemies are defeated
  
  // Start enemy AI system
  enemyAI.start();

  app.ticker.add(() => {
    if (player && player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      
      // Handle movement systems
      movementSystem.handleSmoothMovement(triggerSingleStepMovement);
      movementSystem.handleAutoMovement(
        triggerSingleStepMovement,
        Math.floor(player.x / tileSize),
        Math.floor(player.y / tileSize)
      );
    }
  });
}

async function triggerSingleStepMovement(direction) {
  if (!player || !player.sprite || !dungeon) {
    return;
  }

  let newX = player.x;
  let newY = player.y;

  switch (direction) {
    case 'left':
      newX = player.x - speed;
      break;
    case 'right':
      newX = player.x + speed;
      break;
    case 'up':
      newY = player.y - speed;
      break;
    case 'down':
      newY = player.y + speed;
      break;
  }

  const moveX = Math.floor(newX / tileSize);
  const moveY = Math.floor(newY / tileSize);

  // Check bounds
  if (moveX < 0 || moveX >= dungeon.tiles.length || 
      moveY < 0 || moveY >= dungeon.tiles[0].length) {
    return;
  }

  const tileType = dungeon.tiles[moveX][moveY].type;
  
  // Check if there's an enemy at this position
  const enemyIndex = enemies.findIndex(enemy => enemy.x === moveX && enemy.y === moveY);
  
  if (enemyIndex !== -1) {
    // Combat with enemy
    const enemy = enemies[enemyIndex];
    const combatResult = await combatSystem.performCombat(player, enemy);
    
    if (combatResult && combatResult.winner === 'player') {
      // Player won - remove enemy and drop gold on adjacent tile
      mapContainer.removeChild(enemy.sprite);
      enemies.splice(enemyIndex, 1);
      
      // Player moves to the tile (no automatic gold collection)
      player.setPosition(newX, newY);
      
      // Drop gold on an adjacent tile instead of giving it automatically
      dropGold(moveX, moveY, true);
      
      // Check if all enemies defeated
      if (enemies.length === 0) {
        placeFinishTile();
      }
      
      updateGoldDisplay();
    } else if (combatResult && combatResult.winner === 'enemy') {
      // Update health display after taking damage
      updateHealthDisplay();
      // Player lost the combat but check if they're actually dead
      if ((!player.isAlive || player.health <= 0) && !isGameOver) {
        // Player is actually defeated - show game over screen
        console.log('Player defeated! Game over.');
        setTimeout(() => {
          showGameOverScreen();
        }, 500);
      } else {
        // Player survived but took damage - continue game
        console.log(`Player lost combat but survived with ${player.health} health`);
      }
    }
    
    return;
  }
  
  // Regular movement to empty tiles
  if (tileType === 'floor' || tileType === 'door' || tileType === 'finish') {
    // Check for gold and health potion collection first
    collectGold(moveX, moveY);
    collectHealthPotion(moveX, moveY);
    
    player.setPosition(newX, newY);
    
    // Clean up health bars when player moves
    if (combatSystem) {
      combatSystem.cleanupOrphanedHealthBars();
    }

    if (tileType === 'finish') {
      // Level completed - advance to next level silently
      currentLevel++;
      console.log(`Level ${currentLevel-1} completed! Advancing to level ${currentLevel}`);
      setTimeout(() => {
        startGame();
      }, 100);
    }
  }
}

// Sword attack function for adjacent enemies
async function triggerSwordAttack() {
  if (!player || !player.sprite || !dungeon || isAttacking) {
    return;
  }
  
  // Brief visual indication of attack
  isAttacking = true;
  setTimeout(() => {
    isAttacking = false;
  }, 300);
  
  // Check all adjacent tiles for enemies
  const playerGridX = Math.floor(player.x / tileSize);
  const playerGridY = Math.floor(player.y / tileSize);
  
  const adjacentPositions = [
    { x: playerGridX - 1, y: playerGridY }, // left
    { x: playerGridX + 1, y: playerGridY }, // right
    { x: playerGridX, y: playerGridY - 1 }, // up
    { x: playerGridX, y: playerGridY + 1 }, // down
  ];
  
  // Find first adjacent enemy and attack it
  for (const pos of adjacentPositions) {
    const enemyIndex = enemies.findIndex(enemy => enemy.x === pos.x && enemy.y === pos.y);
    if (enemyIndex !== -1) {
      const enemy = enemies[enemyIndex];
      const combatResult = await combatSystem.performCombat(player, enemy);
      
      if (combatResult && combatResult.winner === 'player') {
        // Player won - remove enemy and drop gold on adjacent tile
        mapContainer.removeChild(enemy.sprite);
        enemies.splice(enemyIndex, 1);
        
        // Drop gold on an adjacent tile instead of giving it automatically
        dropGold(pos.x, pos.y, true);
        
        // Check if all enemies defeated
        if (enemies.length === 0) {
          placeFinishTile();
        }
        
        updateGoldDisplay();
      } else if (combatResult && combatResult.winner === 'enemy') {
        // Update health display after taking damage
        updateHealthDisplay();
        // Player lost the combat but check if they're actually dead
        if ((!player.isAlive || player.health <= 0) && !isGameOver) {
          // Player is actually defeated - show game over screen
          console.log('Player defeated! Game over.');
          setTimeout(() => {
            showGameOverScreen();
          }, 500);
        } else {
          // Player survived but took damage - continue game
          console.log(`Player lost combat but survived with ${player.health} health`);
        }
      }
      
      break; // Only attack one enemy per sword strike
    }
  }
}

function dropGold(gridX, gridY, useAdjacentTile = false) {
  let targetX = gridX;
  let targetY = gridY;
  
  // If useAdjacentTile is true, find an adjacent empty tile
  if (useAdjacentTile) {
    const adjacentTile = findAdjacentEmptyTile(gridX, gridY);
    if (adjacentTile) {
      targetX = adjacentTile.x;
      targetY = adjacentTile.y;
    }
    // If no adjacent tile found, fall back to original position
  }
  
  const goldAmount = generateRandomGold();
  const goldSprite = spriteManager.createGoldSprite(targetX, targetY, tileSize);
  if (goldSprite) {
    const goldItem = {
      x: targetX,
      y: targetY,
      amount: goldAmount,
      sprite: goldSprite
    };
    goldItems.push(goldItem);
    mapContainer.addChild(goldSprite);
  }
}

// Find an adjacent empty tile for dropping gold
function findAdjacentEmptyTile(gridX, gridY) {
  const adjacentPositions = [
    { x: gridX - 1, y: gridY },     // left
    { x: gridX + 1, y: gridY },     // right  
    { x: gridX, y: gridY - 1 },     // up
    { x: gridX, y: gridY + 1 },     // down
    { x: gridX - 1, y: gridY - 1 }, // up-left
    { x: gridX + 1, y: gridY - 1 }, // up-right
    { x: gridX - 1, y: gridY + 1 }, // down-left
    { x: gridX + 1, y: gridY + 1 }  // down-right
  ];
  
  // Shuffle the positions to get random selection
  for (let i = adjacentPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [adjacentPositions[i], adjacentPositions[j]] = [adjacentPositions[j], adjacentPositions[i]];
  }
  
  for (const pos of adjacentPositions) {
    // Check if position is within bounds
    if (pos.x < 0 || pos.x >= dungeon.tiles.length ||
        pos.y < 0 || pos.y >= dungeon.tiles[0].length) {
      continue;
    }
    
    const tileType = dungeon.tiles[pos.x][pos.y].type;
    
    // Check if tile is walkable (floor or door)
    if (tileType !== 'floor' && tileType !== 'door') {
      continue;
    }
    
    // Check if there's already an enemy at this position
    const enemyAtPos = enemies.find(enemy => enemy.x === pos.x && enemy.y === pos.y);
    if (enemyAtPos) {
      continue;
    }
    
    // Check if there's already gold at this position
    const goldAtPos = goldItems.find(gold => gold.x === pos.x && gold.y === pos.y);
    if (goldAtPos) {
      continue;
    }
    
    // This position is suitable
    return pos;
  }
  
  return null; // No suitable adjacent tile found
}

function collectGold(gridX, gridY) {
  const goldIndex = goldItems.findIndex(gold => gold.x === gridX && gold.y === gridY);
  if (goldIndex !== -1) {
    const gold = goldItems[goldIndex];
    player.collectGold(gold.amount);
    mapContainer.removeChild(gold.sprite);
    goldItems.splice(goldIndex, 1);
    updateGoldDisplay();
    return true;
  }
  return false;
}

function collectHealthPotion(gridX, gridY) {
  const potionIndex = healthPotions.findIndex(potion => potion.x === gridX && potion.y === gridY);
  if (potionIndex !== -1) {
    const potion = healthPotions[potionIndex];
    
    // Heal the player
    const oldHealth = player.health;
    player.heal(potion.healAmount);
    const actualHealing = player.health - oldHealth;
    
    // Remove potion from map
    mapContainer.removeChild(potion.sprite);
    healthPotions.splice(potionIndex, 1);
    
    // Update health display
    updateHealthDisplay();
    
    // Show healing effect message
    console.log(`Healed ${actualHealing} HP! Current health: ${player.health}/${player.maxHealth}`);
    
    return true;
  }
  return false;
}

function updateGlobalDebugVars() {
  if (typeof window !== 'undefined') {
    window.player = player;
    window.enemies = enemies;
    window.goldItems = goldItems;
    window.healthPotions = healthPotions;
    window.combatSystem = combatSystem;
    window.tileSize = tileSize;
    window.dungeon = dungeon;
    window.movementSystem = movementSystem;
  }
}

function updateGoldDisplay() {
  // Update the gold counter in the UI
  let goldDisplay = document.getElementById('gold-display');
  if (!goldDisplay) {
    // Create gold display element
    goldDisplay = document.createElement('div');
    goldDisplay.id = 'gold-display';
    goldDisplay.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: rgba(139, 69, 19, 0.9);
      color: gold;
      padding: 8px 15px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      border: 2px solid #654321;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(goldDisplay);
  }
  const goldCount = player ? player.goldCollected : 0;
  goldDisplay.textContent = `💰 Gold: ${goldCount}`;
  updateGlobalDebugVars();
}

// Create player health display with level counter
function updateHealthDisplay() {
  let healthDisplay = document.getElementById('health-display');
  if (!healthDisplay) {
    healthDisplay = document.createElement('div');
    healthDisplay.id = 'health-display';
    healthDisplay.style.cssText = `
      position: fixed;
      top: 110px;
      right: 20px;
      background: rgba(139, 0, 0, 0.9);
      color: white;
      padding: 8px 15px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      border: 2px solid #8B0000;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      min-width: 120px;
    `;
    document.body.appendChild(healthDisplay);
  }
  
  if (player) {
    const healthPercentage = player.getHealthPercentage();
    const healthColor = healthPercentage > 0.6 ? '#00ff00' : 
                       healthPercentage > 0.3 ? '#ffff00' : '#ff0000';
    
    healthDisplay.innerHTML = `
      <div>🏰 Level: ${currentLevel}</div>
      <div style="margin-top: 4px;">❤️ Health: ${player.health}/${player.maxHealth}</div>
      <div style="width: 100px; height: 6px; background: #333; border-radius: 3px; margin-top: 4px;">
        <div style="width: ${healthPercentage * 100}%; height: 100%; background: ${healthColor}; border-radius: 3px; transition: width 0.3s ease, background-color 0.3s ease;"></div>
      </div>
    `;
  }
}

function showGameOverScreen() {
  // Prevent multiple game over screens
  if (isGameOver) return;
  isGameOver = true;
  
  // Create game over overlay
  let gameOverScreen = document.getElementById('game-over-screen');
  if (!gameOverScreen) {
    gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 3000;
      font-family: 'Courier New', monospace;
      text-align: center;
    `;
    document.body.appendChild(gameOverScreen);
  }

  gameOverScreen.innerHTML = `
    <h1 style="color: #ff0000; font-size: 48px; margin-bottom: 20px;">💀 GAME OVER 💀</h1>
    <p style="font-size: 24px; margin-bottom: 10px;">You reached level ${currentLevel}</p>
    <p style="font-size: 18px; margin-bottom: 30px; color: #ffff00;">Gold collected: ${player ? player.goldCollected : 0}</p>
    <button id="try-again-btn" style="
      padding: 15px 30px;
      font-size: 18px;
      background: #8B0000;
      color: white;
      border: 2px solid #ff0000;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-weight: bold;
    ">Try Again</button>
  `;
  
  // Add click event listener to the button
  const tryAgainBtn = gameOverScreen.querySelector('#try-again-btn');
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener('click', () => {
      // Disable button to prevent multiple clicks
      tryAgainBtn.disabled = true;
      tryAgainBtn.style.opacity = '0.5';
      tryAgainBtn.textContent = 'Loading...';
      
      // Small delay to prevent race conditions
      setTimeout(() => {
        resetGame();
      }, 100);
    });
  }
  
  gameOverScreen.style.display = 'flex';
}

function hideGameOverScreen() {
  const gameOverScreen = document.getElementById('game-over-screen');
  if (gameOverScreen) {
    gameOverScreen.style.display = 'none';
  }
}

function resetGame() {
  // Hide game over screen
  hideGameOverScreen();
  
  // Reset game over flag
  isGameOver = false;
  
  // Reset level counter
  currentLevel = 1;
  
  if (player) {
    player.reset();
  }
  dungeon = null;
  enemies = [];
  goldItems = [];
  healthPotions = []; // Reset health potions
  isAttacking = false;
  
  if (movementSystem) {
    movementSystem.clearPressedKeys();
    movementSystem.stopAllMovement();
  }
  
  if (combatSystem) {
    combatSystem.cleanupHealthBars();
  }
  
  if (enemyAI) {
    enemyAI.stop();
  }
  
  mapContainer.removeChildren();
  
  // Reset displays
  updateGoldDisplay();
  updateHealthDisplay();
  
  // Restart game
  startGame();
}

// Event listeners
document.addEventListener('keydown', (e) => {
  if (!movementSystem) return;
  
  const direction = getDirectionFromKeyCode(e.code);
  if (direction) {
    movementSystem.addPressedKey(e.code);
    if (!movementSystem.isCurrentlyMoving()) {
      movementSystem.startSmoothMovement(direction);
    }
  }
  
  switch (e.code) {
    case 'Space':
      triggerSwordAttack();
      break;
  }
  e.preventDefault();
});

document.addEventListener('keyup', (e) => {
  if (!movementSystem) return;
  
  movementSystem.removePressedKey(e.code);
  
  // If no movement keys are pressed, stop smooth movement
  const movementKeys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  const hasMovementKey = movementKeys.some(key => movementSystem.hasPressedKey(key));
  
  if (!hasMovementKey) {
    movementSystem.stopSmoothMovement();
  }
  
  e.preventDefault();
});

// Initialize game
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded event fired');
  
  try {
    app = new PIXI.Application({
      view: document.getElementById('c'),
      background: '#3C3C3C',
    });
    console.log('PIXI Application created:', app);
    
    mapContainer = new PIXI.Container();
    app.stage.addChild(mapContainer);
    
    // Make globally accessible for debugging
    window.app = app;
    window.mapContainer = mapContainer;
    window.player = player;
    window.enemies = enemies;
    window.goldItems = goldItems;
    window.dropGold = dropGold;
    window.collectGold = collectGold;
    updateGlobalDebugVars();
    
    setResponsiveCanvasSize();
    console.log('Starting Endless Dungeon...');
    await startGame();
    
    // Start health display updates
    setInterval(updateHealthDisplay, 100);
    
  } catch (error) {
    console.error('Error initializing game:', error);
  }
});

// Generate new dungeon button
const generateButton = document.getElementById('generate');
generateButton?.addEventListener('click', () => {
  startGame();
});

// Canvas touch/mouse interactions
const canvasElement = document.getElementById('c');
canvasElement.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasElement.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    touchStartY = touch.clientY - rect.top;
  },
  { passive: false },
);

canvasElement.addEventListener(
  'touchend',
  (e) => {
    e.preventDefault();
    if (touchStartX === null || touchStartY === null) return;

    const touch = e.changedTouches[0];
    const rect = canvasElement.getBoundingClientRect();
    const touchEndX = touch.clientX - rect.left;
    const touchEndY = touch.clientY - rect.top;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const minSwipeDistance = 30;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          triggerSingleStepMovement('left');
        } else {
          triggerSingleStepMovement('right');
        }
      }
    } else {
      if (Math.abs(diffY) > minSwipeDistance) {
        if (diffY > 0) {
          triggerSingleStepMovement('up');
        } else {
          triggerSingleStepMovement('down');
        }
      }
    }

    touchStartX = null;
    touchStartY = null;
  },
  { passive: false },
);

// Mouse click pathfinding
canvasElement.addEventListener('pointerdown', (e) => {
  if (!player || !player.sprite || !dungeon || !movementSystem) return;
  
  const rect = canvasElement.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  const targetGridX = Math.floor(clickX / tileSize);
  const targetGridY = Math.floor(clickY / tileSize);
  
  // Check if target is within bounds
  if (targetGridX < 0 || targetGridX >= dungeon.tiles.length ||
      targetGridY < 0 || targetGridY >= dungeon.tiles[0].length) {
    return;
  }
  
  const targetTileType = dungeon.tiles[targetGridX][targetGridY].type;
  const enemyAtTarget = enemies.find(enemy => enemy.x === targetGridX && enemy.y === targetGridY);
  
  // Allow movement to walkable tiles OR tiles with enemies
  if (targetTileType === 'floor' || targetTileType === 'door' || targetTileType === 'finish' || enemyAtTarget) {
    const currentGridX = Math.floor(player.x / tileSize);
    const currentGridY = Math.floor(player.y / tileSize);
    
    // Start auto movement
    movementSystem.startAutoMovement(
      targetGridX, 
      targetGridY, 
      currentGridX, 
      currentGridY, 
      dungeon, 
      enemies
    );
  }
});

// Virtual gamepad support
const dpadButtons = document.querySelectorAll('.dpad-btn');
dpadButtons.forEach(button => {
  const direction = button.getAttribute('data-direction');
  if (direction) {
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      button.classList.add('active');
      if (movementSystem) {
        movementSystem.startSmoothMovement(direction);
      }
    });
    
    button.addEventListener('pointerup', (e) => {
      e.preventDefault();
      button.classList.remove('active');
      if (movementSystem) {
        movementSystem.stopSmoothMovement();
      }
    });
    
    button.addEventListener('pointerleave', (e) => {
      e.preventDefault();
      button.classList.remove('active');
      if (movementSystem) {
        movementSystem.stopSmoothMovement();
      }
    });
  }
});

// Sword button
const swordButton = document.getElementById('sword-btn');
if (swordButton) {
  const activate = (e) => {
    e.preventDefault();
    swordButton.classList.add('active');
    triggerSwordAttack();
  };

  const deactivate = (e) => {
    e.preventDefault();
    swordButton.classList.remove('active');
  };

  swordButton.addEventListener('pointerdown', activate);
  swordButton.addEventListener('pointerup', deactivate);
  swordButton.addEventListener('pointerleave', deactivate);
}