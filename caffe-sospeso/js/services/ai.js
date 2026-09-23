const STORIES = {
  it: [
    '{name} ha lasciato un messaggio: "{msg}"',
    'Un aroma di {aroma} aleggia ancora...',
    'Il caff\u00e8 sospeso di {phase} \u00e8 stato ritirato.',
  ],
  en: [
    '{name} left a note: "{msg}"',
    'An {aroma} aroma lingers...',
    'The {phase} suspended coffee was picked up.',
  ],
};
const MSGS = {
  it: ['la piazza \u00e8 in pace', 'il sole \u00e8 tornato', 'le foglie danzano', 'il vapore sale piano', 'un sorriso basta'],
  en: ['the square is at peace', 'the sun is back', 'leaves dance', 'steam rises softly', 'a smile is enough'],
};
const PHASES = { it: { alba: 'alba', giorno: 'giornata', tramonto: 'tramonto', sera: 'sera' }, en: { alba: 'dawn', giorno: 'day', tramonto: 'dusk', sera: 'evening' } };

export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function generateSospesoStory(state, customerName) {
  const lang = state.lang || 'it';
  const tmpl = pick(STORIES[lang] ?? STORIES.it);
  const msg = pick(MSGS[lang] ?? MSGS.it);
  const phase = PHASES[lang][state.timePhase] ?? state.timePhase;
  const aroma = pick(Object.keys(state.aromi).filter((k) => state.aromi[k]));
  const aromaName = aroma || 'un aroma';
  return tmpl
    .replaceAll('{name}', customerName ?? 'un amico')
    .replaceAll('{msg}', msg)
    .replaceAll('{aroma}', aromaName)
    .replaceAll('{phase}', phase);
}

export function baristaHint(state) {
  const w = state.weather;
  if (w === 'pioggia') return { hintKey: 'rain_hint' };
  if (w === 'sereno') return { hintKey: 'sun_hint' };
  return { hintKey: 'default_hint' };
}
