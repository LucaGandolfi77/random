export const STRATEGIC_WEIGHTS = {
  government: {
    stability: 2,
    militaryLoyalty: 1.8,
    regimeLegitimacy: 1.6,
    publicTrust: 1,
    protestIntensity: -1.7,
    coupRisk: -2,
    internationalPressure: -0.8
  },
  opposition: {
    protestIntensity: 1.8,
    publicTrust: 1.1,
    internationalPressure: 0.8,
    corruption: 1.1,
    regimeLegitimacy: -1.8,
    militaryLoyalty: -1.1,
    stability: -0.7
  },
  lobby_groups: {
    treasuryPressure: -1.5,
    stability: 1,
    coupRisk: -0.8,
    internationalPressure: -1.1,
    corruption: 1.2,
    inflation: 0.8
  },
  citizens: {
    publicTrust: 1.9,
    stability: 0.8,
    protestIntensity: 1,
    corruption: -0.9,
    inflation: -1.9,
    treasuryPressure: -0.8,
    regimeLegitimacy: -0.4
  },
  foreign_media: {
    internationalPressure: 1.8,
    protestIntensity: 0.8,
    regimeLegitimacy: -1.2,
    stability: -0.5,
    treasuryPressure: 0.6,
    publicTrust: 0.3
  }
};

function classifyVerdict(score) {
  if (score >= 4) {
    return 'reinforced';
  }

  if (score <= -4) {
    return 'backfired';
  }

  return 'mixed';
}

function scoreMetricDeltas(metricDeltas = {}, weights = {}) {
  return Object.entries(weights).reduce((sum, [metric, weight]) => sum + (Number(metricDeltas[metric]) || 0) * weight, 0);
}

function buildPressureMetrics(state, weights = {}) {
  return Object.entries(weights)
    .map(([metric, weight]) => ({
      metric,
      direction: weight > 0 ? 'prefer_higher' : 'prefer_lower',
      currentValue: Number(state?.[metric]) || 0,
      urgency: weight > 0 ? Number(state?.[metric]) || 0 : 100 - (Number(state?.[metric]) || 0)
    }))
    .sort((left, right) => right.urgency - left.urgency)
    .slice(0, 4);
}

function buildPatternList(ownMoves = [], predicate) {
  const aggregates = new Map();

  ownMoves.filter(predicate).forEach((move) => {
    const current = aggregates.get(move.actionType) || { actionType: move.actionType, count: 0, totalScore: 0 };
    current.count += 1;
    current.totalScore += move.score;
    aggregates.set(move.actionType, current);
  });

  return [...aggregates.values()]
    .map((entry) => ({
      actionType: entry.actionType,
      count: entry.count,
      averageScore: Number((entry.totalScore / entry.count).toFixed(2))
    }))
    .sort((left, right) => Math.abs(right.averageScore) - Math.abs(left.averageScore))
    .slice(0, 3);
}

function buildRivalPressure(turns = [], agentKey) {
  const map = new Map();

  turns.forEach((turn) => {
    (turn.actions || []).forEach((action) => {
      if (action.agentKey === agentKey) {
        return;
      }

      const current = map.get(action.agentKey) || {
        agentKey: action.agentKey,
        agentName: action.agentName,
        count: 0,
        latestActionType: action.actionType,
        latestTarget: action.target,
        latestTurn: turn.index
      };

      current.count += 1;
      current.latestActionType = action.actionType;
      current.latestTarget = action.target;
      current.latestTurn = turn.index;
      map.set(action.agentKey, current);
    });
  });

  return [...map.values()]
    .sort((left, right) => right.count - left.count || right.latestTurn - left.latestTurn)
    .slice(0, 4);
}

function buildFlashpoints(turns = []) {
  return turns
    .flatMap((turn) =>
      (turn.events || []).map((event) => ({
        turn: turn.index,
        headline: event.headline,
        severity: event.severity,
        region: event.region || null
      }))
    )
    .slice(-8);
}

export function buildStrategicMemory(agentKey, session) {
  const turns = session.history.filter((turn) => turn.index > 0).slice(-8);
  const weights = STRATEGIC_WEIGHTS[agentKey] || {};
  const ownMoves = turns
    .map((turn) => {
      const action = (turn.actions || []).find((entry) => entry.agentKey === agentKey);

      if (!action) {
        return null;
      }

      const score = Number(scoreMetricDeltas(turn.metricDeltas, weights).toFixed(2));
      return {
        turn: turn.index,
        actionType: action.actionType,
        target: action.target,
        rationale: action.rationale,
        summary: turn.summary?.headline || '',
        score,
        verdict: classifyVerdict(score)
      };
    })
    .filter(Boolean);

  const lastOwnAction = ownMoves.at(-1) || null;
  const lastThreeMoves = ownMoves.slice(-3);
  const pivotRisk = lastThreeMoves.length === 3
    && lastThreeMoves.every((move) => move.actionType === lastThreeMoves[0].actionType)
    && lastThreeMoves.slice(-2).every((move) => move.score <= 0);

  const recentSuccesses = buildPatternList(ownMoves, (move) => move.score > 0);
  const recentFailures = buildPatternList(ownMoves, (move) => move.score < 0);
  const repeatedTactics = buildPatternList(ownMoves, () => true)
    .filter((entry) => entry.count > 1)
    .slice(0, 3);

  let campaignVector = 'opening a new line of pressure';

  if (pivotRisk) {
    campaignVector = 'recent repetitions are stalling and a pivot is overdue';
  } else if (ownMoves.slice(-2).every((move) => move.score > 0) && ownMoves.length >= 2) {
    campaignVector = 'doubling down on recent gains';
  } else if (ownMoves.slice(-3).every((move) => move.score < 0) && ownMoves.length >= 3) {
    campaignVector = 'absorbing setbacks while protecting coalition morale';
  } else if (recentFailures.length > 0 && recentSuccesses.length > 0) {
    campaignVector = 'testing competing lines while searching for an exploitable opening';
  }

  return {
    ownMoves,
    rivalPressure: buildRivalPressure(turns, agentKey),
    recentSuccesses,
    recentFailures,
    repeatedTactics,
    flashpoints: buildFlashpoints(turns),
    pressureMetrics: buildPressureMetrics(session.state, weights),
    lastSummary: session.latestTurn?.summary?.headline || null,
    lastOwnActionType: lastOwnAction?.actionType || null,
    campaignVector,
    pivotRisk
  };
}