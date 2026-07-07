import { useState, useEffect } from 'react';
import { useGame } from './hooks/useGame.ts';
import PlanetBoard from './components/PlanetBoard.tsx';
import PlayerArea from './components/PlayerArea.tsx';
import { History, MessageSquare, RefreshCw, Users, ShieldAlert, Trophy } from 'lucide-react';

const PLAYER_NAMES = ['Security Officer', 'Xenobiologist'];

function App() {
  const { gameState, joinGame, performAction, removeAction, lockIn, resetGame } = useGame();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | undefined>();

  useEffect(() => {
    joinGame(PLAYER_NAMES);
  }, [joinGame]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="text-center">
          <RefreshCw className="animate-spin mb-4 mx-auto" size={48} />
          <p className="text-xl font-bold">Connecting to Away Team Command...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[currentPlayerIndex]!;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Away Team</h1>
            <p className="text-xs text-slate-500 font-bold uppercase">Mission: Royal Koog • Turn {gameState.turnCount}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => resetGame(PLAYER_NAMES)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 transition-all"
            title="Reset Game"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <PlanetBoard
            objectives={gameState.planetObjectives}
            events={gameState.planetEvents}
            onSelectObjective={setSelectedObjectiveId}
            selectedObjectiveId={selectedObjectiveId}
          />

          <div className="flex justify-center gap-4 mb-4">
            {gameState.players.map((p, i) => (
                <button
                    key={p.id}
                    onClick={() => setCurrentPlayerIndex(i)}
                    className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                        currentPlayerIndex === i
                        ? 'bg-slate-100 text-slate-900 shadow-xl'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                >
                    {p.name} {p.lockedIn && <span className="text-green-500">✓</span>}
                </button>
            ))}
          </div>

          <div className="space-y-6">
              {/* Show current player area with full info */}
              <PlayerArea
                player={currentPlayer}
                isMe={true}
                onAction={performAction}
                onRemoveAction={(idx) => removeAction(currentPlayer.id, idx)}
                onLockIn={() => lockIn(currentPlayer.id)}
                selectedObjectiveId={selectedObjectiveId}
              />

              {/* Show other players' deployed areas */}
              <div className="grid grid-cols-1 gap-6">
                  {gameState.players.filter((_, i) => i !== currentPlayerIndex).map(otherPlayer => (
                      <PlayerArea
                        key={otherPlayer.id}
                        player={otherPlayer}
                        isMe={false}
                        onAction={() => {}}
                        onRemoveAction={() => {}}
                        onLockIn={() => {}}
                      />
                  ))}
              </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-8">
          {(gameState.activeEnding) && (
            <div className={`p-6 rounded-xl border-2 text-center animate-bounce flex flex-col items-center gap-2 ${
              gameState.activeEnding.isVictory ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'
            }`}>
              {gameState.activeEnding.isVictory ? <Trophy size={48} /> : <ShieldAlert size={48} />}
              <h2 className="text-2xl font-black mb-1 uppercase leading-tight">{gameState.activeEnding.title}</h2>
              <button onClick={() => resetGame(PLAYER_NAMES)} className="mt-4 px-6 py-2 bg-slate-900 rounded-lg text-sm font-bold border border-slate-700 hover:bg-slate-800 transition-colors">
                New Mission
              </button>
            </div>
          )}

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                 Scenario Counters
              </h3>
              <div className="grid grid-cols-2 gap-4">
                  {Object.entries(gameState.scenarioCounters).map(([tag, count]) => (
                      <div key={tag} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">{tag}</div>
                          <div className="text-2xl font-black">{count}</div>
                      </div>
                  ))}
                  {Object.keys(gameState.scenarioCounters).length === 0 && (
                      <p className="col-span-2 text-xs text-slate-600 italic text-center">No counters yet.</p>
                  )}
              </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-[400px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                <MessageSquare size={14} /> Resolution Log
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-sm pr-2">
                {gameState.resolutionLog.map((log, i) => (
                    <div key={i} className="text-slate-400 border-l-2 border-slate-800 pl-3 py-1">
                        {log}
                    </div>
                ))}
                {gameState.resolutionLog.length === 0 && (
                    <p className="text-slate-600 italic">Waiting for turn resolution...</p>
                )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-[300px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                <History size={14} /> Mission History
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 text-sm pr-2">
                {gameState.history.map((entry, i) => (
                    <div key={i} className="text-slate-300">
                        {entry}
                    </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
