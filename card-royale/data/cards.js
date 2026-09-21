const CARD_DATA = [
  {"id":"moss_wisp","name":"Moss Wisp","emoji":"🧚","elixir":1,"hp":35,"dmg":12,"speed":1.0,"range":1,"target":"nearest","ability":"heal_ally","rarity":"common","color":"#4ecdc4"},
  {"id":"spore_sprout","name":"Spore Sprout","emoji":"🍄","elixir":1,"hp":50,"dmg":8,"speed":0.8,"range":1,"target":"nearest","ability":"grow","rarity":"common","color":"#7bc95a"},
  {"id":"dartling","name":"Dartling","emoji":"🌿","elixir":1,"hp":25,"dmg":25,"speed":1.5,"range":1,"target":"nearest","ability":"first_strike","rarity":"common","color":"#95d5b2"},
  {"id":"thorn_bush","name":"Thorn Bush","emoji":"🌵","elixir":2,"hp":70,"dmg":5,"speed":0,"range":0,"target":"none","ability":"taunt","rarity":"common","color":"#2d9a46"},
  {"id":"starling_scout","name":"Starling Scout","emoji":"🐦","elixir":2,"hp":35,"dmg":20,"speed":2.0,"range":1,"target":"nearest","ability":"reveal","rarity":"uncommon","color":"#ffd93d"},
  {"id":"elder_tree","name":"Elder Tree","emoji":"🌳","elixir":3,"hp":120,"dmg":10,"speed":0.5,"range":1,"target":"nearest","ability":"heal_radius","rarity":"uncommon","color":"#2e8b57"},
  {"id":"mushroom_circle","name":"Mushroom Circle","emoji":"🍄","elixir":3,"hp":80,"dmg":15,"speed":0.3,"range":1,"target":"nearest","ability":"spawn_spores","rarity":"uncommon","color":"#e07050"},
  {"id":"moon_fox","name":"Moon Fox","emoji":"🦊","elixir":3,"hp":60,"dmg":25,"speed":1.8,"range":1,"target":"nearest","ability":"phase","rarity":"rare","color":"#9b6dff"},
  {"id":"ancient_oak","name":"Ancient Oak","emoji":"🪵","elixir":4,"hp":200,"dmg":15,"speed":0.3,"range":1,"target":"nearest","ability":"aoe_stun","rarity":"rare","color":"#6b4226"},
  {"id":"crystal_deer","name":"Crystal Deer","emoji":"🦌","elixir":4,"hp":80,"dmg":30,"speed":1.5,"range":1,"target":"nearest","ability":"ice_barrier","rarity":"rare","color":"#7ac5f2"},
  {"id":"pixie_queen","name":"Pixie Queen","emoji":"👸","elixir":5,"hp":100,"dmg":35,"speed":1.2,"range":1,"target":"nearest","ability":"double_damage","rarity":"legendary","color":"#ff6bff"},
  {"id":"heart_seed","name":"Heart Seed","emoji":"💚","elixir":2,"hp":45,"dmg":10,"speed":0.8,"range":1,"target":"nearest","ability":"life_link","rarity":"common","color":"#ff8fa3"},
  {"id":"breeze_lark","name":"Breeze Lark","emoji":"🪶","elixir":2,"hp":30,"dmg":18,"speed":2.5,"range":1,"target":"nearest","ability":"dodge","rarity":"uncommon","color":"#a2d2ff"},
  {"id":"glow_cap","name":"Glow Cap","emoji":"💡","elixir":3,"hp":55,"dmg":20,"speed":1.0,"range":1,"target":"nearest","ability":"luminance","rarity":"uncommon","color":"#ffe066"},
  {"id":"willow_spirit","name":"Willow Spirit","emoji":"👻","elixir":4,"hp":90,"dmg":28,"speed":1.3,"range":1,"target":"nearest","ability":"ethereal","rarity":"rare","color":"#b8a9c9"},
  {"id":"ember_wing","name":"Ember Wing","emoji":"🦋","elixir":4,"hp":75,"dmg":32,"speed":1.7,"range":1,"target":"nearest","ability":"burn","rarity":"rare","color":"#ff7b54"},
  {"id":"fern_guardian","name":"Fern Guardian","emoji":"🦊","elixir":5,"hp":130,"dmg":25,"speed":0.6,"range":1,"target":"nearest","ability":"ward","rarity":"legendary","color":"#2d6a4f"},
  {"id":"dew_drop","name":"Dew Drop","emoji":"💧","elixir":1,"hp":20,"dmg":5,"speed":2.0,"range":1,"target":"nearest","ability":"refresh","rarity":"common","color":"#74b9ff"},
  {"id":"acorn_bomber","name":"Acorn Bomber","emoji":"🫘","elixir":2,"hp":40,"dmg":22,"speed":1.0,"range":1,"target":"nearest","ability":"splash","rarity":"common","color":"#c47a3a"},
  {"id":"sylvan_herald","name":"Sylvan Herald","emoji":"📜","elixir":3,"hp":70,"dmg":15,"speed":0.8,"range":1,"target":"nearest","ability":"summon_moss","rarity":"uncommon","color":"#00b894"},
  {"id":"dreamweaver","name":"Dreamweaver","emoji":"✨","elixir":5,"hp":85,"dmg":30,"speed":1.4,"range":1,"target":"nearest","ability":"dreamscape","rarity":"legendary","color":"#fdcb6e"},
  {"id":"shadow_bat","name":"Shadow Bat","emoji":"🦇","elixir":1,"hp":30,"dmg":15,"speed":2.5,"range":1,"target":"nearest","ability":"dodge","rarity":"common","color":"#636e72"},
  {"id":"vine_sprout","name":"Vine Sprout","emoji":"🌱","elixir":1,"hp":40,"dmg":8,"speed":0.6,"range":1,"target":"nearest","ability":"heal_radius","rarity":"common","color":"#00b894"},
  {"id":"rusty_golem","name":"Rusty Golem","emoji":"⚙️","elixir":2,"hp":80,"dmg":10,"speed":0.3,"range":0,"target":"none","ability":"taunt","rarity":"common","color":"#b2bec3"},
  {"id":"frost_owl","name":"Frost Owl","emoji":"🦉","elixir":3,"hp":65,"dmg":22,"speed":1.5,"range":1,"target":"nearest","ability":"ice_barrier","rarity":"uncommon","color":"#74b9ff"},
  {"id":"coral_guardian","name":"Coral Guardian","emoji":"🐚","elixir":3,"hp":90,"dmg":12,"speed":0.5,"range":1,"target":"nearest","ability":"ward","rarity":"uncommon","color":"#ff7675"},
  {"id":"storm_hawk","name":"Storm Hawk","emoji":"⚡","elixir":3,"hp":45,"dmg":35,"speed":2.8,"range":1,"target":"nearest","ability":"first_strike","rarity":"uncommon","color":"#fdcb6e"},
  {"id":"crystal_golem","name":"Crystal Golem","emoji":"💎","elixir":4,"hp":150,"dmg":18,"speed":0.4,"range":0,"target":"none","ability":"taunt","rarity":"rare","color":"#74b9ff"},
  {"id":"shadow_assassin","name":"Shadow Assassin","emoji":"🔪","elixir":4,"hp":55,"dmg":40,"speed":3.0,"range":1,"target":"nearest","ability":"phase","rarity":"rare","color":"#2d3436"},
  {"id":"phoenix_queen","name":"Phoenix Queen","emoji":"🔥","elixir":6,"hp":130,"dmg":45,"speed":1.5,"range":1,"target":"nearest","ability":"supernova","rarity":"legendary","color":"#ff6b6b"},
  {"id":"ancient_wyrm","name":"Ancient Wyrm","emoji":"🐲","elixir":6,"hp":200,"dmg":35,"speed":0.8,"range":1,"target":"nearest","ability":"aoe_stun","rarity":"legendary","color":"#6c5ce7"}
];

