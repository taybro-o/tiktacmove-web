import { useState, useEffect, useRef, useMemo } from 'react';
import { getWinningLine } from '../gameLogic';

export function useReplayAnimation({ winner, board, moveHistory }) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Compute the boomerang replay stages from the last 2 moves whenever winner/history changes
  const stages = useMemo(() => {
    if (!winner) return [];

    const history = Array.isArray(moveHistory) ? moveHistory : [];
    const winningLine = getWinningLine(board, winner);

    // If we have at least 2 moves: complete boomerang loop (Win -> Reverse -> Normal -> Reverse -> ...)
    if (history.length >= 2) {
      const moveA = history[history.length - 2];
      const moveB = history[history.length - 1];

      const s0 = moveA.boardBefore;
      const s1 = moveA.boardAfter;
      const s2 = moveB.boardAfter;

      return [
        // Stage 0: Initial completed victory hold (with golden line highlight)
        {
          id: 'win-hold',
          board: s2,
          slideMove: null,
          highlights: { winningLine },
          duration: 1400
        },
        // Stage 1: Boomerang reverse move 2 (winning piece slides back to origin)
        {
          id: 'rev-move2',
          board: s1,
          slideMove: moveB.type === 'move' ? {
            from: moveB.to,
            to: moveB.from,
            mark: moveB.mark,
            key: `rev-B-${moveB.to}-${moveB.from}`
          } : null,
          highlights: { winningLine: null },
          duration: 650
        },
        // Stage 2: Boomerang reverse move 1 (penultimate piece slides back to origin)
        {
          id: 'rev-move1',
          board: s0,
          slideMove: moveA.type === 'move' ? {
            from: moveA.to,
            to: moveA.from,
            mark: moveA.mark,
            key: `rev-A-${moveA.to}-${moveA.from}`
          } : null,
          highlights: { winningLine: null },
          duration: 650
        },
        // Stage 3: Brief pause at initial position before advancing forward
        {
          id: 'start-hold',
          board: s0,
          slideMove: null,
          highlights: { winningLine: null },
          duration: 450
        },
        // Stage 4: Normal flow move 1 (penultimate piece slides forward)
        {
          id: 'fwd-move1',
          board: s1,
          slideMove: moveA.type === 'move' ? {
            from: moveA.from,
            to: moveA.to,
            mark: moveA.mark,
            key: `fwd-A-${moveA.from}-${moveA.to}`
          } : null,
          highlights: { winningLine: null },
          duration: 700
        },
        // Stage 5: Normal flow move 2 (winning piece slides forward into the victory alignment)
        {
          id: 'fwd-move2',
          board: s2,
          slideMove: moveB.type === 'move' ? {
            from: moveB.from,
            to: moveB.to,
            mark: moveB.mark,
            key: `fwd-B-${moveB.from}-${moveB.to}`
          } : null,
          highlights: { winningLine: null },
          duration: 700
        }
      ];
    }

    // If only 1 move was recorded (e.g. quick 1-move finish)
    if (history.length === 1) {
      const moveB = history[0];
      const s0 = moveB.boardBefore;
      const s2 = moveB.boardAfter;

      return [
        {
          id: 'win-hold',
          board: s2,
          slideMove: null,
          highlights: { winningLine },
          duration: 1400
        },
        {
          id: 'rev-move1',
          board: s0,
          slideMove: moveB.type === 'move' ? {
            from: moveB.to,
            to: moveB.from,
            mark: moveB.mark,
            key: `rev-1-${moveB.to}-${moveB.from}`
          } : null,
          highlights: { winningLine: null },
          duration: 650
        },
        {
          id: 'start-hold',
          board: s0,
          slideMove: null,
          highlights: { winningLine: null },
          duration: 450
        },
        {
          id: 'fwd-move1',
          board: s2,
          slideMove: moveB.type === 'move' ? {
            from: moveB.from,
            to: moveB.to,
            mark: moveB.mark,
            key: `fwd-1-${moveB.from}-${moveB.to}`
          } : null,
          highlights: { winningLine: null },
          duration: 700
        }
      ];
    }

    // Fallback: Final board with winning line
    return [
      {
        id: 'final-static',
        board: [...board],
        slideMove: null,
        highlights: { winningLine },
        duration: 3000
      }
    ];
  }, [winner, board, moveHistory]);

  // Reset stage index when a new winner is declared
  const prevWinnerRef = useRef(winner);
  useEffect(() => {
    if (winner && !prevWinnerRef.current) {
      setCurrentStageIndex(0);
    }
    prevWinnerRef.current = winner;
  }, [winner]);

  // Continuous loop timer
  useEffect(() => {
    if (!winner || stages.length <= 1) return;

    const currentStage = stages[currentStageIndex] || stages[0];
    const delay = currentStage.duration || 1000;

    const timer = setTimeout(() => {
      setCurrentStageIndex((prev) => (prev + 1) % stages.length);
    }, delay);

    return () => clearTimeout(timer);
  }, [winner, currentStageIndex, stages]);

  const currentStage = stages[currentStageIndex] || stages[0] || null;
  const slidingMove = currentStage?.slideMove || null;

  return {
    isReplayActive: Boolean(winner && stages.length > 0),
    currentStageIndex,
    slidingMove,
    displayBoard: currentStage ? currentStage.board : board,
    highlights: currentStage ? currentStage.highlights : null
  };
}
