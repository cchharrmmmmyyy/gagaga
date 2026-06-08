// Full DOM stub for Chinese Chess tests
import { Window } from 'happy-dom';

const window = new Window({
  url: 'http://localhost/',
  settings: {},
});
const document = window.document;

// Create all DOM elements that chinesechess.js references at top level
const elementIds = [
  'chessBoard',
  'menu-screen', 'game-screen', 'result-modal',
  'main-menu', 'lan-menu', 'lan-create', 'lan-join',
  'mode-label', 'turn-label', 'check-label', 'move-history',
  'result-title', 'result-text', 'room-code-display',
  'create-status', 'join-status', 'server-url-input', 'join-code-input',
  'undo-btn', 'resign-btn', 'menu-btn-game',
  'play-again-btn', 'modal-menu-btn',
  'lan-create-btn', 'lan-join-btn', 'join-confirm-btn',
  'lan-back-btn', 'create-cancel-btn', 'join-cancel-btn',
  'difficulty-row', 'status-block',
];

for (const id of elementIds) {
  const el = document.createElement('div');
  el.id = id;
  if (id === 'chessBoard') {
    const canvas = document.createElement('canvas');
    canvas.id = 'chessBoard';
    canvas.width = 540;
    canvas.height = 600;
    // Mock getContext to return a basic object with canvas methods
    const mockCtx = {
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      fillText: () => {},
      strokeText: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      save: () => {},
      restore: () => {},
      globalAlpha: 1,
      lineCap: '',
      canvas: canvas,
      getImageData: () => ({ data: new Uint8ClampedArray() }),
      putImageData: () => {},
    };
    canvas.getContext = () => mockCtx;
    document.body.appendChild(canvas);
  } else {
    document.body.appendChild(el);
  }
}

// Add data attributes for difficulty buttons
for (const depth of [2, 3, 4]) {
  const btn = document.createElement('button');
  btn.className = 'difficulty-btn';
  btn.dataset.depth = String(depth);
  if (depth === 3) btn.classList.add('active');
  document.body.appendChild(btn);
}

// Add data-mode buttons
const modes = ['ai', 'local', 'lan'];
for (const mode of modes) {
  const btn = document.createElement('button');
  btn.dataset.mode = mode;
  document.body.appendChild(btn);
}

// Set up screen elements with classes
const screenEls = ['menu-screen', 'game-screen'];
for (const id of screenEls) {
  const el = document.getElementById(id);
  if (el) el.classList.add('screen');
}
const menuEl = document.getElementById('menu-screen');
if (menuEl) {
  menuEl.classList.add('active');
  const mainMenuEl = document.getElementById('main-menu');
  if (mainMenuEl) {
    mainMenuEl.style.display = 'block';
  }
}

global.window = window;
global.document = document;
global.HTMLCanvasElement = window.HTMLCanvasElement || class HTMLCanvasElement {};
global.HTMLElement = window.HTMLElement || class HTMLElement {};
global.HTMLDivElement = window.HTMLDivElement || class HTMLDivElement {};
global.HTMLInputElement = window.HTMLInputElement || class HTMLInputElement {};
global.HTMLButtonElement = window.HTMLButtonElement || class HTMLButtonElement {};
global.Event = window.Event || class Event { constructor(type) { this.type = type; } };
global.CustomEvent = window.CustomEvent || class CustomEvent { constructor(type, opts) { this.type = type; Object.assign(this, opts); } };
global.Image = window.Image || class Image {};
global.location = window.location;
global.navigator = window.navigator;
