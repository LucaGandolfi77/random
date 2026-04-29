import { clamp, roundMetric } from '../config.js';
import { METRIC_KEYS } from './catalog.js';
import { STRATEGIC_WEIGHTS } from './strategyMemory.js';

const CURRENT_TEMPLATES = {
  government: [
    {
      key: 'security_hardliners',
      name: 'Security Hardliners',
      doctrine: 'restore obedience through coercive discipline',
      preferredActions: ['security_crackdown', 'emergency_decree']
    },
    {
      key: 'machine_pragmatists',
      name: 'Machine Pragmatists',
      doctrine: 'stabilize the regime through patronage and managed bargains',
      preferredActions: ['cabinet_reshuffle', 'state_broadcast', 'targeted_subsidies']
    },
    {
      key: 'institutional_reformers',
      name: 'Institutional Reformers',
      doctrine: 'save the state by conceding just enough to survive',
      preferredActions: ['negotiate_pact', 'targeted_subsidies']
    }
  ],
  opposition: [
    {
      key: 'street_maximalists',
      name: 'Street Maximalists',
      doctrine: 'escalate pressure until the regime visibly cracks',
      preferredActions: ['mobilize_protest', 'strike_support']
    },
    {
      key: 'civic_institutionalists',
      name: 'Civic Institutionalists',
      doctrine: 'convert anger into a lawful transition and broad coalition',
      preferredActions: ['demand_election', 'shadow_coalition']
    },
    {
      key: 'elite_brokers',
      name: 'Elite Brokers',
      doctrine: 'win by peeling away regime insiders and exposing rot',
      preferredActions: ['elite_split', 'expose_scandal']
    }
  ],
  lobby_groups: [
    {
      key: 'extractive_hawks',
      name: 'Extractive Hawks',
      doctrine: 'protect margins even if volatility deepens',
      preferredActions: ['price_manipulation', 'capital_strike']
    },
    {
      key: 'stability_brokers',
      name: 'Stability Brokers',
      doctrine: 'keep the system barely governable so contracts survive',
      preferredActions: ['broker_backchannel', 'fund_loyalists']
    },
    {
      key: 'gray_networks',
      name: 'Gray Networks',
      doctrine: 'profit through sanctions workarounds and shadow routing',
      preferredActions: ['sanctions_evasion', 'patronage_blitz']
    }
  ],
  citizens: [
    {
      key: 'mutualist_civics',
      name: 'Mutualist Civics',
      doctrine: 'build survival and dignity from the neighborhood outward',
      preferredActions: ['community_aid', 'neighborhood_councils']
    },
    {
      key: 'street_radicals',
      name: 'Street Radicals',
      doctrine: 'force visibility through disruption and confrontation',
      preferredActions: ['mass_strike', 'riot_wave']
    },
    {
      key: 'fearful_survivalists',
      name: 'Fearful Survivalists',
      doctrine: 'minimize exposure and preserve the household under duress',
      preferredActions: ['self_censor', 'flee_capital']
    }
  ],
  foreign_media: [
    {
      key: 'rights_watchers',
      name: 'Rights Watchers',
      doctrine: 'amplify abuses and moral pressure',
      preferredActions: ['spotlight_abuses', 'highlight_opposition']
    },
    {
      key: 'market_realists',
      name: 'Market Realists',
      doctrine: 'frame instability through finance, risk, and state capacity',
      preferredActions: ['market_alarm', 'normalize_regime']
    },
    {
      key: 'interventionist_editors',
      name: 'Interventionist Editors',
      doctrine: 'push external pressure until outsiders act',
      preferredActions: ['sanctions_campaign', 'spotlight_abuses']
    }
  ]
};

const SPLIT_IMPACTS = {
  government: { stability: -5, coupRisk: 5, regimeLegitimacy: -4, militaryLoyalty: -4 },
  opposition: { protestIntensity: -4, regimeLegitimacy: 3, publicTrust: -2 },
  lobby_groups: { treasuryPressure: 4, inflation: 2, stability: -2 },
  citizens: { publicTrust: -4, stability: -2, protestIntensity: 1 },
  foreign_media: { internationalPressure: 3, propagandaIntensity: 2, publicTrust: -1 }
};

const ACTIVE_SPLIT_DRAG = {
  government: { stability: -2, regimeLegitimacy: -1 },
  opposition: { protestIntensity: -1, regimeLegitimacy: 1 },
  lobby_groups: { treasuryPressure: 1, corruption: 1 },
  citizens: { publicTrust: -1, stability: -1 },
  foreign_media: { internationalPressure: 1 }
};

const RECONCILIATION_IMPACTS = {
  government: { stability: 2, militaryLoyalty: 2 },
  opposition: { protestIntensity: 2, regimeLegitimacy: -1 },
  lobby_groups: { treasuryPressure: -1, stability: 1 },
  citizens: { publicTrust: 2, stability: 1 },
  foreign_media: { internationalPressure: 1 }
};

const SEVERITY_RANK = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

