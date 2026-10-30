import { getValidMoves, checkWin } from './gameLogic.js';

export const AI_DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  IMPOSSIBLE: 'impossible'
};

export const AI_CONFIGS = {
  easy: {
    id: 'easy',
    name: 'Apprentice',
    title: 'Novice',
    tier: 'Tier 1',
    badgeClass: 'badge-easy',
    color: '#81b29a',
    description: 'An intuitive learner exploring board lines and basic opening placements.',
    flavor: 'Practicing opening gambits. Prone to overlooking quiet tactical pins.'
  },
  medium: {
    id: 'medium',
    name: 'Tactician',
    title: 'Adept',
    tier: 'Tier 2',
    badgeClass: 'badge-medium',
    color: '#d4a373',
    description: 'A disciplined player with sharp positional control. Claims the center and blocks threats.',
    flavor: 'Values steady board presence and calculated piece mobility.'
  },
  hard: {
    id: 'hard',
    name: 'Grandmaster',
    title: 'Master',
    tier: 'Tier 3',
    badgeClass: 'badge-hard',
    color: '#e07a5f',
    description: 'A strategic master calculating deep move sequences to construct inescapable forks.',
    flavor: 'Constricts movement channels and anticipates every advancing slide.'
  },
  impossible: {
    id: 'impossible',
    name: 'The Arbiter',
    title: 'Unbeaten',
    tier: 'Tier 4',
    badgeClass: 'badge-impossible',
    color: '#9381ff',
    description: 'Full game-tree resolution engine. Unlocks after mastering all three prior tiers.',
    flavor: 'Every possible continuation solved. Flawless mathematical defense.'
  }
};

/**
 * Checks whether a difficulty tier is unlocked.
 * Easy, Medium, and Hard are unlocked by default.
 * Impossible unlocks only once Easy, Medium, and Hard have all been defeated.
 */
export function isDifficultyUnlocked(diffId, beatenList) {
  if (diffId !== AI_DIFFICULTIES.IMPOSSIBLE) return true;
  const list = Array.isArray(beatenList) ? beatenList : [];
  return (
    list.includes(AI_DIFFICULTIES.EASY) &&
    list.includes(AI_DIFFICULTIES.MEDIUM) &&
    list.includes(AI_DIFFICULTIES.HARD)
  );
}

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// Transposition table bound flags
const TT_EXACT = 0;
const TT_LOWER = 1;
const TT_UPPER = 2;

function countThreats(board, mark) {
  let threats = 0;
  for (const pattern of WIN_PATTERNS) {
    let markCount = 0;
    let emptyCount = 0;
    for (const idx of pattern) {
      if (board[idx] === mark) markCount++;
      else if (board[idx] === null) emptyCount++;
    }
    if (markCount === 2 && emptyCount === 1) {
      threats++;
    }
  }
  return threats;
}

function evaluatePosition(board, aiMark, playerMark) {
  if (checkWin(board, aiMark)) return 1000;
  if (checkWin(board, playerMark)) return -1000;

  let score = 0;

  // Center control
  if (board[4] === aiMark) score += 40;
  else if (board[4] === playerMark) score -= 40;

  // Corners
  const corners = [0, 2, 6, 8];
  for (const c of corners) {
    if (board[c] === aiMark) score += 12;
    else if (board[c] === playerMark) score -= 12;
  }

  // Two-in-a-row threats
  const aiThreats = countThreats(board, aiMark);
  const playerThreats = countThreats(board, playerMark);
  score += aiThreats * 45;
  score -= playerThreats * 65;

  // Mobility
  const aiMoves = getValidMoves(board, aiMark).length;
  const playerMoves = getValidMoves(board, playerMark).length;
  score += (aiMoves - playerMoves) * 8;

  return score;
}

