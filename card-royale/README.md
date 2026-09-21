# 🌿 Enchanted Clash — Card Battle PWA

A cozy, beautifully illustrated card-battle PWA played against the charming AI **"The Hollow"**.

## 🎮 Current Features

- **41 unique cards** across 5 rarities (Common, Uncommon, Rare, Epic, Legendary) with magical forest creatures
- **26 fusion recipes** including epic tier fusions (Shadow Frost, Nature's Shield, Storm Assassin, Moon Serpent, Wyrm Golem, Serpent Phoenix, Glow Beetle, Forest Guardian, Storm Phoenix, Merchant Prince, Star Fairy, Crystal Ancient, Star Elder, Fortune Fox, Phoenix Pixie, Turtle Guardian)
- **3 difficulty tiers**: Sproutling (Easy), Whisper (Medium), Shadow (Hard)
- **AI opponent** with personality and dialogue
- **Cozy garden aesthetic** with warm pastel colors, fireflies, and falling petals
- **Full PWA** — works offline, installable to home screen
- **Web Audio API** — all sounds generated procedurally
- **Local persistence** — stats and deck saved to localStorage
- **🌿 Fusion Evolution System** — merge two cards on the same lane to create evolved forms (10 recipes: Phoenix Sprite, Ancient Spirit, Moon Fox Blade, Crystal Bear, Dream Weaver, Ember Wing Phoenix, Fern Master, Heart Sun, Acorn Giant, Dew Star)
- **🌿 Nature Meter** — fills with each card played, visual indicator in fusion bar
- **🦊 Spirit Companions** — choose 5 unique spirits
- **⚔️ Boss Battles** — every 5th win triggers a boss fight with unique mechanics
- **🌿 Nature's Wrath** — ultimate AOE ability dealing 40 damage + healing 30 allies
- **🏆 Achievements** — 12 achievements to unlock
- **⚙️ Card Crafting** — earn essences from battles to craft cards
- **📳 Haptic Feedback** — vibration feedback on sounds before battle with passive abilities (Fox Spirit, Moss Spirit, Moon Spirit, Thorn Spirit, Star Spirit)
- **🌦️ Weather & Seasons** — dynamic 6 weather types (Sunny, Moonlight, Rain, Storm, Fog, Dawn) that modify card stats + seasonal 8-turn cycles
- **📚 Collection View** — browse all 20 cards by rarity with ownership status
- **🏅 Leaderboard** — top 10 scores saved to localStorage
- **⏸ Pause Menu** — ESC key or button, with settings, volume slider, and mute toggle

## 📋 Roadmap & TODO Plan

### Phase 1: Fusion Evolution System ✅ COMPLETE
- [x] Add `fusions.json` — fusion recipes mapping pairs of cards to evolved forms (10 recipes)
- [x] Add fusion UI — visual indicator when two cards are on the same lane
- [x] Add fusion action — merge two cards to create evolved form between turns
- [x] Add evolved card data — new stats, abilities, emojis (Phoenix Sprite, Ancient Spirit, Moon Fox Blade, etc.)
- [x] Add fusion particles effect (30-particle burst + expanding rings)
- [x] Add fusion sound (ascending chord progression)
- [x] Add nature meter (fills with each card played, displayed in fusion bar)
- [x] Add fusion highlight on cards when fusion mode is active

### Phase 2: AI Emotion System ✅ COMPLETE
- [x] Track player play patterns (aggressive/healing/stalling)
- [x] Map emotions to AI behavior changes (sad=defensive, angry=aggressive, bored=random)
- [x] Add emotion dialogue bubbles from The Hollow
- [x] Add emotion state tracking in AI controller
- [x] Track player play patterns (aggressive/healing/stalling)
- [x] Map emotions to AI behavior changes (sad=defensive, angry=aggressive, bored=random)
- [x] Add emotion dialogue bubbles from The Hollow
- [x] Add emotion visualization (AI face mood indicator in HUD)

### Phase 3: Weather & Seasons ✅ COMPLETE
- [x] Add day/night cycle timer (8 turns per cycle)
- [x] Add weather effects: Sun ☀️ / Moon 🌙 / Rain 🌧️ / Storm ⛈️
- [x] Weather affects card stats (fire+day, ice+night)
- [x] Add weather particles and ambient effects
- [x] Add weather HUD indicator

### Phase 4: Spirit Companion System ✅ COMPLETE
- [x] Add companion selection screen before battle
- [x] Define 5 spirit companions with unique passives
- [x] Add companion visuals in battle HUD
- [x] Add companion abilities that trigger during battle

### Phase 5: Boss Battles ✅ COMPLETE
- [x] Every 5th win triggers boss fight
- [x] Define 3 boss characters with unique mechanics (Thorn King shield, Shadow Queen card steal, Ancient Dragon power doubling) triggers boss fight
- [x] Define 3 boss characters with unique mechanics
- [x] Add boss health bar and special abilities
- [x] Add boss dialogue and victory rewards

### Phase 6: Nature's Wrath Ultimate ✅ COMPLETE
- [x] Add nature meter that fills with each card played
- [x] Add ultimate activation button when meter is full
- [x] Nature's Wrath: AOE damage + heal + fusion boost
- [x] Add dramatic visual and audio for activation

### Phase 7: Polish & Extra ✅ COMPLETE
- [x] Card crafting system (collect essences to create new cards)
- [x] Achievement system
- [x] Animated card backs and collection view
- [x] High score leaderboard (localStorage)
- [x] Touch haptic feedback
- [x] Pause menu with settings, volume controls, and ESC key handler
- [x] Sound volume slider and mute toggle

---

## 🚀 Quick Start

```bash
cd card-royale
python3 -m http.server 8080
# Open http://localhost:8080
```

## 📁 Project Structure

```
card-royale/
├── index.html              # Main HTML with all screens (menu, battle, deck, collection, leaderboard, settings, pause)
├── style.css               # Cozy garden theme CSS (includes card backs, collection, leaderboard, pause styles)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline support)
├── icons/                  # App icons
├── js/
│   ├── main.js             # App bootstrap, screen management, collection/leaderboard rendering
│   ├── game.js             # Game orchestrator, battle loop, pause/volume/leaderboard integration
│   ├── card-engine.js      # Card definitions, deck, combat, fusion
│   ├── ai-controller.js    # AI decision-making & emotion system
│   ├── arena.js            # Battlefield, lanes, structures
│   ├── particles.js        # Fireflies, petals, burst effects
│   ├── audio.js            # Web Audio API sound generation with volume/mute support
│   ├── save.js             # localStorage persistence, high score, leaderboard
│   └── utils.js            # Helper functions
├── data/
│   ├── cards.js            # All card definitions
│   ├── fusions.js          # Fusion recipes (Phase 1)
│   ├── weather.js          # Weather & seasons (Phase 3)
│   ├── companions.js       # Spirit companions (Phase 4)
│   ├── bosses.js           # Boss battle data (Phase 5)
│   └── nature.js           # Nature's Wrath ultimate (Phase 6)
└── README.md               # This file
```

## 🎯 Game Rules

1. **Elixir** regenerates over time (max 4). Play cards to summon creatures.
2. **3 lanes** — place creatures on any lane. They auto-attack enemies.
3. **Destroy the enemy's Ancient Tree** 🪵 to win.
4. **Fuse** two cards on the same lane to evolve them into stronger forms.
5. **Win streaks** unlock new cards, companions, and boss fights.
6. **Stars** (1-3) based on Ancient Tree HP remaining.

## 🎨 Design

- **Color Palette**: Warm creams (#fff7e6), soft corals (#ff6b6b), mint greens (#4ecdc4), golden accents (#ffd93d), lavender (#9b6dff)
- **UI**: Rounded cards, soft shadows, smooth animations, cozy garden feel
- **Particles**: Floating fireflies, falling flower petals, fusion sparkles
- **Sound**: All audio generated via Web Audio API (harp plucks, chimes)

## 🛠️ Tech Stack

- Vanilla JavaScript (ES modules)
- HTML5 + CSS3
- Web Audio API for sound
- Canvas 2D for particles
- localStorage for persistence
- Service Workers for offline
