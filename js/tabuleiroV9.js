function main() {
    window.gameActive = true;  //ture se o jogo estiver a correr

    const cols = parseInt(document.getElementById('board-size').value);
    const firstPlayer = document.getElementById('first-player').value;

    document.getElementById('configs').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';

    const ROWS = 4;
    const COLORS = {
        EMPTY: 'empty',
        BLUE: 'blue',
        RED: 'red'
    };

    let COLS = cols;
    let board = [];
    let consumidas = { blue: 0, red: 0 };
    let currentTurn = firstPlayer === 'player2' ? COLORS.BLUE : COLORS.RED;
    let selected = null;
    let highlightedCells = [];

    const boardEl = document.getElementById('board');
    const logEl = document.getElementById('log');
    const turnPopup = document.getElementById('turn-popup');
    const counterEl = document.getElementById('counter');

    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 72px)`;

    const idx = (row, col) => row * COLS + col;
    const getCell = (row, col) => board[idx(row, col)];
    const setCell = (row, col, value) => (board[idx(row, col)] = value);
    const enemyColor = color => (color === COLORS.RED ? COLORS.BLUE : COLORS.RED);

    window.currentDiceRoll = null; // global dice roll

    // --- Track first move ---
    let firstMoveDone = { [COLORS.RED]: false, [COLORS.BLUE]: false };

    // --- In-game message log (replaces console output) ---
    const messageLog = [];
    function escapeHTML(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function addMessage(msg) {
        const time = new Date();
        // keep most recent messages at top
        messageLog.unshift({ time: time, text: String(msg) });
        // keep only last 6 messages
        if (messageLog.length > 6) messageLog.length = 6;
        // refresh the counter/messages display
        contador();
    }

    // --- UI Helpers ---
    function popupRondas() {
        turnPopup.classList.remove('blue-turn', 'red-turn', 'show');
        if (currentTurn === COLORS.BLUE) {
            turnPopup.textContent = 'Ronda Azul';
            turnPopup.classList.add('blue-turn');
        } else {
            turnPopup.textContent = 'Ronda Laranja';
            turnPopup.classList.add('red-turn');
        }
        setTimeout(() => turnPopup.classList.add('show'), 10);
    }

    function contador() {
        counterEl.innerHTML = `
<div class="score-title">Peças Capturadas</div>
<div class="score-row score-blue">
    Azuis Capturadas
    <span class="score-number">${consumidas.blue}</span>
</div>
<div class="score-row score-red">
    Laranjas Capturadas
    <span class="score-number">${consumidas.red}</span>
