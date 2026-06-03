// Pure TicTacMove Game Logic Utilities

export const SIZE = 3;

// Convert 1D board index (0-8) to 2D coordinates (row, col)
export function getCoords(index) {
  return {
    row: Math.floor(index / 3),
    col: index % 3
  };
}

// Convert 2D coordinates to 1D index
export function getIndex(row, col) {
  return row * 3 + col;
}

// Checks if there are 3 in a row for a player mark
export function checkWin(board, mark) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  return winPatterns.some(pattern => 
    pattern.every(index => board[index] === mark)
  );
}

// Checks if a move is valid in the Advance Phase (moveCount >= 6)
// Returns boolean: true if valid, false if invalid
export function isValidMove(board, fromIndex, toIndex) {
  if (fromIndex === null || toIndex === null) return false;
  if (fromIndex < 0 || fromIndex > 8 || toIndex < 0 || toIndex > 8) return false;
  
  // Destination must be empty
  if (board[toIndex] !== null) return false;
  
  const from = getCoords(fromIndex);
  const to = getCoords(toIndex);
  
  const diffRow = to.row - from.row;
  const diffCol = to.col - from.col;
  const absDiffRow = Math.abs(diffRow);
  const absDiffCol = Math.abs(diffCol);
  
  // 1. ORTHOGONAL MOVEMENT (Same row or same column)
  if (diffCol === 0) { // Same column, row is switching
    if (absDiffRow === 1) {
      return true; // 1 unit orthogonal - always valid
    }
    if (absDiffRow === 2) {
      // 2 units orthogonal - intermediate cell must be empty
      const midRow = from.row + (diffRow / 2);
      const midIndex = getIndex(midRow, from.col);
      return board[midIndex] === null;
    }
  }
  
  if (diffRow === 0) { // Same row, column is switching
    if (absDiffCol === 1) {
      return true; // 1 unit orthogonal - always valid
    }
    if (absDiffCol === 2) {
      // 2 units orthogonal - intermediate cell must be empty
      const midCol = from.col + (diffCol / 2);
      const midIndex = getIndex(from.row, midCol);
      return board[midIndex] === null;
    }
  }
  
  // 2. DIAGONAL MOVEMENT
  if (absDiffRow === 1 && absDiffCol === 1) {
    return true; // 1 unit diagonal (e.g. corner to center) - always valid
  }
  
  if (absDiffRow === 2 && absDiffCol === 2) {
    // 2 units diagonal (e.g. corner to opposite corner) - center [1, 1] must be empty
    const centerIndex = getIndex(1, 1);
    return board[centerIndex] === null;
  }
  
  return false;
}

// Get all currently valid moves for a player mark in the Advance Phase
export function getValidMoves(board, mark) {
  const moves = [];
  const myPieces = [];
  
  // Find all piece indices for this player
  for (let i = 0; i < 9; i++) {
    if (board[i] === mark) {
      myPieces.push(i);
    }
  }
  
  // Find empty cells
  const emptyCells = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      emptyCells.push(i);
    }
  }
  
  // Check combination of pieces and empty cells
  for (const from of myPieces) {
    for (const to of emptyCells) {
      if (isValidMove(board, from, to)) {
        moves.push({ from, to });
      }
    }
  }
  
  return moves;
}

// Smart Heuristic AI Decision Maker
export function getBestAIMove(board, aiMark, playerMark, moveCount) {
  const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
  
  // ==================== INITIAL PHASE (moveCount < 6) ====================
  if (moveCount < 6) {
    // 1. Can AI win immediately?
    for (const idx of emptyIndices) {
      const tempBoard = [...board];
      tempBoard[idx] = aiMark;
      if (checkWin(tempBoard, aiMark)) {
        return { type: 'place', index: idx };
      }
    }
    
    // 2. Can player win next turn? Block them!
    for (const idx of emptyIndices) {
      const tempBoard = [...board];
      tempBoard[idx] = playerMark;
      if (checkWin(tempBoard, playerMark)) {
        return { type: 'place', index: idx };
      }
    }
    
    // 3. Take center if open
    if (board[4] === null) {
      return { type: 'place', index: 4 };
    }
    
    // 4. Take corners if open
    const corners = [0, 2, 6, 8];
    const openCorners = corners.filter(c => board[c] === null);
    if (openCorners.length > 0) {
      const randomCorner = openCorners[Math.floor(Math.random() * openCorners.length)];
      return { type: 'place', index: randomCorner };
    }
    
    // 5. Take any open cell
    const randomOpen = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    return { type: 'place', index: randomOpen };
  }
  
  // ==================== ADVANCE PHASE (moveCount >= 6) ====================
  const validMoves = getValidMoves(board, aiMark);
  
  if (validMoves.length === 0) {
    // Fallback: If no valid moves exist, pick any piece and move it to any empty slot (gets penalty)
    const myPieces = board.map((val, idx) => val === aiMark ? idx : null).filter(val => val !== null);
    if (myPieces.length === 0 || emptyIndices.length === 0) {
      return { type: 'place', index: 0 }; // Safety fallback — should never happen
    }
    const randomPiece = myPieces[Math.floor(Math.random() * myPieces.length)];
    const randomEmpty = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    return { type: 'move', from: randomPiece, to: randomEmpty, isIllegal: true };
  }
  
  // 1. Can AI win in one move?
  for (const move of validMoves) {
    const tempBoard = [...board];
    tempBoard[move.to] = aiMark;
    tempBoard[move.from] = null;
    if (checkWin(tempBoard, aiMark)) {
      return { type: 'move', from: move.from, to: move.to };
    }
  }
  
  // 2. Block player's winning moves
  const playerValidMoves = getValidMoves(board, playerMark);
  for (const playerMove of playerValidMoves) {
    const tempBoard = [...board];
    tempBoard[playerMove.to] = playerMark;
    tempBoard[playerMove.from] = null;
    if (checkWin(tempBoard, playerMark)) {
      // Find a move for AI that occupies the player's destination cell (playerMove.to)
      const blockingMoves = validMoves.filter(m => m.to === playerMove.to);
      if (blockingMoves.length > 0) {
        return { type: 'move', from: blockingMoves[0].from, to: blockingMoves[0].to };
      }
    }
  }
  
  // 3. Move pieces closer to centers or keep pieces connected
  // Heuristic: Prefer moving a piece to the center (4)
  const centerMove = validMoves.find(m => m.to === 4);
  if (centerMove) {
    return { type: 'move', from: centerMove.from, to: centerMove.to };
  }
  
  // 4. Default: pick a random valid move
  const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
  return { type: 'move', from: randomMove.from, to: randomMove.to };
}
