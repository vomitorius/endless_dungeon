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

let touchStartX = null;
let touchStartY = null;
const keyPressed = new Set();

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
  const names = ['knight', 'wall', 'door', 'finish', 'enemy'];
  for (const name of names) {
    textures[name] = await PIXI.Assets.load(`/img/${name}.png`);
  }
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

  // Place 3-5 enemies randomly
  const numEnemies = Math.min(Math.floor(Math.random() * 3) + 3, floorTiles.length);
  for (let i = 0; i < numEnemies; i++) {
    const randomIndex = Math.floor(Math.random() * floorTiles.length);
    const tile = floorTiles.splice(randomIndex, 1)[0];
    const enemy = {
      x: tile.x,
      y: tile.y,
      sprite: createSprite('enemy', tile.x, tile.y)
    };
    enemies.push(enemy);
  }

  // Note: Finish tile will be placed when all enemies are defeated

  app.ticker.add(() => {
    if (knight) {
      knight.x = x;
      knight.y = y;
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

function resetGame() {
  knight = null;
  dungeon = null;
  enemies = [];
  isAttacking = false;
  keyPressed.clear();
  mapContainer.removeChildren();
  x = 0;
  y = 0;
}

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'ArrowRight':
    case 'ArrowDown':
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
      triggerSingleStepMovement('left');
      break;
    case 'ArrowUp':
      triggerSingleStepMovement('up');
      break;
    case 'ArrowRight':
      triggerSingleStepMovement('right');
      break;
    case 'ArrowDown':
      triggerSingleStepMovement('down');
      break;
    case 'Space':
      triggerSwordAttack();
      break;
  }
  e.preventDefault();
});

document.addEventListener('DOMContentLoaded', async () => {
  app = new PIXI.Application({
    view: document.getElementById('c'),
    background: '#3C3C3C',
  });
  mapContainer = new PIXI.Container();
  app.stage.addChild(mapContainer);

  setResponsiveCanvasSize();
  console.log('Starting Endless Dungeon...');
  await startGame();
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

const gamepadButtons = document.querySelectorAll('.dpad-btn');

function bindGamepadButton(button, direction) {
  const activate = (e) => {
    e.preventDefault();
    button.classList.add('active');
    triggerSingleStepMovement(direction);
  };

  const deactivate = (e) => {
    e.preventDefault();
    button.classList.remove('active');
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

