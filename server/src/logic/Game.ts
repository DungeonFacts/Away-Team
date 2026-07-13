import type { GameState, Player, Card, Action, ResolutionTrack, Effect, PassiveEffect, Tone, Nature } from '../../../shared/types.js';
import {
  SECURITY_OFFICER_DECK,
  XENOETHNOLOGIST_DECK,
  ROYAL_KOOG_SITUATIONS,
  ROYAL_KOOG_OBJECTIVES,
  ROYAL_KOOG_REWARDS
} from '../data/cards.js';

export class Game {
  private state: GameState;

  constructor(playerNames: string[], seed?: number) {
    const initialSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);

    this.state = {
      id: Math.random().toString(36).substr(2, 9),
      players: [],
      planetDeck: [],
      planetObjectives: [],
      planetSituations: [],
      phase: 'PLAYER_ACTION',
      turnCount: 1,
      history: ['Game started.'],
      victory: false,
      defeat: false,
      resolutionLog: [],
      scenarioCounters: {},
      playerOrder: [],
      seed: initialSeed,
      rngState: initialSeed,
      rngLog: [],
      doubleTargetTracks: [],
      expertsTargetedTracks: [],
      blockedSituationIdsThisTurn: [],
      blockedSituationIdsNextTurn: [],
      tracksAdvancedThisTurn: [],
      tracksAdvancedLastTurn: [],
    };

    // Determine player decks
    const players: Player[] = playerNames.map((name, index) => {
      const isSO = name.toLowerCase().includes('security') || index === 0;
      const deck = this.shuffle(isSO ? [...SECURITY_OFFICER_DECK] : [...XENOETHNOLOGIST_DECK], `Player ${index} deck setup`);
      return {
        id: `player-${index}`,
        name,
        deck,
        hand: [],
        deployed: [],
        actionsTaken: 0,
        lockedIn: false,
        selectedActions: [],
        maxActions: 2,
        pendingExtraActions: 0,
      };
    });

    players.forEach(p => {
      p.hand = p.deck.splice(0, 5);
    });

    const planetDeck = this.shuffle([...ROYAL_KOOG_SITUATIONS], 'Planet deck setup');
    const availableObjectives = this.shuffle([...ROYAL_KOOG_OBJECTIVES], 'Objectives setup');
    const planetObjectives: Card[] = [];
    const planetSituations: Card[] = [];

    const objectiveCount = Math.min(players.length + 1, availableObjectives.length);
    for (let i = 0; i < objectiveCount; i++) {
      planetObjectives.push(availableObjectives.pop()!);
    }

    // Initial 2 Situations
    for (let i = 0; i < 2; i++) {
      const card = planetDeck.pop();
      if (card) planetSituations.push(card);
    }

    // Randomize initial play order
    const playerIds = players.map(p => p.id);
    const randomizedOrder = this.shuffle([...playerIds], 'Initial play order setup');