</div>`;
        // append a compact message list below the scores (no timestamps)
        let msgHTML = '<div class="score-title" style="margin-top:10px;">Registo</div>';
        msgHTML += '<ul class="message-list" style="list-style:none;padding:0;margin:0;font-size:12px;">';
        if (messageLog.length === 0) {
            msgHTML += '<li style="padding:4px">(Sem mensagens)</li>';
        } else {
            messageLog.forEach(it => {
                msgHTML += `<li style="padding:6px 4px;border-bottom:1px dashed #ccc;">${escapeHTML(it.text)}</li>`;
            });
        }
        msgHTML += '</ul>';
        counterEl.innerHTML += msgHTML;
    }

    function updateCell(cell, piece) {
        cell.innerHTML = '';
        cell.classList.remove('selected', 'clickable', 'highlighted');

        if (piece.color === COLORS.EMPTY) return;

        const circ = document.createElement('div');
        circ.className = `circle ${piece.color} ${piece.state}`;
        cell.appendChild(circ);

        if (piece.color === currentTurn) cell.classList.add('clickable');
        if (selected && selected.row === +cell.dataset.row && selected.col === +cell.dataset.col)
            cell.classList.add('selected');
    }

    function updateBoardDisplay() {
        boardEl.querySelectorAll('.cell').forEach(cell => {
            const r = +cell.dataset.row;
            const c = +cell.dataset.col;
            updateCell(cell, getCell(r, c));
        });

        if (highlightedCells.length > 0) {
            highlightedCells.forEach(c => {
                const cell = boardEl.querySelector(`.cell[data-row="${c.row}"][data-col="${c.col}"]`);
                if (cell) cell.classList.add('highlighted');
            });
        }

        contador();
    }

    // Enable/disable the throw button depending on whose turn it is
    function updateThrowButtonState() {
        const throwBtn = document.getElementById('throwBtn');
        if (!throwBtn) return;
        const aiColor = firstPlayer === 'player1' ? COLORS.BLUE : COLORS.RED;
        const humanColor = aiColor === COLORS.BLUE ? COLORS.RED : COLORS.BLUE;
        const isHumanTurn = (currentTurn === humanColor);
        throwBtn.disabled = !isHumanTurn;
        throwBtn.classList.toggle('disabled', throwBtn.disabled);
        // If it's the human's turn, reset dice UI/state so the button actually works
        if (isHumanTurn && typeof window.resetDiceForNewTurn === 'function') {
            window.resetDiceForNewTurn();
        }
    }

    function construirTabuleiro() {
        boardEl.innerHTML = '';
        board = Array(ROWS * COLS).fill(null).map(() => ({ color: COLORS.EMPTY, state: null }));

        const playerIsBlue = firstPlayer === 'player2';
        const topColor = playerIsBlue ? COLORS.RED : COLORS.BLUE;
        const bottomColor = playerIsBlue ? COLORS.BLUE : COLORS.RED;

        for (let c = 0; c < COLS; c++) {
            setCell(0, c, { color: topColor, state: 'unmoved' });
            setCell(ROWS - 1, c, { color: bottomColor, state: 'unmoved' });
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                boardEl.appendChild(cell);
            }
        }
        updateBoardDisplay();
        popupRondas();
        updateLog();
        updateThrowButtonState();
    }

    function checkWin() {
        const totalPerSide = COLS;
        const bluePiecesLeft = totalPerSide - consumidas.blue;
        const redPiecesLeft = totalPerSide - consumidas.red;
        if (bluePiecesLeft === 0) handleWin(COLORS.RED);
        else if (redPiecesLeft === 0) handleWin(COLORS.BLUE);
    }

    function handleWin(winnerColor) {
        const stats = JSON.parse(localStorage.getItem('gameStats')) || {
            red: { wins: 0, losses: 0 },
            blue: { wins: 0, losses: 0 }
        };
        if (winnerColor === COLORS.RED) { stats.red.wins++; stats.blue.losses++; }
        else { stats.blue.wins++; stats.red.losses++; }
        localStorage.setItem('gameStats', JSON.stringify(stats));

        const winnerText = winnerColor === COLORS.BLUE ? "Azul Venceu!" : "Laranja Venceu!";
        const modal = document.createElement('div');
        modal.className = 'vitoria';
        modal.innerHTML = `
<div class="vitoria-content">
    <h2>${winnerText}</h2>
    <button id="closeWinPopup">Voltar ao Menu</button>
