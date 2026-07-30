const scopa = require('./scopa');
const briscola = require('./briscola');
const blackjack = require('./blackjack');
const settemezzo = require('./settemezzo');
const tressette = require('./tressette');
const poker = require('./poker');
const uno = require('./uno');
const explodingkittens = require('./explodingkittens');
const skullking = require('./skullking');
const themind = require('./themind');
const thiryone = require('./thiryone');
const ramino = require('./ramino');
const scala40 = require('./scala40');
const memory = require('./memory');
const monopolydeal = require('./monopolydeal');
const odin = require('./odin');

function wrap(game) {
  return { ...game.meta, create: game.create, getPublicState: game.getPublicState, getValidActions: game.getValidActions, applyAction: game.applyAction, isOver: game.isOver, getRoundScores: game.getRoundScores, nextRound: game.nextRound, getBotAction: game.getBotAction };
}

const games = {
  scopa: wrap(scopa),
  briscola: wrap(briscola),
  blackjack: wrap(blackjack),
  settenmezzo: wrap(settemezzo),
  tressette: wrap(tressette),
  poker: wrap(poker),
  uno: wrap(uno),
  explodingkittens: wrap(explodingkittens),
  skullking: wrap(skullking),
  themind: wrap(themind),
  thiryone: wrap(thiryone),
  ramino: wrap(ramino),
  scala40: wrap(scala40),
  memory: wrap(memory),
  monopolydeal: wrap(monopolydeal),
  odin: wrap(odin),
};

const registry = {
  list() {
    return Object.values(games).map(g => ({
      id: g.id, name: g.name, description: g.description, minPlayers: g.minPlayers, maxPlayers: g.maxPlayers, deckType: g.deckType,
    }));
  },
  get(id) { return games[id] || null; },
};

module.exports = registry;
