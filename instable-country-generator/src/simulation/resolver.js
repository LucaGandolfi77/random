import { clamp, roundMetric, TURN_LIMIT } from '../config.js';
import { ACTION_LIBRARY, METRIC_KEYS, REGION_STATE_KEYS } from './catalog.js';

function emptyMetricMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function scaleMap(map = {}, intensity = 50) {
  const factor = intensity / 100;
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, value * factor]));
}

function buildRegionDeltaMap(regions) {
  return Object.fromEntries(regions.map((region) => [region.slot, emptyMetricMap(REGION_STATE_KEYS)]));
}

function getAverage(regions, key) {
  if (regions.length === 0) {
    return 0;
  }

  return regions.reduce((sum, region) => sum + region[key], 0) / regions.length;
}

function getPeak(regions, key) {
  return Math.max(...regions.map((region) => region[key]));
}

function pushEvent(events, type, severity, headline, detail, region = null) {
  events.push({ type, severity, headline, detail, region });
}

function applyActionDeltas({ state, actions, metricDeltas, regionDeltas }) {
  actions.forEach((action) => {
    const actionDefinition = ACTION_LIBRARY[action.agentKey][action.actionType];
    const scaledMetrics = scaleMap(actionDefinition.effect, action.intensity);
    const scaledRegion = scaleMap(actionDefinition.regionEffect, action.intensity);

    Object.entries(scaledMetrics).forEach(([metric, value]) => {
      metricDeltas[metric] += value;
    });

    if (action.target === 'nationwide') {
      state.regions.forEach((region) => {
        Object.entries(scaledRegion).forEach(([key, value]) => {
          regionDeltas[region.slot][key] += value * 0.45;
        });
      });
      return;
    }

    state.regions.forEach((region) => {
      Object.entries(scaledRegion).forEach(([key, value]) => {
        regionDeltas[region.slot][key] += region.slot === action.target ? value : value * 0.2;
      });
    });
  });
}

function applySystemicPressures(previousState, nextRegions, metricDeltas) {
  const nextInflation = previousState.inflation + metricDeltas.inflation;
  const nextCorruption = previousState.corruption + metricDeltas.corruption;
  const nextPropaganda = previousState.propagandaIntensity + metricDeltas.propagandaIntensity;
  const nextInternational = previousState.internationalPressure + metricDeltas.internationalPressure;
  const nextMilitary = previousState.militaryLoyalty + metricDeltas.militaryLoyalty;
  const averageUnrest = getAverage(nextRegions, 'unrest');
  const averageRepression = getAverage(nextRegions, 'repression');
  const peakSeparatism = getPeak(nextRegions, 'separatistPressure');

  if (nextInflation > 60) {
    metricDeltas.stability -= 3;
    metricDeltas.protestIntensity += 4;
    metricDeltas.publicTrust -= 3;
  }

  if (nextCorruption > 65) {
    metricDeltas.regimeLegitimacy -= 4;
    metricDeltas.protestIntensity += 2;
  }

  if (nextPropaganda > 70 && previousState.publicTrust < 45) {
    metricDeltas.publicTrust -= 2;
    metricDeltas.regimeLegitimacy -= 2;
  }

  if (nextInternational > 65) {
    metricDeltas.treasuryPressure += 3;
  }

  if (nextMilitary < 40) {
    metricDeltas.coupRisk += 4;
  }

  if (averageUnrest > 60) {
    metricDeltas.stability -= 4;
    metricDeltas.protestIntensity += 3;
  }

  if (averageRepression > 65) {
    metricDeltas.internationalPressure += 4;
  }

  if (peakSeparatism > 70) {
    metricDeltas.stability -= 3;
    metricDeltas.coupRisk += 2;
  }
}

