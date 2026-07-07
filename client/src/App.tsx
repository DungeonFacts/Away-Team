import { useState, useEffect } from 'react';
import { useGame } from './hooks/useGame.ts';
import PlanetBoard from './components/PlanetBoard.tsx';
import PlayerArea from './components/PlayerArea.tsx';
import { History, MessageSquare, RefreshCw, Users } from 'lucide-react';

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
                    className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all ${
                        currentPlayerIndex === i
                        ? 'bg-slate-100 text-slate-900 shadow-xl'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                >
                    View {p.name} {p.lockedIn && '✓'}
                </button>
            ))}
          </div>

          <PlayerArea
            player={currentPlayer}
            isCurrentPlayer={true}
            onAction={performAction}
            onRemoveAction={(idx) => removeAction(currentPlayer.id, idx)}
            onLockIn={() => lockIn(currentPlayer.id)}
            selectedObjectiveId={selectedObjectiveId}
          />
        </div>

        <div className="xl:col-span-4 space-y-8">
          {(gameState.victory || gameState.defeat) && (
            <div className={`p-6 rounded-xl border-2 text-center animate-bounce ${
              gameState.victory ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'
            }`}>
              <h2 className="text-3xl font-black mb-2">{gameState.victory ? 'MISSION SUCCESS' : 'MISSION FAILED'}</h2>
              <button onClick={() => resetGame(PLAYER_NAMES)} className="mt-4 px-4 py-2 bg-slate-900 rounded-lg text-sm font-bold">
                Deploy Again
              </button>
            </div>
          )}

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
