import { useState, useRef, useCallback, useEffect } from 'react';
import { ref, get, set, runTransaction, onDisconnect, remove, onValue } from 'firebase/database';
import { db } from '../firebase';
import { BOARD_SIZE, EMPTY_CELL } from '../constants/game';
import { subscribeToGame, sendChatMessage, signalPlayAgain, cleanupSession } from '../services/firebaseService';

export function useOnlineMultiplayer({
  username,
  playSound,
  onConnected,
  onReceiveOpponentState,
  onOpponentPlayAgain
}) {
  const [gameId, setGameId] = useState('');
  const [onlineRole, setOnlineRole] = useState(''); // 'host' or 'client'
  const [onlineStatus, setOnlineStatus] = useState('disconnected'); // disconnected, connecting, waiting, connected, error
  const [inQueue, setInQueue] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [privateLobbyActive, setPrivateLobbyActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const peerIdRef = useRef('');
  const queueListenerRef = useRef(null);
  const gameListenerRef = useRef(null);

  const getMyPeerId = useCallback(() => {
    if (!peerIdRef.current) {
      peerIdRef.current = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }
    return peerIdRef.current;
  }, []);

  const cleanupQueueListener = useCallback(() => {
    if (queueListenerRef.current) {
      try { queueListenerRef.current(); } catch (e) { void e; }
      queueListenerRef.current = null;
    }
  }, []);

  const cleanupGameListener = useCallback(() => {
    if (gameListenerRef.current) {
      try { gameListenerRef.current(); } catch (e) { void e; }
      gameListenerRef.current = null;
    }
  }, []);

  // Setup game listener wrapper
  const setupGameListener = useCallback((gid, role) => {
    cleanupGameListener();
    const unsub = subscribeToGame(gid, role, {
      onStateUpdate: (data) => {
        if (onReceiveOpponentState) onReceiveOpponentState(data);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-49), { sender: 'them', text: msg.text }]);
      },
      onPlayAgain: (byRole) => {
        if (onOpponentPlayAgain) onOpponentPlayAgain(byRole);
      }
    });
    gameListenerRef.current = unsub;
  }, [cleanupGameListener, onReceiveOpponentState, onOpponentPlayAgain]);

  // Quick Match Host helper
  const becomeHost = useCallback(async (myPeerId) => {
    setOnlineStatus('waiting');
    setOnlineRole('host');
    setInQueue(false);

    const myQueueRef = ref(db, `queue/${myPeerId}`);
    await set(myQueueRef, {
      peerId: myPeerId,
      name: (username || 'Guest').slice(0, 25),
      timestamp: Date.now()
    });

    onDisconnect(myQueueRef).remove();

    const queueRef = ref(db, 'queue');
    const unsub = onValue(queueRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const queueData = snapshot.val();

      // Check if OUR entry was claimed
      const myEntry = queueData[myPeerId];
      if (myEntry && myEntry.claimedBy && myEntry.clientName) {
        cleanupQueueListener();
        remove(myQueueRef).catch(() => {});

        const gid = myPeerId;
        setGameId(gid);
        setupGameListener(gid, 'host');
        setOnlineStatus('connected');
        setOnlineRole('host');

        // Write initial game state to Firebase
        const initLog = [{ text: `🎮 Connected! Host: ${username || 'Host'} (X). Client: ${myEntry.clientName} (O)`, type: 'info' }];
        set(ref(db, `games/${gid}/state`), {
          p1: { name: (username || 'Host').slice(0, 25), mark: 'X', penaltyCount: 0 },
          p2: { name: myEntry.clientName.slice(0, 25), mark: 'O', penaltyCount: 0 },
          board: Array(BOARD_SIZE).fill(EMPTY_CELL),
          moveCount: 0,
          twiceTurn: null,
          winner: null,
          roundLog: initLog,
          lastMoveByRole: 'host',
          timestamp: Date.now()
        }).catch((e) => console.error("Firebase init error:", e));

        if (onConnected) {
          onConnected({
            role: 'host',
            gameId: gid,
            p1Name: username || 'Host',
            p2Name: myEntry.clientName,
            initLog
          });
        }
        return;
      }

      // Check if we can claim another host
      for (const hostKey in queueData) {
        const hostData = queueData[hostKey];
        if (hostKey === myPeerId || hostData.claimedBy) continue;

        const otherHostRef = ref(db, `queue/${hostKey}`);
        try {
          const { committed, snapshot: txSnapshot } = await runTransaction(otherHostRef, (currentData) => {
            if (currentData === null) return null;
            if (currentData.claimedBy) return undefined;
            currentData.claimedBy = myPeerId;
            currentData.clientName = (username || 'Guest').slice(0, 25);
            return currentData;
          });

          if (committed && txSnapshot.exists() && txSnapshot.val()?.claimedBy === myPeerId) {
            remove(myQueueRef).catch(() => {});
            cleanupQueueListener();

            const gid = hostKey;
            setGameId(gid);
            setOnlineRole('client');
            setupGameListener(gid, 'client');
            setOnlineStatus('connected');
            return;
          }
        } catch (e) { void e; }
      }
    });

    queueListenerRef.current = unsub;
  }, [username, cleanupQueueListener, setupGameListener, onConnected]);

  // Start Quick Match
  const startQuickMatch = useCallback(async () => {
    playSound('click');
    setOnlineStatus('connecting');
    setInQueue(true);
    setPrivateLobbyActive(false);

    const myId = getMyPeerId();
    let claimed = false;

    try {
      const queueRef = ref(db, 'queue');
      const snapshot = await get(queueRef);

      if (snapshot.exists()) {
        const queueData = snapshot.val();
        for (const hostKey in queueData) {
          const hostData = queueData[hostKey];
          if (hostData.claimedBy || hostKey === myId) continue;

          const hostEntryRef = ref(db, `queue/${hostKey}`);
          try {
            const { committed, snapshot: txSnapshot } = await runTransaction(hostEntryRef, (currentData) => {
              if (currentData === null) return null;
              if (currentData.claimedBy) return undefined;
              currentData.claimedBy = myId;
              currentData.clientName = (username || 'Guest').slice(0, 25);
              return currentData;
            });

            if (committed && txSnapshot.exists() && txSnapshot.val()?.claimedBy === myId) {
              claimed = true;
              setOnlineRole('client');
              setInQueue(false);
              const gid = hostKey;
              setGameId(gid);
              setupGameListener(gid, 'client');
              setOnlineStatus('connected');
              return;
            }
          } catch (e) {
            console.error("Queue claim transaction failed:", e);
          }
        }
      }
    } catch (e) {
      console.error("Queue fetch error:", e);
    }

    if (!claimed) {
      await becomeHost(myId);
    }
  }, [playSound, getMyPeerId, username, becomeHost, setupGameListener]);

  // Private Room Host
  const initPrivateHost = useCallback(async () => {
    playSound('click');
    setOnlineStatus('connecting');
    setPrivateLobbyActive(true);

    try {
      const shortCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      const gid = shortCode;
      setGameId(gid);
      setOnlineRole('host');
      setOnlineStatus('waiting');

      const roomRef = ref(db, `rooms/${shortCode}`);
      await set(roomRef, {
        hostName: (username || 'Host').slice(0, 25),
        timestamp: Date.now()
      });

      onDisconnect(roomRef).remove();

      const unsub = onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        if (data.clientName) {
          unsub();
          remove(roomRef).catch(() => {});
          setupGameListener(gid, 'host');
          setOnlineStatus('connected');

          const initLog = [{ text: `🎮 Connected! Host: ${username || 'Host'} (X). Client: ${data.clientName} (O)`, type: 'info' }];
          set(ref(db, `games/${gid}/state`), {
            p1: { name: (username || 'Host').slice(0, 25), mark: 'X', penaltyCount: 0 },
            p2: { name: data.clientName.slice(0, 25), mark: 'O', penaltyCount: 0 },
            board: Array(BOARD_SIZE).fill(EMPTY_CELL),
            moveCount: 0,
            twiceTurn: null,
            winner: null,
            roundLog: initLog,
            lastMoveByRole: 'host',
            timestamp: Date.now()
          }).catch((e) => console.error("Firebase init error:", e));

          if (onConnected) {
            onConnected({
              role: 'host',
              gameId: gid,
              p1Name: username || 'Host',
              p2Name: data.clientName,
              initLog
            });
          }
        }
      });
    } catch (e) {
      console.error("Private host creation failed:", e);
      setOnlineStatus('error');
    }
  }, [playSound, username, setupGameListener, onConnected]);

  // Private Room Join
  const joinPrivateLobby = useCallback(async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      alert('Please enter a Room Code');
      return;
    }
    playSound('click');
    setOnlineStatus('connecting');
    setPrivateLobbyActive(true);

    try {
      const snapshot = await get(ref(db, `rooms/${code}`));
      if (!snapshot.exists()) {
        setOnlineStatus('error');
        alert('Room not found or expired.');
        return;
      }

      const gid = code;
      setGameId(gid);
      setOnlineRole('client');

      await set(ref(db, `rooms/${code}/clientName`), (username || 'Guest').slice(0, 25));
      setupGameListener(gid, 'client');
      setOnlineStatus('connected');
    } catch (e) {
      console.error("Private join failed:", e);
      setOnlineStatus('error');
    }
  }, [roomCodeInput, playSound, username, setupGameListener]);

  // In-game Chat
  const sendChat = useCallback((text) => {
    const sanitized = text.trim().slice(0, 200);
    if (!sanitized || !gameId) return;

    setChatMessages((prev) => [...prev.slice(-49), { sender: 'me', text: sanitized }]);
    sendChatMessage(gameId, username || 'Guest', sanitized).catch((e) => console.error("Chat send error:", e));
  }, [gameId, username]);

  // Copy Room Code
  const copyRoomCode = useCallback(() => {
    if (!gameId) return;
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [gameId]);

  // Request Rematch
  const handlePlayAgainOnline = useCallback(() => {
    if (gameId) {
      signalPlayAgain(gameId, onlineRole).catch((e) => console.error("Play again signal failed:", e));
    }
  }, [gameId, onlineRole]);

  // Disconnect & Cleanup
  const disconnectOnline = useCallback(() => {
    cleanupQueueListener();
    cleanupGameListener();
    cleanupSession(gameId, peerIdRef.current);
    setGameId('');
    setOnlineStatus('disconnected');
    setOnlineRole('');
    setInQueue(false);
    setPrivateLobbyActive(false);
    setChatMessages([]);
    setRoomCodeInput('');
  }, [cleanupQueueListener, cleanupGameListener, gameId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupQueueListener();
      cleanupGameListener();
    };
  }, [cleanupQueueListener, cleanupGameListener]);

  return {
    gameId,
    onlineRole,
    onlineStatus,
    inQueue,
    chatMessages,
    setChatMessages,
    roomCodeInput,
    setRoomCodeInput,
    privateLobbyActive,
    setPrivateLobbyActive,
    copied,
    startQuickMatch,
    initPrivateHost,
    joinPrivateLobby,
    sendChat,
    copyRoomCode,
    handlePlayAgainOnline,
    disconnectOnline
  };
}
