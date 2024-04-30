import { Pong } from './pong/pong.js';
import { GameStates } from './pong/pong.js';

const pong = new Pong();

document.addEventListener('keydown', function(event) {
    if (event.key === " " && pong.gameGlobals.gameState === GameStates.MENU) {
        pong.startGame();
    }
});

export default pong;