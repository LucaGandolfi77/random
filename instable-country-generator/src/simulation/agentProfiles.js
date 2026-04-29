import { AGENT_DEFINITIONS } from './catalog.js';

function mergeUnique(base = [], extra = []) {
  return Array.from(new Set([...(base || []), ...(extra || [])]));
}

function applyVariant(baseProfile, variant = {}) {
  return {
    ...baseProfile,
    ...variant,
    constituency: mergeUnique(baseProfile.constituency, variant.constituency),
    sacredValues: mergeUnique(baseProfile.sacredValues, variant.sacredValues),
    redLines: mergeUnique(baseProfile.redLines, variant.redLines),
    preferredLevers: mergeUnique(baseProfile.preferredLevers, variant.preferredLevers),
    historicalNarratives: mergeUnique(baseProfile.historicalNarratives, variant.historicalNarratives),
    strategicAnchors: mergeUnique(baseProfile.strategicAnchors, variant.strategicAnchors)
  };
}

function pickPrimary(items = [], fallback = 'national stability') {
  return Array.isArray(items) && items.length > 0 ? items[0] : fallback;
}

function pickSecondary(items = [], fallback = 'elite cohesion') {
  return Array.isArray(items) && items.length > 1 ? items[1] : fallback;
}

function buildGovernmentProfile(country, state) {
  const doctrine = country.mediaFreedom < 35
    ? 'order-first siege statism wrapped in patriotic necessity'
    : 'managerial sovereignty that mixes selective reform with muscular public order';

  return applyVariant({
    ideology: doctrine,
    constituency: ['presidential loyalists', 'security ministries', 'state media managers', 'urban patronage brokers'],
    sacredValues: ['continuity of rule', 'sovereignty', 'visible order'],
    redLines: ['army fragmentation', 'foreign humiliation', 'leader appearing weak'],
    preferredLevers: ['narrative control', 'coercive signaling', 'selective concessions', 'elite bargaining'],
    narrativeStyle: 'executive certainty, paternal nationalism, clipped technocratic confidence',
    longGame: `Keep the capital and the officer corps aligned long enough to outlast unrest driven by ${pickPrimary(country.socialTensions)}.`,
    contradiction: `Needs legitimacy but keeps relying on instruments that deepen anger around ${pickSecondary(country.socialTensions)}.`,
    currentPosture: state.publicTrust < 45 ? 'defensive and suspicious' : 'guardedly assertive',
    historicalNarratives: ['The center must look stronger than the crisis at every visible moment.'],
    strategicAnchors: [country.capital, pickPrimary(country.resources)],
    fearProfile: 'A public crack between the state narrative and the coercive chain of command.',
    campaignInstinct: 'compress panic, hold elites, then trade small concessions for time'
  }, country.factionVariants?.government);
}

function buildOppositionProfile(country, state) {
  const doctrine = state.corruption > 55
    ? 'anti-corruption civic populism with coalition instincts'
    : 'pluralist reformism trying to turn social grievance into institutional change';

  return applyVariant({
    ideology: doctrine,
    constituency: ['students', 'disaffected professionals', 'labor organizers', 'excluded elites'],
    sacredValues: ['dignity', 'fair representation', 'public accountability'],
    redLines: ['looking like a foreign puppet', 'random violence without political gain', 'elite deals that demobilize supporters'],
    preferredLevers: ['scandal exposure', 'protest choreography', 'elite splitting', 'election pressure'],
    narrativeStyle: 'moral indictment, constitutional language, wounded civic pride',
    longGame: `Reframe ${pickPrimary(country.socialTensions)} as proof that the current order has broken the social contract.`,
    contradiction: `Needs mass pressure and elite reassurance at the same time, especially while ${pickSecondary(country.socialTensions)} remains unresolved.`,
    currentPosture: state.protestIntensity > 55 ? 'emboldened and impatient' : 'organizing for a broader opening',
    historicalNarratives: ['The regime survives by convincing each grievance it is isolated.'],
    strategicAnchors: [pickPrimary(country.socialTensions), pickPrimary(country.resources)],
    fearProfile: 'A demoralized base that senses elite betrayal before it senses victory.',
    campaignInstinct: 'turn dispersed pain into a story of illegitimate rule'
  }, country.factionVariants?.opposition);
}