    this.state.players = players;
    this.state.planetDeck = planetDeck;
    this.state.planetObjectives = planetObjectives;
    this.state.planetSituations = planetSituations;
    this.state.playerOrder = randomizedOrder;
  }

  public getState(): GameState {
    return this.state;
  }

  public random(effect: string): number {
    const turnNumber = this.state.turnCount;
    const seedStateBefore = this.state.rngState;

    // Mulberry32 step
    let z = (this.state.rngState += 0x6D2B79F5) | 0;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    const result = ((z ^ (z >>> 14)) >>> 0) / 4294967296;

    const seedStateAfter = this.state.rngState;

    this.state.rngLog.push({
      turnNumber,
      effect,
      seedStateBefore,
      seedStateAfter,
      result
    });

    return result;
  }

  public randomInt(max: number, effect: string): number {
    const r = this.random(effect);
    return Math.floor(r * max);
  }

  public randomElement<T>(array: T[], effect: string): T {
    const index = this.randomInt(array.length, `${effect} (select element)`);
    return array[index]!;
  }

  private shuffle<T>(array: T[], effect: string): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1, `${effect} (shuffle step ${i})`);
      [result[i], result[j]] = [result[j] as T, result[i] as T];
    }
    return result;
  }

  public getRandomSituationTrack(effect: string, filterFn?: (item: { track: ResolutionTrack; parent: Card }) => boolean): { track: ResolutionTrack; parent: Card } | undefined {
    const list: { track: ResolutionTrack; parent: Card }[] = [];
    this.state.planetSituations.forEach(card => {
      card.resolutionTracks?.forEach(t => {
        list.push({ track: t, parent: card });
      });
    });
    const filteredList = filterFn ? list.filter(filterFn) : list;
    if (filteredList.length === 0) return undefined;
    return this.randomElement(filteredList, effect);
  }

  // Get active tones for a track considering base, temp, permanent, and policies
  public getTrackTones(track: ResolutionTrack, situation: Card): Tone[] {
    const tones: Tone[] = [];
    if (track.tone) tones.push(track.tone);
    if (track.extraTones) tones.push(...track.extraTones);
    if (track.tempExtraTones) tones.push(...track.tempExtraTones);

    // Apply Policies/Passives
    const activePolicies = this.state.players.flatMap(p => {
      const policies = [];
      if (p.policy) policies.push(p.policy);
      if (p.tempPolicy) policies.push(p.tempPolicy);
      return policies;
    });

    activePolicies.forEach(pol => {
      if (pol.id === 'XE-POL-09' && situation.type === 'Situation') {
        // Haggle: your Tactics change Tone to Mercantile. Handled at source, but policies don't change track tones
      }
    });

    return Array.from(new Set(tones));
  }

  // Get active natures for a track
  public getTrackNatures(track: ResolutionTrack, situation: Card): Nature[] {
    const natures: Nature[] = [];
    if (track.nature) natures.push(track.nature);
    if (track.extraNatures) natures.push(...track.extraNatures);
    if (track.tempExtraNatures) natures.push(...track.tempExtraNatures);

    // Policies
    const activePolicies = this.state.players.flatMap(p => {
      const policies = [];
      if (p.policy) policies.push(p.policy);
      if (p.tempPolicy) policies.push(p.tempPolicy);
      return policies;
    });

    const tones = this.getTrackTones(track, situation);

    activePolicies.forEach(pol => {
      if (pol.id === 'XE-POL-02' && tones.includes('Mercantile')) {
        natures.push('Cultural');
      }
      if (pol.id === 'XE-POL-03' && tones.includes('Political')) {
        natures.push('Biological');
      }
      if (pol.id === 'XE-POL-04' && tones.includes('Scientific')) {
        natures.push('Anomalous');
      }
      if (pol.id === 'XE-POL-05' && tones.includes('Hostile')) {
        natures.push('Technological');
      }
    });

    return Array.from(new Set(natures));
  }

  // Helper to find all available tracks on active situations/objectives
  private getAllActiveTracks(): { track: ResolutionTrack; parent: Card }[] {
    const list: { track: ResolutionTrack; parent: Card }[] = [];
    [...this.state.planetSituations, ...this.state.planetObjectives].forEach(card => {
      card.resolutionTracks?.forEach(t => {
        list.push({ track: t, parent: card });
      });
    });
    return list;
  }

  // Calculate Action Point Cost of a given planned Action
  private getActionCost(action: Action, player: Player): number {
    if (action.type === 'ACTIVATE') {
      const card = [...player.deployed, ...(player.policy ? [player.policy] : []), ...player.selectedActions.filter(a => a.type === 'PLAY').map(a => player.hand.find(c => c.id === a.cardId)).filter(Boolean)].find(c => c?.id === action.cardId);
      if (card?.type === 'Tactic') {
        const isUnstableActive = this.state.planetSituations.some(s => s.id === 'RK-CHL-05');
        return isUnstableActive ? 2 : 1;
      }
    }
    return 1;
  }

  // Check if target validation holds
  public validateActionSelection(action: Action): { valid: boolean; reason?: string } {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) return { valid: false, reason: 'Player not found' };

    // Calculate total planned cost
    const currentPlannedCost = player.selectedActions.reduce((sum, act) => sum + this.getActionCost(act, player), 0);
    const newActionCost = this.getActionCost(action, player);

    if (currentPlannedCost + newActionCost > player.maxActions) {
      return { valid: false, reason: 'Not enough action points' };
    }

    if (action.type === 'PLAY') {
      const card = player.hand.find(c => c.id === action.cardId);
      if (!card) return { valid: false, reason: 'Card not in hand' };
      return { valid: true };
    }

    if (action.type === 'ACTIVATE') {
      const card = [...player.deployed, ...(player.policy ? [player.policy] : []), ...player.selectedActions.filter(a => a.type === 'PLAY').map(a => player.hand.find(c => c.id === a.cardId)).filter(Boolean)].find(c => c?.id === action.cardId);
      if (!card) return { valid: false, reason: 'Card not found on board' };

      // Check Sterile Technique (XE-POL-07 prohibits Tactics)
      const activePolicies = [player.policy, player.tempPolicy].filter(Boolean) as Card[];
      const remoteDiagnosticsActive = activePolicies.some(p => p.id === 'XE-POL-07');
      if (remoteDiagnosticsActive && card.type === 'Tactic') {
        return { valid: false, reason: 'Remote Diagnostics prevents activating Tactics' };
      }

      // If targeting a track
      if (action.targetId) {
        const targetCard = [...this.state.planetSituations, ...this.state.planetObjectives].find(c => c.id === action.targetId);
        if (!targetCard) return { valid: false, reason: 'Target card not found' };

        // Sovereign Bureaucracy (RK-CHL-03) restriction: Political tactics can only target this situation
        const isSovereignActive = this.state.planetSituations.some(s => s.id === 'RK-CHL-03');
        if (isSovereignActive && card.type === 'Tactic' && card.tone === 'Political' && targetCard.id !== 'RK-CHL-03') {
          return { valid: false, reason: 'Sovereign Bureaucracy forces Political Tactics to target it' };
        }

        // Slum Shakedown (RK-CHL-07) restriction: Mercantile tactics cannot target Situations
        const isShakedownActive = this.state.planetSituations.some(s => s.id === 'RK-CHL-07');
        if (isShakedownActive && card.type === 'Tactic' && card.tone === 'Mercantile' && targetCard.type === 'Situation') {
          return { valid: false, reason: 'Slum Shakedown prevents Mercantile Tactics from targeting Situations' };
        }

        // Evacuate the Civilians (SO-TAC-18) & Solitary Confinement (SO-TAC-20) block targeting next turn
        if (this.state.blockedSituationIdsThisTurn?.includes(targetCard.id)) {
          return { valid: false, reason: 'This target is blocked from being targeted this turn' };
        }

        if (action.targetTrackId) {
          const track = targetCard.resolutionTracks?.find(t => t.id === action.targetTrackId);
          if (!track) return { valid: false, reason: 'Target track not found' };

          // Cave-in at the Cavern (RK-CHL-02): Scientific cards cannot advance Crystal Caverns
          const isCaveInActive = this.state.planetSituations.some(s => s.id === 'RK-CHL-02');
          if (isCaveInActive && targetCard.id === 'RK-OBJ-02' && card.tone === 'Scientific') {
            return { valid: false, reason: 'Cave-in prevents Scientific cards from advancing Crystal Caverns' };
          }

          // Religious Zealotry (RK-CHL-08): Royal Objective tracks cannot be advanced
          const isZealotryActive = this.state.planetSituations.some(s => s.id === 'RK-CHL-08');
          if (isZealotryActive && track.tag === 'Royal' && targetCard.type === 'Objective') {
            return { valid: false, reason: 'Religious Zealotry prevents Royal Objectives from being advanced' };
          }

          // Shoot First, Ask Questions Later (SO-TAC-05): valid collateral damage track (different, strictly Situation track with >= 2 points) must exist
          if (card.id === 'SO-TAC-05') {
            const hasCollateralTarget = this.state.planetSituations.flatMap(s => s.resolutionTracks || []).map(t => {
              const parent = this.state.planetSituations.find(sit => sit.resolutionTracks?.includes(t))!;
              return { track: t, parent };
            }).some(item => {
              return item.track.id !== track.id && item.track.current >= 2;
            });
            if (!hasCollateralTarget) {
              return { valid: false, reason: 'No valid Situation track with at least 2 points exists for Collateral Damage' };
            }
          }
        }
      }

      // XE-EQP-04 (Field Guide): must have Policy card in deck to fetch
      if (card.id === 'XE-EQP-04' && !player.deck.some(c => c.type === 'Policy')) {
        return { valid: false, reason: 'No Policy cards in deck to retrieve' };
      }
    }

    return { valid: true };
  }

  public handleAction(action: Action) {
    const validation = this.validateActionSelection(action);
    if (!validation.valid) {
      return;
    }
    const player = this.state.players.find(p => p.id === action.playerId);
    if (player) {
      player.selectedActions.push(action);
    }
  }

  public removeAction(playerId: string, index: number) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.lockedIn) return;
    player.selectedActions.splice(index, 1);
  }

  private getAllActivePassives(): PassiveEffect[] {
    const allPassives: PassiveEffect[] = [];
    this.state.players.forEach(p => {
      if (p.policy) allPassives.push(...(p.policy.passiveEffects || []));
      if (p.tempPolicy) allPassives.push(...(p.tempPolicy.passiveEffects || []));
      p.deployed.forEach(c => allPassives.push(...(c.passiveEffects || [])));
    });

    // Handle Sterile Technique (XE-POL-06) silencing Biological Situation passives
    const isSterileActive = this.state.players.some(p => p.policy?.id === 'XE-POL-06' || p.tempPolicy?.id === 'XE-POL-06');

    this.state.planetSituations.forEach(s => {
      // Solitary Confinement (SO-TAC-20): Disable passive effects on Situation
      if (this.state.scenarioCounters[`solitary_disabled_${s.id}`] > 0) {
        return;
      }
      if (isSterileActive && s.nature === 'Biological') {
        // Skip passive effects of Biological situations
        return;
      }
      allPassives.push(...(s.passiveEffects || []));
    });

    this.state.planetObjectives.forEach(o => {
      allPassives.push(...(o.passiveEffects || []));
    });
    return allPassives;
  }

  public lockIn(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;
    player.lockedIn = true;

    if (this.state.players.every(p => p.lockedIn)) {
      this.resolveTurn();
    }
  }

  private resolveTurn() {
    this.state.phase = 'RESOLUTION';
    this.state.resolutionLog = [];

    // Order of Resolution:
    // Determine player turn queue: Security Officer's SO-POL-04 (Taking Point) active -> always goes first.
    // Otherwise, follow randomized and rotating player order.
    let playOrderIds = [...this.state.playerOrder];
    const takingPointOwner = this.state.players.find(p => p.policy?.id === 'SO-POL-04' || p.tempPolicy?.id === 'SO-POL-04');
    if (takingPointOwner) {
      playOrderIds = [takingPointOwner.id, ...playOrderIds.filter(id => id !== takingPointOwner.id)];
    }

    const orderedPlayers = playOrderIds.map(id => this.state.players.find(p => p.id === id)!).filter(Boolean);

    // Simultaneous Resolution Log
    this.state.resolutionLog.push(`=== Player Resolution Order: ${orderedPlayers.map(p => p.name).join(' -> ')} ===`);

    // Flag for Fisticuffs (SO-TAC-11) "No Equipment resolves this turn"
    let noEquipmentResolves = false;
    orderedPlayers.forEach(p => {
      p.selectedActions.forEach(a => {
        if (a.cardId === 'SO-TAC-11' && a.type === 'ACTIVATE') {
          noEquipmentResolves = true;
        }
      });
    });

    // Resolve Player Actions
    orderedPlayers.forEach(player => {
      // Keep track of which actions are taken
      for (const action of player.selectedActions) {
        if (action.type === 'DRAW') {
          // Check for draw count modifications (e.g. Call in Reinforcements decreases draw counts by 1)
          const allPassives = this.getAllActivePassives();
          let countToDraw = 1;

          // Remote Diagnostics (XE-POL-07) converts draw 1 to draw 2
          const hasDiagnostics = [player.policy, player.tempPolicy].some(p => p?.id === 'XE-POL-07');
          if (hasDiagnostics) countToDraw = 2;

          // Reinforcements penalty
          const hasReinforcementsPenalty = this.state.scenarioCounters['reinforcements_draw_penalty'] > 0;
          if (hasReinforcementsPenalty) {
            countToDraw = Math.max(0, countToDraw - 1);
          }

          if (countToDraw > 0) {
            for (let d = 0; d < countToDraw; d++) {
              const card = player.deck.pop();
              if (card) {
                player.hand.push(card);
                this.state.resolutionLog.push(`${player.name} drew: ${card.name}`);
              }
            }
          } else {
            this.state.resolutionLog.push(`${player.name} planned a Draw but drew 0 cards due to negative draw modifiers.`);
          }
        } else if (action.type === 'PLAY') {
          const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
          if (cardIndex !== -1) {
            const cardToPlay = player.hand.splice(cardIndex, 1)[0]!;
            if (cardToPlay.type === 'Policy') {
              if (player.policy) player.hand.push(player.policy);
              player.policy = cardToPlay;
            } else {
              player.deployed.push(cardToPlay);
            }
            this.state.resolutionLog.push(`${player.name} played/deployed ${cardToPlay.name}.`);

            // Draft Hypotheses (XE-POL-01): When you deploy a Tactic, draw a card
            const draftHypActive = [player.policy, player.tempPolicy].some(p => p?.id === 'XE-POL-01');
            if (draftHypActive && cardToPlay.type === 'Tactic') {
              const card = player.deck.pop();
              if (card) {
                player.hand.push(card);
                this.state.resolutionLog.push(`Draft Hypotheses triggered: ${player.name} draws ${card.name}.`);
              }
            }
          }
        } else if (action.type === 'ACTIVATE') {
          const cardToActivate = [...player.deployed, ...(player.policy ? [player.policy] : [])].find(c => c.id === action.cardId);
          if (!cardToActivate) continue;

          // Handle Equipment Cancellation if Fisticuffs is active
          if (cardToActivate.type === 'Equipment' && noEquipmentResolves) {
            this.state.resolutionLog.push(`${player.name}'s equipment ${cardToActivate.name} failed to resolve due to Fisticuffs (Collateral Damage).`);
            continue; // Skip activation
          }

          this.state.resolutionLog.push(`${player.name} activated ${cardToActivate.name}.`);

          // Process card-specific logic:
          this.resolvePlayerCardActivation(player, cardToActivate, action);

          if (cardToActivate.type === 'Equipment' && cardToActivate.uses !== undefined) {
            cardToActivate.uses--;
            if (cardToActivate.uses <= 0) {
              player.deployed = player.deployed.filter(c => c.id !== cardToActivate.id);
              this.state.resolutionLog.push(`${cardToActivate.name} has no uses left and was discarded.`);
            }
          }
        }
      }
    });

    // Resolve Planet Turn Phase
    this.resolvePlanetTurn();
    this.checkEndConditions();

    // Round Cleanup & Turn Rotation
    this.state.players.forEach(p => {
      p.lockedIn = false;
      p.selectedActions = [];
      p.maxActions = 2 + p.pendingExtraActions;
      p.pendingExtraActions = 0;

      // Policy Loss Bug fix: return tempPolicy to hand!
      if (p.tempPolicy) {
        p.hand.push(p.tempPolicy);
        this.state.resolutionLog.push(`Cross-Disciplinary Analysis: Returned policy ${p.tempPolicy.name} to ${p.name}'s hand.`);
        p.tempPolicy = undefined;
      }
    });

    // Decrement turn-based global scenario counters
    if (this.state.scenarioCounters['reinforcements_draw_penalty'] > 0) {
      this.state.scenarioCounters['reinforcements_draw_penalty']--;
    }

    // Clear temporary turn-based flags from scenarioCounters
    Object.keys(this.state.scenarioCounters).forEach(key => {
      if (
        key.startsWith('comparative_anatomy_') ||
        key.startsWith('bodyguard_') ||
        key.startsWith('solitary_disabled_')
      ) {
        delete this.state.scenarioCounters[key];
      }
    });

    // Move next turn blocked situations to this turn, and clear next turn list
    this.state.blockedSituationIdsThisTurn = [...(this.state.blockedSituationIdsNextTurn || [])];
    this.state.blockedSituationIdsNextTurn = [];

    // Transfer tracks advanced this turn to last turn
    this.state.tracksAdvancedLastTurn = [...(this.state.tracksAdvancedThisTurn || [])];
    this.state.tracksAdvancedThisTurn = [];

    // Rotate player order queue clockwise
    const firstId = this.state.playerOrder.shift();
    if (firstId) {
      this.state.playerOrder.push(firstId);
    }

    this.state.turnCount++;
    this.state.phase = 'PLAYER_ACTION';
    this.state.history.push(`Turn ${this.state.turnCount} started.`);
  }

  private resolvePlayerCardActivation(player: Player, card: Card, action: Action) {
    const targetId = action.targetId;
    const targetTrackId = action.targetTrackId;

    let targetCard = [...this.state.planetSituations, ...this.state.planetObjectives].find(c => c.id === targetId);
    let track = targetCard?.resolutionTracks?.find(t => t.id === targetTrackId);

    // Apply Bogey Redirect (SO-TAC-15): Next scientific card redirects to bogey track
    if (card.tone === 'Scientific' && this.state.bogeyRedirectTrackId) {
      const redirectedTrackItem = this.getAllActiveTracks().find(item => item.track.id === this.state.bogeyRedirectTrackId);
      if (redirectedTrackItem) {
        targetCard = redirectedTrackItem.parent;
        track = redirectedTrackItem.track;
        this.state.resolutionLog.push(`[Bogey Redirect] ${card.name} redirected to target ${targetCard.name} (${track.tag || track.tone})`);
        this.state.bogeyRedirectTrackId = undefined; // Consumed
      }
    }

    // Draw penalty counter
    if (!this.state.scenarioCounters['reinforcements_draw_penalty']) {
      this.state.scenarioCounters['reinforcements_draw_penalty'] = 0;
    }

    // Resolve Security Officer Specific Cards
    if (card.id === 'SO-TAC-01') { // Bodyguard Detail
      if (targetCard) {
        this.state.resolutionLog.push(`Bodyguard Detail: No Tactics can Reduce tracks on ${targetCard.name} this turn.`);
        if (!this.state.doubleTargetTracks) this.state.doubleTargetTracks = [];
        if (!this.state.scenarioCounters) this.state.scenarioCounters = {};
        this.state.scenarioCounters[`bodyguard_${targetCard.id}`] = 1;

        const politicalTrack = targetCard.resolutionTracks?.find(t => this.getTrackTones(t, targetCard!).includes('Political'));
        if (politicalTrack) {
          this.advanceTrackBy(politicalTrack, targetCard, 1, player);
        }
      }
    }

    else if (card.id === 'SO-TAC-02') { // Set Phasers to Kill
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        let advanceAmt = 1;
        if (tones.includes('Hostile')) advanceAmt += 1;
        this.advanceTrackBy(track, targetCard, advanceAmt, player);

        // Collateral Damage: Reduce ALL Biological tracks by 1
        this.state.resolutionLog.push(`Collateral Damage: Set Phasers to Kill reduces all Biological tracks by 1.`);
        this.getAllActiveTracks().forEach(item => {
          const natures = this.getTrackNatures(item.track, item.parent);
          if (natures.includes('Biological')) {
            this.reduceTrackBy(item.track, item.parent, 1);
          }
        });
      }
    }

    else if (card.id === 'SO-TAC-03') { // Show of Force
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        const natures = this.getTrackNatures(track, targetCard);
        let advanceAmt = 1;
        if (tones.includes('Hostile')) advanceAmt += 1;
        if (natures.includes('Cultural')) advanceAmt += 1;
        this.advanceTrackBy(track, targetCard, advanceAmt, player);
      }
    }

    else if (card.id === 'SO-TAC-04') { // Suppressive Fire
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        let reduceAmt = 1;
        if (tones.includes('Hostile')) reduceAmt += 1;
        this.reduceTrackBy(track, targetCard, reduceAmt);
      }
    }

    else if (card.id === 'SO-TAC-05') { // Shoot First, Ask Questions Later
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 2, player);

        // Collateral Damage: Target a different Situation track with >= 2 points. Reduce it by 2.
        const possibleCollaterals = this.state.planetSituations.flatMap(s => s.resolutionTracks || []).map(t => {
          const parent = this.state.planetSituations.find(sit => sit.resolutionTracks?.includes(t))!;
          return { track: t, parent };
        }).filter(item => {
          return item.track.id !== track?.id && item.track.current >= 2;
        });

        if (possibleCollaterals.length > 0) {
          const chosenCollateral = possibleCollaterals[0]!;
          this.reduceTrackBy(chosenCollateral.track, chosenCollateral.parent, 2);
        }
      }
    }

    else if (card.id === 'SO-TAC-06') { // Brute Force Entry
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        let advanceAmt = 1;
        if (tones.includes('Hostile')) advanceAmt += 1;
        this.advanceTrackBy(track, targetCard, advanceAmt, player);

        // Collateral Damage: One additional Situation Emerges during Planet phase
        this.state.scenarioCounters['brute_force_extra_situations'] = (this.state.scenarioCounters['brute_force_extra_situations'] || 0) + 1;
        this.state.resolutionLog.push(`Collateral Damage: Brute Force Entry adds 1 extra situation to emerge this turn.`);
      }
    }

    else if (card.id === 'SO-TAC-07') { // Take My Sidearm
      // Target other player's equipment. Since hot-seat, finds any equipment not owned by player.
      const otherPlayers = this.state.players.filter(p => p.id !== player.id);
      let targetedEqp: Card | undefined;
      otherPlayers.forEach(op => {
        const eqp = op.deployed.find(c => c.type === 'Equipment');
        if (eqp) targetedEqp = eqp;
      });

      if (targetedEqp) {
        targetedEqp.uses = (targetedEqp.uses || 0) + 1;
        this.state.resolutionLog.push(`Take My Sidearm adds 1 token to ${targetedEqp.name} (Now has ${targetedEqp.uses} uses).`);
      } else {
        this.state.resolutionLog.push(`Take My Sidearm found no active Equipment deployed by other players.`);
      }
    }

    else if (card.id === 'SO-TAC-08') { // Distraction!
      if (track && targetCard) {
        this.reduceTrackBy(track, targetCard, 1);
        if (!this.state.doubleTargetTracks) this.state.doubleTargetTracks = [];
        this.state.doubleTargetTracks.push(track.id);
        this.state.resolutionLog.push(`Distraction! applied: The next Tactic targeting this track happens twice.`);
      }
    }

    else if (card.id === 'SO-TAC-09') { // Call in Reinforcements
      // Every player may deploy 1 Tactic card for free
      this.state.players.forEach(p => {
        const tacticInHand = p.hand.find(c => c.type === 'Tactic');
        if (tacticInHand) {
          const idx = p.hand.indexOf(tacticInHand);
          p.hand.splice(idx, 1);
          p.deployed.push(tacticInHand);
          this.state.resolutionLog.push(`Call in Reinforcements: ${p.name} deployed ${tacticInHand.name} for free.`);
        }
      });
      // Collateral Damage: Until end of next turn, draw 1 less card
      this.state.scenarioCounters['reinforcements_draw_penalty'] = 2; // Lasts 2 turns (this turn's end and next turn's end)
    }

    else if (card.id === 'SO-TAC-10') { // Preemptive Strike
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 2, player);
      }
    }

    else if (card.id === 'SO-TAC-11') { // Fisticuffs
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 1, player);
        this.state.resolutionLog.push(`Collateral Damage: Fisticuffs prevents equipment from resolving this turn.`);
      }
    }

    else if (card.id === 'SO-TAC-12') { // Tactical Retreat
      if (track && targetCard) {
        this.reduceTrackBy(track, targetCard, 1);
        // Draw 1 card
        const cardDrawn = player.deck.pop();
        if (cardDrawn) {
          player.hand.push(cardDrawn);
          this.state.resolutionLog.push(`Tactical Retreat draws a card: ${cardDrawn.name}`);
        }
      }
    }

    else if (card.id === 'SO-TAC-13') { // We've Got Wounded!
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        if (tones.includes('Hostile')) {
          if (!track.tempExtraNatures) track.tempExtraNatures = [];
          track.tempExtraNatures.push('Biological');
          this.state.resolutionLog.push(`We've Got Wounded! grants Biological Nature to track ${track.tag || track.tone} until end of planet phase.`);
        }
      }
    }

    else if (card.id === 'SO-TAC-14') { // Leave That To The Experts
      if (track && targetCard) {
        if (!this.state.expertsTargetedTracks) this.state.expertsTargetedTracks = [];
        this.state.expertsTargetedTracks.push(track.id);
        this.state.resolutionLog.push(`Leave That To The Experts targeted track ${track.id}. If fulfilled, all players will draw a card.`);
      }
    }

    else if (card.id === 'SO-TAC-15') { // Unidentified Bogey
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 1, player);
        this.state.bogeyRedirectTrackId = track.id;
        this.state.resolutionLog.push(`Collateral Damage: The next Scientific card is redirected to this track.`);
      }
    }

    else if (card.id === 'SO-TAC-16') { // If It Bleeds...
      if (track && targetCard) {
        const natures = this.getTrackNatures(track, targetCard);
        let advanceAmt = 1;
        if (natures.includes('Biological')) advanceAmt += 1;
        this.advanceTrackBy(track, targetCard, advanceAmt, player);
      }
    }

    else if (card.id === 'SO-TAC-17') { // Vulnerable Subsystem
      if (track && targetCard) {
        const natures = this.getTrackNatures(track, targetCard);
        if (natures.includes('Technological')) {
          this.reduceTrackBy(track, targetCard, 2);
        } else {
          this.advanceTrackBy(track, targetCard, 1, player);
        }
      }
    }

    else if (card.id === 'SO-TAC-18') { // Evacuate the Civilians
      if (targetCard) {
        const hostileTrack = targetCard.resolutionTracks?.find(t => this.getTrackTones(t, targetCard!).includes('Hostile'));
        if (hostileTrack) {
          this.reduceTrackBy(hostileTrack, targetCard, 1);
        }
        targetCard.resolutionTracks?.forEach(t => {
          if (!this.getTrackTones(t, targetCard!).includes('Hostile')) {
            this.advanceTrackBy(t, targetCard!, 1, player);
          }
        });

        // Collateral Damage: No player may target this situation next turn
        if (!this.state.blockedSituationIdsNextTurn) this.state.blockedSituationIdsNextTurn = [];
        this.state.blockedSituationIdsNextTurn.push(targetCard.id);
        this.state.resolutionLog.push(`Collateral Damage: ${targetCard.name} cannot be targeted next turn.`);
      }
    }

    else if (card.id === 'SO-TAC-19') { // I've Got Your Six
      if (targetCard) {
        this.state.resolutionLog.push(`I've Got Your Six covers ${targetCard.name}. If other players target it this turn, they get +1 action next turn.`);
        this.state.players.forEach(p => {
          if (p.id !== player.id) {
            const targetsThisSit = p.selectedActions.some(a => a.targetId === targetCard?.id);
            if (targetsThisSit) {
              p.pendingExtraActions += 1;
              this.state.resolutionLog.push(`I've Got Your Six: ${p.name} targeted ${targetCard?.name} and gains +1 action next turn.`);
            }
          }
        });
      }
    }

    else if (card.id === 'SO-TAC-20') { // Solitary Confinement
      if (targetCard) {
        this.state.resolutionLog.push(`Solitary Confinement disables all passive abilities on ${targetCard.name}.`);
        this.state.scenarioCounters[`solitary_disabled_${targetCard.id}`] = 1;

        // Collateral Damage: No other Tactics can target it next turn
        if (!this.state.blockedSituationIdsNextTurn) this.state.blockedSituationIdsNextTurn = [];
        this.state.blockedSituationIdsNextTurn.push(targetCard.id);
      }
    }

    // Resolve Xenoethnologist Specific Cards
    else if (card.id === 'XE-TAC-01') { // Sign Language
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        const natures = this.getTrackNatures(track, targetCard);
        let advanceAmt = 1;
        if (tones.includes('Political') && natures.includes('Cultural')) {
          advanceAmt += 2;
        }
        this.advanceTrackBy(track, targetCard, advanceAmt, player);
      }
    }

    else if (card.id === 'XE-TAC-02') { // Sample Local Cuisine
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        const natures = this.getTrackNatures(track, targetCard);
        let advanceAmt = 1;
        if (tones.includes('Mercantile') && natures.includes('Biological')) {
          advanceAmt += 2;
        }
        this.advanceTrackBy(track, targetCard, advanceAmt, player);
      }
    }

    else if (card.id === 'XE-TAC-03') { // Gather Data
      if (track && targetCard) {
        this.reduceTrackBy(track, targetCard, 1);
        const natures = this.getTrackNatures(track, targetCard);
        if (natures.includes('Technological') || natures.includes('Biological')) {
          const cardDrawn = player.deck.pop();
          if (cardDrawn) {
            player.hand.push(cardDrawn);
            this.state.resolutionLog.push(`Gather Data draws a card: ${cardDrawn.name}`);
          }
        }
      }
    }

    else if (card.id === 'XE-TAC-04') { // Shift Paradigm
      if (track && targetCard) {
        const natures = this.getTrackNatures(track, targetCard);
        if (natures.includes('Anomalous')) {
          if (!track.tempExtraTones) track.tempExtraTones = [];
          track.tempExtraTones.push('Scientific');
          this.state.resolutionLog.push(`Shift Paradigm adds Scientific Tone to track ${track.tag || track.tone} this turn.`);
        }
      }
    }

    else if (card.id === 'XE-TAC-05') { // Cross-Disciplinary Analysis
      // Deploy secondary Policy card chosen from hand in action planning
      const policyId = action.secondaryCardId;
      if (policyId) {
        const polCardIndex = player.hand.findIndex(c => c.id === policyId);
        if (polCardIndex !== -1) {
          const polCard = player.hand.splice(polCardIndex, 1)[0]!;
          player.tempPolicy = polCard;
          this.state.resolutionLog.push(`Cross-Disciplinary Analysis: ${player.name} deploys secondary policy ${polCard.name} until end of turn.`);
        }
      }
    }

    else if (card.id === 'XE-TAC-06') { // It's A Cookbook!
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        if (tones.includes('Hostile')) {
          if (!track.tempExtraNatures) track.tempExtraNatures = [];
          track.tempExtraNatures.push('Biological', 'Technological', 'Cultural', 'Anomalous');
          this.state.resolutionLog.push(`It's A Cookbook! grants all four Natures to track ${track.tag || track.tone} this turn.`);
        }
      }
    }

    else if (card.id === 'XE-TAC-07') { // Comparative Anatomy
      if (track && targetCard) {
        this.state.resolutionLog.push(`Comparative Anatomy applied to track ${track.tag || track.tone}. Whenever another Biological track is advanced, this track advances as well.`);
        if (!this.state.scenarioCounters) this.state.scenarioCounters = {};
        this.state.scenarioCounters[`comparative_anatomy_${track.id}`] = 1;
      }
    }

    else if (card.id === 'XE-TAC-08') { // Publish or Perish
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 1, player);
        if (track.current < track.target) {
          track.current = 0;
          this.state.resolutionLog.push(`Publish or Perish failed to Fulfill the track. Its advancement was reset to zero.`);
        }
      }
    }

    else if (card.id === 'XE-TAC-09') { // Historical Precedent
      if (track && targetCard) {
        this.state.historicalPrecedentPassive = {
          passiveEffects: targetCard.passiveEffects || [],
          sourceSituationId: targetCard.id
        };
        this.state.resolutionLog.push(`Historical Precedent copies passive effect from ${targetCard.name} for the next emerging Situation.`);
      }
    }

    else if (card.id === 'XE-TAC-10') { // Leave Only Footprints
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 1, player);
        let otherTacticsCount = 0;
        this.state.players.forEach(p => {
          p.selectedActions.forEach(a => {
            if (a.type === 'ACTIVATE' && a.targetTrackId === track?.id && a.cardId !== 'XE-TAC-10') {
              otherTacticsCount++;
            }
          });
        });
        if (otherTacticsCount > 0) {
          this.reduceTrackBy(track, targetCard, otherTacticsCount);
        }
      }
    }

    else if (card.id === 'XE-TAC-11') { // More Than Meets The Eye
      if (track && targetCard) {
        const tones = this.getTrackTones(track, targetCard);
        const natures = this.getTrackNatures(track, targetCard);
        if (tones.includes('Hostile')) {
          this.reduceTrackBy(track, targetCard, natures.length);
        }
        if (tones.includes('Political')) {
          this.advanceTrackBy(track, targetCard, natures.length, player);
        }
      }
    }

    else if (card.id === 'XE-TAC-12') { // Scan Alternate Spectra
      if (action.choice) {
        if (!this.state.scanAlternateSpectraChoices) {
          this.state.scanAlternateSpectraChoices = [];
        }
        this.state.scanAlternateSpectraChoices.push({
          playerId: player.id,
          choice: action.choice
        });
        this.state.resolutionLog.push(`Scan Alternate Spectra chosen: ${action.choice}`);
      }
    }

    else if (card.id === 'XE-TAC-13') { // We Need More Gum!
      let returned = false;
      this.state.players.forEach(p => {
        const eqpIdx = p.deployed.findIndex(c => c.type === 'Equipment');
        if (eqpIdx !== -1) {
          const eqpCard = p.deployed.splice(eqpIdx, 1)[0]!;
          p.hand.push(eqpCard);
          this.state.resolutionLog.push(`We Need More Gum! returns equipment ${eqpCard.name} to ${p.name}'s hand.`);
          returned = true;
        }
      });
      if (!returned) {
        this.state.resolutionLog.push(`We Need More Gum! found no active equipment to return.`);
      }
    }

    // Equipment Uses removing tokens
    else if (card.id === 'XE-EQP-01') { // Universal Translator
      if (track && targetCard) {
        if (!track.tempExtraNatures) track.tempExtraNatures = [];
        track.tempExtraNatures.push('Cultural');
        this.state.resolutionLog.push(`Universal Translator adds Cultural Nature to track ${track.tag || track.tone} this turn.`);
      }
    }

    else if (card.id === 'XE-EQP-02') { // Specimen Collection Kit
      if (track && targetCard) {
        if (!track.tempExtraNatures) track.tempExtraNatures = [];
        track.tempExtraNatures.push('Biological');
        this.state.resolutionLog.push(`Specimen Collection Kit adds Biological Nature to track ${track.tag || track.tone} this turn.`);
      }
    }

    else if (card.id === 'XE-EQP-03') { // Harmless Knick-Knacks
      if (track && targetCard) {
        if (!track.tempExtraTones) track.tempExtraTones = [];
        track.tempExtraTones.push('Mercantile');
        this.state.resolutionLog.push(`Harmless Knick-Knacks adds Mercantile Tone to track ${track.tag || track.tone} this turn.`);
      }
    }

    else if (card.id === 'XE-EQP-04') { // Field Guide
      const polCardIndex = player.deck.findIndex(c => c.type === 'Policy');
      if (polCardIndex !== -1) {
        const polCard = player.deck.splice(polCardIndex, 1)[0]!;
        player.hand.push(polCard);
        this.state.resolutionLog.push(`Field Guide retrieves policy ${polCard.name} from deck.`);
      }
    }

    else if (card.id === 'SO-EQP-01') { // Heavy Body Armor
    }

    else if (card.id === 'SO-EQP-02') { // Survival Kit
      const d1 = player.deck.pop();
      if (d1) {
        player.hand.push(d1);
        this.state.resolutionLog.push(`Survival Kit draws: ${d1.name}`);
      }
      if (player.hand.length < 3) {
        const d2 = player.deck.pop();
        if (d2) {
          player.hand.push(d2);
          this.state.resolutionLog.push(`Survival Kit draws second card (hand size < 3): ${d2.name}`);
        }
      }
    }

    else if (card.id === 'SO-EQP-03') { // Ceremonial Weaponry
      if (track && targetCard) {
        if (!track.extraTones) track.extraTones = [];
        track.extraTones.push('Hostile');
        this.state.resolutionLog.push(`Ceremonial Weaponry permanently adds Hostile Tone to track ${track.tag || track.tone}.`);
      }
    }

    else if (card.type === 'Reward' && card.id === 'RK-REW-01') { // Laser Rifle reward
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 2, player);
      }
    }

    // Default Fallback Activation
    else {
      if (track && targetCard) {
        this.advanceTrackBy(track, targetCard, 1, player);
      }
    }
  }

  private advanceTrackBy(track: ResolutionTrack, card: Card, amount: number, player: Player | null) {
    let finalAmt = amount;

    // Distraction! doubling logic
    if (this.state.doubleTargetTracks?.includes(track.id)) {
      finalAmt *= 2;
      this.state.resolutionLog.push(`[Distraction! x2] Advancement doubled on track ${track.tag || track.tone}`);
      this.state.doubleTargetTracks = this.state.doubleTargetTracks.filter(id => id !== track.id); // Consumed
    }

    // Apply When In Rome Policy (XE-POL-08) free trigger copy
    const isCulturalTactic = player && player.selectedActions.some(a => {
      const c = player.hand.find(h => h.id === a.cardId) || player.deployed.find(d => d.id === a.cardId);
      return c && c.type === 'Tactic' && c.nature === 'Cultural';
    });
    const whenInRomeActive = player && [player.policy, player.tempPolicy].some(p => p?.id === 'XE-POL-08');

    track.current += finalAmt;
    if (player) {
      this.state.resolutionLog.push(`${player.name} advanced track ${track.tag || track.tone} on ${card.name} by ${finalAmt}.`);
    } else {
      this.state.resolutionLog.push(`Planet advanced track ${track.tag || track.tone} on ${card.name} by ${finalAmt}.`);
    }

    if (!this.state.tracksAdvancedThisTurn) this.state.tracksAdvancedThisTurn = [];
    this.state.tracksAdvancedThisTurn.push(track.id);

    // Trigger Comparative Anatomy (XE-TAC-07) copy-advancement
    const trackNatures = this.getTrackNatures(track, card);
    if (trackNatures.includes('Biological')) {
      this.getAllActiveTracks().forEach(item => {
        if (item.track.id !== track.id && this.state.scenarioCounters?.[`comparative_anatomy_${item.track.id}`]) {
          item.track.current += finalAmt;
          this.state.resolutionLog.push(`[Comparative Anatomy] Copy-advanced track ${item.track.tag || item.track.tone} by ${finalAmt}.`);
        }
      });
    }

    // Handle When In Rome copy if appropriate
    if (whenInRomeActive && isCulturalTactic && !this.state.scenarioCounters['when_in_rome_triggered_this_turn']) {
      this.state.scenarioCounters['when_in_rome_triggered_this_turn'] = 1;
      const otherTrackItem = this.getAllActiveTracks().find(item => item.track.id !== track.id);
      if (otherTrackItem) {
        otherTrackItem.track.current += 1;
        this.state.resolutionLog.push(`[When In Rome...] Free bonus advancement on ${otherTrackItem.parent.name} (${otherTrackItem.track.tag || otherTrackItem.track.tone})`);
      }
    }
  }

  private reduceTrackBy(track: ResolutionTrack, card: Card, amount: number) {
    // Bodyguard detail negates reductions
    if (this.state.scenarioCounters?.[`bodyguard_${card.id}`]) {
      this.state.resolutionLog.push(`Reduction on ${card.name} was blocked by Bodyguard Detail!`);
      return;
    }
    track.current = Math.max(0, track.current - amount);
    this.state.resolutionLog.push(`Reduced track ${track.tag || track.tone} on ${card.name} by ${amount} (Current: ${track.current}).`);
  }

  private resolvePlanetTurn() {
    this.state.resolutionLog.push(`Planet resolves situations...`);

    // Self-discard / expiration for Counterfeit Crystals
    this.state.planetSituations.forEach((sit, index) => {
      if (sit.id === 'RK-CHL-09') {
        const ageKey = `age_${sit.id}`;
        this.state.scenarioCounters[ageKey] = (this.state.scenarioCounters[ageKey] || 0) + 1;
        if (this.state.scenarioCounters[ageKey] >= 3) {
          this.state.resolutionLog.push(`${sit.name} expired unresolved.`);
          const crystalCaverns = this.state.planetObjectives.find(o => o.id === 'RK-OBJ-02');
          const crimTrack = crystalCaverns?.resolutionTracks?.find(t => t.tag === 'Criminal');
          if (crimTrack && crystalCaverns) {
            this.advanceTrackBy(crimTrack, crystalCaverns, 1, null);
          }
          this.state.planetSituations.splice(index, 1);
        }
      }
    });

    // Smuggler Ambush (RK-CHL-04): Passive end of turn reduce a random Situation track by 1 point
    const isSmugglerActive = this.state.planetSituations.some(s => s.id === 'RK-CHL-04');
    if (isSmugglerActive) {
      const randomTrackItem = this.getRandomSituationTrack('Smuggler Ambush reduction', item => item.track.current > 0);
      if (randomTrackItem) {
        this.reduceTrackBy(randomTrackItem.track, randomTrackItem.parent, 1);
        this.state.resolutionLog.push(`[Smuggler Ambush] End of turn track reduction applied.`);
      }
    }

    // They Should Have Sent A Poet (XE-POL-10): All Anomalous Situation Tracks advance by 1
    const poetActive = this.state.players.some(p => p.policy?.id === 'XE-POL-10' || p.tempPolicy?.id === 'XE-POL-10');
    if (poetActive) {
      this.getAllActiveTracks().forEach(item => {
        const natures = this.getTrackNatures(item.track, item.parent);
        if (natures.includes('Anomalous') && item.parent.type === 'Situation') {
          this.advanceTrackBy(item.track, item.parent, 1, null);
        }
      });
    }

    // Resolve completed Situations and distribute rewards
    for (let i = 0; i < this.state.planetSituations.length; i++) {
      const sit = this.state.planetSituations[i]!;
      if (sit.resolutionTracks) {
        const resolvedTrack = sit.resolutionTracks.find(t => t.current >= t.target);
        if (resolvedTrack) {
          this.state.resolutionLog.push(`Situation ${sit.name} resolved via ${resolvedTrack.resultName}!`);
          this.state.history.push(`Resolved: ${sit.name} (${resolvedTrack.resultName})`);

          // Execute Fulfill Rewards & Objective Advancements
          if (resolvedTrack.resultTags) {
            resolvedTrack.resultTags.forEach(tag => {
              this.state.scenarioCounters[tag] = (this.state.scenarioCounters[tag] || 0) + 1;

              // Advance Objectives
              this.state.planetObjectives.forEach(obj => {
                const objTrack = obj.resolutionTracks?.find(ot => ot.tag === tag);
                if (objTrack) {
                  const escortsActive = this.state.planetSituations.some(s => s.id === 'RK-CHL-10');
                  const advValue = (escortsActive && tag === 'Criminal') ? 0 : 1;
                  if (advValue > 0) {
                    this.advanceTrackBy(objTrack, obj, advValue, null);
                  } else {
                    this.state.resolutionLog.push(`[Royal Escort Demands] Blocked Criminal track advancement.`);
                  }
                }
              });
            });
          }

          if (this.state.expertsTargetedTracks?.includes(resolvedTrack.id)) {
            this.state.players.forEach(p => {
              const c = p.deck.pop();
              if (c) {
                p.hand.push(c);
                this.state.resolutionLog.push(`[Experts Reward] ${p.name} draws a card: ${c.name}`);
              }
            });
          }

          // Accept a Bribe? (RK-CHL-01) Target player gains Laser Rifle item
          if (sit.id === 'RK-CHL-01' && resolvedTrack.id.endsWith('t1')) {
            const p = this.state.players[0]!;
            const reward = ROYAL_KOOG_REWARDS.find(r => r.id === 'RK-REW-01');
            if (reward) {
              p.hand.push({ ...reward });
              this.state.resolutionLog.push(`${p.name} receives Laser Rifle reward!`);
            }
          }

          // Counterfeit Crystals (RK-CHL-09) Fulfill Mercantile track: AP refund next turn
          if (sit.id === 'RK-CHL-09') {
            const p = this.state.players[0]!;
            p.pendingExtraActions += 1;
            this.state.resolutionLog.push(`${p.name} receives +1 extra Action next turn for authenticating Counterfeit Crystals.`);
          }

          this.state.planetSituations.splice(i, 1);
          i--;
        }
      }
    }

    // Resolve Objectives
    for (let i = 0; i < this.state.planetObjectives.length; i++) {
      const obj = this.state.planetObjectives[i]!;
      if (obj.resolutionTracks) {
        const resolvedTrack = obj.resolutionTracks.find(t => t.current >= t.target);
        if (resolvedTrack) {
          this.state.resolutionLog.push(`Objective ${obj.name} fulfilled via ${resolvedTrack.resultName}!`);
          this.state.history.push(`Objective Fulfilled: ${obj.name} (${resolvedTrack.resultName})`);

          if (resolvedTrack.resultTags) {
            resolvedTrack.resultTags.forEach(tag => {
              this.state.scenarioCounters[tag] = (this.state.scenarioCounters[tag] || 0) + 1;
            });
          }

          this.state.planetObjectives.splice(i, 1);
          i--;
        }
      }
    }

    // Emerge normal new Situation
    let emergeCount = 1;
    if (this.state.scenarioCounters['brute_force_extra_situations'] && this.state.scenarioCounters['brute_force_extra_situations'] > 0) {
      emergeCount += this.state.scenarioCounters['brute_force_extra_situations'];
      this.state.scenarioCounters['brute_force_extra_situations'] = 0; // Consume
    }

    for (let e = 0; e < emergeCount; e++) {
      const newCard = this.state.planetDeck.pop();
      if (newCard) {
        // Apply Historical Precedent (XE-TAC-09) copied passive effect
        if (this.state.historicalPrecedentPassive && !newCard.tags?.includes('CannotBeTargetedByHistoricalPrecedent')) {
          newCard.passiveEffects = [...(newCard.passiveEffects || []), ...this.state.historicalPrecedentPassive.passiveEffects];
          newCard.tags = [...(newCard.tags || []), 'CannotBeTargetedByHistoricalPrecedent'];
          this.state.resolutionLog.push(`[Historical Precedent] Applied copied passive effects to emerging situation: ${newCard.name}`);
          this.state.historicalPrecedentPassive = undefined; // Consumed
        }

        // Apply Scan Alternate Spectra (XE-TAC-12) prediction draw
        if (this.state.scanAlternateSpectraChoices && this.state.scanAlternateSpectraChoices.length > 0) {
          this.state.scanAlternateSpectraChoices.forEach(spectChoice => {
            const chosen = spectChoice.choice;
            const matchesTone = newCard.tone === chosen;
            const matchesNature = newCard.nature === chosen;
            if (matchesTone || matchesNature) {
              const p = this.state.players.find(pl => pl.id === spectChoice.playerId);
              if (p) {
                for (let d = 0; d < 2; d++) {
                  const drawC = p.deck.pop();
                  if (drawC) p.hand.push(drawC);
                }
                this.state.resolutionLog.push(`[Scan Alternate Spectra Match] ${p.name} guessed correctly (${chosen}) and draws 2 cards!`);
              }
            }
          });
          this.state.scanAlternateSpectraChoices = []; // Consumed
        }

        this.state.planetSituations.push(newCard);
        this.state.resolutionLog.push(`New situation emerged: ${newCard.name}`);
      }
    }

    // Clear turn-based temporary track effects
    this.getAllActiveTracks().forEach(item => {
      item.track.tempExtraTones = [];
      item.track.tempExtraNatures = [];
    });
    this.state.blockedSituationIdsThisTurn = [];
    if (this.state.scenarioCounters) {
      this.state.scenarioCounters['when_in_rome_triggered_this_turn'] = 0;
    }
  }

  private checkEndConditions() {
    if (this.state.planetObjectives.length === 0) {
      this.state.victory = true;

      let endingTitle = 'Mission Accomplished: ';
      const endings = [];
      if (this.state.scenarioCounters['RoyalEnding']) endings.push('You founded a Royal embassy with the blessing of the Royal Court.');
      if (this.state.scenarioCounters['CriminalEnding']) endings.push('The Kooga Nostra has established a long-term presence on the planet.');
      if (this.state.scenarioCounters['ReligiousEnding']) endings.push('The Crystal Cultists have secured their sacred grounds.');

      if (endings.length > 0) {
        endingTitle += endings.join(' ');
      } else {
        endingTitle += 'All objectives fulfilled.';
      }

      this.state.activeEnding = { title: endingTitle, isVictory: true };
      this.state.history.push(`VICTORY: ${endingTitle}`);
    }
  }
}
