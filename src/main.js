import * as PIXI from 'pixi.js';
import Dungeoneer from 'dungeoneer';

let app;
let mapContainer;
let knight = null;
let dungeon = null;
let tileSize = 32;
let x = 0;
let y = 0;
let speed = tileSize;

const textures = {};
let enemies = [];
let isAttacking = false;
let goldCollected = 0;
let goldItems = [];

// Sprite coordinates in the fulltilesheet (32x32 tiles, coordinates are 0-based)
const spriteCoords = {
  enemies: [
    { x: 0, y: 1 },   // First enemy type - second row, first column
    { x: 1, y: 1 },   // Second enemy type  
    { x: 2, y: 1 },   // Third enemy type
    { x: 3, y: 1 },   // Fourth enemy type
    { x: 4, y: 1 },   // Fifth enemy type
    { x: 5, y: 1 },   // Sixth enemy type
  ],
  gold: { x: 0, y: 10 }, // Gold coin sprite - trying a different position
};

let touchStartX = null;
let touchStartY = null;
const keyPressed = new Set();

// Smooth movement variables
let isMoving = false;
let moveDirection = null;
let lastMoveTime = 0;
const MOVE_INTERVAL = 150; // milliseconds between moves when holding key

// Mouse pathfinding variables
let targetPath = [];
let isAutoMoving = false;
let lastAutoMoveTime = 0;
const AUTO_MOVE_INTERVAL = 200; // milliseconds between pathfinding steps

function getResponsiveCanvasSize() {
  const container = document.getElementById('content');
  const containerWidth = container.offsetWidth - 30;
  const containerHeight = window.innerHeight - 200;

  const isMobilePortrait =
    window.innerWidth < 768 && window.innerHeight > window.innerWidth;

  if (isMobilePortrait) {
    const maxSize = Math.min(containerWidth, containerHeight * 0.6);
    return {
      width: maxSize,
      height: Math.floor(maxSize * 0.85),
    };
  } else {
    const maxWidth = Math.min(containerWidth, 1050);
    let width = maxWidth;
    let height = Math.floor(maxWidth * 0.67);

    if (height > containerHeight) {
      height = containerHeight;
      width = Math.floor(height * 1.5);
    }

    const minTileSize = 16;
    const minGridWidth = 21;
    const minGridHeight = 15;

    if (width < minGridWidth * minTileSize) {
      width = minGridWidth * minTileSize;
    }
    if (height < minGridHeight * minTileSize) {
      height = minGridHeight * minTileSize;
    }

    return { width, height };
  }
}

function setResponsiveCanvasSize() {
  const { width, height } = getResponsiveCanvasSize();
  app.renderer.resize(width, height);
  const canvasElement = app.view;
  if (canvasElement && canvasElement.style) {
    canvasElement.style.maxWidth = '100%';
    canvasElement.style.height = 'auto';
  }
}

function calculateTileSize() {
  const { width, height } = getResponsiveCanvasSize();
  const isMobilePortrait =
    window.innerWidth < 768 && window.innerHeight > window.innerWidth;

  if (isMobilePortrait) {
    let preferredTileSize = Math.min(
      Math.floor(width / 15),
      Math.floor(height / 13),
    );
    preferredTileSize = Math.max(20, Math.min(preferredTileSize, 40));
    return preferredTileSize;
  } else {
    let preferredTileSize = Math.min(
      Math.floor(width / 33),
      Math.floor(height / 23),
    );
    preferredTileSize = Math.max(16, Math.min(preferredTileSize, 48));
    return preferredTileSize;
  }
}

async function loadTextures() {
  const names = ['knight', 'wall', 'door', 'finish'];
  for (const name of names) {
    textures[name] = await PIXI.Assets.load(`/img/${name}.png`);
  }
  
  // Load the full tilesheet
  textures.fulltilesheet = await PIXI.Assets.load('/img/fulltilesheet.png');
}

function createSpriteFromTilesheet(coordX, coordY, tileSize = 32) {
  const texture = new PIXI.Texture(
    textures.fulltilesheet,
    new PIXI.Rectangle(coordX * tileSize, coordY * tileSize, tileSize, tileSize)
  );
  return texture;
}

