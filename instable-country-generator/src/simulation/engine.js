import { normalizeRequestedModel, roundMetric, TURN_LIMIT } from '../config.js';
import { createCountryProfile } from '../data/worldSeeds.js';
import { requestJsonCompletion } from '../services/openrouter.js';
import { AGENT_DEFINITIONS, AGENT_ORDER, METRIC_KEYS } from './catalog.js';
import { createAgentProfiles } from './agentProfiles.js';
import { buildFactionDynamics, evolveFactionDynamics } from './factionDynamics.js';
import { createMockAction, createMockSummary } from './mockAgents.js';
import { buildAgentMessages, buildSummaryMessages } from './prompts.js';
import { evaluateOutcome, resolveTurn } from './resolver.js';
import { parseJsonObject, sanitizeAgentAction, sanitizeSummary } from './validators.js';

function buildInitialSummary(country) {
  return {
    headline: `${country.name} starts in a fragile equilibrium`,
    summary: `${country.name} opens with layered political stress around ${country.capital}. The dashboard is ready to simulate how government, opposition, lobbies, citizens, and foreign media push the country toward survival or rupture.`,
    reasons: [
      `Baseline stability begins under pressure from ${country.socialTensions[0].toLowerCase()}.`,
      `Foreign influence is already meaningful around strategic resources and media attention.`,
      `Military loyalty and public trust will determine whether tension becomes transition or coercion.`
    ]
  };
}

function buildInitialEvent(country) {
  return {
    type: 'briefing',
    severity: 'low',
    headline: `Opening briefing for ${country.name}`,
    detail: `${country.capital} faces an unstable opening balance between elite control, public frustration, and outside scrutiny.`
  };
}

export function buildSession({ seedId, model, useMock }) {
  const country = createCountryProfile(seedId);
  const createdAt = new Date().toISOString();
  const state = {
    turn: 0,
    ...country.initialState,
    regions: country.regions.map((region) => ({
      slot: region.slot,
      name: region.name,
      resource: region.resource,
      unrest: region.baseline.unrest,
      foreignPressure: region.baseline.foreignPressure,
      repression: region.baseline.repression,
      separatistPressure: region.baseline.separatistPressure
    }))
  };
  const actorProfiles = createAgentProfiles(country, state);
  const factionDynamics = buildFactionDynamics(country, actorProfiles, state);

  return {
    country: {
      id: country.id,
      originSeedId: country.originSeedId || country.id,
      name: country.name,
      capital: country.capital,
      politicalSystem: country.politicalSystem,
      description: country.description,
      tagline: country.tagline,
      flag: country.flag,
      resources: country.resources,
      socialTensions: country.socialTensions,
      mediaFreedom: country.mediaFreedom,
      foreignInfluence: country.foreignInfluence
    },
    state,
    settings: {
      model,
      useMock,
      maxTurns: TURN_LIMIT
    },
    actorProfiles,
    factionDynamics,
    meta: {
      createdAt,
      updatedAt: createdAt,
      storageMode: 'sqlite'
    },
    latestTurn: {
      index: 0,
      actions: [],
      events: [buildInitialEvent(country)],
      metricDeltas: {},
      summary: buildInitialSummary(country),
      outcome: null
    },
    history: [
      {
        index: 0,
        actions: [],
        events: [buildInitialEvent(country)],
        metricDeltas: {},
        summary: buildInitialSummary(country),
        outcome: null
      }
    ],
    status: {
      ended: false,
      outcome: null
    }
  };
}

async function runLiveAgent({ agentKey, session, runtimeConfig, model }) {
  const rawCompletion = await requestJsonCompletion({
    runtimeConfig,
    model,
    messages: buildAgentMessages({ agentKey, session }),
    temperature: 0.8,
    maxTokens: 360
  });
  const parsed = parseJsonObject(rawCompletion);

  if (!parsed) {
    throw new Error(`Invalid JSON returned for ${agentKey}.`);
  }

  return sanitizeAgentAction(parsed, agentKey, session.state.regions);
}

