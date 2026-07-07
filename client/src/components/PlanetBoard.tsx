import React from 'react';
import type { Card } from '../../../shared/types.js';

interface PlanetBoardProps {
  objectives: Card[];
  events: Card[];
  onSelectObjective: (cardId: string) => void;
  selectedObjectiveId?: string;
}

const PlanetBoard: React.FC<PlanetBoardProps> = ({ objectives, events, onSelectObjective, selectedObjectiveId }) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl">
      <h2 className="text-2xl font-bold mb-4 text-center text-slate-300 uppercase tracking-widest">Planet Status</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-slate-400">Objectives</h3>
          <div className="space-y-3">
            {objectives.map((obj) => (
              <div
                key={obj.id}
                onClick={() => onSelectObjective(obj.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedObjectiveId === obj.id
                    ? 'bg-slate-700 border-blue-500 ring-2 ring-blue-500 shadow-lg'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-100">{obj.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold bg-opacity-20 ${
                    obj.tone === 'Hostile' ? 'bg-red-500 text-red-500' :
                    obj.tone === 'Diplomatic' ? 'bg-blue-500 text-blue-500' :
                    obj.tone === 'Scientific' ? 'bg-green-500 text-green-500' :
                    'bg-yellow-500 text-yellow-500'
                  }`}>
                    {obj.tone}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-3">{obj.description}</p>
                {obj.resolutionTracks && (
                  <div className="space-y-2">
                    {obj.resolutionTracks.map((track, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 italic">{track.resultName}</span>
                          <span className="font-mono">{track.current} / {track.target}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              track.tone === 'Hostile' ? 'bg-red-500' :
                              track.tone === 'Diplomatic' ? 'bg-blue-500' :
                              track.tone === 'Scientific' ? 'bg-green-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${(track.current / track.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-slate-400">Events</h3>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No active events.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-100">{event.name}</span>
                    <span className="text-xs text-slate-500 uppercase">{event.nature}</span>
                  </div>
                  <p className="text-sm text-slate-400">{event.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanetBoard;
