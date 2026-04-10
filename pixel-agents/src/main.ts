import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const statusBar = document.getElementById('status-bar') as HTMLElement;
const tooltip = document.getElementById('tooltip') as HTMLElement;

// Query params: ?ws=ws://host:8787&theme=cyber&layout=open-plan&skins=pastel
const params = new URLSearchParams(window.location.search);
const wsUrl = params.get('ws') || undefined;
const theme = params.get('theme') || undefined;
const layout = params.get('layout') || undefined;
const skins = params.get('skins') || undefined;

const game = new Game(canvas, statusBar, tooltip, { wsUrl, theme, layout, skins });
game.start();
