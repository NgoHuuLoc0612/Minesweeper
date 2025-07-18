

// Game settings for different difficulty levels
const DIFFICULTY_SETTINGS = {
    beginner: {
        rows: 9,
        cols: 9,
        mines: 10
    },
    intermediate: {
        rows: 16,
        cols: 16,
        mines: 40
    },
    expert: {
        rows: 16,
        cols: 30,
        mines: 99
    }
};

// Game state
let board = [];
let gameOver = false;
let gameStarted = false;
let totalMines = 0;
let flaggedCount = 0;
let revealedCount = 0;
let timer = 0;
let timerInterval;
let currentDifficulty = 'beginner';
let gameHistory = [];
let keyboardMode = false;
let focusedCell = { row: 0, col: 0 };
let touchStartTime = 0;
let longPressTimer = null;
let isDarkMode = false;

// DOM elements
const gameBoard = document.getElementById('game-board');
const resetButton = document.getElementById('reset-button');
const minesCounter = document.getElementById('mines-count');
const timerDisplay = document.getElementById('timer');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const undoButton = document.getElementById('undo-btn');
const particlesContainer = document.getElementById('particles-container');

// Initialize the game
function initGame(difficulty = 'beginner') {
    currentDifficulty = difficulty;
    resetGameState();
    
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[difficulty];
    totalMines = mines;
    
    updateMinesCounter();
    updateProgressBar();
    createEmptyBoard(rows, cols);
    renderBoard();
    updateBoardStyling(cols);
    
    // Reset focus to center
    focusedCell = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
    
    // Save initial state
    saveGameState();
}

// Reset game state
function resetGameState() {
    clearInterval(timerInterval);
    board = [];
    gameOver = false;
    gameStarted = false;
    flaggedCount = 0;
    revealedCount = 0;
    timer = 0;
    gameHistory = [];
    resetButton.textContent = '😊';
    timerDisplay.textContent = '0';
    undoButton.disabled = true;
    clearParticles();
}

// Create an empty board
function createEmptyBoard(rows, cols) {
    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            row.push({
                row: i,
                col: j,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            });
        }
        board.push(row);
    }
}

// Place mines randomly on the board
function placeMines(firstClickRow, firstClickCol) {
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[currentDifficulty];
    let minesPlaced = 0;
    
    while (minesPlaced < mines) {
        const randomRow = Math.floor(Math.random() * rows);
        const randomCol = Math.floor(Math.random() * cols);
        
        if ((randomRow !== firstClickRow || randomCol !== firstClickCol) && 
            !board[randomRow][randomCol].isMine) {
            board[randomRow][randomCol].isMine = true;
            minesPlaced++;
        }
    }
    
    calculateNeighborMines();
}

// Calculate neighbor mines
function calculateNeighborMines() {
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j].isMine) continue;
            
            let count = 0;
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    if (di === 0 && dj === 0) continue;
                    
                    const ni = i + di;
                    const nj = j + dj;
                    
                    if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && 
                        board[ni][nj].isMine) {
                        count++;
                    }
                }
            }
            
            board[i][j].neighborMines = count;
        }
    }
}

// Render the game board
function renderBoard() {
    gameBoard.innerHTML = '';
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.tabIndex = -1;
            
            // Add event listeners
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleRightClick);
            cell.addEventListener('dblclick', handleDoubleClick);
            cell.addEventListener('mousedown', handleMouseDown);
            cell.addEventListener('mouseup', handleMouseUp);
            cell.addEventListener('mouseleave', handleMouseLeave);
            
            // Touch events
            cell.addEventListener('touchstart', handleTouchStart, { passive: false });
            cell.addEventListener('touchend', handleTouchEnd, { passive: false });
            
            updateCellAppearance(cell, board[i][j]);
            gameBoard.appendChild(cell);
        }
    }
    
    updateKeyboardFocus();
}

