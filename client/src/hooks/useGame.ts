import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Action } from '../../../shared/types.js';

const SOCKET_URL = 'http://localhost:3001';

export const useGame = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinGame = useCallback((playerNames: string[]) => {
    socket?.emit('joinGame', playerNames);
  }, [socket]);

  const performAction = useCallback((action: Action) => {
    socket?.emit('playerAction', action);
  }, [socket]);

  const removeAction = useCallback((playerId: string, index: number) => {
    socket?.emit('removeAction', { playerId, index });
  }, [socket]);

  const lockIn = useCallback((playerId: string) => {
    socket?.emit('lockIn', playerId);
  }, [socket]);

  const resetGame = useCallback((playerNames: string[]) => {
    socket?.emit('resetGame', playerNames);
  }, [socket]);

  return {
    gameState,
    joinGame,
    performAction,
    removeAction,
    lockIn,
    resetGame,
    connected: !!socket?.connected,
  };
};
