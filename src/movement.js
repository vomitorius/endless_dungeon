import { findPath, getDirectionFromMovement } from './utils.js';

// Movement system for smooth and auto movement
export class MovementSystem {
  constructor() {
    // Smooth movement variables
    this.isMoving = false;
    this.moveDirection = null;
    this.lastMoveTime = 0;
    this.MOVE_INTERVAL = 150; // milliseconds between moves when holding key

    // Mouse pathfinding variables
    this.targetPath = [];
    this.isAutoMoving = false;
    this.lastAutoMoveTime = 0;
    this.AUTO_MOVE_INTERVAL = 50; // milliseconds between pathfinding steps

    // Key tracking
    this.keyPressed = new Set();
  }

  // Start smooth movement in a direction
  startSmoothMovement(direction) {
    this.isMoving = true;
    this.moveDirection = direction;
    this.lastMoveTime = Date.now();
  }

  // Stop smooth movement
  stopSmoothMovement() {
    this.isMoving = false;
    this.moveDirection = null;
  }

  // Handle smooth movement tick
  handleSmoothMovement(triggerSingleStepMovement) {
    if (!this.isMoving || !this.moveDirection) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastMoveTime >= this.MOVE_INTERVAL) {
      triggerSingleStepMovement(this.moveDirection);
      this.lastMoveTime = currentTime;
    }
  }

  // Start auto movement to target
  startAutoMovement(targetGridX, targetGridY, currentGridX, currentGridY, dungeon, enemies) {
    // Find path to target
    const path = findPath(currentGridX, currentGridY, targetGridX, targetGridY, dungeon, enemies, true);
    
    if (path.length > 0) {
      this.targetPath = path;
      this.isAutoMoving = true;
      this.lastAutoMoveTime = Date.now();
      
      // Cancel keyboard movement
      this.stopSmoothMovement();
      
      return true;
    }
    
    return false;
  }

  // Handle auto movement tick
  handleAutoMovement(triggerSingleStepMovement, currentGridX, currentGridY) {
    if (!this.isAutoMoving || this.targetPath.length === 0) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastAutoMoveTime >= this.AUTO_MOVE_INTERVAL) {
      const nextStep = this.targetPath.shift();
      
      if (nextStep) {
        // Calculate direction to move
        const direction = getDirectionFromMovement(
          currentGridX,
          currentGridY,
          nextStep.x,
          nextStep.y
        );
        
        if (direction) {
          triggerSingleStepMovement(direction);
        }
        
        this.lastAutoMoveTime = currentTime;
      }
      
      // Stop auto-movement when path is complete
      if (this.targetPath.length === 0) {
        this.isAutoMoving = false;
      }
    }
  }

  // Check if currently moving
  isCurrentlyMoving() {
    return this.isMoving || this.isAutoMoving;
  }

  // Stop all movement
  stopAllMovement() {
    this.stopSmoothMovement();
    this.isAutoMoving = false;
    this.targetPath = [];
  }

  // Key management
  addPressedKey(key) {
    this.keyPressed.add(key);
  }

  removePressedKey(key) {
    this.keyPressed.delete(key);
  }

  hasPressedKey(key) {
    return this.keyPressed.has(key);
  }

  clearPressedKeys() {
    this.keyPressed.clear();
  }

  // Get current movement state
  getMovementState() {
    return {
      isMoving: this.isMoving,
      moveDirection: this.moveDirection,
      isAutoMoving: this.isAutoMoving,
      targetPathLength: this.targetPath.length,
      pressedKeys: Array.from(this.keyPressed)
    };
  }
}