export const METRIC_KEYS = [
  'stability',
  'protestIntensity',
  'propagandaIntensity',
  'coupRisk',
  'corruption',
  'inflation',
  'treasuryPressure',
  'internationalPressure',
  'publicTrust',
  'militaryLoyalty',
  'regimeLegitimacy'
];

export const REGION_STATE_KEYS = ['unrest', 'foreignPressure', 'repression', 'separatistPressure'];

export const METRIC_LABELS = {
  stability: 'Stability',
  protestIntensity: 'Protest intensity',
  propagandaIntensity: 'Propaganda intensity',
  coupRisk: 'Coup risk',
  corruption: 'Corruption',
  inflation: 'Inflation',
  treasuryPressure: 'Treasury pressure',
  internationalPressure: 'International pressure',
  publicTrust: 'Public trust',
  militaryLoyalty: 'Military loyalty',
  regimeLegitimacy: 'Regime legitimacy'
};

export const AGENT_ORDER = ['government', 'opposition', 'lobby_groups', 'citizens', 'foreign_media'];

export const AGENT_DEFINITIONS = {
  government: {
    key: 'government',
    name: 'Government',
    ideology: 'order-first sovereignty with paternal executive instincts',
    goals: [
      'Preserve executive control',
      'Keep streets manageable',
      'Hold army loyalty',
      'Prevent institutional collapse'
    ],
    constraints: [
      'Treasury resources are finite',
      'Repression can backfire internationally',
      'Military confidence matters as much as public messaging'
    ],
    actionTypes: ['state_broadcast', 'emergency_decree', 'targeted_subsidies', 'security_crackdown', 'cabinet_reshuffle', 'negotiate_pact'],
    defaultAction: 'state_broadcast'
  },
  opposition: {
    key: 'opposition',
    name: 'Opposition',
    ideology: 'anti-corruption civic pluralism under pressure',
    goals: [
      'Weaken regime legitimacy',
      'Convert grievances into organized pressure',
      'Split elite support',
      'Force transition or concessions'
    ],
    constraints: [
      'Must avoid being discredited as reckless',
      'Needs public energy and elite openings',
      'Cannot command the security apparatus directly'
    ],
    actionTypes: ['expose_scandal', 'mobilize_protest', 'elite_split', 'shadow_coalition', 'demand_election', 'strike_support'],
    defaultAction: 'mobilize_protest'
  },
  lobby_groups: {
    key: 'lobby_groups',
    name: 'Lobby Groups',
    ideology: 'rent-preserving oligarchic pragmatism',
    goals: [
      'Protect privileged access',
      'Preserve profit channels',
      'Influence policy without overt exposure',
      'Shape outcomes behind the scenes'
    ],
    constraints: [
      'Visible greed increases backlash',
      'Capital flight can destabilize the system they rely on',
      'External sanctions can damage networks'
    ],
    actionTypes: ['capital_strike', 'fund_loyalists', 'price_manipulation', 'broker_backchannel', 'sanctions_evasion', 'patronage_blitz'],
    defaultAction: 'broker_backchannel'
  },
  citizens: {
    key: 'citizens',
    name: 'Citizens',
    ideology: 'bread-and-dignity survival politics',
    goals: [
      'Reduce daily insecurity',
      'Protect livelihoods and dignity',
      'Respond to repression and inflation',
      'Build local resilience when institutions fail'
    ],
    constraints: [
      'Fear, exhaustion, and shortages limit coordination',
      'Rioting can trigger severe repression',
      'Mutual aid lowers immediate pain but not structural dysfunction'
    ],
    actionTypes: ['mass_strike', 'community_aid', 'riot_wave', 'self_censor', 'neighborhood_councils', 'flee_capital'],
    defaultAction: 'community_aid'
  },
  foreign_media: {
    key: 'foreign_media',
    name: 'Foreign Media',
    ideology: 'international narrative competition shaped by credibility and spectacle',
    goals: [
      'Frame the crisis for outside audiences',
      'Influence legitimacy and external pressure',
      'Highlight instability or normalize it depending on incentives'
    ],
    constraints: [
      'Coverage intensity follows spectacle',
      'Narratives can move markets and diplomats',
      'Access is uneven and often mediated by elites'
    ],
    actionTypes: ['spotlight_abuses', 'normalize_regime', 'market_alarm', 'highlight_opposition', 'sanctions_campaign', 'conflict_fatigue_piece'],
    defaultAction: 'spotlight_abuses'
  }
};

