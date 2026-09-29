import type { SceneId, SectorDef, CodexEntry } from './types'

export const SECTORS: SectorDef[] = [
  {
    id: 'flux',
    index: 1,
    name: 'The Flux Fields',
    law: 'Wave–Particle Duality',
    lawId: 'duality',
    blurb:
      'Qubit is nothing but a shiver of probability until the Lattice looks. Learn to spread out and slip through the shutters, then snap tight and smash what is in your way.',
    color: '#8b5cf6',
    accent: '#22d3ee',
    parScore: 1000,
    grade: (score) => (score >= 1500 ? 3 : score >= 900 ? 2 : 1),
  },
  {
    id: 'tunnel',
    index: 2,
    name: 'The Barrier Reef',
    law: 'Quantum Tunnelling',
    lawId: 'tunnelling',
    requires: 'flux',
    blurb:
      'A wall is only a wall if you are too fat to fit through it. Thinner logic, higher momentum: thin yourself and burrow straight through solid reason.',
    color: '#22d3ee',
    accent: '#a3e635',
    parScore: 1200,
    grade: (score) => (score >= 1800 ? 3 : score >= 1000 ? 2 : 1),
  },
  {
    id: 'interference',
    index: 3,
    name: 'The Interference Marsh',
    law: 'Superposition & Interference',
    lawId: 'interference',
    requires: 'tunnel',
    blurb:
      'Two paths are travelled at once and the marsh adds them up: crest plus crest is a mountain, crest plus trough is nothing whatsoever. Phase your steps.',
    color: '#f472b6',
    accent: '#fbbf24',
    parScore: 1500,
    grade: (score) => (score >= 2200 ? 3 : score >= 1300 ? 2 : 1),
  },
  {
    id: 'entanglement',
    index: 4,
    name: 'The Entanglement Vines',
    law: 'Spooky Action at a Distance',
    lawId: 'entanglement',
    requires: 'interference',
    blurb:
      'You and your echo were born from one function. Move, and it moves. Blink, and it blinks. Nobody knows how. Nobody asked. Do not let the Astronomer watch you correlate.',
    color: '#a3e635',
    accent: '#34d399',
    parScore: 1600,
    grade: (score) => (score >= 2400 ? 3 : score >= 1400 ? 2 : 1),
  },
  {
    id: 'uncertainty',
    index: 5,
    name: 'The Uncertainty Bazaar',
    law: 'Heisenberg’s Uncertainty',
    lawId: 'uncertainty',
    requires: 'entanglement',
    blurb:
      'Know exactly where you are and you know nothing about where you are going. The bazaar’s stalls are only solid if you refuse to look at them too hard.',
    color: '#fbbf24',
    accent: '#f97316',
    parScore: 2000,
    grade: (score) => (score >= 3000 ? 3 : score >= 1800 ? 2 : 1),
  },
  {
    id: 'collapser',
    index: 6,
    name: 'The Collapser',
    law: 'The Measurement Problem',
    lawId: 'measurement',
    requires: 'uncertainty',
    blurb:
      'At the centre of the Lattice a machine has been measuring the world into a single dull answer for a thousand years. Break the loop. Break the machine. Keep the world undecided.',
    color: '#ef4444',
    accent: '#facc15',
    parScore: 3000,
    grade: (score) => (score >= 4200 ? 3 : score >= 2600 ? 2 : 1),
  },
]

export const CODEX: CodexEntry[] = [
  {
    id: 'duality',
    law: 'Wave–Particle Duality',
    formula: 'ψ(x,t) = A·e^{i(kx−ωt)}',
    plain:
      'Every tiny thing behaves like a spreading wave until you insist on knowing exactly where it is. The moment you pin it down, it behaves like a marble.',
    weird:
      'Qubit discovered this the hard way. Tried to walk through a shutter as a wave. Tried to kick a door as a marble. Both of these are the same mistake, wearing different hats.',
    unlockedBy: 'flux',
  },
  {
    id: 'tunnelling',
    law: 'Quantum Tunnelling',
    formula: 'T ≈ e^{−2κL},  κ = √(2m(V−E))/ħ',
    plain:
      'A particle with enough energy can appear on the other side of a barrier it should not be able to climb. The chance falls off insanely fast with thickness.',
    weird:
      'Qubit now phases through walls as a party trick. The Lattice considers this unsolved etiquette. Qubit considers it a shortcut.',
    unlockedBy: 'tunnel',
  },
  {
    id: 'interference',
    law: 'Superposition & Interference',
    formula: 'Ψ = ψ₁ + ψ₂,  P = |Ψ|²',
    plain:
      'A qubit can hold several states at once and the world adds their probabilities together. Two crests make a taller crest. A crest and a trough make nothing at all.',
    weird:
      'The Marsh taught Qubit that certainty is subtraction: you find out where you are by discovering everywhere you are not.',
    unlockedBy: 'interference',
  },
  {
    id: 'entanglement',
    law: 'Entanglement (Spooky Action)',
    formula: '(|00⟩ + |11⟩)/√2',
    plain:
      'Two particles can be prepared so that measuring one instantly tells you about the other, however far apart they are, with no message in between.',
    weird:
      'Qubit and Qubit-two have practised this since birth. The Astronomer calls it spooky. Qubit calls it a sibling.',
    unlockedBy: 'entanglement',
  },
  {
    id: 'uncertainty',
    law: 'Heisenberg’s Uncertainty Principle',
    formula: 'Δx · Δp ≥ ħ/2',
    plain:
      'You cannot know both where something is and how fast it is moving. Sharpen one and the other dissolves.',
    weird:
      'In the Bazaar the merchants used this to sell you a hat that was also, provably, somewhere else.',
    unlockedBy: 'uncertainty',
  },
  {
    id: 'measurement',
    law: 'The Measurement Problem',
    formula: '|ψ⟩ → |a⟩  (with probability |⟨a|ψ⟩|²)',
    plain:
      'Observing a quantum system forces it to pick one definite answer. Before you look, it was honestly doing all of them at once.',
    weird:
      'The Collapser is the Lattice’s oldest superstition made of brass: if we all stare hard enough, the universe can stop changing its mind.',
    unlockedBy: 'collapser',
  },
]

