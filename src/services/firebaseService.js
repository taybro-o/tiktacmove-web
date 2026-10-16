import { ref, set, update, remove, onValue } from 'firebase/database';
import { db } from '../firebase';
import { boardToFirebase, boardFromFirebase } from '../constants/game';
import { checkWin } from '../gameLogic';

/**
 * Pushes game state update to Firebase for opponent synchronization.
 */
export async function syncGameState(gameId, { board, moveCount, p1, p2, twiceTurn, winner, roundLog, role }) {
  if (!gameId) return;
  const writeBoard = boardToFirebase(board);
  const writeLog = Array.isArray(roundLog) ? [...roundLog] : [];

  return set(ref(db, `games/${gameId}/state`), {
    board: writeBoard,
    moveCount,
    p1,
    p2,
    twiceTurn: twiceTurn ?? null,
    winner: winner || null,
    roundLog: writeLog,
    lastMoveByRole: role,
    timestamp: Date.now()
  }).catch((e) => console.error("Firebase sync error:", e));
}

/**
 * Listens for state changes, incoming chat, and play again triggers.
 * Returns a cleanup function.
 */
export function subscribeToGame(gameId, myRole, { onStateUpdate, onChatMessage, onPlayAgain }) {
  const gameStateRef = ref(db, `games/${gameId}/state`);
  const chatRef = ref(db, `games/${gameId}/chat`);
  const playAgainRef = ref(db, `games/${gameId}/playAgain`);

  const unsubState = onValue(gameStateRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    // Skip our own moves
    if (data.lastMoveByRole === myRole) return;

    const incomingBoard = boardFromFirebase(data.board);

    // Validate claimed winner
    let verifiedWinner = null;
    if (data.winner === 'X' || data.winner === 'O') {
      if (checkWin(incomingBoard, data.winner)) {
        verifiedWinner = data.winner;
      } else {
        console.warn(`[Security] Rejected unverified win claim for mark "${data.winner}"`);
      }
    } else if (data.winner === 'draw') {
      verifiedWinner = 'draw';
    }

    onStateUpdate({
      board: incomingBoard,
      moveCount: typeof data.moveCount === 'number' ? data.moveCount : 0,
      p1: data.p1 || { name: 'Player 1', mark: 'X', penaltyCount: 0 },
      p2: data.p2 || { name: 'Player 2', mark: 'O', penaltyCount: 0 },
      twiceTurn: data.twiceTurn || null,
      winner: verifiedWinner,
      roundLog: Array.isArray(data.roundLog) ? data.roundLog.slice(-50) : []
    });
  });

  const unsubChat = onValue(chatRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    if (data.sender && onChatMessage) {
      const safeText = typeof data.text === 'string' ? data.text.slice(0, 200) : '';
      if (safeText) {
        onChatMessage({ sender: data.sender, text: safeText });
      }
    }
  });

  const unsubPlayAgain = onValue(playAgainRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    if (data && data.triggered && onPlayAgain) {
      onPlayAgain(data.by);
      set(playAgainRef, null).catch(() => {});
    }
  });

  return () => {
    unsubState();
    unsubChat();
    unsubPlayAgain();
  };
}

/**
 * Sends a chat message to the game session.
 */
export async function sendChatMessage(gameId, sender, text) {
  if (!gameId || !text.trim()) return;
  const chatRef = ref(db, `games/${gameId}/chat`);
  return set(chatRef, {
    sender: sender.slice(0, 25),
    text: text.trim().slice(0, 200),
    timestamp: Date.now()
  });
}

/**
 * Signals opponent to play again.
 */
export async function signalPlayAgain(gameId, role) {
  if (!gameId) return;
  return set(ref(db, `games/${gameId}/playAgain`), {
    triggered: true,
    by: role
  });
}

/**
 * Cleans up game records on disconnect or return to menu.
 */
export async function cleanupSession(gameId, peerId) {
  if (peerId) {
    remove(ref(db, `queue/${peerId}`)).catch(() => {});
  }
  if (gameId) {
    update(ref(db), {
      [`games/${gameId}`]: null,
      [`rooms/${gameId}`]: null
    }).catch(() => {});
  }
}
