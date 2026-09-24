import { getAllCards, shuffle, createUnit } from './card-engine.js';

const AI_DIALOGUE = {
  easy: {
    intro: "🌿 O-oh, a visitor! I'm Sproutling! Let's have some fun!",
    play: "Let's go! 🌸",
    attack: "Hehe, watch this!",
    win: "Yay! I won! 🎉",
    lose: "Oh no... but let's try again! 💚",
    taunt: "You're really strong!",
    think: "Hmm... this one!",
    spawn: "Ooh, a new friend!",
    heal: "Feel better!",
    error: "Oops!"
  },
  medium: {
    intro: "🌿 A worthy opponent approaches... I am Whisper. Let the games begin.",
    play: "The forest decides.",
    attack: "You won't evade this.",
    win: "The forest speaks my name. 🌙",
    lose: "Hmm... you're clever. But I'll return.",
    taunt: "Can you keep up?",
    think: "An interesting choice...",
    spawn: "From the shadows, I call.",
    heal: "Nature heals all wounds.",
    error: "A minor setback..."
  },
  hard: {
    intro: "🌿 I am Shadow. The Hollow has awaited this battle. Prepare yourself.",
    play: "Inevitable.",
    attack: "Futile.",
    win: "The forest bows to me. 🗡️",
    lose: "Interesting... I underestimated you.",
    taunt: "Your strategies are transparent.",
    think: "Predictable... but still interesting.",
    spawn: "The shadows obey.",
    heal: "Darkness restores.",
    error: "A scratch."
  }
};

const EMOTION_DIALOGUE = {
  neutral: { think: "An interesting choice...", play: "The forest decides." },
  happy: { think: "Oh my! How delightful! 🌸", play: "Wonderful! 🎉" },
  sad: { think: "Oh no... 💚", play: "I'm so sorry..." },
  angry: { think: "You dare! 🔥", play: "You'll regret that!" },
  bored: { think: "This is... dull... 😴", play: "Yawn..." },
  confused: { think: "Hmm? What was that? 🤔", play: "Wait, what?" }
};

const AI_DECKS = {
  easy: ['moss_wisp', 'spore_sprout', 'dartling', 'thorn_bush', 'heart_seed', 'dew_drop', 'acorn_bomber', 'starling_scout'],
  medium: ['moss_wisp', 'starling_scout', 'elder_tree', 'thorn_bush', 'mushroom_circle', 'glow_cap', 'breeze_lark', 'moon_fox'],
  hard: ['moon_fox', 'ancient_oak', 'crystal_deer', 'willow_spirit', 'ember_wing', 'pixie_queen', 'fern_guardian', 'dreamweaver']
};

const EMOTION_EFFECTS = {
  happy: { defensiveBonus: -5, aggressionBonus: 10, randomBonus: 0 },
  sad: { defensiveBonus: 15, aggressionBonus: -5, randomBonus: 0 },
  angry: { defensiveBonus: -10, aggressionBonus: 20, randomBonus: 5 },
  bored: { defensiveBonus: 0, aggressionBonus: -10, randomBonus: 15 },
  confused: { defensiveBonus: 5, aggressionBonus: 0, randomBonus: 10 },
  neutral: { defensiveBonus: 0, aggressionBonus: 0, randomBonus: 0 }
};

const EMOTION_COLORS = {
  happy: '#4ecdc4',
  sad: '#74b9ff',
  angry: '#ff6b6b',
  bored: '#a0a0a0',
  confused: '#9b6dff',
  neutral: '#ffd93d'
};

const EMOTION_EMOJIS = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  bored: '😴',
  confused: '😕',
  neutral: '😐'
};

export class AIController {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.dialogue = AI_DIALOGUE[difficulty] || AI_DIALOGUE.medium;
    this.deck = this.buildDeck(difficulty);
    this.hand = [];
    this.elixir = 0;
    this.maxElixir = 4;
    this.superElixir = 0;
    this.maxSuperElixir = 2;
    this.scoreWeights = this.getScoreWeights();

