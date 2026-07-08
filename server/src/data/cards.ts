import type { Card } from '../../../shared/types.js';

export const SECURITY_OFFICER_DECK: Card[] = [
  {
    id: 'so-1',
    name: 'Set Phasers to Stun',
    type: 'Tactic',
    tone: 'Hostile',
    nature: 'Technological',
    description: 'Hostile tracks cannot advance this turn. Political cards have no effect this turn.',
    effects: [
      { type: 'SUPPRESS_TRACK', trigger: 'ON_ACTIVATE', trackTone: 'Hostile' },
      { type: 'SUPPRESS_TONE', trigger: 'ON_ACTIVATE', tone: 'Political' }
    ]
  },
  {
    id: 'so-2',
    name: 'Tactical Analysis',
    type: 'Tactic',
    tone: 'Scientific',
    nature: 'Technological',
    description: 'Advance one Hostile track twice.',
    effects: [
      { type: 'ADVANCE', trigger: 'ON_ACTIVATE', tone: 'Hostile', amount: 2 }
    ]
  },
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `so-p-${i}`,
    name: `Security Card ${i + 3}`,
    type: 'Tactic' as const,
    tone: 'Hostile' as const,
    nature: 'Technological' as const,
    description: 'Thematic security placeholder.',
  })),
];

export const XENOBIOLOGIST_DECK: Card[] = [
  {
    id: 'xb-1',
    name: 'Peace Offering',
    type: 'Equipment',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Choose one Political Situation. Advance it three times. Discard Peace Offering.',
    uses: 1,
    effects: [
      { type: 'ADVANCE', trigger: 'ON_ACTIVATE', tone: 'Political', amount: 3 }
    ]
  },
  {
    id: 'xb-2',
    name: 'Field Scanner',
    type: 'Equipment',
    tone: 'Scientific',
    nature: 'Technological',
    description: 'Advance one Scientific track.',
    uses: 3,
    effects: [
      { type: 'ADVANCE', trigger: 'ON_ACTIVATE', tone: 'Scientific', amount: 1 }
    ]
  },
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `xb-p-${i}`,
    name: `Xeno Card ${i + 3}`,
    type: 'Tactic' as const,
    tone: 'Scientific' as const,
    nature: 'Biological' as const,
    description: 'Thematic xenobiology placeholder.',
  })),
];

export const ROYAL_KOOG_DECK: Card[] = [
  {
    id: 'rk-obj-1',
    name: 'Establish an Outpost',
    type: 'Objective',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Key cards to completing Planet storylines. A game ends when all Objective tracks are fulfilled.',
    resolutionTracks: [
      { tag: 'Royal', current: 0, target: 3, resultName: 'Royal Outpost', resultTags: ['Royal'] },
      { tag: 'Criminal', current: 0, target: 3, resultName: 'Criminal Outpost', resultTags: ['Criminal'] },
    ],
  },
  {
    id: 'rk-sit-1',
    name: 'Strange Foliage',
    type: 'Situation',
    tone: 'Hostile',
    nature: 'Biological',
    description: 'These plants seem to be following your moves. Advance one Hostile at the end of each turn.',
    resolutionTracks: [
        { tone: 'Hostile', current: 0, target: 3, resultName: 'Foliage Cleared', resultTags: ['Criminal'] },
        { tone: 'Political', current: 0, target: 3, resultName: 'Foliage Communed', resultTags: ['Royal'] },
        { tone: 'Scientific', current: 0, target: 3, resultName: 'Foliage Cataloged', resultTags: ['Scientific'] }
    ],
    effects: [
        { type: 'ADVANCE', trigger: 'PLANET_TURN', tone: 'Hostile', amount: 1 }
    ]
  },
  {
    id: 'rk-sit-2',
    name: 'Wandering Herbivore',
    type: 'Situation',
    tone: 'Scientific',
    nature: 'Biological',
    description: 'A placid, plant eating beast wanders into the area.',
    resolutionTracks: [
        { tone: 'Scientific', current: 0, target: 2, resultName: 'Herbivore Studied', resultTags: ['Scientific'] },
        { tone: 'Mercantile', current: 0, target: 2, resultName: 'Herbivore Traded', resultTags: ['Royal'] }
    ]
  },
  ...Array.from({ length: 7 }, (_, i) => {
    const card: Card = {
      id: `rk-p-${i}`,
      name: `Planet Card ${i + 4}`,
      type: (i % 3 === 0 ? 'Objective' : 'Situation') as 'Objective' | 'Situation',
      tone: 'Mercantile' as const,
      nature: 'Cultural' as const,
      description: 'Thematic Royal Koog placeholder.',
    };
    if (card.type === 'Objective') {
        card.resolutionTracks = [{ tag: 'Trade', current: 0, target: 3, resultName: 'Trade Established', resultTags: ['Mercantile'] }];
    } else {
        card.resolutionTracks = [{ tone: 'Mercantile' as const, current: 0, target: 3, resultName: 'Deal Done', resultTags: ['Trade'] }];
    }
    return card;
  }),
];