function createEnemySprite(gridX, gridY, enemyType = 0) {
  const enemyCoords = spriteCoords.enemies[enemyType] || spriteCoords.enemies[0];
  const texture = createSpriteFromTilesheet(enemyCoords.x, enemyCoords.y);
  const sprite = new PIXI.Sprite(texture);
  sprite.width = tileSize;
  sprite.height = tileSize;
  sprite.x = gridX * tileSize;
  sprite.y = gridY * tileSize;
  mapContainer.addChild(sprite);
  return sprite;
}

function createGoldSprite(gridX, gridY) {
  const goldCoords = spriteCoords.gold;
  const texture = createSpriteFromTilesheet(goldCoords.x, goldCoords.y);
  const sprite = new PIXI.Sprite(texture);
  sprite.width = tileSize;
  sprite.height = tileSize;
  sprite.x = gridX * tileSize;
  sprite.y = gridY * tileSize;
  mapContainer.addChild(sprite);
  return sprite;
}

function createSprite(type, gridX, gridY) {
  const sprite = new PIXI.Sprite(textures[type]);
  sprite.width = tileSize;
  sprite.height = tileSize;
  sprite.x = gridX * tileSize;
  sprite.y = gridY * tileSize;
  mapContainer.addChild(sprite);
  return sprite;
}

function placeFinishTile() {
  // Find a floor tile far from the knight to place the finish
  for (let i = dungeon.tiles.length - 1; i >= 0; i--) {
    for (let j = dungeon.tiles[i].length - 1; j >= 0; j--) {
      if (dungeon.tiles[i][j].type === 'floor') {
        // Check if this position is not occupied by knight
        const knightGridX = Math.floor(x / tileSize);
        const knightGridY = Math.floor(y / tileSize);
        if (!(i === knightGridX && j === knightGridY)) {
          dungeon.tiles[i][j].type = 'finish';
          createSprite('finish', i, j);
          return;
        }
      }
    }
  }
}

async function startGame() {
  tileSize = calculateTileSize();
  speed = tileSize;
  setResponsiveCanvasSize();

  await loadTextures();
  
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
  knight = null;
  enemies = [];
  goldItems = [];

  let knightPlaced = false;
  
  // Place walls and doors
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      const tile = dungeon.tiles[i][j].type;
      if (tile === 'wall' || tile === 'door') {
        createSprite(tile, i, j);
      }
    }
  }

  // Place knight in first available floor tile
  for (let i = 0; i < dungeon.tiles.length && !knightPlaced; i++) {
    for (let j = 0; j < dungeon.tiles[i].length && !knightPlaced; j++) {
      if (dungeon.tiles[i][j].type === 'floor') {
        knightPlaced = true;
        x = i * tileSize;
        y = j * tileSize;
        knight = createSprite('knight', i, j);
      }
    }
  }

  // Place enemies on random floor tiles
  const floorTiles = [];
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      if (dungeon.tiles[i][j].type === 'floor') {
        // Don't place enemy where knight is
        if (!(i === Math.floor(x / tileSize) && j === Math.floor(y / tileSize))) {
          floorTiles.push({ x: i, y: j });
        }
      }
    }
  }

  // Place 3-5 enemies randomly with varied designs
  const numEnemies = Math.min(Math.floor(Math.random() * 3) + 3, floorTiles.length);
  for (let i = 0; i < numEnemies; i++) {
    const randomIndex = Math.floor(Math.random() * floorTiles.length);
    const tile = floorTiles.splice(randomIndex, 1)[0];
    const enemyType = Math.floor(Math.random() * spriteCoords.enemies.length);
    const enemy = {
      x: tile.x,
      y: tile.y,
      sprite: createEnemySprite(tile.x, tile.y, enemyType)
    };
    enemies.push(enemy);
  }

  // Note: Finish tile will be placed when all enemies are defeated

  app.ticker.add(() => {
    if (knight) {
      knight.x = x;
      knight.y = y;
      
      // Handle smooth movement
      handleSmoothMovement();
      
      // Handle auto-movement from mouse clicks
      handleAutoMovement();
    }
  });
}

