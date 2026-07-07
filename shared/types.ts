export type Tone = 'Hostile' | 'Diplomatic' | 'Mercantile' | 'Scientific';
export type Nature = 'Biological' | 'Technological' | 'Cultural' | 'Anomalous';

export type CardType = 'Equipment' | 'Tactic' | 'Policy' | 'Objective' | 'Event';

export interface ResolutionTrack {
  tone: Tone;
  current: number;
  target: number;
  resultName: string;
  resultTags?: string[];
}

export interface Effect {
  type: 'ADVANCE';
  trigger: 'ON_ACTIVATE' | 'PLANET_TURN';
  tone?: Tone; // If omitted, use the card's own tone or the action's tone
  amount: number;
}

export interface PassiveEffect {
  type: 'MULTIPLY_ADVANCE';
  nature?: Nature;
  tone?: Tone;
  factor: number;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  tone: Tone;
  nature: Nature;
  description: string;
  uses?: number; // For Equipment
  resolutionTracks?: ResolutionTrack[]; // For Objectives
  resolveAction?: (state: GameState) => GameState; // For Events/Objectives
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
  planetEvents: Card[];
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