function emptyMetricMap() {
  return Object.fromEntries(METRIC_KEYS.map((metric) => [metric, 0]));
}

function applyMetricImpact(metricDeltas, impact = {}) {
  Object.entries(impact).forEach(([metric, value]) => {
    if (metric in metricDeltas) {
      metricDeltas[metric] += value;
    }
  });
}

function normalizeCurrents(currents) {
  const total = currents.reduce((sum, current) => sum + current.influence, 0) || 1;
  let remainder = 100;

  return currents.map((current, index) => {
    const normalized = index === currents.length - 1
      ? remainder
      : Math.max(5, Math.round((current.influence / total) * 100));
    remainder -= normalized;
    return {
      ...current,
      influence: normalized,
      irritation: roundMetric(current.irritation)
    };
  });
}

function scoreTurn(agentKey, metricDeltas = {}) {
  const weights = STRATEGIC_WEIGHTS[agentKey] || {};
  return Object.entries(weights).reduce((sum, [metric, weight]) => sum + (Number(metricDeltas[metric]) || 0) * weight, 0);
}

function createCurrentState(template, influence) {
  return {
    ...template,
    influence,
    irritation: 24
  };
}

function buildInitialCurrents(agentKey, state) {
  const templates = CURRENT_TEMPLATES[agentKey] || [];

  switch (agentKey) {
    case 'government':
      if (state.protestIntensity > 40 || state.publicTrust < 40) {
        return [42, 33, 25].map((value, index) => createCurrentState(templates[index], value));
      }
      return [31, 40, 29].map((value, index) => createCurrentState(templates[index], value));
    case 'opposition':
      if (state.corruption > 55) {
        return [29, 26, 45].map((value, index) => createCurrentState(templates[index], value));
      }
      return [36, 37, 27].map((value, index) => createCurrentState(templates[index], value));
    case 'lobby_groups':
      return [39, 34, 27].map((value, index) => createCurrentState(templates[index], value));
    case 'citizens':
      if (state.inflation > 45 || state.publicTrust < 40) {
        return [27, 41, 32].map((value, index) => createCurrentState(templates[index], value));
      }
      return [41, 29, 30].map((value, index) => createCurrentState(templates[index], value));
    case 'foreign_media':
      if (state.internationalPressure > 40 || state.protestIntensity > 35) {
        return [41, 24, 35].map((value, index) => createCurrentState(templates[index], value));
      }
      return [30, 44, 26].map((value, index) => createCurrentState(templates[index], value));
    default:
      return templates.map((template) => createCurrentState(template, Math.round(100 / Math.max(templates.length, 1))));
  }
}

function pickDominantCurrent(currents = []) {
  return [...currents].sort((left, right) => right.influence - left.influence || left.irritation - right.irritation)[0] || null;
}

function pickDissidentCurrent(currents = [], dominantKey) {
  return [...currents]
    .filter((current) => current.key !== dominantKey)
    .sort((left, right) => (right.irritation + right.influence) - (left.irritation + left.influence))[0] || null;
}

function buildFactionFaultLine(agentState, dominantCurrent, dissidentCurrent) {
  if (!dominantCurrent || !dissidentCurrent) {
    return 'No major fault line is visible.';
  }

  return `${dominantCurrent.name} are setting the line, but ${dissidentCurrent.name} are contesting it from inside the faction.`;
}

function createSplitEvent(agentName, splitState, turn) {
  return {
    type: 'faction_split',
    severity: splitState.severity,
    headline: `${agentName} fracture around ${splitState.currentName}`,
    detail: `${splitState.currentName} broke discipline on turn ${turn}, arguing for ${splitState.doctrine}. ${splitState.reason}`,
    region: null
  };
}

function createReconciliationEvent(agentName, splitState) {
  return {
    type: 'faction_reconciliation',
    severity: 'medium',
    headline: `${agentName} paper over an internal split`,
    detail: `${splitState.currentName} accept a temporary truce, but the faction remains marked by the dispute.`,
    region: null
  };
}

