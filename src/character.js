// Base Character class with Health, Damage, and Shield stats
export class Character {
  constructor(health, damage, shield) {
    this.maxHealth = health;
    this.health = health;
    this.damage = damage;
    this.shield = shield;
    this.isAlive = true;
  }

  // Take damage with shield calculation
  takeDamage(incomingDamage) {
    // Shield reduces damage, but not below 1
    const actualDamage = Math.max(1, incomingDamage - this.shield);
    this.health = Math.max(0, this.health - actualDamage);
    
    if (this.health <= 0) {
      this.isAlive = false;
    }
    
    return {
      damageDealt: actualDamage,
      shieldBlocked: incomingDamage - actualDamage,
      remainingHealth: this.health,
      died: !this.isAlive
    };
  }

  // Get current health percentage
  getHealthPercentage() {
    return this.health / this.maxHealth;
  }

  // Heal the character
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Get character stats for display
  getStats() {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      damage: this.damage,
      shield: this.shield,
      isAlive: this.isAlive
    };
  }
}