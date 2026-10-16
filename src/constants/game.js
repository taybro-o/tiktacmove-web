// Core Game Constants and Data Marshalling Helpers

export const BOARD_SIZE = 9;
export const EMPTY_CELL = ""; // Sentinel for empty cells in Firebase RTDB
export const DRAW_MOVE_LIMIT = 50;

export const INITIAL_P1 = {
  name: 'Player 1',
  mark: 'X',
  penaltyCount: 0
};

export const INITIAL_P2 = {
  name: 'Player 2',
  mark: 'O',
  penaltyCount: 0
};

/**
 * Normalizes Firebase board snapshot into a 9-element array with null for empty cells.
 */
export function boardFromFirebase(data) {
  if (!data) return Array(BOARD_SIZE).fill(null);
  const result = Array(BOARD_SIZE).fill(null);
  if (Array.isArray(data)) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const v = data[i];
      result[i] = (v === EMPTY_CELL || v === undefined || v === null) ? null : v;
    }
    return result;
  }
  // Object with numeric keys (Firebase stores sparse arrays this way)
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (data[i] !== undefined && data[i] !== null) {
      result[i] = data[i] === EMPTY_CELL ? null : data[i];
    }
  }
  return result;
}

/**
 * Converts local board array into a Firebase-safe array using EMPTY_CELL sentinel.
 */
export function boardToFirebase(board) {
  return Array.from({ length: BOARD_SIZE }, (_, i) =>
    (board[i] === null || board[i] === undefined) ? EMPTY_CELL : board[i]
  );
}