function evolveSingleFaction({ agentKey, agentName, previous, action, resolution }) {
  const turnScore = scoreTurn(agentKey, resolution.metricDeltas);
  const currents = structuredClone(previous.currents || []);

  currents.forEach((current) => {
    const aligned = current.preferredActions.includes(action.actionType);
    current.influence += aligned ? 6 : -2;
    current.irritation += aligned ? -5 : 4;

    if (current.key === previous.dominantCurrentKey && turnScore < -4) {
      current.influence -= 5;
      current.irritation += 8;
    }

    if (current.key !== previous.dominantCurrentKey && turnScore < -4) {
      current.influence += 3;
      current.irritation += 2;
    }

    if (previous.activeSplit && current.key === previous.activeSplit.currentKey) {
      current.influence += 2;
      current.irritation += 2;
    }

    current.influence = clamp(current.influence, 8, 72);
    current.irritation = clamp(current.irritation, 0, 100);
  });

  const normalizedCurrents = normalizeCurrents(currents);
  const dominantCurrent = pickDominantCurrent(normalizedCurrents);
  const dissidentCurrent = pickDissidentCurrent(normalizedCurrents, dominantCurrent?.key);
  const topGap = dominantCurrent && dissidentCurrent ? dominantCurrent.influence - dissidentCurrent.influence : 100;
  let cohesion = clamp(previous.cohesion + (turnScore > 4 ? 4 : turnScore < -4 ? -8 : -1) + (previous.activeSplit ? -5 : 0) - Math.max(0, 18 - topGap), 0, 100);
  let splitRisk = clamp(100 - cohesion + Math.max(0, (dissidentCurrent?.irritation || 0) - 55) * 0.7 + (topGap < 8 ? 12 : 0) + (turnScore < -2 ? 6 : -1), 0, 100);
  let activeSplit = previous.activeSplit ? structuredClone(previous.activeSplit) : null;
  const extraMetricDeltas = emptyMetricMap();
  const events = [];

  if (activeSplit) {
    applyMetricImpact(extraMetricDeltas, ACTIVE_SPLIT_DRAG[agentKey]);
  }

  if (!activeSplit && splitRisk >= 76 && dissidentCurrent && dissidentCurrent.irritation >= 62) {
    activeSplit = {
      currentKey: dissidentCurrent.key,
      currentName: dissidentCurrent.name,
      doctrine: dissidentCurrent.doctrine,
      sinceTurn: resolution.nextState.turn,
      severity: splitRisk > 86 ? 'high' : 'medium',
      reason: `The line around ${action.actionType.replaceAll('_', ' ')} convinced them the leadership is betraying the faction's own instincts.`
    };
    cohesion = clamp(cohesion - 12, 0, 100);
    splitRisk = clamp(splitRisk + 8, 0, 100);
    applyMetricImpact(extraMetricDeltas, SPLIT_IMPACTS[agentKey]);
    events.push(createSplitEvent(agentName, activeSplit, resolution.nextState.turn));
  } else if (activeSplit && splitRisk < 42 && turnScore > 4) {
    events.push(createReconciliationEvent(agentName, activeSplit));
    applyMetricImpact(extraMetricDeltas, RECONCILIATION_IMPACTS[agentKey]);
    activeSplit = null;
    cohesion = clamp(cohesion + 10, 0, 100);
    splitRisk = clamp(splitRisk - 18, 0, 100);
  }

  const nextState = {
    currents: normalizedCurrents,
    dominantCurrentKey: dominantCurrent?.key || null,
    dominantCurrentName: dominantCurrent?.name || 'No dominant current',
    cohesion: roundMetric(cohesion),
    splitRisk: roundMetric(splitRisk),
    activeSplit,
    lastTurnScore: Number(turnScore.toFixed(2)),
    faultLine: buildFactionFaultLine(previous, dominantCurrent, dissidentCurrent),
    campaignMood: turnScore > 4 ? 'confident' : turnScore < -4 ? 'embattled' : 'tense'
  };

  return {
    nextState,
    extraMetricDeltas,
    events
  };
}

export function buildFactionDynamics(_country, actorProfiles, state) {
  return Object.fromEntries(
    Object.entries(actorProfiles).map(([agentKey, profile]) => {
      const currents = buildInitialCurrents(agentKey, state);
      const dominant = pickDominantCurrent(currents);
      return [
        agentKey,
        {
          currents,
          dominantCurrentKey: dominant?.key || null,
          dominantCurrentName: dominant?.name || 'No dominant current',
          cohesion: agentKey === 'government' ? 66 : agentKey === 'lobby_groups' ? 64 : 58,
          splitRisk: agentKey === 'government' ? 28 : agentKey === 'lobby_groups' ? 24 : 34,
          activeSplit: null,
          lastTurnScore: 0,
          faultLine: `${profile.currentPosture[0].toUpperCase()}${profile.currentPosture.slice(1)}, the faction still hides its internal fault lines.`,
          campaignMood: 'watchful'
        }
      ];
    })
  );
}

export function evolveFactionDynamics({ session, actions, resolution }) {
  const nextFactionDynamics = {};
  const combinedMetricDeltas = emptyMetricMap();
  const factionEvents = [];

  actions.forEach((action) => {
    const previous = session.factionDynamics?.[action.agentKey];

    if (!previous) {
      return;
    }

    const evolved = evolveSingleFaction({
      agentKey: action.agentKey,
      agentName: action.agentName,
      previous,
      action,
      resolution
    });

    nextFactionDynamics[action.agentKey] = evolved.nextState;
    applyMetricImpact(combinedMetricDeltas, evolved.extraMetricDeltas);
    factionEvents.push(...evolved.events);
  });

  const orderedEvents = factionEvents
    .sort((left, right) => (SEVERITY_RANK[right.severity] || 0) - (SEVERITY_RANK[left.severity] || 0))
    .slice(0, 3);

  return {
    nextFactionDynamics,
    additionalMetricDeltas: combinedMetricDeltas,
    factionEvents: orderedEvents
  };
}