function triggerSingleStepMovement(direction) {
  if (!knight || !dungeon) {
    return;
  }

  let newX = x;
  let newY = y;

  switch (direction) {
    case 'left':
      newX = x - speed;
      break;
    case 'up':
      newY = y - speed;
      break;
    case 'right':
      newX = x + speed;
      break;
    case 'down':
      newY = y + speed;
      break;
  }

  const moveX = Math.floor(newX / tileSize);
  const moveY = Math.floor(newY / tileSize);

  if (
    moveX >= 0 &&
    moveX < dungeon.tiles.length &&
    moveY >= 0 &&
    moveY < dungeon.tiles[moveX].length
  ) {
    const tileType = dungeon.tiles[moveX][moveY].type;
    
    // Check if there's an enemy at this position
    const enemyIndex = enemies.findIndex(enemy => enemy.x === moveX && enemy.y === moveY);
    
    if (enemyIndex !== -1) {
      // Combat with enemy - attack and defeat it
      const enemy = enemies[enemyIndex];
      mapContainer.removeChild(enemy.sprite);
      enemies.splice(enemyIndex, 1);
      
      // Drop gold where enemy was defeated
      dropGold(moveX, moveY);
      
      // Brief attack animation
      isAttacking = true;
      setTimeout(() => {
        isAttacking = false;
      }, 200);
      
      // Move to the tile where enemy was
      x = newX;
      y = newY;
      
      // Check if all enemies defeated
      if (enemies.length === 0) {
        placeFinishTile();
      }
    } else if (
      tileType === 'floor' ||
      tileType === 'door' ||
      tileType === 'finish'
    ) {
      // Check for gold collection first
      collectGold(moveX, moveY);
      
      x = newX;
      y = newY;

      if (tileType === 'finish') {
        setTimeout(async () => {
          resetGame();
          await startGame();
        }, 1000);
      }
    }
  }
}

function handleSmoothMovement() {
  if (!isMoving || !moveDirection) return;
  
  const currentTime = Date.now();
  if (currentTime - lastMoveTime >= MOVE_INTERVAL) {
    triggerSingleStepMovement(moveDirection);
    lastMoveTime = currentTime;
  }
}

function handleAutoMovement() {
  if (!isAutoMoving || targetPath.length === 0) return;
  
  const currentTime = Date.now();
  if (currentTime - lastAutoMoveTime >= AUTO_MOVE_INTERVAL) {
    const nextStep = targetPath.shift();
    if (nextStep) {
      const currentGridX = Math.floor(x / tileSize);
      const currentGridY = Math.floor(y / tileSize);
      
      const deltaX = nextStep.x - currentGridX;
      const deltaY = nextStep.y - currentGridY;
      
      let direction = null;
      if (deltaX > 0) direction = 'right';
      else if (deltaX < 0) direction = 'left';
      else if (deltaY > 0) direction = 'down';
      else if (deltaY < 0) direction = 'up';
      
      if (direction) {
        triggerSingleStepMovement(direction);
      }
      
      lastAutoMoveTime = currentTime;
    }
    
    // Stop auto-movement when path is complete
    if (targetPath.length === 0) {
      isAutoMoving = false;
    }
  }
}

// Simple A* pathfinding implementation
function findPath(startX, startY, endX, endY, allowEnemyTarget = false) {
  if (!dungeon || !dungeon.tiles) return [];
  
  const openSet = [];
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  
  const startKey = `${startX},${startY}`;
  
  openSet.push({ x: startX, y: startY, key: startKey });
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(startX, startY, endX, endY));
  
  while (openSet.length > 0) {
    // Find node with lowest fScore
    let current = openSet.reduce((lowest, node) => 
      fScore.get(node.key) < fScore.get(lowest.key) ? node : lowest
    );
    
    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path = [];
      let currentKey = current.key;
      
      while (cameFrom.has(currentKey)) {
        const coords = currentKey.split(',').map(Number);
        path.unshift({ x: coords[0], y: coords[1] });
        currentKey = cameFrom.get(currentKey);
      }
      
      return path;
    }
    
    openSet.splice(openSet.indexOf(current), 1);
    closedSet.add(current.key);
    
    // Check neighbors
    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      // Check bounds and walkability
      if (neighbor.x < 0 || neighbor.x >= dungeon.tiles.length ||
          neighbor.y < 0 || neighbor.y >= dungeon.tiles[neighbor.x].length) {
        continue;
      }
      
      const tileType = dungeon.tiles[neighbor.x][neighbor.y].type;
      if (tileType === 'wall' || closedSet.has(neighborKey)) {
        continue;
      }
      
      // Check if there's an enemy at this position (treat as obstacle unless it's the target)
      const enemyAtPos = enemies.find(enemy => enemy.x === neighbor.x && enemy.y === neighbor.y);
      if (enemyAtPos && !(allowEnemyTarget && neighbor.x === endX && neighbor.y === endY)) {
        continue;
      }
      
      const tentativeGScore = gScore.get(current.key) + 1;
      
      if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
        cameFrom.set(neighborKey, current.key);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor.x, neighbor.y, endX, endY));
        
        if (!openSet.find(node => node.key === neighborKey)) {
          openSet.push({ x: neighbor.x, y: neighbor.y, key: neighborKey });
        }
      }
    }
  }
  
  return []; // No path found
}