function generateEvents(previousState, nextState, actions) {
  const events = [];
  const actionTypes = new Set(actions.map((action) => action.actionType));
  const unrestRegion = [...nextState.regions].sort((left, right) => right.unrest - left.unrest)[0];
  const repressionRegion = [...nextState.regions].sort((left, right) => right.repression - left.repression)[0];

  if (actionTypes.has('security_crackdown') && nextState.protestIntensity > 45) {
    pushEvent(events, 'crackdown', 'high', 'Security forces escalate street control', `Checkpoints, arrests, and intimidation operations intensify around ${unrestRegion.name}.`, unrestRegion.slot);
  }

  if (actionTypes.has('expose_scandal') && nextState.corruption > 55) {
    pushEvent(events, 'corruption_leak', 'high', 'A fresh corruption leak hits the regime', 'Financial links between ministers, fixers, and procurement networks circulate widely across domestic and foreign channels.');
  }

  if ((actionTypes.has('mass_strike') || actionTypes.has('mobilize_protest')) && nextState.protestIntensity > 70) {
    pushEvent(events, 'strike_wave', 'high', 'A coordinated strike wave spreads', `Work stoppages and road blockades radiate outward from ${unrestRegion.name}.`, unrestRegion.slot);
  }

  if ((actionTypes.has('spotlight_abuses') || actionTypes.has('sanctions_campaign')) && nextState.internationalPressure > 60) {
    pushEvent(events, 'sanctions', 'medium', 'Foreign pressure hardens', 'Diplomatic and media pressure converge into concrete discussions of sanctions, travel bans, and conditional aid.');
  }

  if (nextState.militaryLoyalty < 35 && nextState.coupRisk > 60) {
    pushEvent(events, 'army_defections', 'critical', 'Army defections are rumored across the capital', `Command discipline slips as officers weigh whether the presidency can still protect their interests.`);
  }

  if (actionTypes.has('negotiate_pact') && (actionTypes.has('shadow_coalition') || actionTypes.has('demand_election'))) {
    pushEvent(events, 'negotiations', 'medium', 'Back-channel negotiations reopen', 'Opposition intermediaries and regime envoys test a narrow landing zone for de-escalation.');
  }

  if (nextState.coupRisk > 85 && nextState.militaryLoyalty < 32) {
    pushEvent(events, 'coup_attempt', 'critical', 'A coup attempt becomes plausible', 'Multiple institutions begin acting as if the command chain may fracture within hours.');
  }

  if (nextState.stability < 25 && nextState.protestIntensity > 75) {
    pushEvent(events, 'administrative_paralysis', 'critical', 'State administration begins to seize up', 'Logistics slow down, local officials improvise, and central directives lose credibility.');
  }

  if (events.length === 0) {
    const direction = nextState.stability >= previousState.stability ? 'fragile calm' : 'slow erosion';
    pushEvent(events, 'fragile_calm', 'low', `The turn closes in ${direction}`, `Street energy and elite maneuvering remain active, but no single flashpoint dominates beyond ${repressionRegion.name}.`, repressionRegion.slot);
  }

  return events.slice(0, 3);
}