// Update cell appearance with animations
function updateCellAppearance(cellElement, cellData) {
    cellElement.className = 'cell';
    cellElement.textContent = '';
    
    if (cellData.isRevealed) {
        cellElement.classList.add('revealed');
        
        if (cellData.isMine) {
            cellElement.classList.add('mine');
            if (gameOver) {
                cellElement.classList.add('exploded');
            }
        } else if (cellData.neighborMines > 0) {
            cellElement.textContent = cellData.neighborMines;
            cellElement.dataset.value = cellData.neighborMines;
            cellElement.classList.add('number-reveal');
        }
    } else if (cellData.isFlagged) {
        cellElement.classList.add('flagged');
    }
}

// Update all cells on the board
function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        updateCellAppearance(cell, board[row][col]);
    });
}

// Handle mouse events for pressed state
function handleMouseDown(event) {
    if (gameOver || event.target.classList.contains('revealed')) return;
    event.target.classList.add('pressed');
}

function handleMouseUp(event) {
    event.target.classList.remove('pressed');
}

function handleMouseLeave(event) {
    event.target.classList.remove('pressed');
}

// Handle touch events for mobile
function handleTouchStart(event) {
    event.preventDefault();
    touchStartTime = Date.now();
    
    // Long press for flagging
    longPressTimer = setTimeout(() => {
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        handleRightClick({ target: event.target, preventDefault: () => {} });
    }, 500);
    
    event.target.classList.add('pressed');
}

function handleTouchEnd(event) {
    event.preventDefault();
    clearTimeout(longPressTimer);
    event.target.classList.remove('pressed');
    
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration < 500) {
        // Short tap - reveal cell
        handleCellClick(event);
    }
}

// Handle cell click
function handleCellClick(event) {
    if (gameOver) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    if (board[row][col].isFlagged) return;
    
    if (!gameStarted) {
        gameStarted = true;
        placeMines(row, col);
        startTimer();
    }
    
    // Save state before move
    saveGameState();
    
    revealCell(row, col);
    updateBoard();
    updateProgressBar();
    checkWinCondition();
}

// Handle right-click to flag/unflag
function handleRightClick(event) {
    event.preventDefault();
    
    if (gameOver || !gameStarted) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    if (board[row][col].isRevealed) return;
    
    // Save state before move
    saveGameState();
    
    board[row][col].isFlagged = !board[row][col].isFlagged;
    flaggedCount += board[row][col].isFlagged ? 1 : -1;
    
    updateMinesCounter();
    updateCellAppearance(event.target, board[row][col]);
}

// Handle double-click
function handleDoubleClick(event) {
    if (gameOver || !gameStarted) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    const cell = board[row][col];
    
    if (!cell.isRevealed || cell.neighborMines === 0) return;
    
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    let flagsCount = 0;
    
    for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue;
            
            const ni = row + di;
            const nj = col + dj;
            
            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && 
                board[ni][nj].isFlagged) {
                flagsCount++;
            }
        }
    }
    
    if (flagsCount === cell.neighborMines) {
        saveGameState();
        
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue;
                
                const ni = row + di;
                const nj = col + dj;
                
                if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && 
                    !board[ni][nj].isRevealed && !board[ni][nj].isFlagged) {
                    revealCell(ni, nj);
                }
            }
        }
        
        updateBoard();
        updateProgressBar();
        checkWinCondition();
    }
}

function revealCell(row, col) {
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    const cell = board[row][col];
    
    if (cell.isFlagged || cell.isRevealed) return;
    
    cell.isRevealed = true;
    revealedCount++;
    
    // Add chain reaction animation
    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cellElement) {
        cellElement.classList.add('chain-reaction');
        setTimeout(() => {
            cellElement.classList.remove('chain-reaction');
        }, 300);
    }
    
    if (cell.isMine) {
        createExplosionParticles(row, col);
        endGame(false);
        return;
    }
    
    if (cell.neighborMines === 0) {
        // Reveal neighbors immediately to prevent missing cells
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue;
                
                const ni = row + di;
                const nj = col + dj;
                
                if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                    revealCell(ni, nj);
                }
            }
        }
    }
}