function heuristic(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan distance
}

function generateRandomGold() {
  const goldAmounts = [10, 20, 50, 100, 200, 500, 1000];
  return goldAmounts[Math.floor(Math.random() * goldAmounts.length)];
}

function dropGold(gridX, gridY) {
  const goldAmount = generateRandomGold();
  const goldSprite = createGoldSprite(gridX, gridY);
  const goldItem = {
    x: gridX,
    y: gridY,
    amount: goldAmount,
    sprite: goldSprite
  };
  goldItems.push(goldItem);
}

function collectGold(gridX, gridY) {
  const goldIndex = goldItems.findIndex(gold => gold.x === gridX && gold.y === gridY);
  if (goldIndex !== -1) {
    const gold = goldItems[goldIndex];
    goldCollected += gold.amount;
    mapContainer.removeChild(gold.sprite);
    goldItems.splice(goldIndex, 1);
    updateGoldDisplay();
    return true;
  }
  return false;
}

function updateGlobalDebugVars() {
  if (typeof window !== 'undefined') {
    window.enemies = enemies;
    window.goldItems = goldItems;
    window.goldCollected = goldCollected;
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
  goldDisplay.textContent = `💰 Gold: ${goldCollected}`;
  updateGlobalDebugVars();
}

function resetGame() {
  knight = null;
  dungeon = null;
  enemies = [];
  goldItems = [];
  isAttacking = false;
  keyPressed.clear();
  mapContainer.removeChildren();
  x = 0;
  y = 0;
  
  // Reset movement states
  isMoving = false;
  moveDirection = null;
  lastMoveTime = 0;
  isAutoMoving = false;
  targetPath = [];
  lastAutoMoveTime = 0;
  
  // Note: goldCollected is persistent across games, so we don't reset it
}

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'ArrowRight':
    case 'ArrowDown':
      keyPressed.delete(e.code);
      // Stop smooth movement when key is released
      if (moveDirection === getDirectionFromKeyCode(e.code)) {
        isMoving = false;
        moveDirection = null;
      }
      break;
    case 'Space':
      keyPressed.delete(e.code);
      break;
  }
});

document.addEventListener('keydown', (e) => {
  if (keyPressed.has(e.code)) {
    e.preventDefault();
    return;
  }

  keyPressed.add(e.code);

  switch (e.code) {
    case 'ArrowLeft':
      startSmoothMovement('left');
      break;
    case 'ArrowUp':
      startSmoothMovement('up');
      break;
    case 'ArrowRight':
      startSmoothMovement('right');
      break;
    case 'ArrowDown':
      startSmoothMovement('down');
      break;
    case 'Space':
      triggerSwordAttack();
      break;
  }
  e.preventDefault();
});

function getDirectionFromKeyCode(keyCode) {
  switch (keyCode) {
    case 'ArrowLeft': return 'left';
    case 'ArrowUp': return 'up';
    case 'ArrowRight': return 'right';
    case 'ArrowDown': return 'down';
    default: return null;
  }
}

function startSmoothMovement(direction) {
  // Cancel any auto-movement from mouse clicks
  isAutoMoving = false;
  targetPath = [];
  
  isMoving = true;
  moveDirection = direction;
  lastMoveTime = 0; // Trigger immediate first move
}

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
    window.textures = textures;
    window.enemies = enemies;
    window.goldItems = goldItems;
    window.goldCollected = goldCollected;
    window.dropGold = dropGold;
    window.collectGold = collectGold;
    updateGlobalDebugVars();
    
    setResponsiveCanvasSize();
    console.log('Starting Endless Dungeon...');
    await startGame();
  } catch (error) {
    console.error('Error initializing game:', error);
  }
});

const canvasElement = document.getElementById('c');
canvasElement.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  },
  { passive: false },
);

canvasElement.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

