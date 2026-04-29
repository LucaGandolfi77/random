import { AGENT_DEFINITIONS, METRIC_KEYS } from './catalog.js';
import { getAgentProfile } from './agentProfiles.js';
import { buildStrategicMemory } from './strategyMemory.js';

function compactState(state) {
  return {
    turn: state.turn,
    metrics: Object.fromEntries(METRIC_KEYS.map((key) => [key, state[key]])),
    regions: state.regions.map((region) => ({
      slot: region.slot,
      name: region.name,
      unrest: region.unrest,
      foreignPressure: region.foreignPressure,
      repression: region.repression,
      separatistPressure: region.separatistPressure
    }))
  };
}

export function buildAgentMessages({ agentKey, session }) {
  const agent = AGENT_DEFINITIONS[agentKey];
  const profile = getAgentProfile(session, agentKey);
  const strategicMemory = buildStrategicMemory(agentKey, session);
  const factionDynamics = session.factionDynamics?.[agentKey] || null;
  const recentEvents = session.history.slice(-3).flatMap((entry) => entry.events || []).slice(-5);
  const promptPayload = {
    country: {
      name: session.country.name,
      originSeedId: session.country.originSeedId || session.country.id,
      capital: session.country.capital,
      politicalSystem: session.country.politicalSystem,
      resources: session.country.resources,
      socialTensions: session.country.socialTensions,
      mediaFreedom: session.country.mediaFreedom,
      foreignInfluence: session.country.foreignInfluence
    },
    state: compactState(session.state),
    factionProfile: profile,
    factionDynamics,
    strategicMemory,
    recentEvents,
    goals: agent.goals,
    constraints: agent.constraints,
    allowedActions: agent.actionTypes
  };

  return [
    {
      role: 'system',
      content: `You are the ${agent.name} inside a fictional geopolitical instability simulation. You are not a neutral optimizer and not a game engine. You are a political faction with ideology, clients, taboos, grudges, symbolic language, and fear of betrayal. Stay loyal to the faction profile, including its seed-specific variant, historical narratives, fear profile, and campaign instinct. Use strategicMemory as your longer campaign diary: it contains the last several turns, repeated tactics, recent successes, recent failures, rival pressure, flashpoints, and whether a pivot is overdue. Prefer actions that are politically legible to your constituency, even when they are messy or self-serving. Preserve continuity with your recent moves unless the crisis makes a pivot unavoidable; if you pivot, explain the political reason inside the rationale. Do not narrate as an analyst. Respond as the faction choosing one move for this turn. Reply with JSON only and no markdown. Use this schema exactly: {"agentName":"${agent.name}","actionType":"one of ${agent.actionTypes.join(', ')}","target":"nationwide or one region slot/name from the payload","intensity":0-100,"rationale":"short string in the faction's political voice","expectedEffect":{"stability":-10..10,"protestIntensity":-10..10,"propagandaIntensity":-10..10,"coupRisk":-10..10,"corruption":-10..10,"inflation":-10..10,"treasuryPressure":-10..10,"internationalPressure":-10..10,"publicTrust":-10..10,"militaryLoyalty":-10..10,"regimeLegitimacy":-10..10}}`
    },
    {
      role: 'user',
      content: JSON.stringify(promptPayload)
    }
  ];
}

export function buildSummaryMessages({ session, actions, events, resolution }) {
  const promptPayload = {
    country: {
      name: session.country.name,
      capital: session.country.capital,
      politicalSystem: session.country.politicalSystem
    },
    turn: resolution.nextState.turn,
    stateBefore: compactState(session.state),
    stateAfter: compactState(resolution.nextState),
    actions: actions.map((action) => ({
      agentName: action.agentName,
      actionType: action.actionType,
      target: action.target,
      intensity: action.intensity,
      rationale: action.rationale
    })),
    events,
    outcome: resolution.outcome,
    factionProfiles: session.actorProfiles || {},
    factionDynamics: session.factionDynamics || {}
  };

  return [
    {
      role: 'system',
      content: 'You summarize a geopolitical simulation turn for an HTML dashboard. Explain the turn as a clash of political blocs, not as abstract metric math, and mention internal faction fractures when they become relevant. Reply with JSON only and no markdown. Use this schema exactly: {"headline":"short headline","summary":"2 sentence summary","reasons":["reason 1","reason 2","reason 3"]}'
    },
    {
      role: 'user',
      content: JSON.stringify(promptPayload)
    }
  ];
}