</div>`;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        document.getElementById('closeWinPopup').onclick = () => {
            modal.remove();
            document.getElementById('game-area').style.display = 'none';
            document.getElementById('menu-view').style.display = 'block';

        };

        //para as classificações
        if (winnerColor==firstPlayer) ganhar(); 
        else perder();
    }

    function shakeCell(row, col) {
        const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        cell.classList.add('illegal-move');
        setTimeout(() => cell.classList.remove('illegal-move'), 500);
    }

    // --- Movement ---
function getSerpentineDest(row, col, steps, pieceColor) {
    // reproduce same mapping from construirTabuleiro for start row
    const playerIsBlue = firstPlayer === 'player2';
    const topColor = playerIsBlue ? COLORS.RED : COLORS.BLUE;
    const bottomColor = playerIsBlue ? COLORS.BLUE : COLORS.RED;
    const startRow = (pieceColor === topColor) ? 0 : (ROWS - 1);

    // helper: direction on a given row relative to startRow:
    // if distance from startRow is even => move right (+1), else left (-1)
    const dirForRow = r => ((Math.abs(r - startRow) % 2) === 0) ? 1 : -1;

    // helper: next row when "moving away" from startRow (i.e. going up in user's description)
    const nextRowAway = r => (startRow === 0 ? r + 1 : r - 1);
    // helper: other direction (when bouncing back from topmost)
    const nextRowBack = r => (startRow === 0 ? r - 1 : r + 1);

    let r = row, c = col;

    for (let s = 0; s < steps; s++) {
        const dir = dirForRow(r); // +1 right, -1 left
        if (dir === 1) {
            // moving right
            if (c < COLS - 1) {
                c += 1;
            } else {
                // at right end: attempt to go "away" from startRow
                const nr = nextRowAway(r);
                if (nr >= 0 && nr < ROWS) {
                    r = nr;
                    // when moving to the next row, direction flips automatically via dirForRow
                    // but we don't move horizontally this step beyond changing row
                } else {
                    // no row away (we were at top); go back instead (bounce)
                    const nr2 = nextRowBack(r);
                    if (nr2 >= 0 && nr2 < ROWS) {
                        r = nr2;
                    } else {
                        // extremely defensive: stay put if nowhere to go
                    }
                }
            }
        } else {
            // moving left (dir === -1)
            if (c > 0) {
                c -= 1;
            } else {
                // at left end: attempt to go "away" from startRow
                const nr = nextRowAway(r);
                if (nr >= 0 && nr < ROWS) {
                    r = nr;
                } else {
                    // bounce back
                    const nr2 = nextRowBack(r);
                    if (nr2 >= 0 && nr2 < ROWS) {
                        r = nr2;
                    } else {
                        // defensively stay put
                    }
                }
            }
        }
    }

    // clamp just in case
    r = Math.max(0, Math.min(ROWS - 1, r));
    c = Math.max(0, Math.min(COLS - 1, c));
    return { row: r, col: c };
}

 function getReachableCells(row, col, steps) {
    const piece = getCell(row, col);
    if (!piece || piece.color === COLORS.EMPTY) return [];
    const dest = getSerpentineDest(row, col, steps, piece.color);
    // legal if destination is not occupied by same-color piece
    const target = getCell(dest.row, dest.col);
    if (!target) return [];
    if (target.color !== piece.color) return [dest];
    return [];
}

    function highlightReachable(cells) {
        highlightedCells = cells;
        boardEl.querySelectorAll('.cell').forEach(cell => cell.classList.remove('highlighted'));
        cells.forEach(c => {
            const cell = boardEl.querySelector(`.cell[data-row="${c.row}"][data-col="${c.col}"]`);
            if (cell) cell.classList.add('highlighted');
        });
    }

/* --- AI Logic for Tâb 7 --- */
function aiMove(board, COLORS, currentTurn, diceRoll) {
const steps = diceRoll || 1;
const COLS = board.length / ROWS;

const getCellLocal = (r, c) => board[r * COLS + c];
const enemy = currentTurn === COLORS.RED ? COLORS.BLUE : COLORS.RED;

const captureMoves = [];
const startRowMoves = [];
const goalRowMoves = [];
const normalMoves = [];

const aiTopColor = firstPlayer === 'player2' ? COLORS.RED : COLORS.BLUE;
const aiStartRow = currentTurn === aiTopColor ? 0 : ROWS - 1;
const aiGoalRow  = currentTurn === aiTopColor ? ROWS - 1 : 0;

const startRowHasPieces = board
    .slice(aiStartRow * COLS, (aiStartRow + 1) * COLS)
    .some(p => p.color === currentTurn);

function getReachable(row, col, steps) {
    const piece = getCellLocal(row, col);
    if (!piece || piece.color === COLORS.EMPTY) return [];
    // piece.color is currentTurn here
    // reuse same logic as getSerpentineDest but adapted to aiMove's local helpers
    const playerIsBlue = firstPlayer === 'player2';
    const topColor = playerIsBlue ? COLORS.RED : COLORS.BLUE;
    const bottomColor = playerIsBlue ? COLORS.BLUE : COLORS.RED;
    const startRow = (piece.color === topColor) ? 0 : (ROWS - 1);

    const dirForRow = r => ((Math.abs(r - startRow) % 2) === 0) ? 1 : -1;
    const nextRowAway = r => (startRow === 0 ? r + 1 : r - 1);
    const nextRowBack = r => (startRow === 0 ? r - 1 : r + 1);

    let r = row, c = col;

    for (let s = 0; s < steps; s++) {
        const dir = dirForRow(r);
        if (dir === 1) {
            if (c < COLS - 1) c += 1;
            else {
                const nr = nextRowAway(r);
                if (nr >= 0 && nr < ROWS) r = nr;
                else {
                    const nr2 = nextRowBack(r);
                    if (nr2 >= 0 && nr2 < ROWS) r = nr2;
                }
            }
        } else {
            if (c > 0) c -= 1;
            else {
                const nr = nextRowAway(r);
                if (nr >= 0 && nr < ROWS) r = nr;
                else {
                    const nr2 = nextRowBack(r);
                    if (nr2 >= 0 && nr2 < ROWS) r = nr2;
                }
            }
        }
    }

    // check target occupancy
    const target = getCellLocal(r, c);
    if (!target) return [];
    if (target.color !== piece.color) return [{ row: r, col: c }];
    return [];
}

for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
        const piece = getCellLocal(r, c);
        if (piece.color !== currentTurn) continue;

        const reachable = getReachable(r, c, steps);

        reachable.forEach(dest => {
            if (startRowHasPieces && dest.row === aiGoalRow) return;

            const target = getCellLocal(dest.row, dest.col);

            if (target.color === enemy) captureMoves.push({ from: { row: r, col: c }, to: dest });
            else if (r === aiStartRow && dest.row !== aiStartRow) startRowMoves.push({ from: { row: r, col: c }, to: dest });
            else if (dest.row === aiGoalRow) goalRowMoves.push({ from: { row: r, col: c }, to: dest });
            else if (target.color === COLORS.EMPTY) normalMoves.push({ from: { row: r, col: c }, to: dest });
        });
    }
}

if (captureMoves.length > 0) return captureMoves[Math.floor(Math.random() * captureMoves.length)];
if (startRowHasPieces && startRowMoves.length > 0) return startRowMoves[Math.floor(Math.random() * startRowMoves.length)];
if (!startRowHasPieces && goalRowMoves.length > 0) return goalRowMoves[Math.floor(Math.random() * goalRowMoves.length)];
if (normalMoves.length > 0) return normalMoves[Math.floor(Math.random() * normalMoves.length)];

return null;

}

/* --- Hard Mode Dice Chooser --- */
function chooseBestDiceAndMove(currentTurn) {
// First-move must use dice = 1
if (!firstMoveDone[currentTurn]) {
return { dice: 1, move: aiMove(board, COLORS, currentTurn, 1) };
}

let best = { dice: 1, move: null, score: -Infinity };
for (let d = 1; d <= 6; d++) {
    const candidateMove = aiMove(board, COLORS, currentTurn, d);
    if (!candidateMove) continue;

    // Scoring: capture highest, promotion next, normal movement minor
    const from = candidateMove.from;
    const to = candidateMove.to;

    const aiTopColor = firstPlayer === 'player2' ? COLORS.RED : COLORS.BLUE;
    const aiStartRow = currentTurn === aiTopColor ? 0 : ROWS - 1;
    const aiGoalRow  = currentTurn === aiTopColor ? ROWS - 1 : 0;

    const startRowHasPieces = board
        .slice(aiStartRow * (board.length / ROWS), (aiStartRow + 1) * (board.length / ROWS))
        .some(p => p.color === currentTurn);

    const target = board[to.row * (board.length / ROWS) + to.col];
    const isCapture = target.color !== COLORS.EMPTY && target.color !== currentTurn;
    const leavesStartRow = from.row === aiStartRow && to.row !== aiStartRow;
    const entersGoalRow = to.row === aiGoalRow && !startRowHasPieces;

    let score = 0;
    if (isCapture) score += 100;
    if (entersGoalRow) score += 20;
    if (leavesStartRow) score += 15;
    // small heuristic: closer to goal is slightly better
    const distBefore = Math.abs(from.row - aiGoalRow);
    const distAfter = Math.abs(to.row - aiGoalRow);
    if (distAfter < distBefore) score += 5;

    if (score > best.score) {
        best = { dice: d, move: candidateMove, score };
    }
}

return { dice: best.dice, move: best.move };

}

    // --- Execute AI Turn ---
function executeAITurn() {
    if (!window.gameActive) return; 
const aiColor = firstPlayer === 'player1' ? COLORS.BLUE : COLORS.RED;
if (currentTurn !== aiColor) return;

// Read difficulty fresh from UI
const aiDifficulty = document.getElementById('level-ai').value;

let diceRoll;
let moveData;

if (aiDifficulty === 'hard') {
    const chosen = chooseBestDiceAndMove(currentTurn);
    diceRoll = chosen.dice || 1;
    moveData = chosen.move;
    addMessage(`AI lançou ${diceRoll}`);
} else {
    diceRoll = Math.floor(Math.random() * 6) + 1;
    addMessage(`AI lançou ${diceRoll}`);

    // First-move restriction: must move with dice=1
    if (!firstMoveDone[currentTurn] && diceRoll !== 1) {
        addMessage("Só é permitido mover no primeiro turno com 1! Ronda passada...");

        currentTurn = enemyColor(currentTurn);
        updateBoardDisplay();
        popupRondas();
        updateLog();
        updateThrowButtonState();
        return;
    }

    moveData = aiMove(board, COLORS, currentTurn, diceRoll);
}

// No legal move
if (!moveData) {
    addMessage("O AI não tem movimentos legais. Ronda passada...");
    currentTurn = enemyColor(currentTurn);
    updateBoardDisplay();
    popupRondas();
    updateLog();
    updateThrowButtonState();
    return;
}

// Execute the selected move
const { from, to } = moveData;
const movingPiece = { ...getCell(from.row, from.col) };
const destinationPiece = getCell(to.row, to.col);

// AI promotion logic
const aiTopColor = firstPlayer === 'player2' ? COLORS.RED : COLORS.BLUE;
const aiStartRow = movingPiece.color === aiTopColor ? 0 : ROWS - 1;
const aiGoalRow  = movingPiece.color === aiTopColor ? ROWS - 1 : 0;

const startRowHasPieces = board.slice(aiStartRow * COLS, (aiStartRow + 1) * COLS)
    .some(p => p.color === movingPiece.color);

if (to.row === aiGoalRow && !startRowHasPieces) movingPiece.state = 'promovido';
else if (movingPiece.state === 'unmoved') movingPiece.state = 'moved';

if (destinationPiece.color !== COLORS.EMPTY && destinationPiece.color !== currentTurn)
    consumidas[destinationPiece.color]++;

setCell(to.row, to.col, movingPiece);
setCell(from.row, from.col, { color: COLORS.EMPTY, state: null });

firstMoveDone[currentTurn] = true;
currentTurn = enemyColor(currentTurn);
updateBoardDisplay();
popupRondas();
updateLog();
    updateThrowButtonState();
checkWin();

}

    // --- Handle Clicks ---
    boardEl.onclick = e => {
        if (!window.gameActive) return;
        const cell = e.target.closest('.cell');
        if (!cell) return;

        const row = +cell.dataset.row;
        const col = +cell.dataset.col;
        const targetPiece = getCell(row, col);

        if (window.currentDiceRoll === null) {
            alert("É necessário lançar os dados de paus primeiro!");
            return;
        }

        // --- First-move restriction ---
        if (!firstMoveDone[currentTurn] && window.currentDiceRoll !== 1) {
            alert("Só é permitido mover no primeiro turno com 1!");

            currentTurn = enemyColor(currentTurn);
            updateBoardDisplay();
            popupRondas();
            updateLog();
            setTimeout(executeAITurn, 500);
            window.currentDiceRoll = null;
            return;
        }

        if (targetPiece.color === currentTurn) {
            selected = { row, col };
            const reachable = getReachableCells(row, col, window.currentDiceRoll);
            highlightReachable(reachable);
            updateBoardDisplay();
            return;
        }

        if (!selected) return;

        const movingPiece = { ...getCell(selected.row, selected.col) };
        const reachable = getReachableCells(selected.row, selected.col, window.currentDiceRoll);
        const isLegal = reachable.some(c => c.row === row && c.col === col);

        if (!isLegal) {
            shakeCell(selected.row, selected.col);
            selected = null;
            highlightedCells = [];
            updateBoardDisplay();
            return;
        }

        const destinationPiece = getCell(row, col);

        if (destinationPiece.color === currentTurn) {
            shakeCell(selected.row, selected.col);
            selected = null;
            highlightedCells = [];
            updateBoardDisplay();
            return;
        }

        // Handle promotions
        const playerIsBlue = firstPlayer === 'player2';
        const topColor = playerIsBlue ? COLORS.RED : COLORS.BLUE;
        const goalRow = movingPiece.color === topColor ? ROWS - 1 : 0;
        const startRow = movingPiece.color === topColor ? 0 : ROWS - 1;

        if (row === goalRow) {
            const startRowHasPieces = board.slice(startRow * COLS, (startRow + 1) * COLS)
                .some(p => p.color === movingPiece.color);
            if (startRowHasPieces) {
                shakeCell(selected.row, selected.col);
                selected = null;
                highlightedCells = [];
                updateBoardDisplay();
                return;
            }
            movingPiece.state = 'promovido';
        } else if (movingPiece.state === 'unmoved') movingPiece.state = 'moved';

        // Handle capture
        if (destinationPiece.color !== COLORS.EMPTY && destinationPiece.color !== currentTurn)
            consumidas[destinationPiece.color]++;

        setCell(row, col, movingPiece);
        setCell(selected.row, selected.col, { color: COLORS.EMPTY, state: null });

        selected = null;
        highlightedCells = [];
        firstMoveDone[currentTurn] = true;
        currentTurn = enemyColor(currentTurn);
        updateBoardDisplay();
        popupRondas();
        updateLog();
        updateThrowButtonState();
        checkWin();

        // AI turn
        setTimeout(executeAITurn, 500);

        window.currentDiceRoll = null;
    };

    // --- Reset Dice Button (skip turn) ---
    const resetDiceBtn = document.getElementById('resetBtn');
    resetDiceBtn.onclick = () => {
        window.currentDiceRoll = null;
        selected = null;
        highlightedCells = [];
        currentTurn = enemyColor(currentTurn);
        updateBoardDisplay();
        popupRondas();
        updateLog();
        updateThrowButtonState();

        // If AI's turn, execute immediately
        setTimeout(executeAITurn, 500);
    };

    function updateLog() {
        let out = '';
        for (let r = 0; r < ROWS; r++) {
            const rowArr = [];
            for (let c = 0; c < COLS; c++) {
                const p = getCell(r, c);
                rowArr.push(`${p.color[0].toUpperCase()}(${p.state ? p.state[0] : '-'})`);
            }
            out += rowArr.join(' ') + '\n';
        }
        logEl.textContent = out.trim();
    }

    construirTabuleiro();
}

//butão de desistir
function desistir() {

    if(window.confirm('De certeza que quer desistir? ( Conta como um jogo perdido :( )')){

        window.gameActive = false;

        perder();

        // Parar Ai
        if (window.aiTimeout) {
            clearTimeout(window.aiTimeout);
            window.aiTimeout = null;
        }

        // Esconder jogo
        document.getElementById('game-area').style.display = 'none';

        // Voltar ao menu
        navigateTo("menu-view");
    }
}

window.addEventListener("load", () => {
    document.getElementById("desistir").addEventListener("click", desistir);
});