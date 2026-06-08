// Full DOM stub for Chinese Chess tests
import { Window } from 'happy-dom';

const window = new Window({
  url: 'http://localhost/',
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
  'red-timer', 'black-timer',
  'lan-create-btn', 'lan-join-btn', 'join-confirm-btn',
  'lan-back-btn', 'create-cancel-btn', 'join-cancel-btn',
  'difficulty-row', 'status-block',
];

for (const id of elementIds) {
  if (id === 'chessBoard') {
    const canvas = document.createElement('canvas');
    canvas.id = 'chessBoard';
    canvas.width = 540;
    canvas.height = 600;
    // Mock getContext
    const mockCtx = {
      clearRect() {},
      fillRect() {},
      strokeRect() {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
      arc() {},
      fillText() {},
      strokeText() {},
      createRadialGradient() { return { addColorStop() {} }; },
      createLinearGradient() { return { addColorStop() {} }; },
      save() {},
      restore() {},
      globalAlpha: 1,
      lineCap: 'round',
      canvas: canvas,
      getImageData() { return { data: new Uint8ClampedArray() }; },
      putImageData() {},
    };
    canvas.getContext = function () { return mockCtx; };
    document.body.appendChild(canvas);
  } else {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
}

// Add data-mode buttons
for (const mode of ['ai', 'local', 'lan']) {
  const btn = document.createElement('button');
  btn.dataset.mode = mode;
  document.body.appendChild(btn);
}

// Add difficulty buttons
for (const depth of [2, 3, 4]) {
  const btn = document.createElement('button');
  btn.className = 'difficulty-btn';
  btn.dataset.depth = String(depth);
  if (depth === 3) btn.classList.add('active');
  document.body.appendChild(btn);
}

// Set up screen classes
const menuScreen = document.getElementById('menu-screen');
if (menuScreen) {
  menuScreen.classList.add('screen', 'active');
}
const gameScreen = document.getElementById('game-screen');
if (gameScreen) {
  gameScreen.classList.add('screen');
}
const mainMenu = document.getElementById('main-menu');
if (mainMenu) {
  mainMenu.style.display = 'block';
}

global.window = window;
global.document = document;
global.HTMLElement = window.HTMLElement;
global.HTMLDivElement = window.HTMLDivElement;
global.HTMLCanvasElement = window.HTMLCanvasElement;
global.HTMLInputElement = window.HTMLInputElement;
global.HTMLButtonElement = window.HTMLButtonElement;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
global.Image = window.Image;
global.location = window.location;
global.navigator = window.navigator;
global.Node = window.Node;