// Start timer
function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        timerDisplay.textContent = timer;
        
        if (timer >= 999) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

// Update mines counter
function updateMinesCounter() {
    minesCounter.textContent = totalMines - flaggedCount;
}

// Update progress bar
function updateProgressBar() {
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[currentDifficulty];
    const totalCells = rows * cols;
    const progress = (revealedCount / (totalCells - mines)) * 100;
    
    progressFill.style.width = `${Math.min(progress, 100)}%`;
    progressText.textContent = `${Math.round(progress)}%`;
}

// Check win condition
function checkWinCondition() {
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[currentDifficulty];
    const totalCells = rows * cols;
    
    if (revealedCount === totalCells - mines) {
        endGame(true);
    }
}

// End game
function endGame(isWin) {
    gameOver = true;
    clearInterval(timerInterval);
    
    resetButton.textContent = isWin ? '😎' : '😵';
    
    if (isWin) {
        createWinParticles();
        flagAllMines();
    } else {
        revealAllMines();
    }
}

// Reveal all mines
function revealAllMines() {
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j].isMine) {
                board[i][j].isRevealed = true;
            }
        }
    }
    
    updateBoard();
}

// Flag all mines
function flagAllMines() {
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j].isMine && !board[i][j].isFlagged) {
                board[i][j].isFlagged = true;
            }
        }
    }
    
    flaggedCount = totalMines;
    updateMinesCounter();
    updateBoard();
}

// Update board styling
function updateBoardStyling(cols) {
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
}

// Keyboard navigation
function updateKeyboardFocus() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('keyboard-focus');
    });
    
    if (keyboardMode) {
        const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
        if (focusedCell.row >= 0 && focusedCell.row < rows && 
            focusedCell.col >= 0 && focusedCell.col < cols) {
            const targetCell = document.querySelector(
                `[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`
            );
            if (targetCell) {
                targetCell.classList.add('keyboard-focus');
            }
        }
    }
}

// Save game state for undo
function saveGameState() {
    const state = {
        board: JSON.parse(JSON.stringify(board)),
        flaggedCount,
        revealedCount,
        timer,
        gameStarted,
        gameOver
    };
    
    gameHistory.push(state);
    
    // Keep only last 10 states
    if (gameHistory.length > 10) {
        gameHistory.shift();
    }
    
    undoButton.disabled = gameHistory.length <= 1;
}

// Undo last move
function undoLastMove() {
    if (gameHistory.length <= 1) return;
    
    // Remove current state
    gameHistory.pop();
    
    // Get previous state
    const previousState = gameHistory[gameHistory.length - 1];
    
    // Restore state
    board = JSON.parse(JSON.stringify(previousState.board));
    flaggedCount = previousState.flaggedCount;
    revealedCount = previousState.revealedCount;
    timer = previousState.timer;
    gameStarted = previousState.gameStarted;
    gameOver = previousState.gameOver;
    
    // Update UI
    updateBoard();
    updateMinesCounter();
    updateProgressBar();
    timerDisplay.textContent = timer;
    
    undoButton.disabled = gameHistory.length <= 1;
}

// Particle effects
function createExplosionParticles(row, col) {
    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!cellElement) return;
    
    const rect = cellElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle explosion';
        
        const angle = (Math.PI * 2 * i) / 20;
        const velocity = 100 + Math.random() * 100;
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity;
        
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');
        
        particlesContainer.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

function createWinParticles() {
    const colors = ['#ffd700', '#ffed4e', '#ff6b6b', '#4ecdc4', '#45b7d1'];
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle win';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const dx = (Math.random() - 0.5) * 400;
        const dy = (Math.random() - 0.5) * 400;
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');
        
        particlesContainer.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

function clearParticles() {
    particlesContainer.innerHTML = '';
}

// Dark mode toggle
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.dataset.theme = isDarkMode ? 'dark' : 'light';
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    
    // Save preference
    localStorage.setItem('minesweeper-dark-mode', isDarkMode);
}

