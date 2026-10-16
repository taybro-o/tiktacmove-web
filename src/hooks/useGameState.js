import { useState, useEffect, useRef, useCallback } from 'react';
import { checkWin, isValidMove, getBestAIMove, getCoords } from '../gameLogic';
import { INITIAL_P1, INITIAL_P2, DRAW_MOVE_LIMIT } from '../constants/game';

export function getCoordLabel(index) {
  const coords = getCoords(index);
  const rowLetter = ['A', 'B', 'C'][coords.row];
  const colNum = coords.col + 1;
  return `${rowLetter}${colNum}`;
}

export function useGameState({ gameMode, onlineRole, playSound, onSyncState }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [moveCount, setMoveCount] = useState(0);
  const [p1, setP1] = useState(INITIAL_P1);
  const [p2, setP2] = useState(INITIAL_P2);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(null);
  const [twiceTurn, setTwiceTurn] = useState(null); // 'X' or 'O' or null
  const [winner, setWinner] = useState(null); // 'X', 'O', 'draw', null
  const [roundLog, setRoundLog] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);

  const aiThinkingRef = useRef(false);

  const activeMark = moveCount % 2 === 0 ? 'X' : 'O';
  const activePlayer = activeMark === 'X' ? p1 : p2;

  // Derived status message (no unnecessary setState/effects)
  let statusMessage;
  if (winner) {
    if (winner === 'draw') {
      statusMessage = '⚔️ Match ended in a draw!';
    } else {
      const winningPlayer = winner === 'X' ? p1.name : p2.name;
      statusMessage = `🏆 ${winningPlayer} Wins the Arena!`;
    }
  } else if (gameMode === 'vs-ai' && activeMark === 'O') {
    statusMessage = '🤖 CyberAI is scanning the grid...';
  } else {
    const phaseLabel = moveCount < 6 ? 'Placement Phase' : 'Advance Phase';
    statusMessage = `⚡ ${activePlayer.name}'s Turn - [${phaseLabel}]`;
  }

  // Derived twice turn prompt visibility
  const showTwiceTurnPrompt = Boolean(
    twiceTurn &&
    twiceTurn === activeMark &&
    !winner &&
    (gameMode === 'vs-local' ||
      (gameMode === 'vs-ai' && activeMark === 'X') ||
      (gameMode === 'vs-online' &&
        ((onlineRole === 'host' && activeMark === 'X') || (onlineRole === 'client' && activeMark === 'O'))))
  );

  // CyberAI automation
  useEffect(() => {
    if (gameMode !== 'vs-ai' || winner || activeMark !== 'O') return;
    if (aiThinkingRef.current) return;

    aiThinkingRef.current = true;
    setAiThinking(true);
    let cancelled = false;

    const aiTimer = setTimeout(() => {
      if (cancelled) {
        aiThinkingRef.current = false;
        return;
      }
      let nextBoard = [...board];
      let nextMoveCount = moveCount;
      let nextP2 = { ...p2 };
      let nextWinner = winner;
      let nextLog = [...roundLog];
      let nextTwiceTurn = twiceTurn;

      const aiMove = getBestAIMove(board, 'O', 'X', moveCount);

      if (aiMove.type === 'place') {
        const index = aiMove.index;
        nextBoard[index] = 'O';
        playSound('click');
        nextLog.push({
          text: `CyberAI placed O at ${getCoordLabel(index)}.`,
          type: 'o'
        });

        if (checkWin(nextBoard, 'O')) {
          nextWinner = 'O';
          playSound('win');
          nextLog.push({ text: `🏆 CyberAI has won the game!`, type: 'success' });
        } else {
          if (nextTwiceTurn === 'O') {
            nextMoveCount += 2;
            nextTwiceTurn = null;
            nextLog.push({ text: `⚡ CyberAI ACCEPTED the skip! ${p1.name}'s turn is skipped.`, type: 'info' });
          } else {
            nextMoveCount += 1;
          }
          if (nextMoveCount === 6) {
            nextLog.push({ text: 'Phase 2: Advance Phase! Slide your existing 3 pieces.', type: 'info' });
          }
        }
      } else if (aiMove.type === 'move') {
        const { from, to, isIllegal } = aiMove;

        if (!isIllegal) {
          nextBoard[to] = 'O';
          nextBoard[from] = null;
          playSound('move');
          nextLog.push({
            text: `CyberAI moved piece from ${getCoordLabel(from)} to ${getCoordLabel(to)}.`,
            type: 'o'
          });

          if (checkWin(nextBoard, 'O')) {
            nextWinner = 'O';
            playSound('win');
            nextLog.push({ text: `🏆 CyberAI has won the game!`, type: 'success' });
          } else {
            if (nextTwiceTurn === 'O') {
              nextMoveCount += 2;
              nextTwiceTurn = null;
              nextLog.push({ text: `⚡ CyberAI ACCEPTED the skip! ${p1.name}'s turn is skipped.`, type: 'info' });
            } else {
              nextMoveCount += 1;
            }
          }
        } else {
          nextP2.penaltyCount += 1;
          playSound('penalty');
          nextLog.push({
            text: `⚠️ CyberAI played an illegal move! Penalty +1. [Total: ${nextP2.penaltyCount}/2]`,
            type: 'warn'
          });

          if (nextP2.penaltyCount === 2) {
            nextTwiceTurn = 'X';
            nextP2.penaltyCount = 0;
            nextLog.push({
              text: `🚨 PENALTY MAXED! You hold the option to skip CyberAI's next turn!`,
              type: 'danger'
            });
          }

          nextMoveCount += 1;
        }
      }

      // Check Draw limit
      if (nextMoveCount >= DRAW_MOVE_LIMIT && !nextWinner) {
        nextWinner = 'draw';
        nextLog.push({
          text: `⚔️ Move limit reached (${DRAW_MOVE_LIMIT})! The match is declared a draw.`,
          type: 'info'
        });
        playSound('penalty');
      }

      setBoard(nextBoard);
      setMoveCount(nextMoveCount);
      setP2(nextP2);
      setWinner(nextWinner);
      setRoundLog(nextLog);
      setTwiceTurn(nextTwiceTurn);

      setAiThinking(false);
      aiThinkingRef.current = false;
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(aiTimer);
    };
  }, [gameMode, board, moveCount, winner, activeMark, p1, p2, twiceTurn, roundLog, playSound]);

  // Human player cell interaction
  const handleCellClick = useCallback((index) => {
    if (winner) return;

    if (gameMode === 'vs-online') {
      if (onlineRole === 'host' && activeMark === 'O') return;
      if (onlineRole === 'client' && activeMark === 'X') return;
    }

    if (gameMode === 'vs-ai' && activeMark === 'O') return;

    let nextBoard = [...board];
    let nextMoveCount = moveCount;
    let nextP1 = { ...p1 };
    let nextP2 = { ...p2 };
    let nextTwiceTurn = twiceTurn;
    let nextWinner = winner;
    let nextLog = [...roundLog];

    // PHASE 1: Placement
    if (moveCount < 6) {
      if (board[index] !== null) {
        playSound('click');
        return;
      }

      nextBoard[index] = activeMark;
      playSound('click');
      nextLog.push({ text: `${activePlayer.name} placed ${activeMark} at ${getCoordLabel(index)}.`, type: activeMark.toLowerCase() });

      if (checkWin(nextBoard, activeMark)) {
        nextWinner = activeMark;
        playSound('win');
        nextLog.push({ text: `🏆 ${activePlayer.name} has won the game!`, type: 'success' });
      } else {
        nextMoveCount += 1;
        if (nextMoveCount === 6) {
          nextLog.push({ text: 'Phase 2: Advance Phase! Slide your existing 3 pieces.', type: 'info' });
        }
      }

      if (nextMoveCount >= DRAW_MOVE_LIMIT && !nextWinner) {
        nextWinner = 'draw';
        nextLog.push({ text: `⚔️ Move limit reached (${DRAW_MOVE_LIMIT})! The match is declared a draw.`, type: 'info' });
        playSound('penalty');
      }

      setBoard(nextBoard);
      setMoveCount(nextMoveCount);
      setWinner(nextWinner);
      setRoundLog(nextLog);

      if (onSyncState) {
        onSyncState(nextBoard, nextMoveCount, p1, p2, nextTwiceTurn, nextWinner, nextLog);
      }
    }
    // PHASE 2: Advanced Movement
    else {
      if (selectedPieceIndex === null) {
        if (board[index] !== activeMark) {
          playSound('click');
          nextLog.push({ text: `${activePlayer.name} clicked wrong piece. Select your own (${activeMark})!`, type: 'warn' });
          setRoundLog(nextLog);
          return;
        }
        setSelectedPieceIndex(index);
        playSound('select');
      } else {
        if (index === selectedPieceIndex) {
          setSelectedPieceIndex(null);
          playSound('click');
          return;
        }

        if (board[index] === activeMark) {
          setSelectedPieceIndex(index);
          playSound('select');
          return;
        }

        if (board[index] === null) {
          const valid = isValidMove(board, selectedPieceIndex, index);

          if (valid) {
            nextBoard[index] = activeMark;
            nextBoard[selectedPieceIndex] = null;
            playSound('move');
            nextLog.push({
              text: `${activePlayer.name} moved piece from ${getCoordLabel(selectedPieceIndex)} to ${getCoordLabel(index)}.`,
              type: activeMark.toLowerCase()
            });

            if (checkWin(nextBoard, activeMark)) {
              nextWinner = activeMark;
              playSound('win');
              nextLog.push({ text: `🏆 ${activePlayer.name} has won the game!`, type: 'success' });

              setBoard(nextBoard);
              setMoveCount(nextMoveCount + 1);
              setWinner(nextWinner);
              setRoundLog(nextLog);
              setSelectedPieceIndex(null);
              if (onSyncState) {
                onSyncState(nextBoard, nextMoveCount + 1, p1, p2, nextTwiceTurn, nextWinner, nextLog);
              }
              return;
            }

            nextMoveCount += 1;
            setSelectedPieceIndex(null);

            if (nextMoveCount >= DRAW_MOVE_LIMIT && !nextWinner) {
              nextWinner = 'draw';
              nextLog.push({ text: `⚔️ Move limit reached (${DRAW_MOVE_LIMIT})! The match is declared a draw.`, type: 'info' });
              playSound('penalty');
            }

            setBoard(nextBoard);
            setMoveCount(nextMoveCount);
            setWinner(nextWinner);
            setRoundLog(nextLog);
            if (onSyncState) {
              onSyncState(nextBoard, nextMoveCount, p1, p2, nextTwiceTurn, nextWinner, nextLog);
            }
          } else {
            // Illegal move
            if (activeMark === 'X') {
              nextP1.penaltyCount += 1;
            } else {
              nextP2.penaltyCount += 1;
            }
            const currentPenCount = activeMark === 'X' ? nextP1.penaltyCount : nextP2.penaltyCount;

            playSound('penalty');
            nextLog.push({
              text: `⚠️ ${activePlayer.name} played an illegal move! Penalty +1. [Total: ${currentPenCount}/2]`,
              type: 'warn'
            });

            if (currentPenCount === 2) {
              nextTwiceTurn = activeMark === 'X' ? 'O' : 'X';
              if (activeMark === 'X') nextP1.penaltyCount = 0;
              else nextP2.penaltyCount = 0;

              nextLog.push({
                text: `🚨 PENALTY MAXED! ${activeMark === 'X' ? p2.name : p1.name} holds the option to skip your next turn!`,
                type: 'danger'
              });
            }

            nextMoveCount += 1;
            setSelectedPieceIndex(null);

            if (nextMoveCount >= DRAW_MOVE_LIMIT && !nextWinner) {
              nextWinner = 'draw';
              nextLog.push({ text: `⚔️ Move limit reached (${DRAW_MOVE_LIMIT})! The match is declared a draw.`, type: 'info' });
              playSound('penalty');
            }

            setBoard(nextBoard);
            setMoveCount(nextMoveCount);
            setP1(nextP1);
            setP2(nextP2);
            setTwiceTurn(nextTwiceTurn);
            setWinner(nextWinner);
            setRoundLog(nextLog);

            if (onSyncState) {
              onSyncState(nextBoard, nextMoveCount, nextP1, nextP2, nextTwiceTurn, nextWinner, nextLog);
            }
          }
        }
      }
    }
  }, [
    winner, gameMode, onlineRole, activeMark, board, moveCount, p1, p2, twiceTurn,
    roundLog, selectedPieceIndex, activePlayer, playSound, onSyncState
  ]);

  const handleTwiceTurnChoice = useCallback((accept) => {
    playSound('click');
    let nextMoveCount = moveCount;
    let nextLog = [...roundLog];

    if (accept) {
      nextMoveCount += 2;
      nextLog.push({ text: `⚡ ${activePlayer.name} ACCEPTED the skip! Opponent's turn is skipped.`, type: 'info' });
    } else {
      nextMoveCount += 1;
      nextLog.push({ text: `🚫 ${activePlayer.name} DECLINED the skip. Normal turns continue.`, type: 'info' });
    }

    setMoveCount(nextMoveCount);
    setTwiceTurn(null);
    setRoundLog(nextLog);

    if (onSyncState) {
      onSyncState(board, nextMoveCount, p1, p2, null, winner, nextLog);
    }
  }, [moveCount, roundLog, activePlayer.name, playSound, onSyncState, board, p1, p2, winner]);

  const resetGameStates = useCallback(() => {
    setBoard(Array(9).fill(null));
    setMoveCount(0);
    setSelectedPieceIndex(null);
    setTwiceTurn(null);
    setWinner(null);
    setRoundLog([{ text: 'Rematch started! Phase 1: Placement.', type: 'info' }]);
    setP1((prev) => ({ ...prev, penaltyCount: 0 }));
    setP2((prev) => ({ ...prev, penaltyCount: 0 }));
    setAiThinking(false);
    aiThinkingRef.current = false;
  }, []);

  return {
    board,
    setBoard,
    moveCount,
    setMoveCount,
    p1,
    setP1,
    p2,
    setP2,
    selectedPieceIndex,
    setSelectedPieceIndex,
    twiceTurn,
    setTwiceTurn,
    showTwiceTurnPrompt,
    winner,
    setWinner,
    roundLog,
    setRoundLog,
    statusMessage,
    aiThinking,
    activeMark,
    activePlayer,
    handleCellClick,
    handleTwiceTurnChoice,
    resetGameStates
  };
}