async function buildLiveSummary({ session, actions, resolution, runtimeConfig, model }) {
  const fallbackSummary = createMockSummary({
    country: session.country,
    actions,
    events: resolution.events,
    resolution
  });

  try {
    const rawCompletion = await requestJsonCompletion({
      runtimeConfig,
      model,
      messages: buildSummaryMessages({ session, actions, events: resolution.events, resolution }),
      temperature: 0.65,
      maxTokens: 260
    });
    const parsed = parseJsonObject(rawCompletion);

    if (!parsed) {
      return fallbackSummary;
    }

    return sanitizeSummary(parsed, fallbackSummary);
  } catch {
    return fallbackSummary;
  }
}

export async function advanceSession({ session, model, useMock, runtimeConfig, availableModels }) {
  if (session.status.ended) {
    return session;
  }

  const normalizedModel = normalizeRequestedModel(model || session.settings.model, availableModels);
  const liveMode = Boolean(runtimeConfig.apiKey) && !useMock && Boolean(normalizedModel);

  const actions = await Promise.all(
    AGENT_ORDER.map(async (agentKey) => {
      if (!liveMode) {
        return createMockAction({ agentKey, session });
      }

      try {
        return await runLiveAgent({ agentKey, session, runtimeConfig, model: normalizedModel });
      } catch (error) {
        return {
          ...createMockAction({ agentKey, session }),
          source: 'fallback',
          fallbackReason: error.message
        };
      }
    })
  );

  const resolution = resolveTurn({ session, actions });
  const factionUpdate = evolveFactionDynamics({ session, actions, resolution });

  METRIC_KEYS.forEach((metric) => {
    const delta = factionUpdate.additionalMetricDeltas[metric] || 0;

    if (delta !== 0) {
      resolution.metricDeltas[metric] = Math.round((resolution.metricDeltas[metric] || 0) + delta);
      resolution.nextState[metric] = roundMetric(resolution.nextState[metric] + delta);
    }
  });

  if (factionUpdate.factionEvents.length > 0) {
    resolution.events = [...resolution.events, ...factionUpdate.factionEvents].slice(0, 6);
  }

  resolution.outcome = evaluateOutcome(resolution.nextState, actions, session.country.mediaFreedom, resolution.nextState.turn);
  const summary = liveMode
    ? await buildLiveSummary({ session, actions, resolution, runtimeConfig, model: normalizedModel })
    : createMockSummary({
        country: session.country,
        actions,
        events: resolution.events,
        resolution
      });

  const turnRecord = {
    index: resolution.nextState.turn,
    actions,
    events: resolution.events,
    metricDeltas: resolution.metricDeltas,
    summary,
    outcome: resolution.outcome,
    factionSnapshot: factionUpdate.nextFactionDynamics
  };

  session.state = resolution.nextState;
  session.settings.model = normalizedModel;
  session.settings.useMock = !liveMode;
  session.latestTurn = turnRecord;
  session.history.push(turnRecord);
  session.factionDynamics = factionUpdate.nextFactionDynamics;
  session.meta = {
    ...(session.meta || {}),
    updatedAt: new Date().toISOString(),
    storageMode: 'sqlite'
  };
  session.status = {
    ended: Boolean(resolution.outcome),
    outcome: resolution.outcome
  };

  return session;
}

export function describeAgentModes(runtimeConfig, availableModels) {
  return {
    apiEnabled: Boolean(runtimeConfig.apiKey),
    availableModels,
    defaultModel: normalizeRequestedModel(runtimeConfig.defaultModel, availableModels),
    storageMode: 'sqlite',
    exportFormats: ['json', 'html'],
    mockMode: true,
    agents: Object.values(AGENT_DEFINITIONS).map((agent) => ({
      key: agent.key,
      name: agent.name,
      actions: agent.actionTypes
    }))
  };
}