export const ESSENCES = {
  common: { name: 'Common Essence', color: '#a0a0a0', xp: 10 },
  uncommon: { name: 'Uncommon Essence', color: '#4ecdc4', xp: 25 },
  rare: { name: 'Rare Essence', color: '#9b6dff', xp: 50 },
  epic: { name: 'Epic Essence', color: '#ff6bff', xp: 75 },
  legendary: { name: 'Legendary Essence', color: '#ffd93d', xp: 100 }
};

export function getEssencesForCard(card) {
  const base = ESSENCES[card.rarity] || ESSENCES.common;
  return { ...base, cardId: card.id };
}

export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Victory', desc: 'Win your first battle', icon: '🌱', check: (s) => s.wins >= 1 },
  { id: 'three_star', name: 'Perfectionist', desc: 'Win with 3 stars', icon: '⭐', check: (s) => s.threeStarWins >= 1 },
  { id: 'win_5', name: 'Forest Guardian', desc: 'Win 5 battles', icon: '🛡', check: (s) => s.wins >= 5 },
  { id: 'win_10', name: 'Enchanted Hero', desc: 'Win 10 battles', icon: '🗡', check: (s) => s.wins >= 10 },
  { id: 'win_25', name: 'Legendary Warrior', desc: 'Win 25 battles', icon: '👑', check: (s) => s.wins >= 25 },
  { id: 'fuse_once', name: 'Fusion Master', desc: 'Perform your first fusion', icon: '🔥', check: (s) => s.fusions >= 1 },
  { id: 'fuse_10', name: 'Fusion Legend', desc: 'Perform 10 fusions', icon: '💎', check: (s) => s.fusions >= 10 },
  { id: 'boss_1', name: 'Boss Slayer', desc: 'Defeat a boss', icon: '⚔', check: (s) => s.bossesDefeated >= 1 },
  { id: 'boss_3', name: 'Boss Slayer Elite', desc: 'Defeat all 3 bosses', icon: '💀', check: (s) => s.bossesDefeated >= 3 },
 { id: 'weather_all', name: 'Weather Wizard', desc: 'Experience all 6 weather types', icon: '🌦', check: (s) => (s.weatherTypes || []).length >= 6 },
 { id: 'nature_max', name: "Nature's Chosen", desc: 'Use Nature\'s Wrath', icon: '🌿', check: (s) => (s.ultimateUses || 0) >= 1 },
 { id: 'companion_all', name: 'Spirit Collector', desc: 'Use all 5 companions', icon: '🦊', check: (s) => (s.companionsUsed || []).length >= 5 }
];

export { CARD_DATA };
