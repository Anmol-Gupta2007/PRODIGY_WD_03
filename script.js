const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const lineElement = document.getElementById("line");

// State variables
let gameMode = "pva"; // 'pva' (Player vs AI) or 'pvp' (Player vs Player)
let currentPlayer = "X"; // Used strictly for PvP mode
let player1Score = 0;
let player2Score = 0; // Acts as AI score in PvA mode
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

// Handle Mode Switching
function changeMode() {
    gameMode = document.getElementById("mode").value;
    const diffContainer = document.getElementById("diff-container");
    
    if (gameMode === "pvp") {
        diffContainer.style.display = "none";
        document.getElementById('score-player').textContent = `Player 1: 0`;
        document.getElementById('score-ai').textContent = `Player 2: 0`;
    } else {
        diffContainer.style.display = "inline";
        document.getElementById('score-player').textContent = `Player: 0`;
        document.getElementById('score-ai').textContent = `AI: 0`;
    }

    // Reset scores
    player1Score = 0;
    player2Score = 0;
    drawScore = 0;
    document.getElementById('score-draw').textContent = `Draws: 0`;
    
    restartGame();
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

// Player Move (Handles both PvP and PvA)
function playerMove(index) {
    if (board[index] !== "" || gameOver) {
        if (!gameOver) playSound('error');
        return;
    }

    playSound('click');

    if (gameMode === "pvp") {
        board[index] = currentPlayer;
        updateBoard();

        if (checkWinner(board, currentPlayer)) {
            endGame(currentPlayer);
            return;
        }

        if (isBoardFull(board)) {
            endGame("DRAW");
            return;
        }

        // Switch turns for PvP
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        statusElement.textContent = `Player ${currentPlayer === "X" ? "1" : "2"}'s Turn (${currentPlayer})`;

    } else {
        // Player vs AI Logic
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
        setTimeout(aiMove, 400);
    }
}

// AI Move (Updated with Difficulty Settings)
function aiMove() {
    if (gameOver) return;

    const difficulty = document.getElementById("difficulty").value;
    let move = -1;
    let useMinimax = false;

    if (difficulty === "hard") {
        useMinimax = true;
    } else if (difficulty === "medium") {
        useMinimax = Math.random() > 0.5; // 50% chance to play perfectly
    }

    if (useMinimax) {
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
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
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
    
    if (winner === "DRAW") {
        statusElement.textContent = "🤝 It's a Draw!";
        drawScore++;
        document.getElementById('score-draw').textContent = `Draws: ${drawScore}`;
        playSound('error');
    } else {
        drawWinLine(winningCells);

        if (gameMode === "pvp") {
            if (winner === "X") {
                statusElement.textContent = "🎉 Player 1 (X) Wins! 🎉";
                player1Score++;
                document.getElementById('score-player').textContent = `Player 1: ${player1Score}`;
            } else {
                statusElement.textContent = "🎉 Player 2 (O) Wins! 🎉";
                player2Score++;
                document.getElementById('score-ai').textContent = `Player 2: ${player2Score}`;
            }
            playSound('win');
        } else {
            if (winner === HUMAN) {
                statusElement.textContent = "🎉 Congratulations! You Win! 🎉";
                player1Score++;
                document.getElementById('score-player').textContent = `Player: ${player1Score}`;
                playSound('win');
            } else if (winner === AI) {
                statusElement.textContent = "🤖 AI Wins! Better luck next time.";
                player2Score++;
                document.getElementById('score-ai').textContent = `AI: ${player2Score}`;
                playSound('lose');
            }
        }
    }

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

    if (gameMode === "pvp") {
        currentPlayer = "X";
        statusElement.textContent = `Player 1's Turn (X)`;
        createBoard();
    } else {
        // Player vs AI starting setup
        if (Math.random() < 0.5) {
            HUMAN = "X";
            AI = "O";
        } else {
            HUMAN = "O";
            AI = "X";
        }

        statusElement.textContent = `You are ${HUMAN}`;
        createBoard();

        if (AI === "X") {
            statusElement.textContent = "AI Starts...";
            setTimeout(aiMove, 500);
        }
    }
}

// Start Game
restartGame();
