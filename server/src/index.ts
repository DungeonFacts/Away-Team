import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Game } from './logic/Game.js';
import type { Action } from '../../shared/types.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface SessionInfo {
  sessionId: string;
  playerId: string;
  displayName: string;
}

interface GameSession {
  gameId: string;
  game: Game | null;
  sessions: Map<string, SessionInfo>; // sessionId -> SessionInfo
}

const games = new Map<string, GameSession>();
const socketSessions = new Map<string, { gameId: string; sessionId: string }>(); // socket.id -> { gameId, sessionId }

const broadcastGameState = async (gameId: string) => {
  const gameSession = games.get(gameId);
  if (!gameSession) return;

  const roomSockets = await io.in(gameId).fetchSockets();

  for (const roomSocket of roomSockets) {
    const conn = socketSessions.get(roomSocket.id);
    if (conn && conn.gameId === gameId) {
      const sessionInfo = gameSession.sessions.get(conn.sessionId);
      if (sessionInfo) {
        if (gameSession.game) {
          const filteredState = gameSession.game.getStateForPlayer(sessionInfo.playerId);
          roomSocket.emit('gameStateUpdate', filteredState);
        } else {
          // Pre-game state
          roomSocket.emit('gameStateUpdate', null);
        }
      } else {
        // Spectator / fallback
        if (gameSession.game) {
          const filteredState = gameSession.game.getStateForPlayer(null);
          roomSocket.emit('gameStateUpdate', filteredState);
        } else {
          roomSocket.emit('gameStateUpdate', null);
        }
      }
    } else {
      // Fallback for sockets in the room that we can't find in socketSessions
      if (gameSession.game) {
        const filteredState = gameSession.game.getStateForPlayer(null);
        roomSocket.emit('gameStateUpdate', filteredState);
      } else {
        roomSocket.emit('gameStateUpdate', null);
      }
    }
  }
};

io.on('connection', (socket) => {
  socket.on('createGame', () => {
    const gameId = Math.random().toString(36).substring(2, 7).toUpperCase();
    games.set(gameId, {
      gameId,
      game: null,
      sessions: new Map(),
    });
    socket.emit('gameCreated', { gameId });
  });

  socket.on('joinGame', ({ gameId: rawGameId, displayName, sessionId: inputSessionId }: { gameId: string; displayName?: string; sessionId?: string }) => {
    if (!rawGameId) {
      socket.emit('joinError', { message: 'Invalid Game ID' });
      return;
    }
    const gameId = rawGameId.toUpperCase();
    const gameSession = games.get(gameId);

    if (!gameSession) {
      socket.emit('joinError', { message: 'Game not found' });
      return;
    }

    let sessionInfo: SessionInfo | undefined;
    let sessionId = inputSessionId;

    if (sessionId) {
      sessionInfo = gameSession.sessions.get(sessionId);
    }

    if (sessionInfo) {
      // Reconnection / Re-binding
      socketSessions.set(socket.id, { gameId, sessionId: sessionInfo.sessionId });
      socket.join(gameId);
      socket.emit('joinedGame', {
        gameId,
        playerId: sessionInfo.playerId,
        sessionId: sessionInfo.sessionId,
      });
      broadcastGameState(gameId);
      return;
    }

    // New connection joining
    if (gameSession.sessions.size >= 2) {
      socket.emit('joinError', { message: 'Game is full' });
      return;
    }

    const playerId = gameSession.sessions.size === 0 ? 'player-0' : 'player-1';
    const newSessionId = Math.random().toString(36).substring(2, 15);
    const resolvedDisplayName: string = displayName || (playerId === 'player-0' ? 'Security Officer' : 'Xenoethnologist');
    const newSession: SessionInfo = {
      sessionId: newSessionId,
      playerId,
      displayName: resolvedDisplayName,
    };

    gameSession.sessions.set(newSessionId, newSession);
    socketSessions.set(socket.id, { gameId, sessionId: newSessionId });
    socket.join(gameId);

    socket.emit('joinedGame', {
      gameId,
      playerId,
      sessionId: newSessionId,
    });

    // Check if we have both players to start the game
    if (gameSession.sessions.size === 2 && !gameSession.game) {
      const p0 = Array.from(gameSession.sessions.values()).find(s => s.playerId === 'player-0')!;
      const p1 = Array.from(gameSession.sessions.values()).find(s => s.playerId === 'player-1')!;
      gameSession.game = new Game([p0.displayName, p1.displayName]);
    }

    broadcastGameState(gameId);
  });

  socket.on('playerAction', (action: Action) => {
    const conn = socketSessions.get(socket.id);
    if (!conn) return;

    const gameSession = games.get(conn.gameId);
    if (!gameSession || !gameSession.game) return;

    const sessionInfo = gameSession.sessions.get(conn.sessionId);
    if (!sessionInfo || sessionInfo.playerId !== action.playerId) {
      return;
    }

    gameSession.game.handleAction(action);
    broadcastGameState(conn.gameId);
  });

  socket.on('removeAction', ({ playerId, index }: { playerId: string; index: number }) => {
    const conn = socketSessions.get(socket.id);
    if (!conn) return;

    const gameSession = games.get(conn.gameId);
    if (!gameSession || !gameSession.game) return;

    const sessionInfo = gameSession.sessions.get(conn.sessionId);
    if (!sessionInfo || sessionInfo.playerId !== playerId) {
      return;
    }

    gameSession.game.removeAction(playerId, index);
    broadcastGameState(conn.gameId);
  });

  socket.on('lockIn', (playerId: string) => {
    const conn = socketSessions.get(socket.id);
    if (!conn) return;

    const gameSession = games.get(conn.gameId);
    if (!gameSession || !gameSession.game) return;

    const sessionInfo = gameSession.sessions.get(conn.sessionId);
    if (!sessionInfo || sessionInfo.playerId !== playerId) {
      return;
    }

    gameSession.game.lockIn(playerId);
    broadcastGameState(conn.gameId);
  });

  socket.on('resetGame', () => {
    const conn = socketSessions.get(socket.id);
    if (!conn) return;

    const gameSession = games.get(conn.gameId);
    if (!gameSession) return;

    const p0 = Array.from(gameSession.sessions.values()).find(s => s.playerId === 'player-0')?.displayName || 'Security Officer';
    const p1 = Array.from(gameSession.sessions.values()).find(s => s.playerId === 'player-1')?.displayName || 'Xenoethnologist';

    gameSession.game = new Game([p0, p1]);
    broadcastGameState(conn.gameId);
  });

  socket.on('disconnect', () => {
    socketSessions.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
