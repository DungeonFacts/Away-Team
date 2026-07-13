import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Game } from './Game.js';
import type { Action, Card } from '../../../shared/types.js';

describe('Away Team Game Engine Tests', () => {

  test('Game Initialization', () => {
    const game = new Game(['Security Officer', 'Xenoethnologist']);
    const state = game.getState();

    assert.strictEqual(state.players.length, 2);
    assert.strictEqual(state.players[0]?.hand.length, 5);
    assert.strictEqual(state.players[1]?.hand.length, 5);
    assert.strictEqual(state.planetObjectives.length, 3);
    assert.strictEqual(state.planetSituations.length, 2);
    assert.strictEqual(state.playerOrder.length, 2);
    assert.strictEqual(state.turnCount, 1);
  });

  test('Rotating Play Order Queue', () => {
    const game = new Game(['Security Officer', 'Xenoethnologist']);
    const initialOrder = [...game.getState().playerOrder];

    // Force draw action for both players to quickly pass the turn
    const p0 = game.getState().players[0]!;
    const p1 = game.getState().players[1]!;

    game.handleAction({ type: 'DRAW', playerId: p0.id });
    game.handleAction({ type: 'DRAW', playerId: p0.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });

    game.lockIn(p0.id);
    game.lockIn(p1.id);

    // After turn resolution, turn count should be 2, and play order queue should be rotated
    assert.strictEqual(game.getState().turnCount, 2);
    const nextOrder = game.getState().playerOrder;
    assert.deepStrictEqual(nextOrder, [initialOrder[1], initialOrder[0]]);
  });

  test('Taking Point Override (SO-POL-04)', () => {
    const game = new Game(['Security Officer', 'Xenoethnologist']);
    const p0 = game.getState().players[0]!;
    const p1 = game.getState().players[1]!;

    // Deploy SO-POL-04 (Taking Point) Policy for Security Officer
    const takingPointPolicy: Card = {
      id: 'SO-POL-04',
      name: 'Taking Point',
      type: 'Policy',
      tone: 'Hostile',
      nature: 'Biological',
      description: 'During card resolution, your cards resolve first. Other players resolve as normal.',
    };
    p0.policy = takingPointPolicy;

    // Set rotation so that Xenoethnologist (p1) is at the front of normal queue
    game.getState().playerOrder = [p1.id, p0.id];

    // Lock in Actions
    game.handleAction({ type: 'DRAW', playerId: p0.id });
    game.handleAction({ type: 'DRAW', playerId: p0.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });

    game.lockIn(p0.id);
    game.lockIn(p1.id);

    // Resolution log should show Security Officer resolving first even though p1 was front of queue
    const log = game.getState().resolutionLog.join(' ');
    assert.ok(log.includes('Player Resolution Order: Security Officer -> Xenoethnologist'));
  });

  test('Set Phasers to Kill (SO-TAC-02) Advancement & Collateral Damage', () => {
    const game = new Game(['Security Officer', 'Xenoethnologist']);
    const p0 = game.getState().players[0]!;

    // Setup active situation with a biological track having progress
    const mockSituation: Card = {
      id: 'RK-ADV-01',
      name: 'Formal Audience',
      type: 'Situation',
      tone: 'Political',
      nature: 'Cultural',
      description: 'Test',
      resolutionTracks: [
        { id: 't1', tone: 'Political', nature: 'Cultural', current: 0, target: 3, resultName: 'A' },
        { id: 't2', tone: 'Hostile', nature: 'Cultural', current: 0, target: 3, resultName: 'B' }
      ]
    };
    game.getState().planetSituations = [mockSituation];

    // Put biological track on an objective with 1 point
    const mockObjective: Card = {
      id: 'RK-OBJ-01',
      name: 'The Royal Embassy',
      type: 'Objective',
      tone: 'Political',
      nature: 'Cultural',
      description: 'Test',
      resolutionTracks: [
        { id: 'obj-t1', tag: 'Royal', current: 0, target: 3, resultName: 'C' },
        { id: 'obj-t2', tag: 'Criminal', current: 0, target: 3, resultName: 'D', nature: 'Biological' }
      ]
    };
    mockObjective.resolutionTracks![1]!.current = 1;
    game.getState().planetObjectives = [mockObjective];

    // Play/Activate Set Phasers to Kill (SO-TAC-02) targeting Hostile/Cultural (t2)
    const phasersCard: Card = {
      id: 'SO-TAC-02',
      name: 'Set Phasers to Kill',
      type: 'Tactic',
      tone: 'Hostile',
      nature: 'Technological',
      description: 'Advance 1. If Hostile, advance again. Collateral: reduce biological.'
    };
    p0.deployed.push(phasersCard);

    game.handleAction({
      type: 'ACTIVATE',
      playerId: p0.id,
      cardId: 'SO-TAC-02',
      targetId: 'RK-ADV-01',
      targetTrackId: 't2'
    });
    game.handleAction({ type: 'DRAW', playerId: p0.id });

    // Pass turn for other player
    const p1 = game.getState().players[1]!;
    game.handleAction({ type: 'DRAW', playerId: p1.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });

    game.lockIn(p0.id);
    game.lockIn(p1.id);

    // Hostile track t2 should advance by 2 (base 1 + 1 since track is Hostile)
    assert.strictEqual(mockSituation.resolutionTracks![1]!.current, 2);

    // Biological track obj-t2 should be reduced by 1 (to 0) due to Collateral Damage
    assert.strictEqual(mockObjective.resolutionTracks![1]!.current, 0);
  });

  test('Shoot First, Ask Questions Later (SO-TAC-05) target verification and resolution', () => {
    const game = new Game(['Security Officer', 'Xenoethnologist']);
    const p0 = game.getState().players[0]!;

    const mockSituation: Card = {
      id: 'RK-ADV-01',
      name: 'Formal Audience',
      type: 'Situation',
      tone: 'Political',
      nature: 'Cultural',
      description: 'Test',
      resolutionTracks: [
        { id: 't1', tone: 'Political', nature: 'Cultural', current: 0, target: 3, resultName: 'A' },
        { id: 't2', tone: 'Hostile', nature: 'Cultural', current: 0, target: 3, resultName: 'B' }
      ]
    };
    game.getState().planetSituations = [mockSituation];

    const shootFirstCard: Card = {
      id: 'SO-TAC-05',
      name: 'Shoot First, Ask Questions Later',
      type: 'Tactic',
      tone: 'Hostile',
      nature: 'Cultural',
      description: 'Advance 2. Collateral: reduce another with >= 2 by 2.'
    };
    p0.deployed.push(shootFirstCard);

    // Initially, there's no other track with >= 2 points of advancement, so validateActionSelection should block it
    const validation1 = game.validateActionSelection({
      type: 'ACTIVATE',
      playerId: p0.id,
      cardId: 'SO-TAC-05',
      targetId: 'RK-ADV-01',
      targetTrackId: 't1'
    });
    assert.strictEqual(validation1.valid, false);

    // Give another track 2 points of advancement
    mockSituation.resolutionTracks![1]!.current = 2;

    const validation2 = game.validateActionSelection({
      type: 'ACTIVATE',
      playerId: p0.id,
      cardId: 'SO-TAC-05',
      targetId: 'RK-ADV-01',
      targetTrackId: 't1'
    });
    assert.strictEqual(validation2.valid, true);

    // Perform action
    game.handleAction({
      type: 'ACTIVATE',
      playerId: p0.id,
      cardId: 'SO-TAC-05',
      targetId: 'RK-ADV-01',
      targetTrackId: 't1'
    });
    game.handleAction({ type: 'DRAW', playerId: p0.id });

    // Resolve turn
    const p1 = game.getState().players[1]!;
    game.handleAction({ type: 'DRAW', playerId: p1.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });

    game.lockIn(p0.id);
    game.lockIn(p1.id);

    // Target track t1 should be 2. Collateral track t2 should be reduced from 2 to 0.
    assert.strictEqual(mockSituation.resolutionTracks![0]!.current, 2);
    assert.strictEqual(mockSituation.resolutionTracks![1]!.current, 0);
  });

  test('Distraction! (SO-TAC-08) Doubling Next Tactic', () => {
    const game = new Game(['Security Officer', 'Xenoethnologist']);
    const p0 = game.getState().players[0]!;

    const mockSituation: Card = {
      id: 'RK-ADV-01',
      name: 'Formal Audience',
      type: 'Situation',
      tone: 'Political',
      nature: 'Cultural',
      description: 'Test',
      resolutionTracks: [
        { id: 't1', tone: 'Political', nature: 'Cultural', current: 0, target: 5, resultName: 'A' }
      ]
    };
    game.getState().planetSituations = [mockSituation];

    const distCard: Card = {
      id: 'SO-TAC-08',
      name: 'Distraction!',
      type: 'Tactic',
      tone: 'Hostile',
      nature: 'Biological',
      description: 'Reduce track by 1. Next tactic targeting it happens twice.'
    };
    // Let's add a generic tactic to activate subsequently
    const followCard: Card = {
      id: 'generic-tactic',
      name: 'Generic Tactic',
      type: 'Tactic',
      tone: 'Political',
      nature: 'Cultural',
      description: 'Advance 1.'
    };

    mockSituation.resolutionTracks![0]!.current = 1;

    p0.deployed.push(distCard, followCard);

    // Turn 1: Activate Distraction!
    game.handleAction({
      type: 'ACTIVATE',
      playerId: p0.id,
      cardId: 'SO-TAC-08',
      targetId: 'RK-ADV-01',
      targetTrackId: 't1'
    });
    game.handleAction({ type: 'DRAW', playerId: p0.id });

    const p1 = game.getState().players[1]!;
    game.handleAction({ type: 'DRAW', playerId: p1.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });

    game.lockIn(p0.id);
    game.lockIn(p1.id);

    // Track should be reduced to 0, and double list should contain track id
    assert.strictEqual(mockSituation.resolutionTracks![0]!.current, 0);
    assert.ok(game.getState().doubleTargetTracks?.includes('t1'));

    // Turn 2: Activate Generic Tactic on t1
    game.handleAction({
      type: 'ACTIVATE',
      playerId: p0.id,
      cardId: 'generic-tactic',
      targetId: 'RK-ADV-01',
      targetTrackId: 't1'
    });
    game.handleAction({ type: 'DRAW', playerId: p0.id });

    game.handleAction({ type: 'DRAW', playerId: p1.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });

    game.lockIn(p0.id);
    game.lockIn(p1.id);

    // Track should advance by 2 instead of 1
    assert.strictEqual(mockSituation.resolutionTracks![0]!.current, 2);
  });

  test('They Should Have Sent A Poet (XE-POL-10)', () => {
    const game = new Game(['Security Officer', 'Xenoethnologist']);
    const p1 = game.getState().players[1]!;

    // Deploy Poet Policy for Xenoethnologist
    const poetPolicy: Card = {
      id: 'XE-POL-10',
      name: 'They Should Have Sent A Poet',
      type: 'Policy',
      tone: 'Scientific',
      nature: 'Anomalous',
      description: 'At the end of every turn, all Anomalous Situation Tracks advance by 1.'
    };
    p1.policy = poetPolicy;

    // Active situation with Anomalous track
    const mockSituation: Card = {
      id: 'RK-ADV-01',
      name: 'Formal Audience',
      type: 'Situation',
      tone: 'Scientific',
      nature: 'Anomalous',
      description: 'Test',
      resolutionTracks: [
        { id: 't1', tone: 'Scientific', nature: 'Anomalous', current: 0, target: 3, resultName: 'A' }
      ]
    };
    game.getState().planetSituations = [mockSituation];

    const p0 = game.getState().players[0]!;
    game.handleAction({ type: 'DRAW', playerId: p0.id });
    game.handleAction({ type: 'DRAW', playerId: p0.id });

    game.handleAction({ type: 'DRAW', playerId: p1.id });
    game.handleAction({ type: 'DRAW', playerId: p1.id });

    game.lockIn(p0.id);
    game.lockIn(p1.id);

    // Anomalous track t1 should advance by 1 at the end of the turn
    assert.strictEqual(mockSituation.resolutionTracks![0]!.current, 1);
  });

  test('Deterministic PRNG and Logging', () => {
    // Two games with the exact same seed should yield identical shuffle/random behavior
    const gameA = new Game(['Security Officer', 'Xenoethnologist'], 42);
    const gameB = new Game(['Security Officer', 'Xenoethnologist'], 42);
    const gameC = new Game(['Security Officer', 'Xenoethnologist'], 100);

    // Decks, objectives, and play order should be identical for A and B
    assert.deepStrictEqual(gameA.getState().playerOrder, gameB.getState().playerOrder);
    assert.deepStrictEqual(
      gameA.getState().players[0]?.deck.map(c => c.id),
      gameB.getState().players[0]?.deck.map(c => c.id)
    );

    // Decks for C (different seed) should be different from A
    const deckA = gameA.getState().players[0]?.deck.map(c => c.id);
    const deckC = gameC.getState().players[0]?.deck.map(c => c.id);
    assert.notDeepStrictEqual(deckA, deckC);

    // Test sequence of numbers
    const seqA = [gameA.randomInt(100, 'test1'), gameA.randomInt(100, 'test2')];
    const seqB = [gameB.randomInt(100, 'test1'), gameB.randomInt(100, 'test2')];
    const seqC = [gameC.randomInt(100, 'test1'), gameC.randomInt(100, 'test2')];

    assert.deepStrictEqual(seqA, seqB);
    assert.notDeepStrictEqual(seqA, seqC);

    // Verify logs
    const logA = gameA.getState().rngLog;
    assert.ok(logA.length > 0);
    const lastEntry = logA[logA.length - 1]!;
    assert.strictEqual(lastEntry.turnNumber, 1);
    assert.strictEqual(lastEntry.effect, 'test2');
    assert.ok(typeof lastEntry.seedStateBefore === 'number');
    assert.ok(typeof lastEntry.seedStateAfter === 'number');
    assert.ok(typeof lastEntry.result === 'number');
  });

  test('Flattened Pool Track Selection (Smuggler Ambush)', () => {
    // Setup game state with specific situations
    const game = new Game(['Security Officer', 'Xenoethnologist'], 999);

    const situationA: Card = {
      id: 'RK-ADV-01',
      name: 'Situation A',
      type: 'Situation',
      tone: 'Political',
      nature: 'Cultural',
      description: '1 track',
      resolutionTracks: [
        { id: 'track-A1', tone: 'Political', nature: 'Cultural', current: 2, target: 3, resultName: 'A1' }
      ]
    };

    const situationB: Card = {
      id: 'RK-ADV-02',
      name: 'Situation B',
      type: 'Situation',
      tone: 'Mercantile',
      nature: 'Technological',
      description: '2 tracks',
      resolutionTracks: [
        { id: 'track-B1', tone: 'Mercantile', nature: 'Technological', current: 0, target: 3, resultName: 'B1' },
        { id: 'track-B2', tone: 'Scientific', nature: 'Anomalous', current: 3, target: 5, resultName: 'B2' }
      ]
    };

    game.getState().planetSituations = [situationA, situationB];

    // Total situation tracks is 3: track-A1, track-B1, track-B2
    // If we get a random situation track with filter current > 0, track-B1 should be excluded
    // So the pool should only be track-A1 and track-B2.
    // Let's call getRandomSituationTrack multiple times or verify the pool size/members.

    const chosenTracks = new Set<string>();
    // Since it's deterministic, let's run it many times to see if we hit both valid tracks
    for (let i = 0; i < 50; i++) {
      const match = game.getRandomSituationTrack('test select', item => item.track.current > 0);
      assert.ok(match);
      assert.notStrictEqual(match.track.id, 'track-B1'); // Should never be B1 because its current is 0
      chosenTracks.add(match.track.id);
    }

    assert.strictEqual(chosenTracks.has('track-A1'), true);
    assert.strictEqual(chosenTracks.has('track-B2'), true);
    assert.strictEqual(chosenTracks.has('track-B1'), false);
  });
});
