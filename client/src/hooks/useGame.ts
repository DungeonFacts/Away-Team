import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Action } from '../../../shared/types.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useGame = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('gameStateUpdate', (state: GameState | null) => {
      setGameState(state);
    });

    newSocket.on('gameCreated', ({ gameId }: { gameId: string }) => {
      setGameId(gameId);
      setJoinError(null);
    });

    newSocket.on('joinedGame', ({ gameId: jGameId, playerId: jPlayerId, sessionId: jSessionId }: { gameId: string; playerId: string; sessionId: string }) => {
      setGameId(jGameId);
      setPlayerId(jPlayerId);
      setSessionId(jSessionId);
      setJoinError(null);
      localStorage.setItem('away_team_session', JSON.stringify({ gameId: jGameId, playerId: jPlayerId, sessionId: jSessionId }));
    });

    newSocket.on('joinError', ({ message }: { message: string }) => {
      setJoinError(message);
    });

    // Try auto-rejoining on connect
    newSocket.on('connect', () => {
      const saved = localStorage.getItem('away_team_session');
      if (saved) {
        try {
          const { gameId: sGameId, sessionId: sSessionId } = JSON.parse(saved);
          if (sGameId && sSessionId) {
            newSocket.emit('joinGame', { gameId: sGameId, sessionId: sSessionId });
          }
        } catch (e) {
          localStorage.removeItem('away_team_session');
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createGame = useCallback(() => {
    socket?.emit('createGame');
  }, [socket]);

  const joinGame = useCallback((targetGameId: string, displayName: string) => {
    setJoinError(null);
    socket?.emit('joinGame', { gameId: targetGameId, displayName });
  }, [socket]);

  const performAction = useCallback((action: Action) => {
    socket?.emit('playerAction', action);
  }, [socket]);

  const removeAction = useCallback((actPlayerId: string, index: number) => {
    socket?.emit('removeAction', { playerId: actPlayerId, index });
  }, [socket]);

  const lockIn = useCallback((actPlayerId: string) => {
    socket?.emit('lockIn', actPlayerId);
  }, [socket]);

  const resetGame = useCallback(() => {
    socket?.emit('resetGame');
  }, [socket]);

  const leaveGame = useCallback(() => {
    localStorage.removeItem('away_team_session');
    setGameId(null);
    setPlayerId(null);
    setSessionId(null);
    setGameState(null);
    setJoinError(null);
  }, []);

  return {
    gameState,
    gameId,
    playerId,
    sessionId,
    joinError,
    createGame,
    joinGame,
    performAction,
    removeAction,
    lockIn,
    resetGame,
    leaveGame,
    connected: !!socket?.connected,
  };
};
