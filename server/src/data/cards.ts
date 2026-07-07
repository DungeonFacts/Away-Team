import type { Card } from '../../../shared/types.js';

export const SECURITY_OFFICER_DECK: Card[] = [
  {
    id: 'so-1',
    name: 'Set Phasers to Stun',
    type: 'Tactic',
    tone: 'Hostile',
    nature: 'Technological',
    description: 'Hostile events cannot advance this turn. Diplomatic cards do not resolve this turn.',
  },
  {
    id: 'so-2',
    name: 'Tactical Analysis',
    type: 'Tactic',
    tone: 'Scientific',
    nature: 'Technological',
    description: 'Advance one Hostile objective twice.',
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
    tone: 'Diplomatic',
    nature: 'Cultural',
    description: 'Choose one Diplomacy Objective. Advance it three times. Discard Peace Offering.',
    uses: 1,
    effects: [
      { type: 'ADVANCE', trigger: 'ON_ACTIVATE', tone: 'Diplomatic', amount: 3 }
    ]
  },
  {
    id: 'xb-2',
    name: 'Field Scanner',
    type: 'Equipment',
    tone: 'Scientific',
    nature: 'Technological',
    description: 'Advance one Scientific objective.',
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
    name: 'Royal Bodyguard',
    type: 'Objective',
    tone: 'Hostile',
    nature: 'Cultural',
    description: 'Resolves when it reaches 3 points in either direction.',
    resolutionTracks: [
      { tone: 'Hostile', current: 0, target: 3, resultName: 'Criminal Probation', resultTags: ['Criminal'] },
      { tone: 'Diplomatic', current: 0, target: 3, resultName: 'Royal Escort', resultTags: ['Royal'] },
    ],
  },
  {
    id: 'rk-obj-2',
    name: 'A Royal Audience',
    type: 'Objective',
    tone: 'Diplomatic',
    nature: 'Cultural',
    description: 'Core objective. Requires 3 Royal resolutions to win.',
    resolutionTracks: [
      { tone: 'Diplomatic', current: 0, target: 5, resultName: 'Royal Alliance', resultTags: ['Royal'] },
    ],
  },
  {
    id: 'rk-obj-3',
    name: 'Strange Foliage',
    type: 'Objective',
    tone: 'Hostile',
    nature: 'Biological',
    description: 'These plants seem to be following your moves. Advance one Hostile at the end of each turn.',
    resolutionTracks: [
        { tone: 'Scientific', current: 0, target: 3, resultName: 'Botanical Breakthrough', resultTags: ['Scientific'] }
    ],
    effects: [
        { type: 'ADVANCE', trigger: 'PLANET_TURN', tone: 'Hostile', amount: 1 }
    ]
  },
  {
    id: 'rk-event-1',
    name: 'Wandering Herbivore',
    type: 'Event',
    tone: 'Scientific',
    nature: 'Biological',
    description: 'A placid, plant eating beast wanders into the area.',
  },
  ...Array.from({ length: 6 }, (_, i) => {
    const card: Card = {
      id: `rk-p-${i}`,
      name: `Planet Card ${i + 4}`,
      type: (i % 2 === 0 ? 'Objective' : 'Event') as 'Objective' | 'Event',
      tone: 'Mercantile' as const,
      nature: 'Cultural' as const,
      description: 'Thematic Royal Koog placeholder.',
    };
    if (i % 2 === 0) {
      card.resolutionTracks = [{ tone: 'Mercantile' as const, current: 0, target: 3, resultName: 'Trade Agreement', resultTags: ['Mercantile'] }];
    }
    return card;
  }),
];
