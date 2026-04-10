import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const statusBar = document.getElementById('status-bar') as HTMLElement;
const tooltip = document.getElementById('tooltip') as HTMLElement;

const game = new Game(canvas, statusBar, tooltip);
game.start();
