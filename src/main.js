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
  const names = ['knight', 'wall', 'door', 'finish'];
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

  let knightPlaced = false;
  let finishPlaced = false;

  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      const tile = dungeon.tiles[i][j].type;
      if (tile === 'wall' || tile === 'door') {
        createSprite(tile, i, j);
      }
    }
  }

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

  for (let i = dungeon.tiles.length - 1; i >= 0 && !finishPlaced; i--) {
    for (let j = dungeon.tiles[i].length - 1; j >= 0 && !finishPlaced; j--) {
      if (dungeon.tiles[i][j].type === 'floor') {
        dungeon.tiles[i][j].type = 'finish';
        finishPlaced = true;
        createSprite('finish', i, j);
      }
    }
  }

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
    if (
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

