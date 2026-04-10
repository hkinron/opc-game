import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const statusBar = document.getElementById('status-bar') as HTMLElement;
const tooltip = document.getElementById('tooltip') as HTMLElement;

// Check for WebSocket URL in query params: ?ws=ws://localhost:8787
const params = new URLSearchParams(window.location.search);
const wsUrl = params.get('ws') || undefined;

const game = new Game(canvas, statusBar, tooltip, wsUrl);
game.start();