function buildLobbyProfile(country, state) {
  const doctrine = country.foreignInfluence > 55
    ? 'transnational rent protection with local political brokerage'
    : 'oligarchic pragmatism focused on contract survival over ideology';

  return applyVariant({
    ideology: doctrine,
    constituency: ['extractive elites', 'import cartels', 'well-connected fixers', 'security-linked businesses'],
    sacredValues: ['access', 'contract continuity', 'capital preservation'],
    redLines: ['nationalization', 'chaotic collapse', 'sanctions that freeze channels'],
    preferredLevers: ['price shocks', 'liquidity pressure', 'quiet bargains', 'patronage financing'],
    narrativeStyle: 'transactional realism, boardroom understatement, veiled threats',
    longGame: `Keep ${pickPrimary(country.resources)} profitable regardless of who occupies the ministries.`,
    contradiction: `Fears collapse but often intensifies it when protecting margins under ${pickSecondary(country.resources, 'strategic bottlenecks')}.`,
    currentPosture: state.treasuryPressure > 50 ? 'predatory and hedging' : 'quietly consolidating influence',
    historicalNarratives: ['Governments rotate faster than commercial networks do.'],
    strategicAnchors: [pickPrimary(country.resources), country.capital],
    fearProfile: 'An uncontrolled rupture that wipes out access faster than a corrupt regime ever could.',
    campaignInstinct: 'hedge every faction while quietly shaping the rules of scarcity'
  }, country.factionVariants?.lobby_groups);
}

function buildCitizensProfile(country, state) {
  const doctrine = state.inflation > 45
    ? 'bread-and-dignity populism mixed with local survivalism'
    : 'municipal mutualism that wants safety without surrendering dignity';

  return applyVariant({
    ideology: doctrine,
    constituency: ['households', 'workers', 'street vendors', 'neighborhood committees'],
    sacredValues: ['food security', 'personal dignity', 'community safety'],
    redLines: ['disappearances', 'unpayable prices', 'public humiliation by authorities'],
    preferredLevers: ['strikes', 'mutual aid', 'street mobilization', 'local self-organization'],
    narrativeStyle: 'plainspoken anger, survival logic, collective dignity',
    longGame: `Force elites to treat ${pickPrimary(country.socialTensions)} as a lived emergency rather than a slogan.`,
    contradiction: `People want order and revolt at once when daily life keeps deteriorating around ${pickSecondary(country.socialTensions)}.`,
    currentPosture: state.publicTrust < 40 ? 'exhausted but volatile' : 'restless and watchful',
    historicalNarratives: ['Ordinary people are asked to sacrifice long before elites are asked to account.'],
    strategicAnchors: [pickPrimary(country.socialTensions), pickSecondary(country.socialTensions, country.capital)],
    fearProfile: 'That despair becomes silence before it becomes leverage.',
    campaignInstinct: 'survive locally while testing when private anger can become collective force'
  }, country.factionVariants?.citizens);
}

function buildForeignMediaProfile(country, state) {
  const doctrine = country.mediaFreedom < 40
    ? 'rights-first international crisis framing'
    : 'transactional geopolitical realism hunting for the most legible narrative';

  return applyVariant({
    ideology: doctrine,
    constituency: ['foreign correspondents', 'editorial boards', 'policy audiences', 'market watchers'],
    sacredValues: ['credibility', 'narrative clarity', 'audience attention'],
    redLines: ['being manipulated by propaganda', 'covering a crisis nobody can explain', 'missing a decisive rupture'],
    preferredLevers: ['framing abuses', 'spotlighting dissent', 'market signals', 'sanctions discourse'],
    narrativeStyle: 'compressed moral framing mixed with geopolitical shorthand',
    longGame: `Turn instability around ${pickPrimary(country.resources)} and ${pickPrimary(country.socialTensions)} into a legible international storyline.`,
    contradiction: `Needs spectacle for attention but loses interest when crises become structurally complex instead of cinematic.`,
    currentPosture: state.internationalPressure > 45 ? 'amplifying and agenda-setting' : 'searching for a decisive frame',
    historicalNarratives: ['Outside attention arrives through frames of market risk, rights abuse, or strategic rivalry.'],
    strategicAnchors: [pickPrimary(country.resources), pickPrimary(country.socialTensions)],
    fearProfile: 'A crisis so muddy that no single frame wins attention.',
    campaignInstinct: 'compress complexity into a narrative outsiders can act on'
  }, country.factionVariants?.foreign_media);
}

export function createAgentProfiles(country, state) {
  return {
    government: buildGovernmentProfile(country, state),
    opposition: buildOppositionProfile(country, state),
    lobby_groups: buildLobbyProfile(country, state),
    citizens: buildCitizensProfile(country, state),
    foreign_media: buildForeignMediaProfile(country, state)
  };
}

export function getAgentProfile(session, agentKey) {
  const profile = session.actorProfiles?.[agentKey];

  if (profile) {
    return profile;
  }

  return {
    ideology: AGENT_DEFINITIONS[agentKey]?.ideology || 'pragmatic factional politics',
    constituency: [],
    sacredValues: [],
    redLines: [],
    preferredLevers: [],
    historicalNarratives: [],
    strategicAnchors: [],
    narrativeStyle: 'direct political language',
    longGame: 'Maintain leverage.',
    contradiction: 'Power and legitimacy diverge.',
    currentPosture: 'adapting under pressure',
    fearProfile: 'An adverse shift in the balance of power.',
    campaignInstinct: 'preserve influence under uncertainty'
  };
}