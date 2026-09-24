export class Deck {
  constructor() {
    this.cards = [];
    this.hand = [];
    this.discard = [];
  }

  shuffle(arr = this.cards) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  drawInitial() {
    this.hand = [];
    for (let i = 0; i < 4 && this.cards.length > 0; i++) {
      this.hand.push(this.cards.pop());
    }
  }

  draw() {
    if (this.cards.length === 0) {
      // Recycle discard pile
      if (this.discard && this.discard.length > 0) {
        this.cards = this.discard;
        this.discard = [];
        this.shuffle(this.cards);
      } else {
        return null;
      }
    }
    const card = this.cards.pop();
    this.hand.push(card);
    return card;
  }

  play(index) {
    if (index < 0 || index >= this.hand.length) return null;
    const card = this.hand.splice(index, 1)[0];
    if (!this.discard) this.discard = [];
    this.discard.push(card);
    return card;
  }

  unplay(index, card) {
    if (!card) return;
    const di = this.discard ? this.discard.indexOf(card) : -1;
    if (di >= 0) this.discard.splice(di, 1);
    this.hand.splice(Math.min(index, this.hand.length), 0, card);
  }

  getHand() {
    return [...this.hand];
  }

  getHandSize() {
    return this.hand.length;
  }

  hasPlayable(elixir) {
    return this.hand.some(c => c.elixir <= elixir);
  }

  getPlayable(elixir) {
    return this.hand.filter(c => c.elixir <= elixir);
  }
}

export class Arena {
  constructor() {
    this.lanes = [0, 1, 2];
    this.playerUnits = [];
    this.enemyUnits = [];
    this.playerStructure = { hp: 200, maxHp: 200, alive: true };
    this.enemyStructure = { hp: 200, maxHp: 200, alive: true };
  }

  addUnit(unit, side) {
    if (side === 'player') {
      this.playerUnits.push(unit);
    } else {
      this.enemyUnits.push(unit);
    }
  }

  getUnitsInLane(lane, side) {
    const units = side === 'player' ? this.playerUnits : this.enemyUnits;
    return units.filter(u => u.lane === lane && u.alive);
  }

  getAliveUnits(side) {
    return (side === 'player' ? this.playerUnits : this.enemyUnits).filter(u => u.alive);
  }

  damageStructure(side, amount) {
    const struct = side === 'player' ? this.playerStructure : this.enemyStructure;
    struct.hp = Math.max(0, struct.hp - amount);
    if (struct.hp <= 0) struct.alive = false;
    return struct.hp;
  }

  isGameOver() {
    return !this.playerStructure.alive || !this.enemyStructure.alive;
  }

  getWinner() {
    if (!this.playerStructure.alive) return 'enemy';
    if (!this.enemyStructure.alive) return 'player';
    return null;
  }

  getLaneSlots(side) {
    const units = side === 'player' ? this.playerUnits : this.enemyUnits;
    return this.lanes.map(lane => ({
      lane,
      unit: units.find(u => u.lane === lane && u.alive) || null,
      hasUnit: !!units.find(u => u.lane === lane && u.alive)
    }));
  }

  clearDead() {
    this.playerUnits = this.playerUnits.filter(u => u.alive);
    this.enemyUnits = this.enemyUnits.filter(u => u.alive);
  }

  reset() {
    this.playerUnits = [];
    this.enemyUnits = [];
    this.playerStructure = { hp: 200, maxHp: 200, alive: true };
    this.enemyStructure = { hp: 200, maxHp: 200, alive: true };
  }
}
