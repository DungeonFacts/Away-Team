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

export const ROYAL_KOOG_OBJECTIVES: Card[] = [
  {
    id: 'RK-OBJ-01',
    name: 'The Royal Embassy',
    type: 'Objective',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Establish deep diplomatic ties on Koog. The Crown wants pristine protocol; the underworld wants open backdoors.',
    resolutionTracks: [
      { id: 'rk-obj-01-t1', tag: 'Royal', current: 0, target: 3, resultName: 'Favored by Royal Court', resultTags: ['RoyalEnding'] },
      { id: 'rk-obj-01-t2', tag: 'Criminal', current: 0, target: 3, resultName: 'Favored by Kooga Nostra', resultTags: ['CriminalEnding'] },
    ],
    passiveEffects: [
      { type: 'MULTIPLY_ADVANCE', factor: 2, sourceTone: 'Political', targetCardName: 'The Royal Embassy', targetTrackTag: 'Royal' }
    ],
    tags: ['RoyalCourt']
  },
  {
    id: 'RK-OBJ-02',
    name: 'The Crystal Caverns',
    type: 'Objective',
    tone: 'Scientific',
    nature: 'Anomalous',
    description: "Secure the planet's unique mineral repositories. A clash between divine right and raw corporate greed.",
    resolutionTracks: [
      { id: 'rk-obj-02-t1', tag: 'Religious', current: 0, target: 3, resultName: 'Favored by Crystal Cultists', resultTags: ['ReligiousEnding'] },
      { id: 'rk-obj-02-t2', tag: 'Criminal', current: 0, target: 3, resultName: 'Favored by Kooga Nostra', resultTags: ['CriminalEnding'] },
    ],
    passiveEffects: [
      { type: 'MULTIPLY_ADVANCE', factor: 2, sourceTone: 'Scientific', targetCardName: 'The Crystal Caverns', targetTrackTag: 'Religious' }
    ],
    tags: ['CrystalCaverns']
  },
  {
    id: 'RK-OBJ-03',
    name: 'Establish an Outpost',
    type: 'Objective',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Erect a permanent Federation foothold on the surface, balancing territorial sovereignty and sacred ground.',
    resolutionTracks: [
      { id: 'rk-obj-03-t1', tag: 'Royal', current: 0, target: 3, resultName: 'Favored by Royal Court', resultTags: ['RoyalEnding'] },
      { id: 'rk-obj-03-t2', tag: 'Religious', current: 0, target: 3, resultName: 'Favored by Crystal Cultists', resultTags: ['ReligiousEnding'] },
    ],
    effects: [
      { type: 'REDUCE_TRACK', trigger: 'PLANET_TURN', amount: 1, nature: 'Cultural', trackTone: 'Hostile' }
    ],
    tags: ['Outpost']
  }
];

export const ROYAL_KOOG_REWARDS: Card[] = [
  {
    id: 'RK-REW-01',
    name: 'Laser Rifle',
    type: 'Reward',
    tone: 'Hostile',
    nature: 'Technological',
    description: 'Advance a Hostile track twice.',
    effects: [{ type: 'ADVANCE', trigger: 'ON_ACTIVATE', tone: 'Hostile', amount: 2 }]
  }
];

