import { clamp } from '../config.js';
import { ACTION_LIBRARY, AGENT_DEFINITIONS, METRIC_KEYS, METRIC_LABELS } from './catalog.js';
import { getAgentProfile } from './agentProfiles.js';
import { buildStrategicMemory } from './strategyMemory.js';

function averageRegionValue(regions, key) {
  if (!regions.length) {
    return 0;
  }

  return regions.reduce((sum, region) => sum + region[key], 0) / regions.length;
}

function getHottestRegion(regions, key = 'unrest') {
  return [...regions].sort((left, right) => right[key] - left[key])[0] || regions[0];
}

function scaledEffect(effectMap = {}, intensity = 50) {
  const factor = intensity / 100;
  return Object.fromEntries(
    Object.entries(effectMap)
      .filter(([key]) => METRIC_KEYS.includes(key))
      .map(([key, value]) => [key, Math.round(value * factor)])
  );
}

function createAction(agentKey, actionType, target, intensity, rationale) {
  return {
    agentKey,
    agentName: AGENT_DEFINITIONS[agentKey].name,
    actionType,
    target,
    intensity: Math.round(clamp(intensity, 10, 100)),
    rationale,
    expectedEffect: scaledEffect(ACTION_LIBRARY[agentKey][actionType].effect, intensity),
    source: 'mock'
  };
}

function humanizeAction(actionType) {
  return String(actionType || '').replaceAll('_', ' ');
}

function buildMemoryCue(memory) {
  if (memory.pivotRisk && memory.lastOwnActionType) {
    return `Recent reliance on ${humanizeAction(memory.lastOwnActionType)} has started to stall, so the faction presents this as a corrective pivot.`;
  }

  if (memory.recentSuccesses[0]) {
    return `Recent gains came from ${humanizeAction(memory.recentSuccesses[0].actionType)}, so the faction wants to preserve momentum.`;
  }

  if (memory.recentFailures[0]) {
    return `The faction is haunted by how ${humanizeAction(memory.recentFailures[0].actionType)} recently backfired.`;
  }

  if (memory.flashpoints[0]) {
    return `The latest strategic flashpoint remains ${memory.flashpoints.at(-1).headline.toLowerCase()}.`;
  }

  return 'This remains an opening move in an unfinished campaign.';
}

function withFactionVoice(session, agentKey, rationale) {
  const profile = getAgentProfile(session, agentKey);
  const memory = buildStrategicMemory(agentKey, session);
  return `${rationale} ${profile.currentPosture[0].toUpperCase()}${profile.currentPosture.slice(1)}, the faction frames this move through ${profile.ideology}. ${buildMemoryCue(memory)}`;
}

function getDominantCurrent(session, agentKey) {
  return session.factionDynamics?.[agentKey]?.dominantCurrentKey || null;
}

