export type Tone = 'Hostile' | 'Political' | 'Mercantile' | 'Scientific';
export type Nature = 'Biological' | 'Technological' | 'Cultural' | 'Anomalous';

export type CardType = 'Equipment' | 'Tactic' | 'Policy' | 'Objective' | 'Situation' | 'Reward';

export interface ResolutionTrack {
  id: string;
  tone?: Tone;
  nature?: Nature;
  tag?: string;
  current: number;
  target: number;
  resultName: string;
  resultTags?: string[];
}

export interface Effect {
  type: 'ADVANCE' | 'SUPPRESS_TONE' | 'SUPPRESS_TRACK' | 'DRAW_CARD' | 'REDUCE_TRACK';
  trigger: 'ON_ACTIVATE' | 'PLANET_TURN';
  tone?: Tone;
  nature?: Nature;
  amount?: number;
  trackTone?: Tone;
  targetTrackTag?: string;
  targetCardName?: string;
}

export interface PassiveEffect {
  type: 'MULTIPLY_ADVANCE' | 'PREVENT_ADVANCE' | 'FORCE_TARGET' | 'MODIFY_ACTION_COST' | 'PREVENT_ACTION';
  factor?: number;
  amount?: number;

  // Filters
  sourceTone?: Tone;
  sourceNature?: Nature;
  sourceCardType?: CardType;
  targetCardName?: string;
  targetTrackTag?: string;
  targetTrackTone?: Tone;
  targetNature?: Nature;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  tone: Tone;
  nature: Nature;
  description: string;
  uses?: number; // For Equipment
  resolutionTracks?: ResolutionTrack[]; // For Objectives/Situations
  effects?: Effect[];
  passiveEffects?: PassiveEffect[];
  tags?: string[];
}

export type Phase = 'DRAW' | 'PLAYER_ACTION' | 'RESOLUTION' | 'PLANET_TURN';

export interface Action {
  type: 'DRAW' | 'PLAY' | 'ACTIVATE';
  playerId: string;
  cardId?: string;
  targetId?: string;
  targetTrackId?: string;
}

export interface Player {
  id: string;
  name: string;
  deck: Card[];
  hand: Card[];
  deployed: Card[];
  policy?: Card;
  actionsTaken: number;
  lockedIn: boolean;
  selectedActions: Action[];
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
  };
}