canvasElement.addEventListener(
  'touchend',
  (e) => {
    e.preventDefault();

    if (touchStartX === null || touchStartY === null) {
      return;
    }

    const touch = e.changedTouches[0];
    const diffX = touchStartX - touch.clientX;
    const diffY = touchStartY - touch.clientY;
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

// Mouse click event handler for pathfinding movement
canvasElement.addEventListener('click', (e) => {
  if (!knight || !dungeon) return;
  
  // Get canvas bounds and calculate click position relative to canvas
  const rect = canvasElement.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  // Convert to grid coordinates
  const targetGridX = Math.floor(clickX / tileSize);
  const targetGridY = Math.floor(clickY / tileSize);
  
  // Check if target is within bounds
  if (targetGridX >= 0 && targetGridX < dungeon.tiles.length &&
      targetGridY >= 0 && targetGridY < dungeon.tiles[targetGridX].length) {
    
    const targetTileType = dungeon.tiles[targetGridX][targetGridY].type;
    
    // Check if there's an enemy at this position
    const enemyAtTarget = enemies.find(enemy => enemy.x === targetGridX && enemy.y === targetGridY);
    
    // Allow movement to walkable tiles OR tiles with enemies
    if (targetTileType === 'floor' || targetTileType === 'door' || targetTileType === 'finish' || enemyAtTarget) {
      // Cancel keyboard movement
      isMoving = false;
      moveDirection = null;
      
      // Get current position
      const currentGridX = Math.floor(x / tileSize);
      const currentGridY = Math.floor(y / tileSize);
      
      // Find path to target
      const path = findPath(currentGridX, currentGridY, targetGridX, targetGridY, !!enemyAtTarget);
      
      if (path.length > 0) {
        targetPath = path;
        isAutoMoving = true;
        lastAutoMoveTime = 0; // Trigger immediate first move
      }
    }
  }
});

const gamepadButtons = document.querySelectorAll('.dpad-btn');

function bindGamepadButton(button, direction) {
  const activate = (e) => {
    e.preventDefault();
    button.classList.add('active');
    startSmoothMovement(direction);
  };

  const deactivate = (e) => {
    e.preventDefault();
    button.classList.remove('active');
    // Stop smooth movement when button is released
    if (moveDirection === direction) {
      isMoving = false;
      moveDirection = null;
    }
  };

  button.addEventListener('pointerdown', activate);
  button.addEventListener('pointerup', deactivate);
  button.addEventListener('pointerleave', deactivate);
}

gamepadButtons.forEach((button) => {
  const direction = button.dataset.direction;
  if (direction) {
    bindGamepadButton(button, direction);
  }
});

// Sword attack function
function triggerSwordAttack() {
  if (!knight || !dungeon || isAttacking) {
    return;
  }
  
  // Brief visual indication of attack
  isAttacking = true;
  setTimeout(() => {
    isAttacking = false;
  }, 300);
  
  // Check all adjacent tiles for enemies
  const knightGridX = Math.floor(x / tileSize);
  const knightGridY = Math.floor(y / tileSize);
  
  const adjacentPositions = [
    { x: knightGridX - 1, y: knightGridY }, // left
    { x: knightGridX + 1, y: knightGridY }, // right
    { x: knightGridX, y: knightGridY - 1 }, // up
    { x: knightGridX, y: knightGridY + 1 }, // down
  ];
  
  adjacentPositions.forEach(pos => {
    const enemyIndex = enemies.findIndex(enemy => enemy.x === pos.x && enemy.y === pos.y);
    if (enemyIndex !== -1) {
      const enemy = enemies[enemyIndex];
      mapContainer.removeChild(enemy.sprite);
      enemies.splice(enemyIndex, 1);
      
      // Drop gold where enemy was defeated
      dropGold(pos.x, pos.y);
      
      // Check if all enemies defeated
      if (enemies.length === 0) {
        placeFinishTile();
      }
    }
  });
}

// Bind sword button
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

document.getElementById('generate').addEventListener('click', async () => {
  resetGame();
  await startGame();
});

let resizeTimeout = null;
window.addEventListener('resize', () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  resizeTimeout = setTimeout(async () => {
    const newTileSize = calculateTileSize();
    const sizeDifference = Math.abs(newTileSize - tileSize);

    if (sizeDifference > 4) {
      resetGame();
      await startGame();
    } else {
      setResponsiveCanvasSize();
    }
  }, 250);
});