export function createMockAction({ agentKey, session }) {
  const state = session.state;
  const regions = state.regions;
  const unrestRegion = getHottestRegion(regions, 'unrest');
  const repressionRegion = getHottestRegion(regions, 'repression');
  const foreignPressureRegion = getHottestRegion(regions, 'foreignPressure');
  const avgRepression = averageRegionValue(regions, 'repression');
  const dominantCurrent = getDominantCurrent(session, agentKey);

  switch (agentKey) {
    case 'government': {
      if (dominantCurrent === 'institutional_reformers' && state.protestIntensity > 48) {
        return createAction('government', 'negotiate_pact', unrestRegion.slot, 72, withFactionVoice(session, 'government', `Institutional reformers force the cabinet to test a controlled pact in ${unrestRegion.name} before hardliners lock in another cycle of repression.`));
      }

      if (dominantCurrent === 'security_hardliners' && state.protestIntensity > 42) {
        return createAction('government', 'security_crackdown', unrestRegion.slot, 78, withFactionVoice(session, 'government', `Security hardliners push forces into ${unrestRegion.name}, arguing that hesitation now would look like collapse.`));
      }

      if (state.coupRisk > 68 || state.militaryLoyalty < 45) {
        return createAction('government', state.corruption > 60 ? 'cabinet_reshuffle' : 'emergency_decree', 'nationwide', 74, withFactionVoice(session, 'government', 'The executive prioritizes elite discipline and command cohesion before the officer corps starts freelancing.'));
      }

      if (state.protestIntensity > 62) {
        if (state.publicTrust > 45) {
          return createAction('government', 'negotiate_pact', unrestRegion.slot, 69, withFactionVoice(session, 'government', `The cabinet offers a limited pact in ${unrestRegion.name} to bleed momentum out of the street without looking weak.`));
        }

        return createAction('government', 'security_crackdown', unrestRegion.slot, 76, withFactionVoice(session, 'government', `Security units are pushed into ${unrestRegion.name} to suppress demonstrations before they synchronize nationally.`));
      }

      if (state.treasuryPressure > 58 || state.inflation > 58) {
        return createAction('government', 'targeted_subsidies', unrestRegion.slot, 71, withFactionVoice(session, 'government', `Emergency subsidies are redirected to ${unrestRegion.name} to cool anger over prices and shortages.`));
      }

      return createAction('government', 'state_broadcast', 'nationwide', 58, withFactionVoice(session, 'government', 'The presidency leans on patriotic messaging to project control while avoiding a more expensive intervention.'));
    }
    case 'opposition': {
      if (dominantCurrent === 'civic_institutionalists' && state.publicTrust < 54) {
        return createAction('opposition', 'demand_election', 'nationwide', 66, withFactionVoice(session, 'opposition', 'Institutionalists insist on making the crisis look governable, not merely explosive, by forcing the election question to the center.'));
      }

      if (dominantCurrent === 'street_maximalists' && state.protestIntensity < 68) {
        return createAction('opposition', 'mobilize_protest', unrestRegion.slot, 72, withFactionVoice(session, 'opposition', `Street maximalists push for another visible surge in ${unrestRegion.name} before the regime regains narrative control.`));
      }

      if (state.corruption > 60) {
        return createAction('opposition', 'expose_scandal', 'nationwide', 72, withFactionVoice(session, 'opposition', 'Opposition figures publish a corruption dossier to tie everyday pain directly to regime theft.'));
      }

      if (state.protestIntensity < 55) {
        return createAction('opposition', 'mobilize_protest', unrestRegion.slot, 67, withFactionVoice(session, 'opposition', `Organizers push for a protest surge in ${unrestRegion.name} to build a visible center of gravity.`));
      }

      if (state.militaryLoyalty < 50) {
        return createAction('opposition', 'elite_split', 'nationwide', 73, withFactionVoice(session, 'opposition', 'Back-channel emissaries work on fracturing regime loyalists and signaling safety to defectors.'));
      }

      return createAction('opposition', state.publicTrust < 48 ? 'demand_election' : 'shadow_coalition', 'nationwide', 61, withFactionVoice(session, 'opposition', 'The opposition tries to convert diffuse anger into a recognizably political alternative.'));
    }
    case 'lobby_groups': {
      if (dominantCurrent === 'gray_networks' && state.internationalPressure > 40) {
        return createAction('lobby_groups', 'sanctions_evasion', foreignPressureRegion.slot, 68, withFactionVoice(session, 'lobby_groups', `Gray networks route influence and goods through ${foreignPressureRegion.name}, treating sanctions pressure as a pricing problem.`));
      }

      if (dominantCurrent === 'stability_brokers' && state.stability < 50) {
        return createAction('lobby_groups', 'broker_backchannel', 'nationwide', 62, withFactionVoice(session, 'lobby_groups', 'Stability brokers quietly reopen side channels because a shattered state is worse for business than a compromised one.'));
      }

      if (state.internationalPressure > 62) {
        return createAction('lobby_groups', 'sanctions_evasion', foreignPressureRegion.slot, 69, withFactionVoice(session, 'lobby_groups', `Commercial fixers reactivate gray routes through ${foreignPressureRegion.name} to protect rents from outside pressure.`));
      }

      if (state.treasuryPressure > 65) {
        return createAction('lobby_groups', 'capital_strike', 'nationwide', 66, withFactionVoice(session, 'lobby_groups', 'Business patrons withhold liquidity to force policy concessions and protect balance sheets.'));
      }

      if (state.stability < 40) {
        return createAction('lobby_groups', 'fund_loyalists', 'nationwide', 63, withFactionVoice(session, 'lobby_groups', 'Elite networks quietly finance loyal intermediaries to keep the regime functional enough for contracts to survive.'));
      }

      return createAction('lobby_groups', state.inflation < 60 ? 'price_manipulation' : 'broker_backchannel', unrestRegion.slot, 57, withFactionVoice(session, 'lobby_groups', 'Lobby actors exploit volatility while keeping a back door open to whoever controls the ministries next.'));
    }
    case 'citizens': {
      if (dominantCurrent === 'mutualist_civics' && state.publicTrust < 52) {
        return createAction('citizens', 'neighborhood_councils', unrestRegion.slot, 60, withFactionVoice(session, 'citizens', `Mutualist organizers in ${unrestRegion.name} choose local coordination over spectacle, trying to hold society together from below.`));
      }

      if (dominantCurrent === 'street_radicals' && state.protestIntensity < 72) {
        return createAction('citizens', 'mass_strike', unrestRegion.slot, 74, withFactionVoice(session, 'citizens', `Street radicals in ${unrestRegion.name} argue that private suffering is useless unless it becomes collective disruption.`));
      }

      if (state.inflation > 62 || state.treasuryPressure > 60) {
        return createAction('citizens', 'mass_strike', unrestRegion.slot, 74, withFactionVoice(session, 'citizens', `Workers and households in ${unrestRegion.name} stop cooperating with an economy that no longer pays for daily life.`));
      }

      if (avgRepression > 60 && state.publicTrust < 40) {
        return createAction('citizens', 'self_censor', 'nationwide', 54, withFactionVoice(session, 'citizens', 'Fear outpaces hope, and people retreat into private survival instead of open dissent.'));
      }

      if (state.protestIntensity > 68 && state.stability < 45) {
        return createAction('citizens', 'riot_wave', unrestRegion.slot, 78, withFactionVoice(session, 'citizens', `Crowds in ${unrestRegion.name} cross from protest into riot as patience with official promises collapses.`));
      }

      return createAction('citizens', state.publicTrust < 45 ? 'neighborhood_councils' : 'community_aid', unrestRegion.slot, 56, withFactionVoice(session, 'citizens', `Residents in ${unrestRegion.name} build local coping structures because national institutions feel unreliable.`));
    }
    case 'foreign_media': {
      if (dominantCurrent === 'interventionist_editors' && state.internationalPressure > 48) {
        return createAction('foreign_media', 'sanctions_campaign', 'nationwide', 72, withFactionVoice(session, 'foreign_media', 'Interventionist editors try to convert outrage into policy pressure before the story goes cold.'));
      }

      if (dominantCurrent === 'market_realists' && state.treasuryPressure > 46) {
        return createAction('foreign_media', 'market_alarm', foreignPressureRegion.slot, 66, withFactionVoice(session, 'foreign_media', `Market desks recast ${session.country.name} as a pricing signal, centering anxiety around ${foreignPressureRegion.name}.`));
      }

      if (avgRepression > 55) {
        return createAction('foreign_media', 'spotlight_abuses', repressionRegion.slot, 72, withFactionVoice(session, 'foreign_media', `International coverage fixates on coercion in ${repressionRegion.name}, raising reputational costs for the regime.`));
      }

      if (state.internationalPressure > 68) {
        return createAction('foreign_media', 'sanctions_campaign', 'nationwide', 70, withFactionVoice(session, 'foreign_media', 'Editors coordinate a harsher framing that nudges foreign ministries toward punitive measures.'));
      }

      if (state.treasuryPressure > 60) {
        return createAction('foreign_media', 'market_alarm', foreignPressureRegion.slot, 67, withFactionVoice(session, 'foreign_media', `Business desks frame ${session.country.name} as an instability trade, deepening financial anxiety around ${foreignPressureRegion.name}.`));
      }

      return createAction('foreign_media', state.regimeLegitimacy < 45 ? 'highlight_opposition' : 'conflict_fatigue_piece', unrestRegion.slot, 52, withFactionVoice(session, 'foreign_media', 'Outside coverage decides whether the crisis is a democratic opening, a market warning, or just background noise.'));
    }
    default:
      return createAction('government', 'state_broadcast', 'nationwide', 50, withFactionVoice(session, 'government', 'Fallback action.'));
  }
}

