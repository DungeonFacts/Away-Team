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

let game: Game | null = null;

io.on('connection', (socket) => {
  socket.on('joinGame', (playerNames: string[]) => {
    if (!game) {
      game = new Game(playerNames);
    }
    io.emit('gameStateUpdate', game.getState());
  });

  socket.on('playerAction', (action: Action) => {
    if (game) {
      game.handleAction(action);
      io.emit('gameStateUpdate', game.getState());
    }
  });

  socket.on('removeAction', ({ playerId, index }: { playerId: string; index: number }) => {
    if (game) {
      game.removeAction(playerId, index);
      io.emit('gameStateUpdate', game.getState());
    }
  });

  socket.on('lockIn', (playerId: string) => {
    if (game) {
      game.lockIn(playerId);
      io.emit('gameStateUpdate', game.getState());
    }
  });

  socket.on('resetGame', (playerNames: string[]) => {
    game = new Game(playerNames);
    io.emit('gameStateUpdate', game.getState());
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