// Alpha-Beta Minimax for Phase 1 with Transposition Table
function minimaxPhase1(board, moveCount, isMax, alpha, beta, aiMark, playerMark, tt) {
  if (checkWin(board, aiMark)) return 10000 - moveCount;
  if (checkWin(board, playerMark)) return -10000 + moveCount;

  if (moveCount === 6) {
    return evaluatePosition(board, aiMark, playerMark);
  }

  const alphaOrig = alpha;
  const betaOrig = beta;
  const key = board.map(c => c || '.').join('') + ':' + moveCount + ':' + (isMax ? '1' : '0');
  const entry = tt.get(key);
  if (entry) {
    if (entry.flag === TT_EXACT) return entry.value;
    else if (entry.flag === TT_LOWER) alpha = Math.max(alpha, entry.value);
    else if (entry.flag === TT_UPPER) beta = Math.min(beta, entry.value);
    if (alpha >= beta) return entry.value;
  }

  const emptyIndices = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) emptyIndices.push(i);
  }

  const mark = isMax ? aiMark : playerMark;

  if (isMax) {
    let maxEval = -Infinity;
    for (const idx of emptyIndices) {
      board[idx] = mark;
      const ev = minimaxPhase1(board, moveCount + 1, false, alpha, beta, aiMark, playerMark, tt);
      board[idx] = null;
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    let flag = TT_EXACT;
    if (maxEval <= alphaOrig) flag = TT_UPPER;
    else if (maxEval >= betaOrig) flag = TT_LOWER;
    tt.set(key, { value: maxEval, flag });
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const idx of emptyIndices) {
      board[idx] = mark;
      const ev = minimaxPhase1(board, moveCount + 1, true, alpha, beta, aiMark, playerMark, tt);
      board[idx] = null;
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    let flag = TT_EXACT;
    if (minEval <= alphaOrig) flag = TT_UPPER;
    else if (minEval >= betaOrig) flag = TT_LOWER;
    tt.set(key, { value: minEval, flag });
    return minEval;
  }
}

