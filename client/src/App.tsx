import { useState, useEffect } from 'react';
import { useGame } from './hooks/useGame.ts';
import PlanetBoard from './components/PlanetBoard.tsx';
import PlayerArea from './components/PlayerArea.tsx';
import { History, MessageSquare, RefreshCw, Users, ShieldAlert, Trophy, LogOut, Copy, Check } from 'lucide-react';

function App() {
  const {
    gameState,
    gameId,
    playerId,
    joinError,
    createGame,
    joinGame,
    performAction,
    removeAction,
    lockIn,
    resetGame,
    leaveGame
  } = useGame();

  const [inputGameId, setInputGameId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(false);

  // Auto-join handling when creating game
  useEffect(() => {
    if (gameId && pendingJoin) {
      setPendingJoin(false);
      joinGame(gameId, displayName);
    }
  }, [gameId, pendingJoin, joinGame, displayName]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setPendingJoin(true);
    createGame();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputGameId.trim() || !displayName.trim()) return;
    joinGame(inputGameId.trim().toUpperCase(), displayName.trim());
  };

  const handleCopyCode = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Join / Connection Screen
  if (!gameId || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-500/20 mb-2">
              <Users className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Away Team</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Mission Command</p>
          </div>

          {joinError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm font-semibold text-center">
              {joinError}
            </div>
          )}

          <div className="space-y-6">
            {/* Create Game Form */}
            <form onSubmit={handleCreate} className="space-y-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Create New Session</h2>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Your Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Captain Bob"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg text-sm transition-colors"
              >
                Create Game
              </button>
            </form>

            <div className="text-center text-xs text-slate-600 font-bold uppercase">— OR —</div>

            {/* Join Game Form */}
            <form onSubmit={handleJoin} className="space-y-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Join Existing Session</h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Game Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC12"
                    value={inputGameId}
                    onChange={(e) => setInputGameId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 uppercase focus:outline-none focus:border-blue-500 font-mono tracking-wider"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Your Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Science Officer Alice"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-lg text-sm transition-colors"
              >
                Join Game
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Lobby (Waiting for players)
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-8">
          <div className="space-y-2">
            <RefreshCw className="animate-spin mb-4 mx-auto text-blue-500" size={48} />
            <h1 className="text-2xl font-black uppercase tracking-tighter">Waiting for Players</h1>
            <p className="text-sm text-slate-400">Your role: <span className="font-bold text-blue-400">{playerId === 'player-0' ? 'Security Officer' : 'Xenoethnologist'}</span></p>
          </div>

          <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Share this Game Code</div>
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-lg border border-slate-800">
              <span className="font-mono text-2xl font-black text-slate-100 tracking-wider">{gameId}</span>
              <button
                onClick={handleCopyCode}
                className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy Code"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <button
            onClick={leaveGame}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Leave Room
          </button>
        </div>
      </div>
    );
  }

  const me = gameState.players.find(p => p.id === playerId);
  const other = gameState.players.find(p => p.id !== playerId);

  if (!me) {
    // Viewer/Spectator fallback or rejoining state
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <RefreshCw className="animate-spin mb-4 mx-auto" size={48} />
          <p className="text-xl font-bold">Synchronizing seat with game session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Away Team</h1>
            <p className="text-xs text-slate-500 font-bold uppercase">
              Room: {gameId} • Turn {gameState.turnCount} • Role: {me.name} ({playerId === 'player-0' ? 'Security Officer' : 'Xenoethnologist'})
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={resetGame}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            title="Reset Current Game"
          >
            <RefreshCw size={16} /> Reset
          </button>
          <button
            onClick={leaveGame}
            className="flex-1 md:flex-none px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-500 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            title="Leave Game"
          >
            <LogOut size={16} /> Leave
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <PlanetBoard
            objectives={gameState.planetObjectives}
            situations={gameState.planetSituations}
            onSelectObjective={setSelectedObjectiveId}
            selectedObjectiveId={selectedObjectiveId}
          />

          <div className="space-y-6">
              {/* Show viewer's own area with full info */}
              <PlayerArea
                player={me}
                isMe={true}
                onAction={performAction}
                onRemoveAction={(idx) => removeAction(me.id, idx)}
                onLockIn={() => lockIn(me.id)}
                selectedObjectiveId={selectedObjectiveId}
              />

              {/* Show other player's deployed/public area */}
              {other && (
                  <PlayerArea
                    player={other}
                    isMe={false}
                    onAction={() => {}}
                    onRemoveAction={() => {}}
                    onLockIn={() => {}}
                  />
              )}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-8">
          {(gameState.activeEnding) && (
            <div className={`p-6 rounded-xl border-2 text-center animate-bounce flex flex-col items-center gap-2 ${
              gameState.activeEnding.isVictory ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'
            }`}>
              {gameState.activeEnding.isVictory ? <Trophy size={48} /> : <ShieldAlert size={48} />}
              <h2 className="text-2xl font-black mb-1 uppercase leading-tight">{gameState.activeEnding.title}</h2>
              <button onClick={resetGame} className="mt-4 px-6 py-2 bg-slate-900 rounded-lg text-sm font-bold border border-slate-700 hover:bg-slate-800 transition-colors">
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
