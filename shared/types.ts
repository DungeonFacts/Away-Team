export type Tone = 'Hostile' | 'Political' | 'Mercantile' | 'Scientific';
export type Nature = 'Biological' | 'Technological' | 'Cultural' | 'Anomalous';

export type CardType = 'Equipment' | 'Tactic' | 'Policy' | 'Objective' | 'Situation' | 'Reward';

export interface ResolutionTrack {
  id: string;
  tone?: Tone | undefined;
  nature?: Nature | undefined;
  tag?: string | undefined;
  current: number;
  target: number;
  resultName: string;
  resultTags?: string[] | undefined;
  // Dynamic / modified properties
  extraTones?: Tone[] | undefined;
  extraNatures?: Nature[] | undefined;
  tempExtraTones?: Tone[] | undefined;
  tempExtraNatures?: Nature[] | undefined;
}

export interface Effect {
  type: 'ADVANCE' | 'SUPPRESS_TONE' | 'SUPPRESS_TRACK' | 'DRAW_CARD' | 'REDUCE_TRACK';
  trigger: 'ON_ACTIVATE' | 'PLANET_TURN';
  tone?: Tone | undefined;
  nature?: Nature | undefined;
  amount?: number | undefined;
  trackTone?: Tone | undefined;
  targetTrackTag?: string | undefined;
  targetCardName?: string | undefined;
}

export interface PassiveEffect {
  type: 'MULTIPLY_ADVANCE' | 'PREVENT_ADVANCE' | 'FORCE_TARGET' | 'MODIFY_ACTION_COST' | 'PREVENT_ACTION';
  factor?: number | undefined;
  amount?: number | undefined;

  // Filters
  sourceTone?: Tone | undefined;
  sourceNature?: Nature | undefined;
  sourceCardType?: CardType | undefined;
  targetCardName?: string | undefined;
  targetTrackTag?: string | undefined;
  targetTrackTone?: Tone | undefined;
  targetNature?: Nature | undefined;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  tone: Tone;
  nature: Nature;
  description: string;
  uses?: number | undefined; // For Equipment
  resolutionTracks?: ResolutionTrack[] | undefined; // For Objectives/Situations
  effects?: Effect[] | undefined;
  passiveEffects?: PassiveEffect[] | undefined;
  tags?: string[] | undefined;
}

export type Phase = 'DRAW' | 'PLAYER_ACTION' | 'RESOLUTION' | 'PLANET_TURN';

export interface Action {
  type: 'DRAW' | 'PLAY' | 'ACTIVATE';
  playerId: string;
  cardId?: string | undefined;
  targetId?: string | undefined;
  targetTrackId?: string | undefined;
  secondaryCardId?: string | undefined; // For XE-TAC-05
  choice?: string | undefined; // For XE-TAC-12
}

export interface Player {
  id: string;
  name: string;
  deck: Card[];
  hand: Card[];
  deployed: Card[];
  policy?: Card | undefined;
  tempPolicy?: Card | undefined; // Temporary second policy in play (XE-TAC-05)
  actionsTaken: number;
  lockedIn: boolean;
  selectedActions: Action[];
  maxActions: number; // Defaults to 2, can be dynamically modified
  pendingExtraActions: number; // Extra actions to be carried over to the next turn
}

export interface RngLogEntry {
  turnNumber: number;
  effect: string;
  seedStateBefore: number;
  seedStateAfter: number;
  result: number;
}

export interface GameState {
  id: string;
  players: Player[];
  planetDeck: Card[];
  planetObjectives: Card[];
  planetSituations: Card[];
  phase: Phase;
  turnCount: number;
  history: string[];
  victory: boolean;
  defeat: boolean;
  resolutionLog: string[];
  scenarioCounters: Record<string, number>;
  activeEnding?: {
    title: string;
    isVictory: boolean;
  } | undefined;
  seed: number;
  rngState: number;
  rngLog: RngLogEntry[];
  // Dynamic Game Engine State to support advanced card effects:
  playerOrder: string[]; // Sequential play order for the current turn
  doubleTargetTracks?: string[] | undefined; // Track IDs where the next Tactic happens twice this turn
  expertsTargetedTracks?: string[] | undefined; // Tracks targeting by SO-TAC-14
  bogeyRedirectTrackId?: string | undefined; // Track ID to redirect the next Scientific card to
  blockedSituationIdsThisTurn?: string[] | undefined; // Situations that cannot be targeted this turn
  blockedSituationIdsNextTurn?: string[] | undefined; // Situations that cannot be targeted next turn
  tracksAdvancedThisTurn?: string[] | undefined; // Track IDs that advanced this turn
  tracksAdvancedLastTurn?: string[] | undefined; // Track IDs that advanced last turn
  historicalPrecedentPassive?: {
    passiveEffects: PassiveEffect[];
    sourceSituationId: string;
  } | undefined; // For XE-TAC-09
  scanAlternateSpectraChoices?: {
    playerId: string;
    choice: string;
  }[] | undefined; // For XE-TAC-12
}
