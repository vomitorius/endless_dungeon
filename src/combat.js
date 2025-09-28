// Real-time combat system like Diablo
export class Combat {
  constructor() {
    this.isInCombat = false;
    this.activeEnemyHealthBars = new Map(); // Track enemy health bars
    this.recentCombatEnemies = new Set(); // Track enemies that were recently in combat
  }

  // Instant combat resolution - like Diablo
  async performCombat(player, enemy) {
    if (this.isInCombat) return null;
    
    this.isInCombat = true;
    
    // Show enemy health bar
    this.showEnemyHealthBar(enemy);
    
    // Mark enemy as recently in combat
    this.recentCombatEnemies.add(enemy);
    
    // Calculate damage - player always attacks first
    const playerDamage = Math.max(1, player.damage - enemy.shield);
    const enemyTakeDamageResult = enemy.takeDamage(playerDamage);
    
    // Update enemy health bar
    this.updateEnemyHealthBar(enemy);
    
    let combatResult;
    
    if (!enemy.isAlive) {
      // Enemy dies - player wins
      combatResult = { winner: 'player', goldEarned: enemy.getGoldDrop() };
      // Remove enemy health bar immediately when enemy dies
      this.hideEnemyHealthBar(enemy);
      this.recentCombatEnemies.delete(enemy);
    } else {
      // Enemy survives and hits back
      const enemyDamage = Math.max(1, enemy.damage - player.shield);
      const playerTakeDamageResult = player.takeDamage(enemyDamage);
      
      if (!player.isAlive) {
        // Player dies
        combatResult = { winner: 'enemy', goldEarned: 0 };
        this.hideEnemyHealthBar(enemy);
        this.recentCombatEnemies.delete(enemy);
      } else {
        // Both survive - enemy wins this round
        combatResult = { winner: 'enemy', goldEarned: 0 };
        // Delay hiding the health bar to keep it visible for a moment
        setTimeout(() => {
          // Only hide if the enemy is not adjacent to player anymore
          const playerGridX = Math.floor(player.x / tileSize);
          const playerGridY = Math.floor(player.y / tileSize);
          const distance = Math.abs(enemy.x - playerGridX) + Math.abs(enemy.y - playerGridY);
          
          if (distance > 1) {
            this.hideEnemyHealthBar(enemy);
          }
          this.recentCombatEnemies.delete(enemy);
        }, 2000); // Keep health bar visible for 2 seconds after combat
      }
    }
    
    this.isInCombat = false;
    return combatResult;
  }

  // Show health bar above enemy
  showEnemyHealthBar(enemy) {
    if (!enemy.sprite) return;
    
    const healthBarId = `enemy-health-${enemy.x}-${enemy.y}`;
    let healthBar = document.getElementById(healthBarId);
    
    if (!healthBar) {
      healthBar = document.createElement('div');
      healthBar.id = healthBarId;
      healthBar.style.cssText = `
        position: fixed;
        width: 40px;
        height: 6px;
        background: #333;
        border: 1px solid #000;
        border-radius: 3px;
        z-index: 1500;
        pointer-events: none;
      `;
      
      const innerBar = document.createElement('div');
      innerBar.style.cssText = `
        width: 100%;
        height: 100%;
        background: #ff0000;
        border-radius: 2px;
        transition: width 0.2s ease;
      `;
      
      healthBar.appendChild(innerBar);
      document.body.appendChild(healthBar);
      
      this.activeEnemyHealthBars.set(enemy, healthBar);
    }
    
    this.updateEnemyHealthBar(enemy);
  }
  
  // Update enemy health bar position and width
  updateEnemyHealthBar(enemy) {
    if (!enemy.sprite) return;
    
    const healthBar = this.activeEnemyHealthBars.get(enemy);
    if (!healthBar) return;
    
    // Position health bar above enemy sprite
    const spriteRect = enemy.sprite.getBounds();
    const canvasElement = document.querySelector('canvas');
    const canvasRect = canvasElement.getBoundingClientRect();
    
    healthBar.style.left = `${canvasRect.left + spriteRect.x + spriteRect.width/2 - 20}px`;
    healthBar.style.top = `${canvasRect.top + spriteRect.y - 10}px`;
    
    // Update health percentage
    const healthPercentage = enemy.getHealthPercentage();
    const innerBar = healthBar.firstChild;
    innerBar.style.width = `${healthPercentage * 100}%`;
    
    // Color based on health
    const healthColor = healthPercentage > 0.6 ? '#00ff00' : 
                       healthPercentage > 0.3 ? '#ffff00' : '#ff0000';
    innerBar.style.background = healthColor;
  }
  
  // Hide enemy health bar
  hideEnemyHealthBar(enemy) {
    const healthBar = this.activeEnemyHealthBars.get(enemy);
    if (healthBar) {
      healthBar.remove();
      this.activeEnemyHealthBars.delete(enemy);
    }
  }

  // Clean up all health bars
  cleanupHealthBars() {
    for (const healthBar of this.activeEnemyHealthBars.values()) {
      healthBar.remove();
    }
    this.activeEnemyHealthBars.clear();
  }

  // Clean up orphaned health bars (for enemies that moved or are no longer in combat)
  cleanupOrphanedHealthBars() {
    // Create a copy of the health bars to iterate over
    const healthBarsToCheck = new Map(this.activeEnemyHealthBars);
    
    for (const [enemy, healthBar] of healthBarsToCheck) {
      // Remove health bars for dead enemies or enemies that are far from player
      if (!enemy.isAlive || !enemy.sprite) {
        this.hideEnemyHealthBar(enemy);
        continue;
      }
      
      // Don't clean up health bars for enemies that were recently in combat
      if (this.recentCombatEnemies.has(enemy)) {
        continue;
      }
      
      // Calculate distance to player
      const playerGridX = Math.floor(player.x / tileSize);
      const playerGridY = Math.floor(player.y / tileSize);
      const distance = Math.abs(enemy.x - playerGridX) + Math.abs(enemy.y - playerGridY);
      
      // Only hide health bars for enemies that are far from player AND not recently in combat
      if (distance > 2) { // Increased distance threshold to be less aggressive
        this.hideEnemyHealthBar(enemy);
      }
    }
  }

  // Helper function to create delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up combat system
  destroy() {
    this.cleanupHealthBars();
  }
}