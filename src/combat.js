// Simplified combat system with single dice roll
export class Combat {
  constructor() {
    this.isInCombat = false;
    this.combatUI = null;
    this.createCombatUI();
  }

  // Create combat UI elements
  createCombatUI() {
    // Remove existing combat UI
    const existingUI = document.getElementById('combat-ui');
    if (existingUI) {
      existingUI.remove();
    }

    this.combatUI = document.createElement('div');
    this.combatUI.id = 'combat-ui';
    this.combatUI.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 30px;
      border-radius: 15px;
      border: 3px solid #8B4513;
      min-width: 350px;
      text-align: center;
      z-index: 2000;
      font-family: 'Courier New', monospace;
      display: none;
      box-shadow: 0 0 20px rgba(0,0,0,0.8);
    `;
    document.body.appendChild(this.combatUI);
  }

  // Roll a dice (1-20)
  rollDice() {
    return Math.floor(Math.random() * 20) + 1;
  }

  // Perform simplified combat - single dice roll determines winner
  async performCombat(player, enemy) {
    if (this.isInCombat) return null;
    
    this.isInCombat = true;
    
    // Show combat UI
    this.showCombatUI(player, enemy);
    
    // Single dice roll for each combatant
    const playerRoll = this.rollDice();
    const enemyRoll = this.rollDice();
    
    // Add stat-based modifiers
    const playerModifier = Math.floor(player.damage / 5) + Math.floor(player.shield / 3);
    const enemyModifier = Math.floor(enemy.damage / 5) + Math.floor(enemy.shield / 3);
    
    const playerTotal = playerRoll + playerModifier;
    const enemyTotal = enemyRoll + enemyModifier;
    
    // Show dice roll animation
    await this.showDiceRoll(playerRoll, enemyRoll, playerModifier, enemyModifier, playerTotal, enemyTotal);
    
    // Determine winner
    let combatResult;
    if (playerTotal > enemyTotal) {
      combatResult = { winner: 'player', goldEarned: enemy.getGoldDrop() };
      enemy.health = 0;
      enemy.isAlive = false;
    } else if (enemyTotal > playerTotal) {
      combatResult = { winner: 'enemy', goldEarned: 0 };
      // Apply damage to player
      const damage = Math.max(1, enemy.damage - player.shield);
      player.takeDamage(damage);
    } else {
      // Tie goes to the player (game balance)
      combatResult = { winner: 'player', goldEarned: enemy.getGoldDrop() };
      enemy.health = 0;
      enemy.isAlive = false;
    }
    
    // Show result
    this.showCombatResult(combatResult, playerTotal, enemyTotal, player, enemy);
    
    // Wait before hiding UI
    await this.sleep(2500);
    this.hideCombatUI();
    
    this.isInCombat = false;
    return combatResult;
  }

  // Show combat UI with combatant stats
  showCombatUI(player, enemy) {
    this.combatUI.style.display = 'block';
    this.combatUI.innerHTML = `
      <h3>⚔️ COMBAT ⚔️</h3>
      <div style="display: flex; justify-content: space-between; margin: 20px 0;">
        <div style="text-align: left;">
          <h4>🛡️ Player</h4>
          <div>❤️ Health: ${player.health}/${player.maxHealth}</div>
          <div>⚔️ Damage: ${player.damage}</div>
          <div>🛡️ Shield: ${player.shield}</div>
        </div>
        <div style="text-align: right;">
          <h4>👹 ${enemy.name}</h4>
          <div>❤️ Health: ${enemy.health}/${enemy.maxHealth}</div>
          <div>⚔️ Damage: ${enemy.damage}</div>
          <div>🛡️ Shield: ${enemy.shield}</div>
        </div>
      </div>
      <div id="combat-dice" style="margin-top: 20px; font-size: 16px;">
        <div style="color: #ffff00;">Rolling dice...</div>
      </div>
    `;
  }

  // Show dice roll animation and results
  async showDiceRoll(playerRoll, enemyRoll, playerMod, enemyMod, playerTotal, enemyTotal) {
    const diceDiv = document.getElementById('combat-dice');
    if (!diceDiv) return;
    
    // Show rolling animation
    for (let i = 0; i < 3; i++) {
      diceDiv.innerHTML = `
        <div style="color: #ffff00; font-size: 24px;">
          🎲 Rolling... 🎲
        </div>
      `;
      await this.sleep(300);
    }
    
    // Show final results
    diceDiv.innerHTML = `
      <div style="color: #00ff00; margin: 10px 0;">
        🛡️ Player: 🎲 ${playerRoll} + ${playerMod} = <strong>${playerTotal}</strong>
      </div>
      <div style="color: #ff6666; margin: 10px 0;">
        👹 Enemy: 🎲 ${enemyRoll} + ${enemyMod} = <strong>${enemyTotal}</strong>
      </div>
    `;
    
    await this.sleep(1000);
  }

  // Show final combat result
  showCombatResult(result, playerTotal, enemyTotal, player, enemy) {
    const diceDiv = document.getElementById('combat-dice');
    if (!diceDiv) return;
    
    let resultText = '<div style="margin: 20px 0; border: 2px solid #ffff00; padding: 15px; background: rgba(255,255,0,0.1);">';
    
    if (result.winner === 'player') {
      resultText += `
        <div style="color: #00ff00; font-size: 18px; font-weight: bold;">
          🎉 VICTORY! 🎉
        </div>
        <div style="color: #ffff00; margin: 10px 0;">
          You defeated the ${enemy.name}!
        </div>
        <div style="color: #ffd700;">
          💰 Dropped ${result.goldEarned} gold on nearby tile!
        </div>
      `;
    } else {
      const damage = Math.max(1, enemy.damage - player.shield);
      resultText += `
        <div style="color: #ff6666; font-size: 18px; font-weight: bold;">
          💀 DEFEAT 💀
        </div>
        <div style="color: #ff6666; margin: 10px 0;">
          The ${enemy.name} won and dealt ${damage} damage!
        </div>
        <div style="color: #ffaa00;">
          Your health: ${player.health}/${player.maxHealth}
        </div>
      `;
    }
    
    resultText += '</div>';
    diceDiv.innerHTML += resultText;
  }

  // Hide combat UI
  hideCombatUI() {
    if (this.combatUI) {
      this.combatUI.style.display = 'none';
    }
  }

  // Helper function to create delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up combat UI
  destroy() {
    if (this.combatUI) {
      this.combatUI.remove();
      this.combatUI = null;
    }
  }
}