    // Emotion system
    this.emotion = 'neutral';
    this.emotionTimer = 0;
    this.playerStats = {
      totalDamageDealt: 0,
      healCardsPlayed: 0,
      aggressiveCardsPlayed: 0,
      stallTurns: 0,
      turnCount: 0,
      lastAction: null
    };
  }

  buildDeck(difficulty) {
    const base = AI_DECKS[difficulty] || AI_DECKS.medium;
    const allCards = getAllCards();
    const deck = [];
    for (let i = 0; i < 8; i++) {
      const cardId = base[i % base.length];
      const card = allCards.find(c => c.id === cardId);
      if (card) deck.push(card);
    }
    while (deck.length < 20) {
      const random = allCards[Math.floor(Math.random() * allCards.length)];
      deck.push(random);
    }
    return shuffle(deck);
  }

  getScoreWeights() {
    switch (this.difficulty) {
      case 'easy': return { elixirEfficiency: 0.3, threat: 0.2, counter: 0.1, diversity: 0.2, randomness: 0.2 };
      case 'medium': return { elixirEfficiency: 0.4, threat: 0.3, counter: 0.2, diversity: 0.1, randomness: 0.0 };
      case 'hard': return { elixirEfficiency: 0.5, threat: 0.3, counter: 0.2, diversity: 0.0, randomness: 0.0 };
      default: return { elixirEfficiency: 0.4, threat: 0.3, counter: 0.2, diversity: 0.1, randomness: 0.0 };
    }
  }

  updateEmotion(playerAction, gameState) {
    this.playerStats.turnCount++;
    this.emotionTimer++;

    // Track player behavior
    if (playerAction === 'damage') {
      this.playerStats.totalDamageDealt += 20;
      this.playerStats.aggressiveCardsPlayed++;
      this.playerStats.lastAction = 'damage';
      this.playerStats.stallTurns = 0;
    } else if (playerAction === 'heal') {
      this.playerStats.healCardsPlayed++;
      this.playerStats.lastAction = 'heal';
      this.playerStats.stallTurns = 0;
    } else if (playerAction === 'fuse') {
      this.playerStats.lastAction = 'fuse';
      this.playerStats.stallTurns = 0;
    } else if (playerAction === 'stall') {
      this.playerStats.stallTurns++;
      this.playerStats.lastAction = 'stall';
    }

    // Determine emotion based on player behavior
    const s = this.playerStats;
    const damageRatio = s.totalDamageDealt / Math.max(1, s.turnCount * 15);
    const healRatio = s.healCardsPlayed / Math.max(1, s.turnCount);
    const stallRatio = s.stallTurns / Math.max(1, this.emotionTimer);

    let newEmotion = 'neutral';

      if (damageRatio > 1.5 && healRatio < 0.3) {
      // Player is very aggressive
      newEmotion = 'angry';
    } else if (healRatio > 0.5 && damageRatio < 0.5) {
      // Player is very defensive/healing
      newEmotion = 'sad';
    } else if (stallRatio > 0.6) {
      // Player is stalling
      newEmotion = 'bored';
    } else if (Math.random() < 0.1) {
      // Random emotion shift
      const emotions = ['happy', 'confused', 'neutral'];
      newEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    } else if (this.emotionTimer > 8) {
      // Reset periodically
      newEmotion = 'neutral';
      this.emotionTimer = 0;
    }

    if (newEmotion !== this.emotion) {
      this.emotion = newEmotion;
    }
  }

  getEmotionEffect() {
    return EMOTION_EFFECTS[this.emotion] || EMOTION_EFFECTS.neutral;
  }

  getEmotionColor() {
    return EMOTION_COLORS[this.emotion] || '#ffd93d';
  }

  getEmotionEmoji() {
    return EMOTION_EMOJIS[this.emotion] || '😐';
  }

  getEmotionDialogue() {
    return EMOTION_DIALOGUE[this.emotion] || EMOTION_DIALOGUE.neutral;
  }

  drawCard() {
    if (this.deck.length === 0) return null;
    return this.deck.pop();
  }

  refillHand(hand) {
    if (this.deck.length === 0) {
      this.deck = this.buildDeck(this.difficulty);
    }
    while (hand.length < 4 && this.deck.length > 0) {
      hand.push(this.drawCard());
    }
    return hand;
  }

  evaluateCard(card, gameState) {
    let score = 0;
    const w = this.scoreWeights;
    const emotionEffect = this.getEmotionEffect();

    // Base elixir efficiency
    if (card.elixir > 0) {
      const eff = card.dmg / card.elixir;
      score += eff * w.elixirEfficiency * 10;
    }

    // Threat value
    score += card.dmg * w.threat * 0.5;

    // Emotion modifies behavior
    if (this.emotion === 'angry' || this.emotion === 'furious') {
      // Aggressive: prefer high damage, ignore defense
      score += card.dmg * 0.3;
      if (card.ability === 'taunt') score -= 10;
      score += emotionEffect.aggressionBonus;
    } else if (this.emotion === 'sad') {
      // Defensive: prefer high HP, taunt, healing
      score += card.hp * 0.2;
      if (card.ability === 'taunt') score += 15;
      if (['heal_ally', 'heal_radius'].includes(card.ability)) score += 20;
      score += emotionEffect.defensiveBonus;
    } else if (this.emotion === 'bored') {
      // Random: high randomness, weird choices
      score += Math.random() * 30 * w.randomness;
      score += emotionEffect.randomBonus;
    } else if (this.emotion === 'happy') {
      // Positive: balanced but slightly more aggressive
      score += card.dmg * 0.15;
      score += emotionEffect.aggressionBonus;
    } else if (this.emotion === 'confused') {
      // Mixed: random bonus + slight defensive lean
      score += Math.random() * 20 * w.randomness;
      score += card.hp * 0.1;
      score += emotionEffect.randomBonus;
    } else {
      // Neutral: standard scoring
      score += emotionEffect.aggressionBonus;
    }

    // Counter logic
    if (gameState && gameState.enemyTauntCount > 0 && card.target !== 'none') {
      score += 15 * w.counter;
    }

    // Diversity
    if (gameState) {
      const alreadyPlayed = gameState.playedCards.filter(id => id === card.id).length;
      score -= alreadyPlayed * 10 * w.diversity;
    }

    // Randomness
    if (w.randomness > 0) {
      score += Math.random() * 20 * w.randomness;
    }

    // Special ability bonuses
    if (['heal_ally', 'heal_radius'].includes(card.ability)) {
      if (this.emotion === 'sad') score += 30;
      else score += 10;
    }
    if (card.ability === 'taunt') {
      if (this.emotion === 'sad') score += 20;
      else score += 5;
    }

    return score;
  }

  chooseCard(hand, gameState) {
    if (hand.length === 0 || this.elixir < Math.min(...hand.map(c => c.elixir))) {
      return null;
    }
    const playable = hand.filter(c => this.elixir >= c.elixir);
    if (playable.length === 0) return null;

    const scored = playable.map(card => ({
      card,
      score: this.evaluateCard(card, gameState)
    }));

    scored.sort((a, b) => b.score - a.score);

    let chosen;
    if (this.difficulty === 'hard') {
      chosen = scored[0].card;
    } else if (this.difficulty === 'medium') {
      const top3 = scored.slice(0, Math.min(3, scored.length));
      chosen = top3[Math.floor(Math.random() * top3.length)].card;
    } else {
      const totalScore = scored.reduce((s, c) => s + c.score, 0);
      let rand = Math.random() * totalScore;
      chosen = scored[0].card;
      for (const sc of scored) {
        rand -= sc.score;
        if (rand <= 0) { chosen = sc.card; break; }
      }
    }

    return chosen;
  }

  chooseLane(lanes, gameState) {
    if (!gameState || !gameState.enemyUnits || gameState.enemyUnits.length === 0) {
      return lanes[Math.floor(Math.random() * lanes.length)];
    }
    // Lower score = better: empty lanes score 0, occupied lanes score their avg HP
    const laneScores = lanes.map(lane => {
      const enemyInLane = gameState.enemyUnits.filter(u => u.lane === lane && u.alive);
      if (enemyInLane.length === 0) return { lane, score: 0 };
      const avgHp = enemyInLane.reduce((s, u) => s + u.hp, 0) / enemyInLane.length;
      return { lane, score: avgHp };
    });
    laneScores.sort((a, b) => a.score - b.score);
    return laneScores[0].lane;
  }

  canPlay(hand, elixir) {
    return hand.some(c => elixir >= c.elixir);
  }

  getDialogue() {
    return this.dialogue;
  }

  getEmotion() {
    return {
      state: this.emotion,
      emoji: this.getEmotionEmoji(),
      color: this.getEmotionColor(),
      dialogue: this.getEmotionDialogue()
    };
  }
}