export const ACTION_LIBRARY = {
  government: {
    state_broadcast: {
      label: 'State Broadcast',
      effect: { stability: 4, propagandaIntensity: 12, publicTrust: 3, regimeLegitimacy: 5, internationalPressure: 1 },
      regionEffect: { unrest: -2, repression: 1 }
    },
    emergency_decree: {
      label: 'Emergency Decree',
      effect: { stability: 5, propagandaIntensity: 6, publicTrust: -6, coupRisk: 4, internationalPressure: 6, militaryLoyalty: 3, regimeLegitimacy: -4 },
      regionEffect: { unrest: -1, repression: 8, foreignPressure: 3 }
    },
    targeted_subsidies: {
      label: 'Targeted Subsidies',
      effect: { stability: 6, protestIntensity: -6, treasuryPressure: 9, inflation: 4, publicTrust: 8, regimeLegitimacy: 3 },
      regionEffect: { unrest: -6, separatistPressure: -2 }
    },
    security_crackdown: {
      label: 'Security Crackdown',
      effect: { stability: 2, protestIntensity: -8, publicTrust: -8, internationalPressure: 8, coupRisk: 3, militaryLoyalty: 4, regimeLegitimacy: -5 },
      regionEffect: { unrest: -7, repression: 10, foreignPressure: 4 }
    },
    cabinet_reshuffle: {
      label: 'Cabinet Reshuffle',
      effect: { stability: 3, corruption: -5, regimeLegitimacy: 4, militaryLoyalty: -1, publicTrust: 2 },
      regionEffect: { unrest: -1 }
    },
    negotiate_pact: {
      label: 'Negotiate Pact',
      effect: { stability: 5, protestIntensity: -6, propagandaIntensity: -2, publicTrust: 6, regimeLegitimacy: 7, coupRisk: -3 },
      regionEffect: { unrest: -4, repression: -2, separatistPressure: -1 }
    }
  },
  opposition: {
    expose_scandal: {
      label: 'Expose Scandal',
      effect: { corruption: 7, protestIntensity: 5, regimeLegitimacy: -7, internationalPressure: 5, publicTrust: -1 },
      regionEffect: { unrest: 3, foreignPressure: 2 }
    },
    mobilize_protest: {
      label: 'Mobilize Protest',
      effect: { protestIntensity: 9, stability: -4, regimeLegitimacy: -5, publicTrust: 2, coupRisk: 2 },
      regionEffect: { unrest: 9, repression: 1 }
    },
    elite_split: {
      label: 'Elite Split',
      effect: { militaryLoyalty: -6, regimeLegitimacy: -5, coupRisk: 6, stability: -3, corruption: 2 },
      regionEffect: { separatistPressure: 3 }
    },
    shadow_coalition: {
      label: 'Shadow Coalition',
      effect: { publicTrust: 5, regimeLegitimacy: -4, protestIntensity: 2, stability: 1 },
      regionEffect: { unrest: 2, separatistPressure: -1 }
    },
    demand_election: {
      label: 'Demand Election',
      effect: { protestIntensity: 5, regimeLegitimacy: -5, internationalPressure: 4, publicTrust: 4, stability: -1 },
      regionEffect: { unrest: 4, foreignPressure: 3 }
    },
    strike_support: {
      label: 'Strike Support',
      effect: { protestIntensity: 7, treasuryPressure: 5, stability: -3, publicTrust: 2, internationalPressure: 1 },
      regionEffect: { unrest: 7, repression: 2 }
    }
  },
  lobby_groups: {
    capital_strike: {
      label: 'Capital Strike',
      effect: { treasuryPressure: 8, inflation: 4, stability: -4, coupRisk: 2, publicTrust: -2 },
      regionEffect: { unrest: 3, separatistPressure: 1 }
    },
    fund_loyalists: {
      label: 'Fund Loyalists',
      effect: { corruption: 5, stability: 2, militaryLoyalty: 3, regimeLegitimacy: -2, propagandaIntensity: 2 },
      regionEffect: { repression: 3, unrest: -1 }
    },
    price_manipulation: {
      label: 'Price Manipulation',
      effect: { inflation: 8, publicTrust: -5, protestIntensity: 4, treasuryPressure: 3, stability: -2 },
      regionEffect: { unrest: 4 }
    },
    broker_backchannel: {
      label: 'Broker Backchannel',
      effect: { stability: 4, corruption: 4, coupRisk: -3, regimeLegitimacy: 1, internationalPressure: -1 },
      regionEffect: { unrest: -2, repression: 1 }
    },
    sanctions_evasion: {
      label: 'Sanctions Evasion',
      effect: { treasuryPressure: -4, internationalPressure: 6, corruption: 4, inflation: -1, stability: 1 },
      regionEffect: { foreignPressure: 5, unrest: 1 }
    },
    patronage_blitz: {
      label: 'Patronage Blitz',
      effect: { propagandaIntensity: 4, corruption: 7, publicTrust: -3, stability: 1, regimeLegitimacy: -2 },
      regionEffect: { unrest: 1, repression: 2 }
    }
  },
  citizens: {
    mass_strike: {
      label: 'Mass Strike',
      effect: { protestIntensity: 8, stability: -5, treasuryPressure: 5, publicTrust: 1, regimeLegitimacy: -3 },
      regionEffect: { unrest: 8, repression: 2 }
    },
    community_aid: {
      label: 'Community Aid',
      effect: { stability: 3, publicTrust: 6, protestIntensity: -2, treasuryPressure: -1, regimeLegitimacy: 1 },
      regionEffect: { unrest: -3, separatistPressure: -2 }
    },
    riot_wave: {
      label: 'Riot Wave',
      effect: { protestIntensity: 10, stability: -8, internationalPressure: 4, coupRisk: 4, publicTrust: -3 },
      regionEffect: { unrest: 10, repression: 4, foreignPressure: 2 }
    },
    self_censor: {
      label: 'Self-Censor',
      effect: { protestIntensity: -4, propagandaIntensity: 5, publicTrust: -4, stability: 2, regimeLegitimacy: 1 },
      regionEffect: { unrest: -2, repression: 2 }
    },
    neighborhood_councils: {
      label: 'Neighborhood Councils',
      effect: { publicTrust: 5, stability: 3, protestIntensity: -1, regimeLegitimacy: 2 },
      regionEffect: { unrest: -2, separatistPressure: -1 }
    },
    flee_capital: {
      label: 'Flee Capital',
      effect: { treasuryPressure: 4, militaryLoyalty: -2, stability: -3, publicTrust: -2, inflation: 2 },
      regionEffect: { unrest: 2, foreignPressure: 2 }
    }
  },
  foreign_media: {
    spotlight_abuses: {
      label: 'Spotlight Abuses',
      effect: { internationalPressure: 8, regimeLegitimacy: -5, protestIntensity: 4, stability: -2 },
      regionEffect: { foreignPressure: 8, unrest: 3 }
    },
    normalize_regime: {
      label: 'Normalize Regime',
      effect: { propagandaIntensity: 5, stability: 3, internationalPressure: -4, regimeLegitimacy: 2, publicTrust: -1 },
      regionEffect: { foreignPressure: -3, unrest: -1 }
    },
    market_alarm: {
      label: 'Market Alarm',
      effect: { treasuryPressure: 6, inflation: 4, stability: -3, coupRisk: 2, internationalPressure: 2 },
      regionEffect: { foreignPressure: 5, unrest: 2 }
    },
    highlight_opposition: {
      label: 'Highlight Opposition',
      effect: { protestIntensity: 3, publicTrust: 2, regimeLegitimacy: -4, internationalPressure: 4, stability: -1 },
      regionEffect: { foreignPressure: 4, unrest: 2 }
    },
    sanctions_campaign: {
      label: 'Sanctions Campaign',
      effect: { internationalPressure: 9, treasuryPressure: 5, stability: -4, regimeLegitimacy: -2 },
      regionEffect: { foreignPressure: 9, unrest: 1 }
    },
    conflict_fatigue_piece: {
      label: 'Conflict Fatigue Piece',
      effect: { protestIntensity: -2, internationalPressure: -2, regimeLegitimacy: 1, publicTrust: -1, stability: 1 },
      regionEffect: { foreignPressure: -2, unrest: -1 }
    }
  }
};