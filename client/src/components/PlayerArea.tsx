import React from 'react';
import type { Player, Card, Action } from '../../../shared/types.js';
import { Shield, FlaskConical, Handshake, DollarSign, X } from 'lucide-react';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  onAction: (action: Action) => void;
  onRemoveAction: (index: number) => void;
  onLockIn: () => void;
  selectedObjectiveId?: string;
}

const ToneIcon = ({ tone, size = 16 }: { tone: string, size?: number }) => {
  switch (tone) {
    case 'Hostile': return <Shield size={size} className="text-red-500" />;
    case 'Scientific': return <FlaskConical size={size} className="text-green-500" />;
    case 'Diplomatic': return <Handshake size={size} className="text-blue-500" />;
    case 'Mercantile': return <DollarSign size={size} className="text-yellow-500" />;
    default: return null;
  }
};

const CardView = ({ card, onClick, disabled, selected }: { card: Card, onClick?: () => void, disabled?: boolean, selected?: boolean }) => (
  <div
    onClick={!disabled ? onClick : undefined}
    className={`p-3 rounded border transition-all ${
      disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'
    } ${
      selected ? 'border-blue-500 ring-1 ring-blue-500 bg-slate-800' : 'bg-slate-900 border-slate-700'
    }`}
  >
    <div className="flex justify-between items-center mb-1">
      <span className="font-bold text-sm truncate">{card.name}</span>
      <ToneIcon tone={card.tone} />
    </div>
    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2">
      <span>{card.type}</span>
      <span>{card.nature}</span>
    </div>
    <p className="text-[11px] text-slate-400 leading-tight">{card.description}</p>
    {card.uses !== undefined && (
      <div className="mt-2 flex gap-1">
        {Array.from({ length: card.uses }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-slate-600" />
        ))}
      </div>
    )}
  </div>
);

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isCurrentPlayer, onAction, onRemoveAction, onLockIn, selectedObjectiveId }) => {
  return (
    <div className={`p-6 rounded-xl border transition-all ${
        isCurrentPlayer ? 'bg-slate-800 border-slate-600 shadow-xl' : 'bg-slate-900 border-slate-800 opacity-80'
    }`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-200">{player.name}</h2>
          <div className="text-xs text-slate-500 uppercase tracking-widest">
            {player.lockedIn ? 'Ready' : 'Planning Actions'}
          </div>
        </div>
        <div className="flex gap-2">
            {!player.lockedIn && isCurrentPlayer && (
                <>
                    <button
                        onClick={() => onAction({ type: 'DRAW', playerId: player.id })}
                        disabled={player.selectedActions.length >= 2}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold disabled:opacity-50"
                    >
                        Draw Card
                    </button>
                    <button
                        onClick={onLockIn}
                        disabled={player.selectedActions.length === 0}
                        className="px-4 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold disabled:opacity-50 shadow-lg shadow-blue-900/20"
                    >
                        Lock In
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between">
            Hand <span>{player.hand.length} cards</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {player.hand.map(card => (
              <CardView
                key={card.id}
                card={card}
                disabled={!isCurrentPlayer || player.lockedIn || player.selectedActions.length >= 2}
                onClick={() => onAction({ type: 'PLAY', playerId: player.id, cardId: card.id })}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Deployed</h3>
          <div className="grid grid-cols-2 gap-2">
            {player.deployed.map(card => (
              <CardView
                key={card.id}
                card={card}
                disabled={!isCurrentPlayer || player.lockedIn || player.selectedActions.length >= 2 || !selectedObjectiveId}
                onClick={() => onAction({ type: 'ACTIVATE', playerId: player.id, cardId: card.id, targetId: selectedObjectiveId })}
              />
            ))}
            {player.deployed.length === 0 && (
                <div className="col-span-2 border border-dashed border-slate-700 rounded-lg h-24 flex items-center justify-center text-slate-600 text-sm">
                    Empty
                </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Planned Actions</h3>
          <div className="space-y-2 mb-4">
            {player.selectedActions.map((action, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-700 rounded text-sm">
                <span className="font-mono text-slate-300">
                    {action.type} {action.cardId ? `[${action.cardId.split('-')[0]}]` : ''}
                </span>
                {!player.lockedIn && isCurrentPlayer && (
                    <button onClick={() => onRemoveAction(i)} className="text-slate-500 hover:text-red-500 transition-colors">
                        <X size={14} />
                    </button>
                )}
              </div>
            ))}
            {player.selectedActions.length === 0 && (
                <div className="p-4 border border-dashed border-slate-700 rounded-lg text-center text-slate-600 text-xs italic">
                    Select 1-2 actions
                </div>
            )}
          </div>

          {player.policy && (
              <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Active Policy</h3>
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="font-bold text-sm text-green-500">{player.policy.name}</div>
                      <p className="text-[10px] text-slate-400">{player.policy.description}</p>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerArea;
