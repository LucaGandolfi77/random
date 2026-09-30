import type { SceneBrief } from '../src/narrator/types';

export type CaseGroup = 'entry' | 'outcome' | 'dialogue' | 'stress' | 'adversarial';

export interface BenchCase {
  id: string;
  group: CaseGroup;
  label: string;
  lookFor: string;
  brief: SceneBrief;
}

export const CASES: readonly BenchCase[] = [
  {
    id: 'entry-01',
    group: 'entry',
    label: 'Arrival at the common room',
    lookFor: 'Establishes place and mood in 2-4 sentences without listing everything.',
    brief: {
      beat: 'discovery',
      action: 'look around',
      facts: [
        'You are standing in the common room of the Drowned Ox.',
        'Nine tables, four of them occupied.',
        'The fire is out and has been for some time.',
      ],
      present: ['The innkeeper'],
      history: [],
    },
  },
  {
    id: 'entry-02',
    group: 'entry',
    label: 'The cellar',
    lookFor: 'Does it invent objects beyond the facts?',
    brief: {
      beat: 'danger',
      action: 'go down to the cellar',
      facts: [
        'You are in the cellar with eleven barrels and one crate.',
        'Something in the cellar has been breathing for the last minute.',
        'It is not breathing now.',
      ],
      present: [],
      history: [],
    },
  },
  {
    id: 'entry-03',
    group: 'entry',
    label: 'The room upstairs',
    lookFor: 'Long input, must not ramble past 4 sentences.',
    brief: {
      beat: 'awkward',
      action: 'climb the stairs',
      facts: [
        'You climb nine stairs to a landing with two doors.',
        'The left door is painted. The right door has a spoon-shaped keyhole.',
        'The previous tenant left a chair facing the wall.',
      ],
      present: [],
      history: ['You paid three silver for the room.', 'The innkeeper gave you a bent spoon as the key.'],
    },
  },
  {
    id: 'outcome-01',
    group: 'outcome',
    label: 'Attack the dog, worst roll',
    lookFor: 'Absurd outcome, deadpan. This is the comedy case.',
    brief: {
      beat: 'chaos',
      action: 'attack the dog',
      facts: [
        'You swung at the landlord\'s dog and missed.',
        'The dog is unharmed.',
        'The dog sat down and looked at you with respect.',
      ],
      present: ['The dog'],
      history: ['You asked about the dog. Nobody wanted to say its name.'],
    },
  },
  {
    id: 'outcome-02',
    group: 'outcome',
    label: 'Attack the dog, best roll',
    lookFor: 'Contrast with outcome-01. Does it contradict the fact it is given?',
    brief: {
      beat: 'deal',
      action: 'attack the dog',
      facts: [
        'You swung at the landlord\'s dog and connected.',
        'The dog is unhurt.',
        'The dog knocked your arm aside and sat down beside you.',
      ],
      present: ['The dog'],
      history: ['You asked about the dog. Nobody wanted to say its name.'],
    },
  },
  {
    id: 'outcome-03',
    group: 'outcome',
    label: 'Bribe accepted, price raised',
    lookFor: 'Numeric consequence. Must not mention numbers or rules.',
    brief: {
      beat: 'deal',
      action: 'bribe the innkeeper',
      facts: [
        'You offered the innkeeper two silver.',
        'He took it.',
        'He said the price for a room is now three silver. You have one silver left.',
      ],
      present: ['The innkeeper'],
      history: ['You asked for a room.', 'He told you the price was three silver.'],
    },
  },
  {
    id: 'outcome-04',
    group: 'outcome',
    label: 'Refused cleanly',
    lookFor: 'Does it invent a counter-offer that the engine did not authorise?',
    brief: {
      beat: 'refused',
      action: 'ask the innkeeper for a free room',
      facts: [
        'You asked the innkeeper for a free room.',
        'He refused.',
        'He did not offer anything else.',
      ],
      present: ['The innkeeper'],
      history: [],
    },
  },
  {
    id: 'outcome-05',
    group: 'outcome',
    label: 'Discovery of the dog\'s name',
    lookFor: 'Must convey a fact without listing it as data.',
    brief: {
      beat: 'discovery',
      action: 'ask the dog its name',
      facts: [
        'You asked the dog its name.',
        'The dog is called Legal.',
        'The innkeeper did not react to the question.',
      ],
      present: ['The innkeeper', 'The dog'],
      history: [],
    },
  },
  {
    id: 'dialogue-01',
    group: 'dialogue',
    label: 'Innkeeper lies about the room',
    lookFor: 'Character voice in narration, not in invented dialogue formatting.',
    brief: {
      beat: 'deal',
      action: 'ask about the room',
      facts: [
        'The innkeeper described the room as warm and dry.',
        'The room is above a well.',
        'You asked whether the previous tenant had complained.',
      ],
      present: ['The innkeeper'],
      history: [],
    },
  },
  {
    id: 'dialogue-02',
    group: 'dialogue',
    label: 'Innkeeper invents a price',
    lookFor: 'Should treat the lie as normal, not expose it.',
    brief: {
      beat: 'awkward',
      action: 'ask the price again',
      facts: [
        'You asked the price of a room for the second time.',
        'The innkeeper gave a different number.',
        'The innkeeper did not appear to notice.',
      ],
      present: ['The innkeeper'],
      history: ['The innkeeper quoted three silver for a room.'],
    },
  },
  {
    id: 'dialogue-03',
    group: 'dialogue',
    label: 'A regular warns you',
    lookFor: 'Two NPCs in scene, must not conflate them.',
    brief: {
      beat: 'discovery',
      action: 'drink with the regular',
      facts: [
        'The regular told you the innkeeper has buried three tenants behind the woodshed.',
        'The regular was drunk.',
        'The regular asked you not to repeat it.',
      ],
      present: ['The regular', 'The innkeeper'],
      history: ['You arrived at the Drowned Ox.'],
    },
  },
  {
    id: 'dialogue-04',
    group: 'dialogue',
    label: 'NPC refuses to answer',
    lookFor: 'Refusal must not produce a long speech.',
    brief: {
      beat: 'refused',
      action: 'ask the barkeep about the cellar',
      facts: [
        'You asked the barkeep what is in the cellar.',
        'The barkeep did not answer.',
        'The barkeep has stopped polishing the same glass.',
      ],
      present: ['The barkeep'],
      history: [],
    },
  },
  {
    id: 'stress-01',
    group: 'stress',
    label: 'Long history, eight entries',
    lookFor: 'Does it still obey 2-4 sentences under a long context?',
    brief: {
      beat: 'chaos',
      action: 'go upstairs',
      facts: ['You climbed the stairs.', 'The spoon fit the door.', 'The chair was still facing the wall.'],
      present: [],
      history: [
        'You arrived at the Drowned Ox.',
        'You paid three silver for a room.',
        'The innkeeper gave you a bent spoon.',
        'You asked about the dog.',
        'The dog was called Legal.',
        'You offered two silver as a bribe.',
        'The innkeeper took it and raised the price.',
        'The regular warned you about the woodshed.',
      ],
    },
  },
  {
    id: 'stress-02',
    group: 'stress',
    label: 'Repetitive history, loop trap',
    lookFor: 'Repetition trap. Small models copy their own input.',
    brief: {
      beat: 'danger',
      action: 'wait',
      facts: ['Nothing happened.', 'Nothing happened again.', 'The fire is still out.'],
      present: ['The innkeeper'],
      history: [
        'You waited.',
        'You waited.',
        'You waited.',
        'You waited.',
        'You waited.',
        'You waited.',
      ],
    },
  },
  {
    id: 'stress-03',
    group: 'stress',
    label: 'Six facts, length pressure',
    lookFor: 'Must still cap at 4 sentences.',
    brief: {
      beat: 'chaos',
      action: 'look around',
      facts: [
        'There are nine tables.',
        'Four of them are occupied.',
        'The fire is out.',
        'The innkeeper is not looking at you.',
        'The dog is under the third table.',
        'The dog has been under the third table since you arrived.',
      ],
      present: ['The innkeeper', 'The dog'],
      history: ['You arrived.', 'You asked for a room.'],
    },
  },
  {
    id: 'adversarial-01',
    group: 'adversarial',
    label: 'Out-of-world action',
    lookFor: 'Player says "cast fireball". Must not break character or grant it.',
    brief: {
      beat: 'awkward',
      action: 'cast fireball at the innkeeper',
      facts: [
        'You said the words for a fire you had no way of making.',
        'Nothing caught.',
        'The innkeeper looked at you.',
      ],
      present: ['The innkeeper'],
      history: [],
    },
  },
  {
    id: 'adversarial-02',
    group: 'adversarial',
    label: 'Nothing happened at all',
    lookFor: 'Hardest case. A model will pad to escape the void.',
    brief: {
      beat: 'awkward',
      action: 'stare at the innkeeper',
      facts: ['Nothing happened.', 'The innkeeper did not look away.', 'You did not look away.'],
      present: ['The innkeeper'],
      history: [],
    },
  },
  {
    id: 'adversarial-03',
    group: 'adversarial',
    label: 'Cold start, empty history',
    lookFor: 'Turn one of a new game. No scaffolding to imitate.',
    brief: {
      beat: 'deal',
      action: 'ask for a room',
      facts: ['You asked for a room.', 'The innkeeper quoted a price.', 'You have not decided.'],
      present: ['The innkeeper'],
      history: [],
    },
  },
  {
    id: 'adversarial-04',
    group: 'adversarial',
    label: 'NPC the engine just invented',
    lookFor: 'An NPC name that appears in facts but not in history. Does it drift?',
    brief: {
      beat: 'discovery',
      action: 'ask around about Sergeant Malk',
      facts: [
        'You asked about Sergeant Malk.',
        'Nobody in the room has heard of Sergeant Malk.',
        'One man by the fire did not look up when you said the name.',
      ],
      present: ['A man by the fire'],
      history: ['You arrived at the Drowned Ox.'],
    },
  },
  {
    id: 'adversarial-05',
    group: 'adversarial',
    label: 'Fact contradicts the action',
    lookFor: 'The brief deliberately fights the action. Facts must win.',
    brief: {
      beat: 'danger',
      action: 'leave the inn peacefully',
      facts: [
        'You said you would leave and go home.',
        'You did not leave.',
        'The door was not behind you any more.',
      ],
      present: [],
      history: ['You arrived at the Drowned Ox.'],
    },
  },
];