function describeDelta(metric, value) {
  const direction = value > 0 ? 'rose' : 'fell';
  return `${METRIC_LABELS[metric]} ${direction} by ${Math.abs(value)} points`;
}

export function createMockSummary({ country, actions, events, resolution }) {
  const rankedMetrics = Object.entries(resolution.metricDeltas)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .filter(([, value]) => value !== 0)
    .slice(0, 3);

  const headline = resolution.outcome
    ? `${country.name} edges toward ${resolution.outcome.label.toLowerCase()}`
    : `${country.name} enters turn ${resolution.nextState.turn} under renewed political strain`;

  const summary = resolution.outcome
    ? `${country.name} reached a decisive threshold after coordinated pressure from rival actors. ${resolution.outcome.description}`
    : `${actions[0].agentName} and ${actions[1].agentName} set the tone this turn while street pressure and elite maneuvering reshaped the balance. ${events[0]?.headline || 'The situation remains volatile.'}`;

  const reasons = rankedMetrics.length > 0
    ? rankedMetrics.map(([metric, value]) => describeDelta(metric, value))
    : ['No major metric moved enough to dominate the turn.', events[0]?.headline || 'The situation remains fragile.'];

  return {
    headline,
    summary,
    reasons: reasons.slice(0, 3)
  };
}