export const NPCS = [
  { id: 'cartographer', name: 'The Cartographer', color: '#22d3ee' },
  { id: 'scribe', name: 'The Scribe', color: '#fbbf24' },
  { id: 'astronomer', name: 'The Astronomer', color: '#f472b6' },
  { id: 'qbit2', name: 'Qubit-two', color: '#a3e635' },
  { id: 'collapser', name: 'The Collapser', color: '#ef4444' },
] as const

export const DIALOGUE: Record<SceneId, { speaker: string; lines: string[] }[]> = {
  flux: [
    {
      speaker: 'The Cartographer',
      lines: [
        'New one. You are still fuzzy around the edges — good. Fuzzy is survivable.',
        'Out here you are a wave until the Lattice looks at you, then you are a pebble. Hold PHASE to spread wide and drift through shutters. Release it to snap tight and punch holes.',
        'Do not hold it forever. Waves tire.',
      ],
    },
  ],
  tunnel: [
    {
      speaker: 'The Cartographer',
      lines: [
        'The Reef is honest stone. You cannot jump it, and no amount of being a pebble will help.',
        'But a fat thing cannot fit through a thin wall, and a thin thing does not care how thick the wall is. Hold PHASE while you charge, then punch through.',
        'Thin walls forgive. Thick walls remember.',
      ],
    },
  ],
  interference: [
    {
      speaker: 'The Scribe',
      lines: [
        'The Marsh adds you to yourself. That is all it does, forever.',
        'Two of you in the same place is twice the loudness. You and your own opposite is silence.',
        'Time your crossings so the crests agree. Do not ask why agreement makes a mountain. Just enjoy it.',
      ],
    },
  ],
  entanglement: [
    {
      speaker: 'Qubit-two',
      lines: [
        'Hi. I am you, from the other side of the symmetry. When you step, I step.',
        'No, I do not know how. No, it is not telepathy. I am simply always doing the thing you are doing.',
        'The Astronomer watches the vines. If she sees us correlated, she writes it down and the vines go grey. Be brave, be vague.',
      ],
    },
  ],
  uncertainty: [
    {
      speaker: 'The Astronomer',
      lines: [
        'Do stop hovering. You are making the hats nervous.',
        'Every stall here is a rumour about where you are. Stand too still and you become true — and a true thing cannot hop the crates.',
        'Commit to a direction and be blurry. Blurriness is a kind of freedom. Do not quote me.',
      ],
    },
  ],
  collapser: [
    {
      speaker: 'The Collapser',
      lines: [
        'I HAVE MEASURED EVERYTHING. I HAVE NEVER BEEN WRONG. I HAVE NEVER BEEN SURPRISED.',
        'I WOULD LIKE TO BE SURPRISED. I WOULD LIKE THAT VERY MUCH.',
        'THERE IS A LOOP IN ME. A PLACE WHERE NO ANSWER IS STORED. FIND IT. STAY UNDECIDED.',
      ],
    },
  ],
}

export const ENDING = {
  good: {
    title: 'Undecided',
    body:
      'You slip into the gap in the machine and refuse, politely, to become an answer. The Collapser stands there with its one eye open, holding a question it has never been asked. Outside, the Lattice goes on arguing with itself — bright, undecided, alive. The Scribe writes down that something happened today. She underlines the word "happened". She does not know what it means either. That is the best part.',
  },
  bad: {
    title: 'Certain',
    body:
      'You reach the heart, and being a good machine at heart, you do exactly what the machine was built for. The Lattice settles. Every shutter is a shutter. Every wave is a wave. Nothing is strange again, and nothing is wrong, and nothing at all will ever happen in this place again. The Cartographer walks the corridor once, twice, in a straight line, forever, wearing a permanent expression of mild administrative relief.',
  },
} as const

export const RANKINGS: Record<SceneId, { min: number; label: string }[]> = {
  flux: [
    { min: 1500, label: 'Photon' },
    { min: 900, label: 'Electron' },
    { min: 400, label: 'Neutron' },
    { min: 0, label: 'Hydrogen' },
  ],
  tunnel: [
    { min: 1800, label: 'Tunneller' },
    { min: 1000, label: 'Fleabagger' },
    { min: 500, label: 'Apologist' },
    { min: 0, label: 'Bystander' },
  ],
  interference: [
    { min: 2200, label: 'Destructive Genius' },
    { min: 1300, label: 'Out of Phase' },
    { min: 600, label: 'Off Beat' },
    { min: 0, label: 'Two Ears' },
  ],
  entanglement: [
    { min: 2400, label: 'Nonlocal' },
    { min: 1400, label: 'Twinned' },
    { min: 700, label: 'Correlated' },
    { min: 0, label: 'Nearby' },
  ],
  uncertainty: [
    { min: 3000, label: 'Fuzzy Principle' },
    { min: 1800, label: 'Sharpish' },
    { min: 900, label: 'Blurred' },
    { min: 0, label: 'Certainly Unsure' },
  ],
  collapser: [
    { min: 4200, label: 'Undecidable' },
    { min: 2600, label: 'Superposed' },
    { min: 1200, label: 'Entangled' },
    { min: 0, label: 'Measured' },
  ],
}