// Load saved preferences
function loadPreferences() {
    const savedDarkMode = localStorage.getItem('minesweeper-dark-mode');
    if (savedDarkMode === 'true') {
        isDarkMode = true;
        toggleDarkMode();
    }
}

// Auto-save game state
function autoSaveGame() {
    const gameState = {
        board,
        currentDifficulty,
        gameOver,
        gameStarted,
        totalMines,
        flaggedCount,
        revealedCount,
        timer,
        focusedCell
    };
    
    localStorage.setItem('minesweeper-game-state', JSON.stringify(gameState));
}

// Load saved game
function loadSavedGame() {
    const savedState = localStorage.getItem('minesweeper-game-state');
    if (!savedState) return false;
    
    try {
        const gameState = JSON.parse(savedState);
        
        // Restore game state
        board = gameState.board;
        currentDifficulty = gameState.currentDifficulty;
        gameOver = gameState.gameOver;
        gameStarted = gameState.gameStarted;
        totalMines = gameState.totalMines;
        flaggedCount = gameState.flaggedCount;
        revealedCount = gameState.revealedCount;
        timer = gameState.timer;
        focusedCell = gameState.focusedCell || { row: 0, col: 0 };
        
        // Update UI
        updateBoardStyling(DIFFICULTY_SETTINGS[currentDifficulty].cols);
        renderBoard();
        updateMinesCounter();
        updateProgressBar();
        timerDisplay.textContent = timer;
        
        // Set active difficulty button
        difficultyButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === currentDifficulty);
        });
        
        // Resume timer if game is in progress
        if (gameStarted && !gameOver) {
            startTimer();
        }
        
        return true;
    } catch (error) {
        console.error('Failed to load saved game:', error);
        return false;
    }
}

// Event listeners
resetButton.addEventListener('click', () => {
    initGame(currentDifficulty);
});

difficultyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        difficultyButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        initGame(e.target.dataset.difficulty);
    });
});

darkModeToggle.addEventListener('click', toggleDarkMode);
undoButton.addEventListener('click', undoLastMove);

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            keyboardMode = true;
            focusedCell.row = Math.max(0, focusedCell.row - 1);
            updateKeyboardFocus();
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            keyboardMode = true;
            focusedCell.row = Math.min(rows - 1, focusedCell.row + 1);
            updateKeyboardFocus();
            break;
            
        case 'ArrowLeft':
            e.preventDefault();
            keyboardMode = true;
            focusedCell.col = Math.max(0, focusedCell.col - 1);
            updateKeyboardFocus();
            break;
            
        case 'ArrowRight':
            e.preventDefault();
            keyboardMode = true;
            focusedCell.col = Math.min(cols - 1, focusedCell.col + 1);
            updateKeyboardFocus();
            break;
            
        case 'Enter':
            e.preventDefault();
            if (keyboardMode) {
                const targetCell = document.querySelector(
                    `[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`
                );
                if (targetCell) {
                    handleCellClick({ target: targetCell });
                }
            }
            break;
            
        case ' ':
            e.preventDefault();
            if (keyboardMode) {
                const targetCell = document.querySelector(
                    `[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`
                );
                if (targetCell) {
                    handleRightClick({ target: targetCell, preventDefault: () => {} });
                }
            }
            break;
            
        case 'u':
        case 'U':
            e.preventDefault();
            undoLastMove();
            break;
            
        case 'r':
        case 'R':
            e.preventDefault();
            initGame(currentDifficulty);
            break;
    }
});

// Disable keyboard mode on mouse interaction
document.addEventListener('mousemove', () => {
    keyboardMode = false;
    updateKeyboardFocus();
});

// Prevent context menu on game board
gameBoard.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Auto-save periodically
setInterval(autoSaveGame, 5000);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    
    // Try to load saved game, otherwise start new game
    if (!loadSavedGame()) {
        initGame();
    }
});
