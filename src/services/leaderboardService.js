import { ref, onValue, runTransaction, get } from 'firebase/database';
import { db } from '../firebase';

/**
 * Returns today's UTC season date string, e.g. "2026-06-03"
 */
export const getTodaySeasonKey = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/**
 * Milliseconds until the next UTC midnight reset.
 */
export const msUntilReset = () => {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow - now;
};

/**
 * Formats milliseconds into HH:MM:SS string.
 */
export const formatResetCountdown = (ms) => {
  const safeMs = Math.max(0, ms);
  const h = Math.floor(safeMs / 3600000);
  const m = Math.floor((safeMs % 3600000) / 60000);
  const s = Math.floor((safeMs % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const getLeaderboardRef = () => ref(db, `leaderboard/${getTodaySeasonKey()}`);

/**
 * Subscribes to real-time daily leaderboard updates.
 * Returns unsubscribe function.
 */
export const subscribeLeaderboard = (onUpdate, onError) => {
  const seasonRef = getLeaderboardRef();
  return onValue(seasonRef, (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate([]);
      return;
    }
    const entries = snapshot.val() || {};
    let list = Object.values(entries);
    // Sort: wins desc, then losses asc
    list.sort((a, b) => (b.wins || 0) - (a.wins || 0) || (a.losses || 0) - (b.losses || 0));
    onUpdate(list.slice(0, 20));
  }, (err) => {
    console.error("Leaderboard subscription error:", err);
    if (onError) onError(err);
  });
};

/**
 * Checks if a username is already taken in today's season.
 */
export const checkUsernameAvailability = async (name, prevName = '') => {
  try {
    const seasonRef = getLeaderboardRef();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase check timeout')), 3000)
    );
    const snap = await Promise.race([get(seasonRef), timeoutPromise]);
    if (snap && snap.exists()) {
      const entries = snap.val();
      if (entries && typeof entries === 'object') {
        const taken = Object.values(entries).some(
          e => e && typeof e.username === 'string' && e.username.toLowerCase() === name.toLowerCase()
        );
        if (taken && (!prevName || prevName.toLowerCase() !== name.toLowerCase())) {
          return { available: false, error: `"${name}" is already taken today. Pick another!` };
        }
      }
    }
    return { available: true };
  } catch (e) {
    console.warn('Username check skipped or timed out:', e);
    return { available: true }; // Proceed gracefully on network timeout
  }
};

/**
 * Atomically updates player wins and losses on the daily leaderboard.
 */
export const syncStatsToLeaderboard = async (name, isWinner) => {
  if (!name) return;
  const nameLower = name.toLowerCase();
  const playerRef = ref(db, `leaderboard/${getTodaySeasonKey()}/${nameLower}`);
  try {
    await runTransaction(playerRef, (current) => {
      if (current === null) {
        return {
          username: name.slice(0, 25),
          wins: isWinner ? 1 : 0,
          losses: isWinner ? 0 : 1
        };
      }
      if (isWinner) current.wins = (current.wins || 0) + 1;
      else current.losses = (current.losses || 0) + 1;
      return current;
    });
  } catch (e) {
    console.error("Leaderboard sync failed", e);
  }
};