export function evaluateOutcome(nextState, actions, mediaFreedom, turn) {
  const actionTypes = new Set(actions.map((action) => action.actionType));

  if (nextState.coupRisk > 88 && nextState.militaryLoyalty < 30) {
    return {
      key: 'military_coup',
      label: 'Military Coup',
      description: 'The armed forces become the decisive arbiter after loyalty collapses and institutions stop containing the crisis.'
    };
  }

  if (nextState.stability < 18 && nextState.protestIntensity > 82 && nextState.treasuryPressure > 74) {
    return {
      key: 'state_collapse',
      label: 'State Collapse',
      description: 'Administrative capacity breaks down under simultaneous fiscal, social, and coercive strain.'
    };
  }

  if (
    nextState.publicTrust > 57 &&
    nextState.regimeLegitimacy < 44 &&
    (actionTypes.has('shadow_coalition') || actionTypes.has('demand_election')) &&
    actionTypes.has('negotiate_pact')
  ) {
    return {
      key: 'democratic_transition',
      label: 'Democratic Transition',
      description: 'Negotiated pressure produces an opening where elections or constitutional concessions look more credible than force.'
    };
  }

  if (
    nextState.propagandaIntensity > 74 &&
    nextState.protestIntensity < 30 &&
    nextState.regimeLegitimacy > 54 &&
    mediaFreedom < 35
  ) {
    return {
      key: 'authoritarian_consolidation',
      label: 'Authoritarian Consolidation',
      description: 'The regime suppresses open contestation and stabilizes control through coercion, narrative discipline, and selective patronage.'
    };
  }

  if (
    nextState.stability > 72 &&
    nextState.protestIntensity < 32 &&
    nextState.publicTrust > 55 &&
    nextState.coupRisk < 25
  ) {
    return {
      key: 'stabilized_state',
      label: 'Stabilized State',
      description: 'The crisis remains tense but manageable, and major institutions regain enough credibility to keep the system together.'
    };
  }

  if (turn < TURN_LIMIT) {
    return null;
  }

  if (nextState.coupRisk >= 70) {
    return {
      key: 'military_coup',
      label: 'Military Coup',
      description: 'By the turn limit, coercive actors have become the only credible center of power.'
    };
  }

  if (nextState.propagandaIntensity > 65 && mediaFreedom < 40) {
    return {
      key: 'authoritarian_consolidation',
      label: 'Authoritarian Consolidation',
      description: 'The regime survives by narrowing the public sphere and rewarding loyalty over legitimacy.'
    };
  }

  if (nextState.publicTrust > 52 && nextState.regimeLegitimacy < 46) {
    return {
      key: 'democratic_transition',
      label: 'Democratic Transition',
      description: 'Public patience with the old order outlasts the regime’s legitimacy, forcing a negotiated political reset.'
    };
  }

  return nextState.stability >= 50
    ? {
        key: 'stabilized_state',
        label: 'Stabilized State',
        description: 'The country reaches the turn limit without a decisive rupture and settles into a fragile equilibrium.'
      }
    : {
        key: 'state_collapse',
        label: 'State Collapse',
        description: 'The country limps to the turn limit with too little capacity and too many simultaneous crises to remain coherent.'
      };
}

export function resolveTurn({ session, actions }) {
  const previousState = session.state;
  const metricDeltas = emptyMetricMap(METRIC_KEYS);
  const regionDeltas = buildRegionDeltaMap(previousState.regions);

  applyActionDeltas({ state: previousState, actions, metricDeltas, regionDeltas });

  const nextState = structuredClone(previousState);
  nextState.turn += 1;

  nextState.regions = nextState.regions.map((region) => {
    const delta = regionDeltas[region.slot];
    return {
      ...region,
      unrest: roundMetric(region.unrest + delta.unrest),
      foreignPressure: roundMetric(region.foreignPressure + delta.foreignPressure),
      repression: roundMetric(region.repression + delta.repression),
      separatistPressure: roundMetric(region.separatistPressure + delta.separatistPressure)
    };
  });

  applySystemicPressures(previousState, nextState.regions, metricDeltas);

  METRIC_KEYS.forEach((metric) => {
    nextState[metric] = roundMetric(previousState[metric] + metricDeltas[metric]);
  });

  nextState.coupRisk = roundMetric(nextState.coupRisk + clamp((100 - nextState.militaryLoyalty) * 0.06, 0, 6));
  nextState.regimeLegitimacy = roundMetric(nextState.regimeLegitimacy - clamp((nextState.corruption - 50) * 0.03, -2, 4));

  const roundedDeltas = Object.fromEntries(METRIC_KEYS.map((metric) => [metric, Math.round(metricDeltas[metric])]));
  const events = generateEvents(previousState, nextState, actions);
  const outcome = evaluateOutcome(nextState, actions, session.country.mediaFreedom, nextState.turn);

  return {
    nextState,
    metricDeltas: roundedDeltas,
    events,
    outcome
  };
}