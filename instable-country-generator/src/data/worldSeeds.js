const MAP_LAYOUT = [
  {
    slot: 'north',
    label: 'Northern Arc',
    path: 'M88 18 L208 28 L194 88 L110 98 L74 60 Z'
  },
  {
    slot: 'west',
    label: 'Western Corridor',
    path: 'M54 92 L134 96 L146 164 L70 182 L34 128 Z'
  },
  {
    slot: 'central',
    label: 'Inner Basin',
    path: 'M146 92 L248 84 L272 166 L154 176 L136 112 Z'
  },
  {
    slot: 'east',
    label: 'Eastern Frontier',
    path: 'M252 68 L336 84 L350 170 L280 188 L268 156 Z'
  },
  {
    slot: 'south',
    label: 'Southern Belt',
    path: 'M92 182 L242 178 L304 242 L124 236 L72 202 Z'
  }
];

export const COUNTRY_SEEDS = [
  {
    id: 'veloria',
    name: 'Republic of Veloria',
    capital: 'Port Azure',
    politicalSystem: 'Presidential republic under rolling emergency powers',
    description: 'A coastal transit state where gas wealth, patronage networks, and a restless conscript army pull politics in opposite directions.',
    tagline: 'Ports, pipelines, and a brittle executive center.',
    flag: {
      orientation: 'horizontal',
      colors: ['#0c4458', '#e8d3a8', '#b5433d']
    },
    resources: ['Offshore gas', 'Rare-earth logistics', 'Deep-water shipping'],
    socialTensions: ['Regional inequality', 'Youth unemployment', 'Security force rivalry'],
    mediaFreedom: 34,
    foreignInfluence: 62,
    factionVariants: {
      government: {
        ideology: 'maritime emergency presidentialism obsessed with corridor control',
        constituency: ['port authorities', 'customs clans'],
        sacredValues: ['shipping continuity'],
        preferredLevers: ['dockyard patronage', 'harbor securitization'],
        narrativeStyle: 'harbor-state nationalism and command-room urgency',
        longGame: 'Bind ports, customs, and barracks to the presidency before regional brokers become semi-sovereign.',
        contradiction: 'Needs open trade flows but repeatedly governs through emergency bottlenecks and selective closures.',
        historicalNarratives: ['The coast prospers only when the center keeps sea lanes disciplined.'],
        strategicAnchors: ['Port Azure', 'offshore gas terminals'],
        fearProfile: 'A port-city panic that spreads into barracks and customs revenue.',
        campaignInstinct: 'project control at chokepoints first, bargain later'
      },
      opposition: {
        ideology: 'municipal reform populism rooted in dockland grievance',
        constituency: ['port labor councils', 'coastal mayors'],
        preferredLevers: ['port strikes', 'municipal coalitions'],
        narrativeStyle: 'civic outrage mixed with anti-cartel rhetoric',
        longGame: 'Turn coastal inequality and youth exclusion into a city-led national legitimacy crisis.',
        historicalNarratives: ['The republic was captured by customs families and emergency decrees.'],
        strategicAnchors: ['Port Azure municipalities', 'youth unemployment']
      },
      lobby_groups: {
        ideology: 'port-cartel mercantilism wired to offshore rents',
        constituency: ['shipping fixers', 'commodity intermediaries'],
        preferredLevers: ['logistics chokepoints', 'tariff arbitrage'],
        historicalNarratives: ['Every cabinet is temporary, but port access fees endure.'],
        strategicAnchors: ['deep-water shipping', 'rare-earth logistics']
      },
      citizens: {
        ideology: 'dockworker household republicanism shaped by price shocks',
        constituency: ['dockworkers', 'service households'],
        sacredValues: ['bread prices', 'freedom from arbitrary checkpoints'],
        historicalNarratives: ['The state remembers the ports only when it needs revenue or repression.'],
        strategicAnchors: ['food ports', 'regional inequality']
      },
      foreign_media: {
        ideology: 'shipping-lane risk framing fused with human-rights alarm',
        preferredLevers: ['chokepoint storytelling', 'rights investigations'],
        narrativeStyle: 'geopolitical shipping bulletin with moral escalation',
        historicalNarratives: ['Veloria matters when cargo stops moving or troops start firing.'],
        strategicAnchors: ['deep-water shipping', 'security force rivalry']
      }
    },
    regions: [
      {
        slot: 'north',
        name: 'Namar Delta',
        resource: 'Gas terminals',
        baseline: { unrest: 38, foreignPressure: 44, repression: 32, separatistPressure: 16 }
      },
      {
        slot: 'west',
        name: 'Red Basin',
        resource: 'Copper smelters',
        baseline: { unrest: 48, foreignPressure: 24, repression: 46, separatistPressure: 22 }
      },
      {
        slot: 'central',
        name: 'Civic Ring',
        resource: 'Government district',
        baseline: { unrest: 34, foreignPressure: 20, repression: 54, separatistPressure: 8 }
      },
      {
        slot: 'east',
        name: 'Kesh Frontier',
        resource: 'Border trade',
        baseline: { unrest: 42, foreignPressure: 58, repression: 36, separatistPressure: 31 }
      },
      {
        slot: 'south',
        name: 'Marrow Coast',
        resource: 'Food ports',
        baseline: { unrest: 29, foreignPressure: 37, repression: 28, separatistPressure: 11 }
      }
    ],
    initialState: {
      stability: 51,
      protestIntensity: 34,
      propagandaIntensity: 46,
      coupRisk: 24,
      corruption: 59,
      inflation: 43,
      treasuryPressure: 36,
      internationalPressure: 31,
      publicTrust: 43,
      militaryLoyalty: 62,
      regimeLegitimacy: 47
    }
  },
  {
    id: 'solariq',
    name: 'Solariq Federation',
    capital: 'Rivenhold',
    politicalSystem: 'Federal assembly dominated by emergency coalition cabinets',
    description: 'A mineral-rich highland federation where governors, unions, and oligarchic holding groups continuously renegotiate the balance of force.',
    tagline: 'Federal on paper, improvised in practice.',
    flag: {
      orientation: 'vertical',
      colors: ['#d97a1d', '#efe1c5', '#3f6c45']
    },
    resources: ['Lithium plateaus', 'Rail chokepoints', 'Hydro corridors'],
    socialTensions: ['Center-periphery mistrust', 'Inflation fatigue', 'Ethnic patronage blocs'],
    mediaFreedom: 49,
    foreignInfluence: 48,
    factionVariants: {
      government: {
        ideology: 'federal broker statism sustained by emergency coalition arithmetic',
        constituency: ['governors', 'assembly whips', 'rail-security administrators'],
        sacredValues: ['federal cohesion'],
        preferredLevers: ['regional bargaining', 'cabinet balancing'],
        narrativeStyle: 'procedural federalism with underlying machine politics',
        longGame: 'Keep governors dependent on the center without triggering open separatist bargaining.',
        contradiction: 'Calls itself federal consensus while relying on improvised emergency coalitions and opaque patronage.',
        historicalNarratives: ['Solariq survives when provincial bosses fear fragmentation more than each other.'],
        strategicAnchors: ['Rivenhold', 'rail chokepoints'],
        fearProfile: 'A governor bloc discovering it can outbid the capital.',
        campaignInstinct: 'patch coalitions faster than grievances can align'
      },
      opposition: {
        ideology: 'provincial constitutionalism with labor-federal coalition instincts',
        constituency: ['regional reformists', 'mining unions'],
        preferredLevers: ['governor defections', 'federal legality campaigns'],
        narrativeStyle: 'constitutional repair backed by provincial resentment',
        longGame: 'Turn mistrust of the center into a federated anti-corruption front that still looks governable.',
        historicalNarratives: ['The federation was hollowed out by emergency cabinets and oligarchic bargains.'],
        strategicAnchors: ['Center-periphery mistrust', 'industrial syndicates']
      },
      lobby_groups: {
        ideology: 'extractive federal baronialism tied to transit and mineral rents',
        constituency: ['mineral holding groups', 'rail concessionaires'],
        preferredLevers: ['governor patronage', 'commodity timing'],
        historicalNarratives: ['In Solariq, minerals negotiate harder than legislators.'],
        strategicAnchors: ['lithium plateaus', 'rail chokepoints']
      },
      citizens: {
        ideology: 'bread-and-wages union federalism',
        constituency: ['miners', 'teachers', 'food cooperatives'],
        sacredValues: ['regional dignity', 'affordable staples'],
        historicalNarratives: ['The federation remembers ordinary people only during shortages and elections.'],
        strategicAnchors: ['inflation fatigue', 'food cooperatives']
      },
      foreign_media: {
        ideology: 'commodity-cycle fragility framing with cautious democracy language',
        preferredLevers: ['market signal amplification', 'federal deadlock narratives'],
        historicalNarratives: ['Solariq becomes visible abroad when lithium, transit, or cabinet math starts wobbling.'],
        strategicAnchors: ['lithium plateaus', 'federal assembly']
      }
    },
    regions: [
      {
        slot: 'north',
        name: 'Auric Steppe',
        resource: 'Lithium fields',
        baseline: { unrest: 31, foreignPressure: 36, repression: 22, separatistPressure: 19 }
      },
      {
        slot: 'west',
        name: 'Var Glassworks',
        resource: 'Industrial syndicates',
        baseline: { unrest: 44, foreignPressure: 18, repression: 34, separatistPressure: 14 }
      },
      {
        slot: 'central',
        name: 'Assembly Plain',
        resource: 'Federal ministries',
        baseline: { unrest: 27, foreignPressure: 20, repression: 41, separatistPressure: 9 }
      },
      {
        slot: 'east',
        name: 'Talic Pass',
        resource: 'Border customs',
        baseline: { unrest: 39, foreignPressure: 54, repression: 33, separatistPressure: 26 }
      },
      {
        slot: 'south',
        name: 'Lumen Orchards',
        resource: 'Food cooperatives',
        baseline: { unrest: 36, foreignPressure: 27, repression: 24, separatistPressure: 13 }
      }
    ],
    initialState: {
      stability: 57,
      protestIntensity: 28,
      propagandaIntensity: 38,
      coupRisk: 19,
      corruption: 51,
      inflation: 36,
      treasuryPressure: 29,
      internationalPressure: 27,
      publicTrust: 51,
      militaryLoyalty: 55,
      regimeLegitimacy: 52
    }
  },
  {
    id: 'dravara',
    name: 'Union of Dravara',
    capital: 'Halcyon Spire',
    politicalSystem: 'Single-party union with a ceremonial congress and powerful security council',
    description: 'An inland agrarian-security state trying to industrialize while hostile neighbors, drought, and elite families test the regime every season.',
    tagline: 'A disciplined state with widening cracks.',
    flag: {
      orientation: 'horizontal',
      colors: ['#26364c', '#c2b48f', '#6d8b5b']
    },
    resources: ['Wheat belts', 'Military foundries', 'River tolls'],
    socialTensions: ['Food shortages', 'Rural resentment', 'Dynastic corruption'],
    mediaFreedom: 21,
    foreignInfluence: 57,
    factionVariants: {
      government: {
        ideology: 'barracks-and-granary developmental authoritarianism',
        constituency: ['security council families', 'rationing administrators'],
        sacredValues: ['discipline', 'self-reliance'],
        preferredLevers: ['rationing discipline', 'security pageantry'],
        narrativeStyle: 'stern sacrifice rhetoric with martial developmentalism',
        longGame: 'Keep the army, grain flows, and founding myth fused tightly enough that hardship does not become rebellion.',
        contradiction: 'Promises sacrifice for national renewal while dynastic corruption keeps hollowing out the moral core of the regime.',
        historicalNarratives: ['Dravara only survives when hardship is centralized before rivals exploit the frontier.'],
        strategicAnchors: ['Halcyon Spire', 'wheat belts'],
        fearProfile: 'Food panic meeting officer cynicism at the same time.',
        campaignInstinct: 'discipline shortages before they become moral revolt'
      },
      opposition: {
        ideology: 'rural moral populism carried by quiet republican whisper networks',
        constituency: ['rural clergy', 'grain-belt organizers'],
        preferredLevers: ['moral scandal', 'rural protest chains'],
        narrativeStyle: 'ethical accusation, village dignity, anti-dynastic contempt',
        longGame: 'Turn hunger and dynastic theft into a legitimacy revolt that reaches beyond the capital.',
        historicalNarratives: ['The union betrayed the villages long before the cities noticed.'],
        strategicAnchors: ['food shortages', 'rural resentment']
      },
      lobby_groups: {
        ideology: 'dynastic commissariat patronage defending grain and foundry rents',
        constituency: ['ration contractors', 'security-linked merchant houses'],
        preferredLevers: ['ration favoritism', 'smuggling toleration'],
        historicalNarratives: ['Scarcity is dangerous, but controlled scarcity is profitable.'],
        strategicAnchors: ['wheat belts', 'smuggling routes']
      },
      citizens: {
        ideology: 'peasant survival communitarianism with urban bread anger',
        constituency: ['rural households', 'ration-line families'],
        sacredValues: ['grain access', 'freedom from humiliation'],
        historicalNarratives: ['People can survive hardship, but not theft wrapped in patriotic sermons.'],
        strategicAnchors: ['food shortages', 'Verdin Riverlands']
      },
      foreign_media: {
        ideology: 'famine-and-security alarmism around brittle authoritarian states',
        preferredLevers: ['scarcity exposés', 'security-council scrutiny'],
        narrativeStyle: 'warning-sign coverage mixing humanitarian and strategic threat frames',
        historicalNarratives: ['Dravara becomes international news when hunger, smuggling, and militarization intersect.'],
        strategicAnchors: ['food shortages', 'military foundries']
      }
    },
    regions: [
      {
        slot: 'north',
        name: 'Iron Escarpment',
        resource: 'Foundries',
        baseline: { unrest: 33, foreignPressure: 41, repression: 47, separatistPressure: 21 }
      },
      {
        slot: 'west',
        name: 'Pale Granary',
        resource: 'Wheat reserves',
        baseline: { unrest: 52, foreignPressure: 19, repression: 39, separatistPressure: 18 }
      },
      {
        slot: 'central',
        name: 'Halcyon Core',
        resource: 'Security council',
        baseline: { unrest: 22, foreignPressure: 17, repression: 62, separatistPressure: 7 }
      },
      {
        slot: 'east',
        name: 'Sable March',
        resource: 'Smuggling routes',
        baseline: { unrest: 46, foreignPressure: 63, repression: 43, separatistPressure: 33 }
      },
      {
        slot: 'south',
        name: 'Verdin Riverlands',
        resource: 'Hydro locks',
        baseline: { unrest: 37, foreignPressure: 31, repression: 29, separatistPressure: 14 }
      }
    ],
    initialState: {
      stability: 49,
      protestIntensity: 37,
      propagandaIntensity: 54,
      coupRisk: 31,
      corruption: 63,
      inflation: 48,
      treasuryPressure: 41,
      internationalPressure: 38,
      publicTrust: 36,
      militaryLoyalty: 58,
      regimeLegitimacy: 43
    }
  }
];

