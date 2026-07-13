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
    uses?: number | undefined;
    resolutionTracks?: ResolutionTrack[] | undefined;
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
    secondaryCardId?: string | undefined;
    choice?: string | undefined;
}
export interface Player {
    id: string;
    name: string;
    deck: Card[];
    hand: Card[];
    deployed: Card[];
    policy?: Card | undefined;
    tempPolicy?: Card | undefined;
    actionsTaken: number;
    lockedIn: boolean;
    selectedActions: Action[];
    maxActions: number;
    pendingExtraActions: number;
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
    playerOrder: string[];
    doubleTargetTracks?: string[] | undefined;
    expertsTargetedTracks?: string[] | undefined;
    bogeyRedirectTrackId?: string | undefined;
    blockedSituationIdsThisTurn?: string[] | undefined;
    blockedSituationIdsNextTurn?: string[] | undefined;
    tracksAdvancedThisTurn?: string[] | undefined;
    tracksAdvancedLastTurn?: string[] | undefined;
    historicalPrecedentPassive?: {
        passiveEffects: PassiveEffect[];
        sourceSituationId: string;
    } | undefined;
    scanAlternateSpectraChoices?: {
        playerId: string;
        choice: string;
    }[] | undefined;
}
//# sourceMappingURL=types.d.ts.map