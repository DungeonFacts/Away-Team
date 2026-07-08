import type { GameState, Player, Card, Action, ResolutionTrack, Effect } from '../../../shared/types.js';
import { SECURITY_OFFICER_DECK, XENOBIOLOGIST_DECK, ROYAL_KOOG_DECK } from '../data/cards.js';

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

    const planetDeck = this.shuffle([...ROYAL_KOOG_DECK]);
    const planetObjectives: Card[] = [];
    const planetSituations: Card[] = [];

    const initialPlanetCardsCount = players.length + 1;
    for (let i = 0; i < initialPlanetCardsCount; i++) {
      const card = planetDeck.pop();
      if (card) {
        if (card.type === 'Objective') planetObjectives.push(card);
        else planetSituations.push(card);
      }
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
      const card = player.deployed.find(c => c.id === action.cardId);
      if (!card) return;
    }

    player.selectedActions.push(action);
  }

  public removeAction(playerId: string, index: number) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.lockedIn) return;
    player.selectedActions.splice(index, 1);
  }

  public lockIn(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.selectedActions.length === 0) return;
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
          const cardToActivate = player.deployed.find(c => c.id === action.cardId);
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

    // Process ADVANCE effects
    activeEffects.forEach(({ player, card, effect, targetId }) => {
      if (effect.type === 'ADVANCE') {
        this.processEffect(effect, player, card, targetId, suppressedTones, suppressedTracks);
      }
    });

    this.resolvePlanetTurn(suppressedTones, suppressedTracks);
    this.checkEndConditions();

    this.state.players.forEach(p => {
      p.lockedIn = false;
      p.selectedActions = [];
    });
    this.state.turnCount++;
    this.state.phase = 'PLAYER_ACTION';
    this.state.history.push(`Turn ${this.state.turnCount} started.`);
  }

  private processEffect(effect: Effect, player: Player | null, sourceCard: Card, targetId?: string, suppressedTones?: Set<string>, suppressedTracks?: Set<string>) {
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

      const targetSituation = this.state.planetSituations.find(s => s.id === targetId);
      if (targetSituation && targetSituation.resolutionTracks) {
        const track = targetSituation.resolutionTracks.find(t => t.tone === toneToAdvance);
        if (track) {
          let amount = effect.amount !== undefined ? effect.amount : 1;

          // Apply passive effects from all players
          this.state.players.forEach(p => {
              [...(p.policy ? [p.policy] : []), ...p.deployed].forEach(c => {
                  c.passiveEffects?.forEach(pe => {
                      if (pe.type === 'MULTIPLY_ADVANCE') {
                          if ((!pe.nature || pe.nature === sourceCard.nature) && (!pe.tone || pe.tone === sourceCard.tone)) {
                              amount *= pe.factor;
                          }
                      }
                  });
              });
          });

          track.current += amount;
          const playerName = player ? player.name : 'Planet';
          this.state.resolutionLog.push(`${playerName} advanced ${track.tone} track on ${targetSituation.name} by ${amount}.`);
        }
      }
    }
  }

  private resolvePlanetTurn(suppressedTones?: Set<string>, suppressedTracks?: Set<string>) {
    this.state.resolutionLog.push(`Planet resolves situations...`);

    this.state.planetSituations.forEach(sit => {
        sit.effects?.forEach(effect => {
            if (effect.trigger === 'PLANET_TURN') {
                if (effect.type === 'ADVANCE') {
                    const track = sit.resolutionTracks?.find(t => t.tone === effect.tone);
                    if (track) {
                        this.processEffect(effect, null, sit, sit.id, suppressedTones, suppressedTracks);
                    } else {
                        const otherSit = this.state.planetSituations.find(s => s.resolutionTracks?.some(t => t.tone === effect.tone));
                        if (otherSit) {
                            this.processEffect(effect, null, sit, otherSit.id, suppressedTones, suppressedTracks);
                        }
                    }
                }
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
                }

                this.state.planetSituations.splice(i, 1);
                const newCard = this.state.planetDeck.pop();
                if (newCard) {
                    if (newCard.type === 'Objective') this.state.planetObjectives.push(newCard);
                    else this.state.planetSituations.push(newCard);
                }
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
  }

  private checkEndConditions() {
    if (this.state.planetObjectives.length === 0) {
        this.state.victory = true;
        this.state.activeEnding = { title: 'Mission Accomplished: All objectives fulfilled.', isVictory: true };
        this.state.history.push('VICTORY: Mission Accomplished.');
    }
  }
}
