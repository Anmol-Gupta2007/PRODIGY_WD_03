const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const lineElement = document.getElementById("line");

// Score variables
let playerScore = 0;
let aiScore = 0;
let drawScore = 0;

let HUMAN;
let AI;
let board = ["", "", "", "", "", "", "", "", ""];
let gameOver = false;
let winningCells = [];

// Initialize Audio Context for Sound Effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

// Create Board
function createBoard() {
    boardElement.innerHTML = "";
    board.forEach((cell, index) => {
        const cellElement = document.createElement("div");
        cellElement.classList.add("cell");
        cellElement.textContent = cell;

        if (cell === "X") cellElement.classList.add("x");
        if (cell === "O") cellElement.classList.add("o");
        if (winningCells.includes(index)) cellElement.classList.add("winner");

        cellElement.addEventListener("click", () => playerMove(index));
        boardElement.appendChild(cellElement);
    });
}

// Draw the glowing winning line
function drawWinLine(pattern) {
    // Percentages align with the centers of a 3x3 grid perfectly, ensuring it's responsive on mobile
    const percentCoords = {
        0: { x: "16.6%", y: "16.6%" }, 1: { x: "50%", y: "16.6%" }, 2: { x: "83.4%", y: "16.6%" },
        3: { x: "16.6%", y: "50%" },   4: { x: "50%", y: "50%" },   5: { x: "83.4%", y: "50%" },
        6: { x: "16.6%", y: "83.4%" }, 7: { x: "50%", y: "83.4%" }, 8: { x: "83.4%", y: "83.4%" }
    };

    const startPos = percentCoords[pattern[0]];
    const endPos = percentCoords[pattern[2]];

    lineElement.setAttribute("x1", startPos.x);
    lineElement.setAttribute("y1", startPos.y);
    lineElement.setAttribute("x2", endPos.x);
    lineElement.setAttribute("y2", endPos.y);
}

// Player Move
function playerMove(index) {
    if (board[index] !== "" || gameOver) {
        if (!gameOver) playSound('error');
        return;
    }

    playSound('click');
    board[index] = HUMAN;
    updateBoard();

    if (checkWinner(board, HUMAN)) {
        endGame(HUMAN);
        return;
    }

    if (isBoardFull(board)) {
        endGame("DRAW");
        return;
    }

    statusElement.textContent = "🤖 AI Thinking...";
    setTimeout(aiMove, 400); // Slight delay so it feels like thinking
}

// AI Move (Updated with Difficulty Settings)
function aiMove() {
    if (gameOver) return;

    const difficulty = document.getElementById("difficulty").value;
    let move = -1;
    let useMinimax = false;

    // Determine if AI uses perfect logic based on difficulty
    if (difficulty === "hard") {
        useMinimax = true;
    } else if (difficulty === "medium") {
        useMinimax = Math.random() > 0.5; // 50% chance to play perfectly
    } // easy means useMinimax stays false

    if (useMinimax) {
        // Minimax Algorithm Logic
        let bestScore = -Infinity;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === "") {
                board[i] = AI;
                let score = minimax(board, 0, false);
                board[i] = "";
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
    } else {
        // Random Move Logic
        let availableCells = [];
        for (let i = 0; i < board.length; i++) {
            if (board[i] === "") availableCells.push(i);
        }
        let randomIndex = Math.floor(Math.random() * availableCells.length);
        move = availableCells[randomIndex];
    }

    board[move] = AI;
    playSound('click');
    updateBoard();

    if (checkWinner(board, AI)) {
        endGame(AI);
        return;
    }

    if (isBoardFull(board)) {
        endGame("DRAW");
        return;
    }

    statusElement.textContent = `Your Turn (${HUMAN})`;
}

// Minimax Algorithm
function minimax(currentBoard, depth, isMaximizing) {
    if (checkWinnerMini(currentBoard, AI)) return 10 - depth;
    if (checkWinnerMini(currentBoard, HUMAN)) return depth - 10;
    if (isBoardFull(currentBoard)) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < currentBoard.length; i++) {
            if (currentBoard[i] === "") {
                currentBoard[i] = AI;
                let score = minimax(currentBoard, depth + 1, false);
                currentBoard[i] = "";
                bestScore = Math.max(bestScore, score);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < currentBoard.length; i++) {
            if (currentBoard[i] === "") {
                currentBoard[i] = HUMAN;
                let score = minimax(currentBoard, depth + 1, true);
                currentBoard[i] = "";
                bestScore = Math.min(bestScore, score);
            }
        }
        return bestScore;
    }
}

// Check Winner (Stores winning cells)
function checkWinner(boardState, player) {
    const patterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (let pattern of patterns) {
        if (pattern.every(index => boardState[index] === player)) {
            winningCells = pattern;
            return true;
        }
    }
    return false;
}

// Used by Minimax only (doesn't overwrite winning cells)
function checkWinnerMini(boardState, player) {
    const patterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    return patterns.some(pattern => pattern.every(index => boardState[index] === player));
}

function isBoardFull(boardState) {
    return boardState.every(cell => cell !== "");
}

function updateBoard() {
    createBoard();
}

// End Game & Update Scores
function endGame(winner) {
    gameOver = true;
    
    if (winner === HUMAN) {
        statusElement.textContent = "🎉 Congratulations! You Win! 🎉";
        playerScore++;
        document.getElementById('score-player').textContent = `Player: ${playerScore}`;
        drawWinLine(winningCells);
        playSound('win');
    } else if (winner === AI) {
        statusElement.textContent = "🤖 AI Wins! Better luck next time.";
        aiScore++;
        document.getElementById('score-ai').textContent = `AI: ${aiScore}`;
        drawWinLine(winningCells);
        playSound('lose');
    } else {
        statusElement.textContent = "🤝 It's a Draw!";
        drawScore++;
        document.getElementById('score-draw').textContent = `Draws: ${drawScore}`;
        playSound('error'); // Soft buzz for a draw
    }

    // Wait 2.5 seconds before automatically restarting so user can see the line and message
    setTimeout(() => {
        restartGame();
    }, 2500);
}

// Restart Game
function restartGame() {
    board = ["", "", "", "", "", "", "", "", ""];
    winningCells = [];
    gameOver = false;
    
    // Reset Win Line
    lineElement.setAttribute("x1", "0");
    lineElement.setAttribute("y1", "0");
    lineElement.setAttribute("x2", "0");
    lineElement.setAttribute("y2", "0");

    // Randomly assign X or O
    if (Math.random() < 0.5) {
        HUMAN = "X";
        AI = "O";
    } else {
        HUMAN = "O";
        AI = "X";
    }

    statusElement.textContent = `You are ${HUMAN}`;
    createBoard();

    // If AI gets X, it starts first
    if (AI === "X") {
        statusElement.textContent = "AI Starts...";
        setTimeout(aiMove, 500);
    }
}

// Start Game
restartGame();
