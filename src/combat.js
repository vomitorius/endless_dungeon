// Combat system with dice-based calculations and visual feedback
export class Combat {
  constructor() {
    this.isInCombat = false;
    this.combatLog = [];
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
      padding: 20px;
      border-radius: 10px;
      border: 3px solid #8B4513;
      min-width: 400px;
      max-width: 500px;
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

  // Calculate combat modifier based on stats
  getCombatModifier(attacker, defender) {
    // Higher damage gives attack bonus, higher shield gives defense bonus
    const attackBonus = Math.floor(attacker.damage / 5);
    const defenseBonus = Math.floor(defender.shield / 2);
    return { attackBonus, defenseBonus };
  }

  // Perform combat between player and enemy
  async performCombat(player, enemy) {
    if (this.isInCombat) return null;
    
    this.isInCombat = true;
    this.combatLog = [];
    
    // Show combat UI
    this.showCombatUI(player, enemy);
    
    // Combat continues until one dies
    let round = 1;
    let combatResult = null;
    
    while (player.isAlive && enemy.isAlive && round <= 10) { // Max 10 rounds to prevent infinite combat
      const roundResult = await this.performCombatRound(player, enemy, round);
      this.combatLog.push(roundResult);
      
      // Update UI after each round
      this.updateCombatUI(player, enemy, roundResult);
      
      // Wait for visual effect
      await this.sleep(1500);
      
      round++;
    }
    
    // Determine winner
    if (player.isAlive && !enemy.isAlive) {
      combatResult = { winner: 'player', goldEarned: enemy.getGoldDrop() };
    } else if (!player.isAlive && enemy.isAlive) {
      combatResult = { winner: 'enemy', goldEarned: 0 };
    } else {
      // Tie or max rounds reached - player wins by default (game design choice)
      combatResult = { winner: 'player', goldEarned: enemy.getGoldDrop() };
      enemy.health = 0;
      enemy.isAlive = false;
    }
    
    // Show final result
    this.showCombatResult(combatResult, player, enemy);
    
    // Wait before hiding UI
    await this.sleep(2000);
    this.hideCombatUI();
    
    this.isInCombat = false;
    return combatResult;
  }

  // Perform a single combat round
  async performCombatRound(player, enemy, round) {
    // Player attacks first
    const playerRoll = this.rollDice();
    const enemyRoll = this.rollDice();
    
    const { attackBonus: playerAttackBonus } = this.getCombatModifier(player, enemy);
    const { defenseBonus: enemyDefenseBonus } = this.getCombatModifier(enemy, player);
    
    const playerTotal = playerRoll + playerAttackBonus;
    const enemyDefenseTotal = enemyRoll + enemyDefenseBonus;
    
    let roundResult = {
      round,
      playerRoll,
      enemyRoll,
      playerTotal,
      enemyDefenseTotal,
      playerHit: false,
      enemyHit: false,
      playerDamage: null,
      enemyDamage: null
    };
    
    // Player's turn
    if (playerTotal > enemyDefenseTotal) {
      roundResult.playerHit = true;
      roundResult.playerDamage = enemy.takeDamage(player.damage);
    }
    
    // Enemy's turn (if still alive)
    if (enemy.isAlive) {
      const enemyAttackRoll = this.rollDice();
      const playerDefenseRoll = this.rollDice();
      
      const { attackBonus: enemyAttackBonus } = this.getCombatModifier(enemy, player);
      const { defenseBonus: playerDefenseBonus } = this.getCombatModifier(player, enemy);
      
      const enemyAttackTotal = enemyAttackRoll + enemyAttackBonus;
      const playerDefenseTotal = playerDefenseRoll + playerDefenseBonus;
      
      roundResult.enemyAttackRoll = enemyAttackRoll;
      roundResult.playerDefenseRoll = playerDefenseRoll;
      roundResult.enemyAttackTotal = enemyAttackTotal;
      roundResult.playerDefenseTotal = playerDefenseTotal;
      
      if (enemyAttackTotal > playerDefenseTotal) {
        roundResult.enemyHit = true;
        roundResult.enemyDamage = player.takeDamage(enemy.damage);
      }
    }
    
    return roundResult;
  }

  // Show combat UI
  showCombatUI(player, enemy) {
    this.combatUI.style.display = 'block';
    this.combatUI.innerHTML = `
      <h3>⚔️ COMBAT ⚔️</h3>
      <div style="display: flex; justify-content: space-between; margin: 20px 0;">
        <div style="text-align: left;">
          <h4>🛡️ ${player.constructor.name}</h4>
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
      <div id="combat-rounds" style="margin-top: 20px; font-size: 12px; max-height: 200px; overflow-y: auto;">
        <div style="color: #ffff00;">Combat begins...</div>
      </div>
    `;
  }

  // Update combat UI with round results
  updateCombatUI(player, enemy, roundResult) {
    const roundsDiv = document.getElementById('combat-rounds');
    if (!roundsDiv) return;
    
    let roundText = `<div style="margin: 10px 0; border-top: 1px solid #666; padding-top: 10px;">
      <div style="color: #ffff00;">--- Round ${roundResult.round} ---</div>`;
    
    // Player attack
    roundText += `<div style="color: #00ff00;">
      Player rolls ${roundResult.playerRoll} (+${roundResult.playerTotal - roundResult.playerRoll} bonus) = ${roundResult.playerTotal}
    </div>`;
    
    roundText += `<div style="color: #ff6666;">
      ${enemy.name} defends ${roundResult.enemyRoll} (+${roundResult.enemyDefenseTotal - roundResult.enemyRoll} bonus) = ${roundResult.enemyDefenseTotal}
    </div>`;
    
    if (roundResult.playerHit) {
      roundText += `<div style="color: #ff0000;">
        💥 HIT! Dealt ${roundResult.playerDamage.damageDealt} damage (${roundResult.playerDamage.shieldBlocked} blocked by shield)
      </div>`;
    } else {
      roundText += `<div style="color: #888;">
        ❌ MISS! Attack failed.
      </div>`;
    }
    
    // Enemy attack (if alive)
    if (enemy.isAlive && roundResult.enemyAttackRoll !== undefined) {
      roundText += `<div style="color: #ff6666; margin-top: 5px;">
        ${enemy.name} attacks ${roundResult.enemyAttackRoll} (+${roundResult.enemyAttackTotal - roundResult.enemyAttackRoll} bonus) = ${roundResult.enemyAttackTotal}
      </div>`;
      
      roundText += `<div style="color: #00ff00;">
        Player defends ${roundResult.playerDefenseRoll} (+${roundResult.playerDefenseTotal - roundResult.playerDefenseRoll} bonus) = ${roundResult.playerDefenseTotal}
      </div>`;
      
      if (roundResult.enemyHit) {
        roundText += `<div style="color: #ff0000;">
          💥 HIT! Took ${roundResult.enemyDamage.damageDealt} damage (${roundResult.enemyDamage.shieldBlocked} blocked by shield)
        </div>`;
      } else {
        roundText += `<div style="color: #888;">
          ❌ MISS! Attack dodged.
        </div>`;
      }
    }
    
    roundText += `<div style="color: #ccc; font-size: 10px;">
      Player: ${player.health}/${player.maxHealth} HP | ${enemy.name}: ${enemy.health}/${enemy.maxHealth} HP
    </div></div>`;
    
    roundsDiv.innerHTML += roundText;
    roundsDiv.scrollTop = roundsDiv.scrollHeight;
  }

  // Show final combat result
  showCombatResult(result, player, enemy) {
    const roundsDiv = document.getElementById('combat-rounds');
    if (!roundsDiv) return;
    
    let resultText = '<div style="margin: 20px 0; border: 2px solid #ffff00; padding: 10px; background: rgba(255,255,0,0.1);">';
    
    if (result.winner === 'player') {
      resultText += `<div style="color: #00ff00; font-size: 16px; font-weight: bold;">
        🎉 VICTORY! 🎉
      </div>
      <div style="color: #ffff00;">
        You defeated the ${enemy.name}!
      </div>
      <div style="color: #ffd700;">
        💰 Earned ${result.goldEarned} gold!
      </div>`;
    } else {
      resultText += `<div style="color: #ff0000; font-size: 16px; font-weight: bold;">
        💀 DEFEAT 💀
      </div>
      <div style="color: #ff6666;">
        You were defeated by the ${enemy.name}!
      </div>`;
    }
    
    resultText += '</div>';
    roundsDiv.innerHTML += resultText;
    roundsDiv.scrollTop = roundsDiv.scrollHeight;
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