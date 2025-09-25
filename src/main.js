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

// Game systems
let player = null;
let enemies = [];
let goldItems = [];
let spriteManager = null;
let movementSystem = null;
let combatSystem = null;

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

  let playerPlaced = false;
  
  // Place walls and doors
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      const tile = dungeon.tiles[i][j].type;
      if (tile === 'wall' || tile === 'door') {
        const sprite = spriteManager.createSprite(tile, i, j, tileSize);
        if (sprite) {
          mapContainer.addChild(sprite);
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

  // Note: Finish tile will be placed when all enemies are defeated

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
      // Player won - remove enemy and drop gold
      mapContainer.removeChild(enemy.sprite);
      enemies.splice(enemyIndex, 1);
      
      // Player collects gold and moves to the tile
      player.collectGold(combatResult.goldEarned);
      player.setPosition(newX, newY);
      
      // Drop some gold on the ground too
      dropGold(moveX, moveY);
      
      // Check if all enemies defeated
      if (enemies.length === 0) {
        placeFinishTile();
      }
      
      updateGoldDisplay();
    } else if (combatResult && combatResult.winner === 'enemy') {
      // Player lost - game over or respawn logic could go here
      console.log('Player defeated! Game over.');
      // For now, let's just reset the game
      setTimeout(() => {
        resetGame();
      }, 1000);
    }
    
    return;
  }
  
  // Regular movement to empty tiles
  if (tileType === 'floor' || tileType === 'door' || tileType === 'finish') {
    // Check for gold collection first
    collectGold(moveX, moveY);
    
    player.setPosition(newX, newY);

    if (tileType === 'finish') {
      setTimeout(() => {
        // eslint-disable-next-line no-undef
        alert('🎉 Victory! Generating new dungeon...');
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
        // Player won - remove enemy and drop gold
        mapContainer.removeChild(enemy.sprite);
        enemies.splice(enemyIndex, 1);
        
        // Player collects gold
        player.collectGold(combatResult.goldEarned);
        
        // Drop some gold on the ground too
        dropGold(pos.x, pos.y);
        
        // Check if all enemies defeated
        if (enemies.length === 0) {
          placeFinishTile();
        }
        
        updateGoldDisplay();
      } else if (combatResult && combatResult.winner === 'enemy') {
        // Player lost
        console.log('Player defeated! Game over.');
        setTimeout(() => {
          resetGame();
        }, 1000);
      }
      
      break; // Only attack one enemy per sword strike
    }
  }
}

function dropGold(gridX, gridY) {
  const goldAmount = generateRandomGold();
  const goldSprite = spriteManager.createGoldSprite(gridX, gridY, tileSize);
  if (goldSprite) {
    const goldItem = {
      x: gridX,
      y: gridY,
      amount: goldAmount,
      sprite: goldSprite
    };
    goldItems.push(goldItem);
    mapContainer.addChild(goldSprite);
  }
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

function updateGlobalDebugVars() {
  if (typeof window !== 'undefined') {
    window.player = player;
    window.enemies = enemies;
    window.goldItems = goldItems;
    window.combatSystem = combatSystem;
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

// Create player health display
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
    `;
    document.body.appendChild(healthDisplay);
  }
  
  if (player) {
    const healthPercentage = player.getHealthPercentage();
    const healthColor = healthPercentage > 0.6 ? '#00ff00' : 
                       healthPercentage > 0.3 ? '#ffff00' : '#ff0000';
    
    healthDisplay.innerHTML = `
      <div>❤️ Health: ${player.health}/${player.maxHealth}</div>
      <div style="width: 100px; height: 6px; background: #333; border-radius: 3px; margin-top: 4px;">
        <div style="width: ${healthPercentage * 100}%; height: 100%; background: ${healthColor}; border-radius: 3px;"></div>
      </div>
    `;
  }
}

function resetGame() {
  if (player) {
    player.reset();
  }
  dungeon = null;
  enemies = [];
  goldItems = [];
  isAttacking = false;
  
  if (movementSystem) {
    movementSystem.clearPressedKeys();
    movementSystem.stopAllMovement();
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