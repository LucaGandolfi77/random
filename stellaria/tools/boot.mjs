import * as model from '../js/domain/model.js';
import * as world from '../js/domain/world.js';

const s = model.defaultState();
console.log('default state ok', Object.keys(s).length);
const c = world.CITIZENS[0];
const r = model.performGesture(s, 'piazza', 'annuire', c.id);
console.log('gesture result', r);
if (r.stars < 0 || r.reflex < 0) throw new Error('bad result');
console.log('stars +' + r.stars + ' riflesso +' + r.reflex);
const moved = world.moveTo(s, 'caffè');
console.log('move ok', moved);
console.log('fame', world.computeFame(s));
const saved = JSON.stringify(s);
const parsed = JSON.parse(saved);
if (!model.validateSave(parsed)) throw new Error('validate failed');
const migrated = model.migrate(parsed);
console.log('migrate ok', migrated.version);
console.log('BOOT OK');
