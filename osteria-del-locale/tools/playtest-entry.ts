import { parseIntent } from '../src/engine/intent';
import { createWorld } from '../src/engine/world';
import { advanceNight, briefFrom, endingFor, takeTurn } from '../src/engine/chronicle';
import { narrateTemplate } from '../src/narrator/template';
import { analyse } from '../spike/metrics';
import type { GameState } from '../src/engine/types';

const seed = Number(process.argv[2] ?? 1337);
const nights = Number(process.argv[3] ?? 4);
const verbose = process.argv.includes('--verbose');

let state: GameState = { world: createWorld(seed), last: null, status: 'playing' };

const lines: string[] = [];
const push = (line: string): void => {
  lines.push(line);
  if (verbose) console.log(line);
};

push(`SEED ${seed}`);
push('');

const SCRIPT = [
  'look around',
  'ask about the price',
  'ask about the dog',
  'take the spoon',
  'offer the innkeeper two silver',
  'ask about the price',
  'go down',
  'look around',
  'go out',
  'attack the dog',
  'ask about the cellar',
  'go south',
  'ask about Sergeant Malk',
  'inventory',
  'rest',
  'ask about the room',
  'go up',
  'look around',
];

let failures = 0;

for (const input of SCRIPT) {
  if (state.status !== 'playing') break;
  state = takeTurn(state, parseIntent(input));
  const resolution = state.last;
  if (resolution === null) break;

  const brief = briefFrom(state.world, resolution);
  const prose = narrateTemplate(brief);
  const metrics = analyse(prose);

  const dice = resolution.dice;
  const diceText = dice === null ? '--' : `d${dice.sides}=${dice.roll} (${dice.tier})`;
  const flag = metrics.pass ? 'ok  ' : 'FAIL';
  if (!metrics.pass) failures += 1;

  push(`> ${input}`);
  push(`  [${flag}] intent=${resolution.intent.kind} beat=${resolution.beat} dice=${diceText} nerve=${state.world.nerve} silver=${state.world.silver}`);
  push(`  engine: ${brief.facts.join(' ')}`);
  push(`  narrator: ${prose}`);
  if (!metrics.pass) push(`  !! ${metrics.failures.join(', ')}`);
  push('');
}

push('NIGHT ROLL');
for (let i = 0; i < nights; i += 1) {
  if (state.status !== 'playing') break;
  state = advanceNight(state);
  push(`  night ${state.world.night}, nerve ${state.world.nerve}, silver ${state.world.silver}, status ${state.status}`);
}
push('');
push(endingFor(state));
push('');
push(`turns: ${state.world.turn}, format failures: ${failures}, status: ${state.status}`);

const report = `# Playtest — seed ${seed}\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`;
process.stdout.write(report);