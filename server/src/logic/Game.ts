import type { GameState, Player, Card, Action, ResolutionTrack, Effect, PassiveEffect } from '../../../shared/types.js';
import {
  SECURITY_OFFICER_DECK,
  XENOBIOLOGIST_DECK,
  ROYAL_KOOG_SITUATIONS,
  ROYAL_KOOG_OBJECTIVES,
  ROYAL_KOOG_REWARDS
} from '../data/cards.js';

export class Game {
  private state: GameState;

  constructor(playerNames: string[]) {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `player-${index}`,
      name,
      deck: this.shuffle(index === 0 ? [...SECURITY_OFFICER_DECK] : [...XENOBIOLOGIST_DECK]),
      hand: [],
      deployed: [],
      actionsTaken: 0,
      lockedIn: false,
      selectedActions: [],
    }));

    players.forEach(p => {
      p.hand = p.deck.splice(0, 5);
    });

    const planetDeck = this.shuffle([...ROYAL_KOOG_SITUATIONS]);
    const availableObjectives = this.shuffle([...ROYAL_KOOG_OBJECTIVES]);
    const planetObjectives: Card[] = [];
    const planetSituations: Card[] = [];

    const objectiveCount = Math.min(players.length + 1, availableObjectives.length);
    for (let i = 0; i < objectiveCount; i++) {
      planetObjectives.push(availableObjectives.pop()!);
    }

    // Initial Situations
    for (let i = 0; i < 2; i++) {
      const card = planetDeck.pop();
      if (card) planetSituations.push(card);
    }

    this.state = {
      id: Math.random().toString(36).substr(2, 9),
      players,
      planetDeck,
      planetObjectives,
      planetSituations,
      phase: 'PLAYER_ACTION',
      turnCount: 1,
      history: ['Game started.'],
      victory: false,
      defeat: false,
      resolutionLog: [],
      scenarioCounters: {},
    };
  }

  public getState(): GameState {
    return this.state;
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j] as T, array[i] as T];
    }
    return array;
  }

  public handleAction(action: Action) {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player || player.lockedIn || player.selectedActions.length >= 2) return;

    if (action.type === 'PLAY') {
      const card = player.hand.find(c => c.id === action.cardId);
      if (!card) return;
    } else if (action.type === 'ACTIVATE') {
      const card = [...player.deployed, ...(player.policy ? [player.policy] : []), ...player.selectedActions.filter(a => a.type === 'PLAY').map(a => player.hand.find(c => c.id === a.cardId)).filter(Boolean)].find(c => c?.id === action.cardId);
      if (!card) return;

      // Check MODIFY_ACTION_COST
      const allPassives = this.getAllActivePassives();
      let cost = 1;
      allPassives.forEach(pe => {
          if (pe.type === 'MODIFY_ACTION_COST') {
              if (!pe.sourceCardType || pe.sourceCardType === card.type) {
                  cost += (pe.amount ?? 0);
              }
          }
      });

      if (player.selectedActions.length + cost > 2) return;

      // Check PREVENT_ACTION
      const isPrevented = allPassives.some(pe => {
        if (pe.type !== 'PREVENT_ACTION') return false;
        if (pe.sourceTone && pe.sourceTone !== card.tone) return false;
        if (pe.sourceNature && pe.sourceNature !== card.nature) return false;
        return true;
      });
      if (isPrevented) return;

      if (action.targetId) {
        const target = [...this.state.planetSituations, ...this.state.planetObjectives].find(c => c.id === action.targetId);

        // Check FORCE_TARGET
        const forceTargetEffect = allPassives.find(pe => pe.type === 'FORCE_TARGET' && pe.sourceTone === card.tone);
        if (forceTargetEffect && forceTargetEffect.targetCardName && target?.name !== forceTargetEffect.targetCardName) {
            return;
        }

        if (target && action.targetTrackId) {
          const track = target.resolutionTracks?.find(t => t.id === action.targetTrackId);
          if (!track) return;
        }
      }
    }

    player.selectedActions.push(action);
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
      p.deployed.forEach(c => allPassives.push(...(c.passiveEffects || [])));
    });
    this.state.planetSituations.forEach(s => allPassives.push(...(s.passiveEffects || [])));
    this.state.planetObjectives.forEach(o => allPassives.push(...(o.passiveEffects || [])));
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

    // Simultaneous Resolution
    const activeEffects: { player: Player; card: Card; effect: Effect; targetId?: string }[] = [];

    for (const player of this.state.players) {
      for (const action of player.selectedActions) {
        if (action.type === 'DRAW') {
          const card = player.deck.pop();
          if (card) {
            player.hand.push(card);
            this.state.resolutionLog.push(`${player.name} drew a card.`);
          }
        } else if (action.type === 'PLAY') {
          const cardToPlayIndex = player.hand.findIndex(c => c.id === action.cardId);
          if (cardToPlayIndex !== -1) {
            const cardToPlay = player.hand.splice(cardToPlayIndex, 1)[0]!;
            if (cardToPlay.type === 'Policy') {
              if (player.policy) player.hand.push(player.policy);
              player.policy = cardToPlay;
            } else {
              player.deployed.push(cardToPlay);
            }
            this.state.resolutionLog.push(`${player.name} played ${cardToPlay.name}.`);
          }
        } else if (action.type === 'ACTIVATE') {
          const cardToActivate = [...player.deployed, ...(player.policy ? [player.policy] : [])].find(c => c.id === action.cardId);
          if (cardToActivate) {
            this.state.resolutionLog.push(`${player.name} activated ${cardToActivate.name}.`);
            if (cardToActivate.effects && cardToActivate.effects.length > 0) {
              cardToActivate.effects.forEach(effect => {
                if (effect.trigger === 'ON_ACTIVATE') {
                  activeEffects.push({ player, card: cardToActivate, effect, targetId: action.targetId });
                }
              });
            } else {
              activeEffects.push({
                player,
                card: cardToActivate,
                effect: { type: 'ADVANCE', trigger: 'ON_ACTIVATE', tone: cardToActivate.tone, amount: 1 },
                targetId: action.targetId
              });
            }

            if (cardToActivate.type === 'Equipment' && cardToActivate.uses !== undefined) {
              cardToActivate.uses--;
              if (cardToActivate.uses <= 0) {
                player.deployed = player.deployed.filter(c => c.id !== cardToActivate.id);
                this.state.resolutionLog.push(`${cardToActivate.name} was discarded (no uses left).`);
              }
            }
          }
        }
      }
    }

    // Apply Suppression
    const suppressedTones = new Set<string>();
    const suppressedTracks = new Set<string>();

    activeEffects.forEach(({ effect }) => {
      if (effect.type === 'SUPPRESS_TONE' && effect.tone) {
        suppressedTones.add(effect.tone);
      }
      if (effect.type === 'SUPPRESS_TRACK' && effect.trackTone) {
        suppressedTracks.add(effect.trackTone);
      }
    });

    if (suppressedTones.size > 0) {
      this.state.resolutionLog.push(`Suppressed Tones: ${Array.from(suppressedTones).join(', ')}`);
    }
    if (suppressedTracks.size > 0) {
      this.state.resolutionLog.push(`Suppressed Tracks: ${Array.from(suppressedTracks).join(', ')}`);
    }

    // Collect all passive effects
    const allPassives: PassiveEffect[] = this.getAllActivePassives();

    // Process ADVANCE effects
    activeEffects.forEach(({ player, card, effect, targetId }) => {
      if (effect.type === 'ADVANCE') {
        const targetTrackId = player.selectedActions.find(a => a.cardId === card.id)?.targetTrackId;
        this.processEffect(effect, player, card, targetId, targetTrackId, suppressedTones, suppressedTracks, allPassives);
      }
    });

    this.resolvePlanetTurn(suppressedTones, suppressedTracks, allPassives);
    this.checkEndConditions();

    this.state.players.forEach(p => {
      p.lockedIn = false;
      p.selectedActions = [];
    });
    this.state.turnCount++;
    this.state.phase = 'PLAYER_ACTION';
    this.state.history.push(`Turn ${this.state.turnCount} started.`);
  }

  private processEffect(
    effect: Effect,
    player: Player | null,
    sourceCard: Card,
    targetId?: string,
    targetTrackId?: string,
    suppressedTones?: Set<string>,
    suppressedTracks?: Set<string>,
    allPassives: PassiveEffect[] = []
  ) {
    if (effect.type === 'ADVANCE') {
      const toneToAdvance = effect.tone || sourceCard.tone;

      if (suppressedTones?.has(sourceCard.tone)) {
          const name = player ? player.name : 'Planet';
          this.state.resolutionLog.push(`${name}'s ${sourceCard.name} was suppressed (Tone: ${sourceCard.tone}).`);
          return;
      }
      if (suppressedTracks?.has(toneToAdvance)) {
          const name = player ? player.name : 'Planet';
          this.state.resolutionLog.push(`${name}'s ${sourceCard.name} failed to advance ${toneToAdvance} track (Track suppressed).`);
          return;
      }

      const targetCard = [...this.state.planetSituations, ...this.state.planetObjectives].find(s => s.id === targetId);
      if (targetCard && targetCard.resolutionTracks) {
        let track = targetCard.resolutionTracks.find(t => t.id === targetTrackId);
        if (!track) {
           // Fallback: match by tone and nature if possible, but tone is primary
           track = targetCard.resolutionTracks.find(t => t.tone === toneToAdvance && (t.nature === sourceCard.nature || !t.nature));
           if (!track) {
               track = targetCard.resolutionTracks.find(t => t.tone === toneToAdvance);
           }
        }

        if (track) {
          // Check for PREVENT_ADVANCE
          const isPrevented = allPassives.some(pe => {
            if (pe.type !== 'PREVENT_ADVANCE') return false;
            if (pe.sourceTone && pe.sourceTone !== sourceCard.tone) return false;
            if (pe.sourceNature && pe.sourceNature !== sourceCard.nature) return false;
            if (pe.targetCardName && pe.targetCardName !== targetCard.name) return false;
            if (pe.targetTrackTag && pe.targetTrackTag !== track?.tag) return false;
            return true;
          });

          if (isPrevented) {
            this.state.resolutionLog.push(`Advancement on ${targetCard.name} (${track.tag || track.tone}) was prevented by a passive effect.`);
            return;
          }

          let amount = effect.amount !== undefined ? effect.amount : 1;

          // Apply MULTIPLY_ADVANCE
          allPassives.forEach(pe => {
            if (pe.type === 'MULTIPLY_ADVANCE') {
              let match = true;
              if (pe.sourceTone && pe.sourceTone !== sourceCard.tone) match = false;
              if (pe.sourceNature && pe.sourceNature !== sourceCard.nature) match = false;
              if (pe.targetCardName && pe.targetCardName !== targetCard.name) match = false;
              if (pe.targetTrackTag && pe.targetTrackTag !== track?.tag) match = false;
              if (match) amount *= (pe.factor ?? 1);
            }
          });

          track.current += amount;
          const playerName = player ? player.name : 'Planet';
          this.state.resolutionLog.push(`${playerName} advanced ${track.tag || track.tone} track on ${targetCard.name} by ${amount}.`);
        }
      }
    } else if (effect.type === 'DRAW_CARD') {
        // Logic for "Accept a Bribe?" reward
        if (player) {
          const reward = ROYAL_KOOG_REWARDS.find(r => r.id === 'RK-REW-01'); // Simple for now
          if (reward) {
            player.hand.push({ ...reward });
            this.state.resolutionLog.push(`${player.name} received a reward: ${reward.name}!`);
          }
        }
    } else if (effect.type === 'REDUCE_TRACK') {
        const amount = effect.amount ?? 1;
        if (effect.targetCardName) {
            const target = this.state.planetObjectives.find(o => o.name === effect.targetCardName);
            if (target) {
                const track = target.resolutionTracks?.find(t => t.tag === effect.targetTrackTag);
                if (track) {
                    track.current = Math.max(0, track.current - amount);
                    this.state.resolutionLog.push(`Planet reduced ${track.tag} on ${target.name} by ${amount}.`);
                }
            }
        } else {
            // "Smuggler Ambush" - reduce ANY active objective track
            const allObjectiveTracks = this.state.planetObjectives.flatMap(o => o.resolutionTracks || []);
            const trackToReduce = allObjectiveTracks.find(t => t.current > 0);
            if (trackToReduce) {
                trackToReduce.current = Math.max(0, trackToReduce.current - amount);
                this.state.resolutionLog.push(`Planet reduced ${trackToReduce.tag} track by ${amount}.`);
            }
        }
    }
  }

  private resolvePlanetTurn(suppressedTones?: Set<string>, suppressedTracks?: Set<string>, allPassives: PassiveEffect[] = []) {
    this.state.resolutionLog.push(`Planet resolves situations...`);

    // Self-discard logic for Counterfeit Crystals
    this.state.planetSituations.forEach(sit => {
        if (sit.tags?.includes('SelfDiscardAfter3Turns')) {
            const ageKey = `age_${sit.id}`;
            this.state.scenarioCounters[ageKey] = (this.state.scenarioCounters[ageKey] || 0) + 1;
            if (this.state.scenarioCounters[ageKey] >= 3) {
                this.state.resolutionLog.push(`${sit.name} expired.`);
                sit.effects?.forEach(e => {
                    if (e.type === 'REDUCE_TRACK') {
                        this.processEffect(e, null, sit);
                    }
                });
                this.state.planetSituations = this.state.planetSituations.filter(s => s.id !== sit.id);
            }
        }
    });

    this.state.planetSituations.forEach(sit => {
        sit.effects?.forEach(effect => {
            if (effect.trigger === 'PLANET_TURN') {
                this.processEffect(effect, null, sit, undefined, undefined, suppressedTones, suppressedTracks, allPassives);
            }
        });
    });

    for (let i = 0; i < this.state.planetSituations.length; i++) {
        const sit = this.state.planetSituations[i]!;
        if (sit.resolutionTracks) {
            const resolvedTrack = sit.resolutionTracks.find(t => t.current >= t.target);
            if (resolvedTrack) {
                this.state.resolutionLog.push(`${sit.name} resolved as ${resolvedTrack.resultName}!`);
                this.state.history.push(`Resolved: ${resolvedTrack.resultName}`);

                // Situations advance Objectives
                if (resolvedTrack.resultTags) {
                    resolvedTrack.resultTags.forEach(tag => {
                        this.state.scenarioCounters[tag] = (this.state.scenarioCounters[tag] || 0) + 1;

                        // Find an objective with a matching tag track
                        this.state.planetObjectives.forEach(obj => {
                           const objTrack = obj.resolutionTracks?.find(ot => ot.tag === tag);
                           if (objTrack) {
                               objTrack.current += 1;
                               this.state.resolutionLog.push(`Objective ${obj.name} advanced (${tag} track).`);
                           }
                        });
                    });

                    // Check for DRAW_CARD reward on fulfillment (e.g., Accept a Bribe?)
                    const drawEffect = sit.effects?.find(e => e.type === 'DRAW_CARD' && e.targetTrackTag === resolvedTrack.tag);
                    if (drawEffect) {
                        // Reward the player who most recently interacted? No, user said "Target player", let's give to player 1 for now or randomly.
                        // Ideally we'd track who fulfilled it, but let's just give it to the first player for the hot-seat demo.
                        this.processEffect(drawEffect, this.state.players[0], sit);
                    }
                }

                this.state.planetSituations.splice(i, 1);
                i--; // Adjust index due to splice
            }
        }
    }

    // Check Objective Resolution
    for (let i = 0; i < this.state.planetObjectives.length; i++) {
        const obj = this.state.planetObjectives[i]!;
        if (obj.resolutionTracks) {
            const resolvedTrack = obj.resolutionTracks.find(t => t.current >= t.target);
            if (resolvedTrack) {
                 this.state.resolutionLog.push(`Objective ${obj.name} fulfilled: ${resolvedTrack.resultName}!`);
                 this.state.history.push(`Objective Fulfilled: ${resolvedTrack.resultName}`);

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

    // Emerge a new situation every turn
    const newCard = this.state.planetDeck.pop();
    if (newCard) {
        this.state.planetSituations.push(newCard);
        this.state.resolutionLog.push(`New situation emerged: ${newCard.name}`);
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
