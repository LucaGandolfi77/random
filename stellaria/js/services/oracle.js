// services/oracle.js — generatore procedurale potenziato (zero deps).
// Grammatica + template pesati su stato. Hook WebNN no-op (futuro).
import { t } from '../core/i18n.js';
import { getSeason } from '../services/ambient.js';

const TEMPLATES = {
  giorno: [
    'Il sole illumina ciò che conta davvero: {mood}.',
    'Oggi la piazza sente {mood} più forte del vento.',
    '{stars} Stelle in tasca, {riflesso} Riflesso nel cuore. {mood}',
  ],
  crepuscolo: [
    'Tra stelle e ombre, {mood}.',
    'La fama si posa sulle spalle come un mantello leggero. {mood}',
  ],
  notte: [
    'Di notte, chi non ha fama diventa specchio. {mood}.',
    'Nessun occhio, solo il tuo battito. {mood}',
  ],
};

export function generateOracle(state) {
  const hour = (state && state.time && state.time.hour) || 10;
  const riflesso = (state && state.riflesso) || 0;
  const fame = (state && state.fame) || 1;
  const stars = (state && state.stars) || 0;
  const phase = hour < 6 || hour >= 20 ? 'notte' : hour < 18 ? 'giorno' : 'crepuscolo';
  const mood = riflesso > 25 ? 'interiorità' : fame > 3 ? 'fama' : 'ricerca';
  const pool = TEMPLATES[phase] || TEMPLATES.giorno;
  const line = pool[(hour + riflesso) % pool.length]
    .replace('{mood}', mood)
    .replace('{stars}', stars)
    .replace('{riflesso}', riflesso);
  return { line, mood, phase, stars, riflesso, fame };
}