const NAME_PREFIXES = ['Ar', 'Bel', 'Cor', 'Dra', 'Eli', 'Faro', 'Kale', 'Luma', 'Nor', 'Sera', 'Tal', 'Ves'];
const NAME_SUFFIXES = ['dara', 'oria', 'ene', 'ovar', 'eth', 'iq', 'ara', 'une', 'ar', 'is'];
const CAPITAL_SUFFIXES = ['Gate', 'Spire', 'Harbor', 'Reach', 'Haven', 'Bridge', 'Point'];

function clone(value) {
  return structuredClone(value);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildGeneratedName() {
  return `${pickRandom(NAME_PREFIXES)}${pickRandom(NAME_SUFFIXES)}`;
}

function buildCapitalName() {
  return `${pickRandom(NAME_PREFIXES)}${pickRandom(CAPITAL_SUFFIXES)}`;
}

function buildRegionName(slot) {
  const stem = buildGeneratedName();
  const suffixBySlot = {
    north: ' Heights',
    west: ' Corridor',
    central: ' Core',
    east: ' Frontier',
    south: ' Coast'
  };

  return `${stem}${suffixBySlot[slot] || ''}`;
}

export function getCountrySeed(seedId) {
  const seed = COUNTRY_SEEDS.find((entry) => entry.id === seedId) || COUNTRY_SEEDS[0];
  return {
    ...clone(seed),
    originSeedId: seed.id
  };
}

export function createCountryProfile(seedId) {
  if (seedId && seedId !== 'random') {
    return getCountrySeed(seedId);
  }

  const base = clone(pickRandom(COUNTRY_SEEDS));
  const generatedName = buildGeneratedName();
  const originSeedId = base.id;

  base.id = generatedName.toLowerCase();
  base.originSeedId = originSeedId;
  base.name = `${generatedName} State`;
  base.capital = buildCapitalName();
  base.description = `A synthetic scenario generated from regional fault lines, elite patronage, and nervous foreign attention around ${base.capital}.`;
  base.tagline = 'Procedurally assembled fault lines under pressure.';
  base.regions = base.regions.map((region) => ({
    ...region,
    name: buildRegionName(region.slot)
  }));

  return base;
}

export function getBootstrapSeeds() {
  return COUNTRY_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    capital: seed.capital,
    politicalSystem: seed.politicalSystem,
    tagline: seed.tagline
  }));
}

export { MAP_LAYOUT };