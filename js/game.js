/**
 * Minesweeper Game
 * A classic implementation of the Minesweeper game using vanilla JavaScript
 */

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

// DOM elements
const gameBoard = document.getElementById('game-board');
const resetButton = document.getElementById('reset-button');
const minesCounter = document.getElementById('mines-count');
const timerDisplay = document.getElementById('timer');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

// Initialize the game
function initGame(difficulty = 'beginner') {
    // Set current difficulty
    currentDifficulty = difficulty;

    // Reset game state
    resetGameState();

    // Get settings for the selected difficulty
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[difficulty];
    totalMines = mines;
    
    // Update mines counter
    updateMinesCounter();
    
    // Create an empty board
    createEmptyBoard(rows, cols);
    
    // Render the board to DOM
    renderBoard();
    
    // Update board styling based on dimensions
    updateBoardStyling(cols);
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
    resetButton.textContent = '😊';
    timerDisplay.textContent = '0';
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

// Place mines randomly on the board (avoiding the first clicked cell)
function placeMines(firstClickRow, firstClickCol) {
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[currentDifficulty];
    let minesPlaced = 0;
    
    while (minesPlaced < mines) {
        const randomRow = Math.floor(Math.random() * rows);
        const randomCol = Math.floor(Math.random() * cols);
        
        // Avoid placing a mine on the first clicked cell or if there's already a mine
        if ((randomRow !== firstClickRow || randomCol !== firstClickCol) && !board[randomRow][randomCol].isMine) {
            board[randomRow][randomCol].isMine = true;
            minesPlaced++;
        }
    }
    
    // Calculate neighbor mines for each cell
    calculateNeighborMines();
}

// Calculate how many mines are adjacent to each cell
function calculateNeighborMines() {
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j].isMine) continue;
            
            let count = 0;
            
            // Check all 8 neighboring cells
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    if (di === 0 && dj === 0) continue; // Skip the cell itself
                    
                    const ni = i + di;
                    const nj = j + dj;
                    
                    // Check if the neighbor is within bounds
                    if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && board[ni][nj].isMine) {
                        count++;
                    }
                }
            }
            
            board[i][j].neighborMines = count;
        }
    }
}

// Render the game board to the DOM
function renderBoard() {
    // Clear the existing board
    gameBoard.innerHTML = '';
    
    // Get dimensions based on current difficulty
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    // Create cells
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            // Add event listeners
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleRightClick);
            cell.addEventListener('dblclick', handleDoubleClick);
            
            // Update cell appearance based on its state
            updateCellAppearance(cell, board[i][j]);
            
            gameBoard.appendChild(cell);
        }
    }
}

// Update a cell's appearance based on its state
function updateCellAppearance(cellElement, cellData) {
    // Reset all classes first
    cellElement.className = 'cell';
    cellElement.textContent = '';
    
    // Apply appropriate classes and content based on cell state
    if (cellData.isRevealed) {
        cellElement.classList.add('revealed');
        
        if (cellData.isMine) {
            cellElement.classList.add('mine');
        } else if (cellData.neighborMines > 0) {
            cellElement.textContent = cellData.neighborMines;
            cellElement.dataset.value = cellData.neighborMines;
        }
    } else if (cellData.isFlagged) {
        cellElement.classList.add('flagged');
    }
    
    // Special class for exploded mine
    if (cellData.isRevealed && cellData.isMine && gameOver) {
        cellElement.classList.add('exploded');
    }
}

// Update all cells on the board
function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        updateCellAppearance(cell, board[row][col]);
    });
}

// Handle left-click on a cell
function handleCellClick(event) {
    if (gameOver) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    // Can't click on flagged cells
    if (board[row][col].isFlagged) return;
    
    // Start the game on the first click
    if (!gameStarted) {
        gameStarted = true;
        placeMines(row, col);
        startTimer();
    }
    
    // Reveal the clicked cell
    revealCell(row, col);
    
    // Update the board
    updateBoard();
    
    // Check for win condition
    checkWinCondition();
}

// Handle right-click to flag/unflag a cell
function handleRightClick(event) {
    event.preventDefault(); // Prevents context menu from appearing
    
    if (gameOver || !gameStarted) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    // Can't flag revealed cells
    if (board[row][col].isRevealed) return;
    
    // Toggle flag
    board[row][col].isFlagged = !board[row][col].isFlagged;
    
    // Update flagged count
    flaggedCount += board[row][col].isFlagged ? 1 : -1;
    
    // Update mines counter
    updateMinesCounter();
    
    // Update the cell appearance
    updateCellAppearance(event.target, board[row][col]);
}

// Handle double-click to reveal surrounding cells if enough flags are placed
function handleDoubleClick(event) {
    if (gameOver || !gameStarted) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    const cell = board[row][col];
    
    // Only work on revealed numbered cells
    if (!cell.isRevealed || cell.neighborMines === 0) return;
    
    // Count flags around the cell
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    let flagsCount = 0;
    
    for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue;
            
            const ni = row + di;
            const nj = col + dj;
            
            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && board[ni][nj].isFlagged) {
                flagsCount++;
            }
        }
    }
    
    // If enough flags are placed, reveal all unflagged surrounding cells
    if (flagsCount === cell.neighborMines) {
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
        
        // Update the board
        updateBoard();
        
        // Check for win condition
        checkWinCondition();
    }
}

// Reveal a cell and its neighbors if it has no adjacent mines
function revealCell(row, col) {
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    const cell = board[row][col];
    
    // Don't reveal flagged cells or already revealed cells
    if (cell.isFlagged || cell.isRevealed) return;
    
    // Reveal the cell
    cell.isRevealed = true;
    revealedCount++;
    
    // If it's a mine, game over
    if (cell.isMine) {
        endGame(false);
        return;
    }
    
    // If it has no adjacent mines, reveal all neighboring cells
    if (cell.neighborMines === 0) {
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

// Start the game timer
function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        timerDisplay.textContent = timer;
        
        // Limit timer display to 999
        if (timer >= 999) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

// Update the mines counter display
function updateMinesCounter() {
    minesCounter.textContent = totalMines - flaggedCount;
}

// Check if the player has won
function checkWinCondition() {
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[currentDifficulty];
    const totalCells = rows * cols;
    
    // Win condition: all non-mine cells are revealed
    if (revealedCount === totalCells - mines) {
        endGame(true);
    }
}

// End the game (win or lose)
function endGame(isWin) {
    gameOver = true;
    clearInterval(timerInterval);
    
    // Update reset button face
    resetButton.textContent = isWin ? '😎' : '😵';
    
    // If lost, reveal all mines
    if (!isWin) {
        revealAllMines();
    } else {
        // If won, flag all remaining mines
        flagAllMines();
    }
}

// Reveal all mines when the game is lost
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

// Flag all mines when the game is won
function flagAllMines() {
    const { rows, cols } = DIFFICULTY_SETTINGS[currentDifficulty];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j].isMine && !board[i][j].isFlagged) {
                board[i][j].isFlagged = true;
            }
        }
    }
    
    // Update flagged count
    flaggedCount = totalMines;
    updateMinesCounter();
    
    updateBoard();
}

// Update the board styling based on number of columns
function updateBoardStyling(cols) {
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
}

// Event listener for the reset button
resetButton.addEventListener('click', () => {
    initGame(currentDifficulty);
});

// Event listeners for difficulty buttons
difficultyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        // Update active class
        difficultyButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Initialize game with the selected difficulty
        initGame(e.target.dataset.difficulty);
    });
});

// Handle right-click on the game board (prevents context menu)
gameBoard.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});