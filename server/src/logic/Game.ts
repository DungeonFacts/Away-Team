import type { GameState, Player, Card, Action, Phase, ResolutionTrack } from '../../../shared/types.js';
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
    const planetEvents: Card[] = [];

    const initialPlanetCardsCount = players.length + 1;
    for (let i = 0; i < initialPlanetCardsCount; i++) {
      const card = planetDeck.pop();
      if (card) {
        if (card.type === 'Objective') planetObjectives.push(card);
        else planetEvents.push(card);
      }
    }

    this.state = {
      id: Math.random().toString(36).substr(2, 9),
      players,
      planetDeck,
      planetObjectives,
      planetEvents,
      phase: 'PLAYER_ACTION',
      turnCount: 1,
      history: ['Game started.'],
      victory: false,
      defeat: false,
      resolutionLog: [],
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

    for (const player of this.state.players) {
      for (const action of player.selectedActions) {
        this.processAction(player, action);
      }
    }

    this.resolvePlanetTurn();
    this.checkEndConditions();

    this.state.players.forEach(p => {
      p.lockedIn = false;
      p.selectedActions = [];
    });
    this.state.turnCount++;
    this.state.phase = 'PLAYER_ACTION';
    this.state.history.push(`Turn ${this.state.turnCount} started.`);
  }

  private processAction(player: Player, action: Action) {
    switch (action.type) {
      case 'DRAW':
        const card = player.deck.pop();
        if (card) {
          player.hand.push(card);
          this.state.resolutionLog.push(`${player.name} drew a card.`);
        }
        break;
      case 'PLAY':
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
        break;
      case 'ACTIVATE':
        const cardToActivate = player.deployed.find(c => c.id === action.cardId);
        if (cardToActivate) {
          this.applyCardEffect(player, cardToActivate, action.targetId);
        }
        break;
    }
  }

  private applyCardEffect(player: Player, card: Card, targetId?: string) {
    this.state.resolutionLog.push(`${player.name} activated ${card.name}.`);

    const targetObjective = this.state.planetObjectives.find(o => o.id === targetId);
    if (targetObjective && targetObjective.resolutionTracks) {
      const track = targetObjective.resolutionTracks.find(t => t.tone === card.tone);
      if (track) {
        track.current++;
        this.state.resolutionLog.push(`Advanced ${track.tone} track on ${targetObjective.name}.`);
        if (card.name === 'Tactical Analysis') {
            track.current++;
            this.state.resolutionLog.push(`(Tactical Analysis) Advanced ${track.tone} track again.`);
        }
      }
    }

    if (card.type === 'Equipment' && card.uses !== undefined) {
      card.uses--;
      if (card.uses <= 0) {
        player.deployed = player.deployed.filter(c => c.id !== card.id);
        this.state.resolutionLog.push(`${card.name} was discarded (no uses left).`);
      }
    }

    if (card.name === 'Peace Offering') {
        if (targetObjective && targetObjective.resolutionTracks) {
             const dipTrack = targetObjective.resolutionTracks.find(t => t.tone === 'Diplomatic');
             if (dipTrack) {
                 dipTrack.current += 2;
                 this.state.resolutionLog.push(`(Peace Offering) Advanced Diplomatic track by 2 more.`);
             }
        }
    }
  }

  private resolvePlanetTurn() {
    this.state.resolutionLog.push(`Planet resolves events...`);
    this.state.planetObjectives.forEach(obj => {
        if (obj.name === 'Strange Foliage') {
            const track = obj.resolutionTracks?.find(t => t.tone === 'Hostile');
            if (track) {
                track.current++;
                this.state.resolutionLog.push(`Strange Foliage advances Hostile track.`);
            }
        }
    });

    this.state.planetObjectives.forEach((obj, index) => {
        if (obj.resolutionTracks) {
            for (const track of obj.resolutionTracks) {
                if (track.current >= track.target) {
                    this.state.resolutionLog.push(`${obj.name} resolved as ${track.resultName}!`);
                    this.state.history.push(`Resolved: ${track.resultName}`);
                    this.state.planetObjectives.splice(index, 1);
                    const newCard = this.state.planetDeck.pop();
                    if (newCard) {
                        if (newCard.type === 'Objective') this.state.planetObjectives.push(newCard);
                        else this.state.planetEvents.push(newCard);
                    }
                    break;
                }
            }
        }
    });
  }

  private checkEndConditions() {
    const royalResolutions = this.state.history.filter(h => h.includes('Royal')).length;
    const criminalResolutions = this.state.history.filter(h => h.includes('Criminal')).length;

    if (royalResolutions >= 3) {
      this.state.victory = true;
      this.state.history.push('VICTORY: The mission was a success.');
    } else if (criminalResolutions >= 3) {
      this.state.defeat = true;
      this.state.history.push('DEFEAT: The mission failed.');
    }
  }
}