export const ROYAL_KOOG_SITUATIONS: Card[] = [
  {
    id: 'RK-ADV-01',
    name: 'Royal Procession',
    type: 'Situation',
    tone: 'Political',
    nature: 'Cultural',
    description: 'The King is moving through the spires.',
    resolutionTracks: [
      { id: 'rk-adv-01-t1', tone: 'Political', nature: 'Cultural', current: 0, target: 3, resultName: 'Escorted', resultTags: ['Royal'] },
      { id: 'rk-adv-01-t2', tone: 'Hostile', nature: 'Cultural', current: 0, target: 3, resultName: 'Disrupted', resultTags: ['Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-02',
    name: 'Crystal Harmonizing',
    type: 'Situation',
    tone: 'Scientific',
    nature: 'Anomalous',
    description: 'The caverns are humming with energy.',
    resolutionTracks: [
      { id: 'rk-adv-02-t1', tone: 'Scientific', nature: 'Anomalous', current: 0, target: 3, resultName: 'Harmonized', resultTags: ['Religious'] },
      { id: 'rk-adv-02-t2', tone: 'Mercantile', nature: 'Anomalous', current: 0, target: 3, resultName: 'Harvested', resultTags: ['Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-03',
    name: 'Surveying Borderlands',
    type: 'Situation',
    tone: 'Scientific',
    nature: 'Biological',
    description: 'Scoping the local geography.',
    resolutionTracks: [
      { id: 'rk-adv-03-t1', tone: 'Scientific', nature: 'Biological', current: 0, target: 3, resultName: 'Surveyed', resultTags: ['Royal'] },
      { id: 'rk-adv-03-t2', tone: 'Political', nature: 'Anomalous', current: 0, target: 3, resultName: 'Negotiated', resultTags: ['Religious'] }
    ]
  },
  {
    id: 'RK-ADV-04',
    name: 'Port Duty Tariffs',
    type: 'Situation',
    tone: 'Mercantile',
    nature: 'Cultural',
    description: 'Establishing trading fees.',
    resolutionTracks: [
      { id: 'rk-adv-04-t1', tone: 'Mercantile', nature: 'Cultural', current: 0, target: 3, resultName: 'Legitimized', resultTags: ['Royal'] },
      { id: 'rk-adv-04-t2', tone: 'Mercantile', nature: 'Technological', current: 0, target: 3, resultName: 'Bypassed', resultTags: ['Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-05',
    name: "The High Priest's Vision",
    type: 'Situation',
    tone: 'Political',
    nature: 'Anomalous',
    description: 'Religious revelation requires response.',
    resolutionTracks: [
      { id: 'rk-adv-05-t1', tone: 'Political', nature: 'Anomalous', current: 0, target: 3, resultName: 'Interpreted', resultTags: ['Religious'] },
      { id: 'rk-adv-05-t2', tone: 'Hostile', nature: 'Anomalous', current: 0, target: 3, resultName: 'Suppressed', resultTags: ['Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-06',
    name: 'Clearing Foundations',
    type: 'Situation',
    tone: 'Hostile',
    nature: 'Technological',
    description: 'Prepping ground for construction.',
    resolutionTracks: [
      { id: 'rk-adv-06-t1', tone: 'Hostile', nature: 'Technological', current: 0, target: 3, resultName: 'Cleared (Force)', resultTags: ['Royal'] },
      { id: 'rk-adv-06-t2', tone: 'Scientific', nature: 'Biological', current: 0, target: 3, resultName: 'Cleared (Eco)', resultTags: ['Religious'] }
    ]
  },
  {
    id: 'RK-ADV-07',
    name: 'Shady Backroom Deal',
    type: 'Situation',
    tone: 'Mercantile',
    nature: 'Cultural',
    description: 'Under the table trading.',
    resolutionTracks: [
      { id: 'rk-adv-07-t1', tone: 'Mercantile', nature: 'Cultural', current: 0, target: 3, resultName: 'Dealt', resultTags: ['Criminal'] },
      { id: 'rk-adv-07-t2', tone: 'Political', nature: 'Cultural', current: 0, target: 3, resultName: 'Exposed', resultTags: ['Royal'] }
    ]
  },
  {
    id: 'RK-ADV-08',
    name: 'Geothermal Resonance',
    type: 'Situation',
    tone: 'Scientific',
    nature: 'Technological',
    description: 'Uncovering deep energies.',
    resolutionTracks: [
      { id: 'rk-adv-08-t1', tone: 'Scientific', nature: 'Technological', current: 0, target: 3, resultName: 'Tapped (Divine)', resultTags: ['Religious'] },
      { id: 'rk-adv-08-t2', tone: 'Mercantile', nature: 'Technological', current: 0, target: 3, resultName: 'Tapped (Profit)', resultTags: ['Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-09',
    name: 'Mapping the Spires',
    type: 'Situation',
    tone: 'Scientific',
    nature: 'Anomalous',
    description: 'Cartography of structural formations.',
    resolutionTracks: [
      { id: 'rk-adv-09-t1', tone: 'Scientific', nature: 'Anomalous', current: 0, target: 3, resultName: 'Mapped (Sacred)', resultTags: ['Religious'] },
      { id: 'rk-adv-09-t2', tone: 'Hostile', nature: 'Technological', current: 0, target: 3, resultName: 'Mapped (Strategic)', resultTags: ['Royal'] }
    ]
  },
  {
    id: 'RK-ADV-10',
    name: 'Grand Royal Gala (Heavy)',
    type: 'Situation',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Massive high-society gathering.',
    resolutionTracks: [
      { id: 'rk-adv-10-t1', tone: 'Political', nature: 'Cultural', current: 0, target: 5, resultName: 'Diplomatic Success', resultTags: ['Royal', 'Royal'] },
      { id: 'rk-adv-10-t2', tone: 'Mercantile', nature: 'Cultural', current: 0, target: 5, resultName: 'Mixed Interests', resultTags: ['Royal', 'Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-11',
    name: 'Subterranean Dig (Heavy)',
    type: 'Situation',
    tone: 'Scientific',
    nature: 'Technological',
    description: 'Deep mineral excavation.',
    resolutionTracks: [
      { id: 'rk-adv-11-t1', tone: 'Scientific', nature: 'Technological', current: 0, target: 5, resultName: 'Holy Site Uncovered', resultTags: ['Religious', 'Religious'] },
      { id: 'rk-adv-11-t2', tone: 'Mercantile', nature: 'Technological', current: 0, target: 5, resultName: 'Wealth Uncovered', resultTags: ['Criminal', 'Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-12',
    name: 'Charter Negotiation (Heavy)',
    type: 'Situation',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Rewriting structural rights.',
    resolutionTracks: [
      { id: 'rk-adv-12-t1', tone: 'Political', nature: 'Cultural', current: 0, target: 5, resultName: 'Royal Charter', resultTags: ['Royal', 'Royal'] },
      { id: 'rk-adv-12-t2', tone: 'Political', nature: 'Anomalous', current: 0, target: 5, resultName: 'Religious Charter', resultTags: ['Religious', 'Religious'] }
    ]
  },
  {
    id: 'RK-ADV-13',
    name: 'Black Market Fence',
    type: 'Situation',
    tone: 'Mercantile',
    nature: 'Technological',
    description: 'Dealing with stolen materials.',
    resolutionTracks: [
      { id: 'rk-adv-13-t1', tone: 'Mercantile', nature: 'Technological', current: 0, target: 3, resultName: 'Goods Fenced', resultTags: ['Criminal'] },
      { id: 'rk-adv-13-t2', tone: 'Hostile', nature: 'Technological', current: 0, target: 3, resultName: 'Ring Busted', resultTags: ['Royal'] }
    ]
  },
  {
    id: 'RK-ADV-14',
    name: 'Shrines of Luminescence',
    type: 'Situation',
    tone: 'Political',
    nature: 'Anomalous',
    description: 'Pilgrimage holy sites.',
    resolutionTracks: [
      { id: 'rk-adv-14-t1', tone: 'Political', nature: 'Anomalous', current: 0, target: 3, resultName: 'Consecrated', resultTags: ['Religious'] },
      { id: 'rk-adv-14-t2', tone: 'Mercantile', nature: 'Cultural', current: 0, target: 3, resultName: 'Commercialized', resultTags: ['Criminal'] }
    ]
  },
  {
    id: 'RK-ADV-15',
    name: 'Corrupt Guard Patrol',
    type: 'Situation',
    tone: 'Hostile',
    nature: 'Cultural',
    description: 'Bribing or dealing with authorities.',
    resolutionTracks: [
      { id: 'rk-adv-15-t1', tone: 'Hostile', nature: 'Cultural', current: 0, target: 3, resultName: 'Bribed', resultTags: ['Criminal'] },
      { id: 'rk-adv-15-t2', tone: 'Political', nature: 'Cultural', current: 0, target: 3, resultName: 'Disciplined', resultTags: ['Royal'] }
    ]
  },
  {
    id: 'RK-CHL-01',
    name: 'Accept a Bribe?',
    type: 'Situation',
    tone: 'Mercantile',
    nature: 'Cultural',
    description: 'A tempting underworld offer.',
    resolutionTracks: [
      { id: 'rk-chl-01-t1', tone: 'Mercantile', nature: 'Cultural', current: 0, target: 1, resultName: 'Bribe Taken', resultTags: ['Criminal'] },
      { id: 'rk-chl-01-t2', tone: 'Political', nature: 'Cultural', current: 0, target: 3, resultName: 'Reported', resultTags: ['Royal'] }
    ],
    effects: [
      { type: 'DRAW_CARD', trigger: 'ON_ACTIVATE', targetTrackTag: 'Criminal' }
    ]
  },
  {
    id: 'RK-CHL-02',
    name: 'Cave-in at the Cavern!',
    type: 'Situation',
    tone: 'Hostile',
    nature: 'Technological',
    description: 'Rubble blocking entry.',
    resolutionTracks: [
      { id: 'rk-chl-02-t1', tone: 'Hostile', nature: 'Technological', current: 0, target: 2, resultName: 'Cleared', resultTags: [] }
    ],
    passiveEffects: [
      { type: 'PREVENT_ADVANCE', sourceTone: 'Scientific', targetCardName: 'The Crystal Caverns' }
    ]
  },
  {
    id: 'RK-CHL-03',
    name: 'Sovereign Bureaucracy',
    type: 'Situation',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Red tape slowing actions.',
    resolutionTracks: [
      { id: 'rk-chl-03-t1', tone: 'Political', nature: 'Cultural', current: 0, target: 2, resultName: 'Resolved', resultTags: [] }
    ],
    passiveEffects: [
      { type: 'FORCE_TARGET', sourceTone: 'Political', targetCardName: 'Sovereign Bureaucracy' }
    ]
  },
  {
    id: 'RK-CHL-04',
    name: 'Smuggler Ambush',
    type: 'Situation',
    tone: 'Hostile',
    nature: 'Technological',
    description: 'Hostile criminal intercept.',
    resolutionTracks: [
      { id: 'rk-chl-04-t1', tone: 'Hostile', nature: 'Technological', current: 0, target: 3, resultName: 'Secured', resultTags: [] }
    ],
    effects: [
      { type: 'REDUCE_TRACK', trigger: 'PLANET_TURN', amount: 1 }
    ]
  },
  {
    id: 'RK-CHL-05',
    name: 'Unstable Radiation',
    type: 'Situation',
    tone: 'Scientific',
    nature: 'Anomalous',
    description: 'Energy leakage.',
    resolutionTracks: [
      { id: 'rk-chl-05-t1', tone: 'Scientific', nature: 'Anomalous', current: 0, target: 2, resultName: 'Shielded', resultTags: [] }
    ],
    passiveEffects: [
      { type: 'MODIFY_ACTION_COST', sourceCardType: 'Tactic', amount: 1 }
    ]
  },
  {
    id: 'RK-CHL-06',
    name: 'Courtly Gossip',
    type: 'Situation',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Whispers and rumors.',
    resolutionTracks: [
      { id: 'rk-chl-06-t1', tone: 'Political', nature: 'Cultural', current: 0, target: 1, resultName: 'Defused', resultTags: ['Royal'] },
      { id: 'rk-chl-06-t2', tone: 'Mercantile', nature: 'Cultural', current: 0, target: 1, resultName: 'Sold', resultTags: ['Criminal'] }
    ]
  },
  {
    id: 'RK-CHL-07',
    name: 'Slum Shakedown',
    type: 'Situation',
    tone: 'Hostile',
    nature: 'Cultural',
    description: 'Gang interference.',
    resolutionTracks: [
      { id: 'rk-chl-07-t1', tone: 'Hostile', nature: 'Cultural', current: 0, target: 2, resultName: 'Dispersed', resultTags: [] }
    ],
    passiveEffects: [
      { type: 'PREVENT_ACTION', sourceTone: 'Mercantile' }
    ]
  },
  {
    id: 'RK-CHL-08',
    name: 'Religious Zealotry',
    type: 'Situation',
    tone: 'Political',
    nature: 'Anomalous',
    description: 'Extremist disruption.',
    resolutionTracks: [
      { id: 'rk-chl-08-t1', tone: 'Political', nature: 'Anomalous', current: 0, target: 2, resultName: 'Disarmed', resultTags: [] }
    ],
    passiveEffects: [
      { type: 'PREVENT_ADVANCE', targetTrackTag: 'Royal' }
    ]
  },
  {
    id: 'RK-CHL-09',
    name: 'Counterfeit Crystals',
    type: 'Situation',
    tone: 'Mercantile',
    nature: 'Anomalous',
    description: 'Fake mineral trading.',
    resolutionTracks: [
      { id: 'rk-chl-09-t1', tone: 'Mercantile', nature: 'Anomalous', current: 0, target: 2, resultName: 'Authenticated', resultTags: [] }
    ],
    effects: [
      { type: 'REDUCE_TRACK', trigger: 'PLANET_TURN', amount: 1, targetCardName: 'The Crystal Caverns', targetTrackTag: 'Religious' }
    ],
    tags: ['SelfDiscardAfter3Turns']
  },
  {
    id: 'RK-CHL-10',
    name: 'Royal Escort Demands',
    type: 'Situation',
    tone: 'Political',
    nature: 'Cultural',
    description: 'Strict royal demands.',
    resolutionTracks: [
      { id: 'rk-chl-10-t1', tone: 'Political', nature: 'Cultural', current: 0, target: 3, resultName: 'Accommodated', resultTags: [] }
    ],
    passiveEffects: [
      { type: 'MULTIPLY_ADVANCE', factor: 0.5, targetTrackTag: 'Criminal' }
    ]
  }
];

export const ROYAL_KOOG_DECK: Card[] = [
  ...ROYAL_KOOG_SITUATIONS
];