// Alpha-Beta Minimax for Advance Phase with Transposition Table
function minimaxAdvance(board, depth, maxDepth, isMax, alpha, beta, aiMark, playerMark, tt) {
  const currentMark = isMax ? aiMark : playerMark;

  if (checkWin(board, aiMark)) return 1000 - depth;
  if (checkWin(board, playerMark)) return -1000 + depth;
  if (depth >= maxDepth) return evaluatePosition(board, aiMark, playerMark);

  const alphaOrig = alpha;
  const betaOrig = beta;
  const key = board.map(c => c || '.').join('') + ':' + depth + ':' + (isMax ? '1' : '0');
  const entry = tt.get(key);
  if (entry) {
    if (entry.flag === TT_EXACT) return entry.value;
    else if (entry.flag === TT_LOWER) alpha = Math.max(alpha, entry.value);
    else if (entry.flag === TT_UPPER) beta = Math.min(beta, entry.value);
    if (alpha >= beta) return entry.value;
  }

  const moves = getValidMoves(board, currentMark);
  if (moves.length === 0) {
    return isMax ? -500 + depth : 500 - depth;
  }

  // Move ordering: winning moves first
  moves.sort((a, b) => {
    board[a.to] = currentMark;
    board[a.from] = null;
    const aWin = checkWin(board, currentMark) ? 1 : 0;
    board[a.from] = currentMark;
    board[a.to] = null;

    board[b.to] = currentMark;
    board[b.from] = null;
    const bWin = checkWin(board, currentMark) ? 1 : 0;
    board[b.from] = currentMark;
    board[b.to] = null;

    return bWin - aWin;
  });

  if (isMax) {
    let maxEval = -Infinity;
    for (const move of moves) {
      board[move.to] = aiMark;
      board[move.from] = null;
      const ev = minimaxAdvance(board, depth + 1, maxDepth, false, alpha, beta, aiMark, playerMark, tt);
      board[move.from] = aiMark;
      board[move.to] = null;

      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    let flag = TT_EXACT;
    if (maxEval <= alphaOrig) flag = TT_UPPER;
    else if (maxEval >= betaOrig) flag = TT_LOWER;
    tt.set(key, { value: maxEval, flag });
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      board[move.to] = playerMark;
      board[move.from] = null;
      const ev = minimaxAdvance(board, depth + 1, maxDepth, true, alpha, beta, aiMark, playerMark, tt);
      board[move.from] = playerMark;
      board[move.to] = null;

      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    let flag = TT_EXACT;
    if (minEval <= alphaOrig) flag = TT_UPPER;
    else if (minEval >= betaOrig) flag = TT_LOWER;
    tt.set(key, { value: minEval, flag });
    return minEval;
  }
}

/**
 * Main AI move decision function supporting 4 distinct difficulties:
 * - easy: 50% random / frequently makes blunders
 * - medium: Classical smart heuristic (center > corners > block wins > take wins)
 * - hard: Deep minimax lookahead (depth 4-5)
 * - impossible: Full game-tree Alpha-Beta transposition solver (Phase 1 & Phase 2 depth 8-10)
 */
export function getAIMoveByDifficulty(board, aiMark, playerMark, moveCount, difficulty = 'medium') {
  const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);

  // ==================== PHASE 1: PLACEMENT ====================
  if (moveCount < 6) {
    // EASY: 50% chance to place randomly without looking
    if (difficulty === AI_DIFFICULTIES.EASY) {
      if (Math.random() < 0.5) {
        const rand = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        return { type: 'place', index: rand };
      }
    }

    // Immediate Win check
    for (const idx of emptyIndices) {
      const tempBoard = [...board];
      tempBoard[idx] = aiMark;
      if (checkWin(tempBoard, aiMark)) {
        return { type: 'place', index: idx };
      }
    }

    // Immediate Block check (Easy overlooks blocks 50% of the time)
    if (difficulty !== AI_DIFFICULTIES.EASY || Math.random() < 0.5) {
      for (const idx of emptyIndices) {
        const tempBoard = [...board];
        tempBoard[idx] = playerMark;
        if (checkWin(tempBoard, playerMark)) {
          return { type: 'place', index: idx };
        }
      }
    }

    // IMPOSSIBLE (Quantum Singularity): Full Phase 1 Alpha-Beta Minimax game tree
    if (difficulty === AI_DIFFICULTIES.IMPOSSIBLE) {
      const tt = new Map();
      let bestPlacement = emptyIndices[0];
      let bestScore = -Infinity;

      for (const idx of emptyIndices) {
        board[idx] = aiMark;
        const score = minimaxPhase1(board, moveCount + 1, false, -Infinity, Infinity, aiMark, playerMark, tt);
        board[idx] = null;

        if (score > bestScore) {
          bestScore = score;
          bestPlacement = idx;
        }
      }
      return { type: 'place', index: bestPlacement };
    }

    // HARD (Neural Titan): Heuristic fork prevention and positioning
    if (difficulty === AI_DIFFICULTIES.HARD) {
      let bestPlacement = emptyIndices[0];
      let bestScore = -Infinity;

      for (const idx of emptyIndices) {
        const tempBoard = [...board];
        tempBoard[idx] = aiMark;

        let score = evaluatePosition(tempBoard, aiMark, playerMark);
        if (idx === 4) score += 30; // Center bias
        else if ([0, 2, 6, 8].includes(idx)) score += 15; // Corner bias

        // Check if player would get a dual fork on their next placement
        const remainingEmpty = tempBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
        for (const pIdx of remainingEmpty) {
          const testPlayerBoard = [...tempBoard];
          testPlayerBoard[pIdx] = playerMark;
          if (countThreats(testPlayerBoard, playerMark) >= 2) {
            score -= 120;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestPlacement = idx;
        }
      }
      return { type: 'place', index: bestPlacement };
    }

    // MEDIUM (CyberAI): Center > Corners > Open
    if (board[4] === null) {
      return { type: 'place', index: 4 };
    }

    const corners = [0, 2, 6, 8].filter(c => board[c] === null);
    if (corners.length > 0) {
      return { type: 'place', index: corners[Math.floor(Math.random() * corners.length)] };
    }

    return { type: 'place', index: emptyIndices[Math.floor(Math.random() * emptyIndices.length)] };
  }

  // ==================== PHASE 2: ADVANCE SLIDING ====================
  const validMoves = getValidMoves(board, aiMark);

  // Fallback if no valid moves exist (illegal move penalty)
  if (validMoves.length === 0) {
    const myPieces = board.map((val, idx) => val === aiMark ? idx : null).filter(val => val !== null);
    if (myPieces.length === 0 || emptyIndices.length === 0) {
      return { type: 'place', index: 0 };
    }
    const randomPiece = myPieces[Math.floor(Math.random() * myPieces.length)];
    const randomEmpty = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    return { type: 'move', from: randomPiece, to: randomEmpty, isIllegal: true };
  }

  // Immediate Win Check (all difficulties except Easy may skip)
  if (difficulty !== AI_DIFFICULTIES.EASY || Math.random() < 0.6) {
    for (const move of validMoves) {
      board[move.to] = aiMark;
      board[move.from] = null;
      const isWin = checkWin(board, aiMark);
      board[move.from] = aiMark;
      board[move.to] = null;
      if (isWin) {
        return { type: 'move', from: move.from, to: move.to };
      }
    }
  }

  // Immediate Block Check (Easy misses 50% of blocks)
  if (difficulty !== AI_DIFFICULTIES.EASY || Math.random() < 0.5) {
    const playerValidMoves = getValidMoves(board, playerMark);
    for (const pMove of playerValidMoves) {
      board[pMove.to] = playerMark;
      board[pMove.from] = null;
      const playerCanWin = checkWin(board, playerMark);
      board[pMove.from] = playerMark;
      board[pMove.to] = null;

      if (playerCanWin) {
        const blocking = validMoves.filter(m => m.to === pMove.to);
        if (blocking.length > 0) {
          return { type: 'move', from: blocking[0].from, to: blocking[0].to };
        }
      }
    }
  }

  // EASY: 70% random valid move
  if (difficulty === AI_DIFFICULTIES.EASY) {
    const rand = validMoves[Math.floor(Math.random() * validMoves.length)];
    return { type: 'move', from: rand.from, to: rand.to };
  }

  // MEDIUM: Prefer moving to center (4), else random
  if (difficulty === AI_DIFFICULTIES.MEDIUM) {
    const centerMove = validMoves.find(m => m.to === 4);
    if (centerMove) {
      return { type: 'move', from: centerMove.from, to: centerMove.to };
    }
    const rand = validMoves[Math.floor(Math.random() * validMoves.length)];
    return { type: 'move', from: rand.from, to: rand.to };
  }

  // HARD: Minimax depth 4 with Alpha-Beta
  if (difficulty === AI_DIFFICULTIES.HARD) {
    const tt = new Map();
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      board[move.to] = aiMark;
      board[move.from] = null;
      const score = minimaxAdvance(board, 0, 4, false, -Infinity, Infinity, aiMark, playerMark, tt);
      board[move.from] = aiMark;
      board[move.to] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return { type: 'move', from: bestMove.from, to: bestMove.to };
  }

  // IMPOSSIBLE (Quantum Singularity): Deep Minimax depth 8 with Transposition Table
  const tt = new Map();
  let bestMove = validMoves[0];
  let bestScore = -Infinity;

  for (const move of validMoves) {
    board[move.to] = aiMark;
    board[move.from] = null;
    const score = minimaxAdvance(board, 0, 8, false, -Infinity, Infinity, aiMark, playerMark, tt);
    board[move.from] = aiMark;
    board[move.to] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { type: 'move', from: bestMove.from, to: bestMove.to };
}
