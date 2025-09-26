// Utility functions for the game

// Responsive canvas utilities
export function getResponsiveCanvasSize() {
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

export function calculateTileSize() {
  const { width, height } = getResponsiveCanvasSize();
  const isMobilePortrait =
    window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  
  if (isMobilePortrait) {
    return Math.max(16, Math.floor(Math.min(width / 15, height / 11)));
  } else {
    return Math.max(20, Math.floor(Math.min(width / 27, height / 17)));
  }
}

// A* pathfinding algorithm
export function findPath(startX, startY, endX, endY, dungeon, enemies, allowEnemyTarget = false) {
  if (!dungeon || !dungeon.tiles) return [];
  
  const openSet = [{ x: startX, y: startY, key: `${startX},${startY}` }];
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  
  const startKey = `${startX},${startY}`;
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(startX, startY, endX, endY));
  
  while (openSet.length > 0) {
    // Find node with lowest fScore
    let current = openSet[0];
    let currentIndex = 0;
    
    for (let i = 1; i < openSet.length; i++) {
      if (fScore.get(openSet[i].key) < fScore.get(current.key)) {
        current = openSet[i];
        currentIndex = i;
      }
    }
    
    // If we reached the goal
    if (current.x === endX && current.y === endY) {
      const path = [];
      let temp = current.key;
      
      // Add the goal position first
      path.unshift({ x: current.x, y: current.y });
      
      while (cameFrom.has(temp)) {
        temp = cameFrom.get(temp);
        const [x, y] = temp.split(',').map(Number);
        path.unshift({ x, y });
      }
      
      return path.slice(1); // Remove starting position
    }
    
    // Move current from open to closed set
    openSet.splice(currentIndex, 1);
    closedSet.add(current.key);
    
    // Check all neighbors
    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      // Skip if out of bounds
      if (neighbor.x < 0 || neighbor.x >= dungeon.tiles.length ||
          neighbor.y < 0 || neighbor.y >= dungeon.tiles[0].length) {
        continue;
      }
      
      // Skip if already processed
      if (closedSet.has(neighborKey)) {
        continue;
      }
      
      const tileType = dungeon.tiles[neighbor.x][neighbor.y].type;
      
      // Skip walls
      if (tileType === 'wall') {
        continue;
      }
      
      // Check for enemy at this position
      const enemyAtPos = enemies && enemies.find(enemy => enemy.x === neighbor.x && enemy.y === neighbor.y);
      if (enemyAtPos && !(allowEnemyTarget && neighbor.x === endX && neighbor.y === endY)) {
        continue;
      }
      
      const tentativeGScore = gScore.get(current.key) + 1;
      
      if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
        cameFrom.set(neighborKey, current.key);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor.x, neighbor.y, endX, endY));
        
        // Add to open set if not already there
        if (!openSet.find(node => node.key === neighborKey)) {
          openSet.push({ x: neighbor.x, y: neighbor.y, key: neighborKey });
        }
      }
    }
  }
  
  return []; // No path found
}

export function heuristic(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan distance
}

// Generate random gold amounts
export function generateRandomGold() {
  const goldAmounts = [10, 20, 50, 100, 200, 500, 1000];
  return goldAmounts[Math.floor(Math.random() * goldAmounts.length)];
}

// Direction utilities
export function getDirectionFromKeyCode(keyCode) {
  switch (keyCode) {
    case 'ArrowLeft': return 'left';
    case 'ArrowUp': return 'up';
    case 'ArrowRight': return 'right';
    case 'ArrowDown': return 'down';
    default: return null;
  }
}

export function getDirectionFromMovement(fromX, fromY, toX, toY) {
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'down' : 'up';
  }
}

// Create a delay promise
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}