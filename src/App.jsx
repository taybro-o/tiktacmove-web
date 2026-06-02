import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Cpu, 
  Users, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Copy, 
  Check, 
  HelpCircle, 
  Send, 
  LogOut, 
  ArrowLeft, 
  User, 
  FileText, 
  Award,
  Edit2
} from 'lucide-react';
import { synth } from './audio';
import { 
  checkWin, 
  isValidMove, 
  getBestAIMove, 
  getCoords,
  SIZE 
} from './gameLogic';
import './App.css';
import { ref, get, set, runTransaction, onDisconnect, remove, query, orderByChild, limitToFirst, onValue, off } from 'firebase/database';
import { db } from './firebase';

// Public Shared Free JSON Bins on ExtendsClass
const LEADERBOARD_BIN = 'https://extendsclass.com/api/json-storage/bin/fbbaaad';

function App() {
  // ==================== CACHED USERNAME & STATS ====================
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('tiktacmove_username') || '';
  });
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(() => {
    return localStorage.getItem('tiktacmove_username') === null;
  });
  const [localOnlineStats, setLocalOnlineStats] = useState(() => {
    const saved = localStorage.getItem('tiktacmove_online_stats');
    return saved ? JSON.parse(saved) : { wins: 0, losses: 0 };
  });

  // ==================== APP STATE ====================
  const [gameMode, setGameMode] = useState('menu'); // menu, vs-ai, vs-local, vs-online, setup-online
  const [board, setBoard] = useState(Array(9).fill(null));
  const [moveCount, setMoveCount] = useState(0);
  const [p1, setP1] = useState({ name: 'Player 1', mark: 'X', penaltyCount: 0 });
  const [p2, setP2] = useState({ name: 'Player 2', mark: 'O', penaltyCount: 0 });
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(null);
  const [twiceTurn, setTwiceTurn] = useState(null); // 'X' or 'O' or null
  const [showTwiceTurnPrompt, setShowTwiceTurnPrompt] = useState(false);
  const [winner, setWinner] = useState(null); // 'X', 'O', 'draw', null
  const [roundLog, setRoundLog] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Click to place your mark!');
  const [aiThinking, setAiThinking] = useState(false);
  
  // Looping Tutorial Slides
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Global Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // ==================== ONLINE MULTIPLAYER STATE ====================
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [targetPeerId, setTargetPeerId] = useState('');
  const [onlineRole, setOnlineRole] = useState(''); // host, client
  const [onlineStatus, setOnlineStatus] = useState('disconnected'); // disconnected, connecting, waiting, connected, error
  const [inQueue, setInQueue] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Setup inputs
  const [usernameInput, setUsernameInput] = useState('');
  const [privateLobbyActive, setPrivateLobbyActive] = useState(false);

  // Refs
  const logEndRef = useRef(null);
  const chatEndRef = useRef(null);
  const hasPostedStatsRef = useRef(false);
  const aiThinkingRef = useRef(false);
  const gameModeRef = useRef(gameMode);
  const hasActiveConnectionRef = useRef(false);
  const queueListenerRef = useRef(null); // stores { unsubscribe } for the queue watcher

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  // First-time login / visitor check
  useEffect(() => {
    const isFirstTime = localStorage.getItem('tiktacmove_first_time') === null;
    if (isFirstTime) {
      setShowTutorial(true);
      localStorage.setItem('tiktacmove_first_time', 'visited');
    }
  }, []);

  // Fetch Leaderboard on entering setup
  useEffect(() => {
    if (gameMode === 'setup-online') {
      loadLeaderboard();
    }
  }, [gameMode]);

  // Scroll triggers (disabled log auto-scroll to prevent viewport jumping on smaller layouts)
  useEffect(() => {
    // logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roundLog]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Determine Active Player & Mark
  const activeMark = moveCount % 2 === 0 ? 'X' : 'O';
  const activePlayer = activeMark === 'X' ? p1 : p2;

  // Sound triggering helper
  const playSound = (soundType) => {
    if (!soundEnabled) return;
    if (soundType === 'click') synth.playClick();
    else if (soundType === 'select') synth.playSelect();
    else if (soundType === 'move') synth.playMove();
    else if (soundType === 'penalty') synth.playPenalty();
    else if (soundType === 'win') synth.playWin();
  };

  // Generate nice coordinates string (e.g. A1, B2, etc.)
  const getCoordLabel = (index) => {
    const coords = getCoords(index);
    const rowLetter = ['A', 'B', 'C'][coords.row];
    const colNum = coords.col + 1;
    return `${rowLetter}${colNum}`;
  };

  // ==================== DYNAMIC TURN & STATUS MESSAGE ENGINE ====================
  useEffect(() => {
    if (winner) {
      if (winner === 'draw') {
        setStatusMessage('⚔️ Match ended in a draw!');
      } else {
        const winningPlayer = winner === 'X' ? p1.name : p2.name;
        setStatusMessage(`🏆 ${winningPlayer} Wins the Arena!`);
      }
    } else {
      if (gameMode === 'vs-ai' && activeMark === 'O') {
        setStatusMessage('🤖 CyberAI is scanning the grid...');
      } else {
        const phaseLabel = moveCount < 6 ? 'Placement Phase' : 'Advance Phase';
        setStatusMessage(`⚡ ${activePlayer.name}'s Turn - [${phaseLabel}]`);
      }
    }
  }, [winner, moveCount, p1.name, p2.name, gameMode, activeMark]);

  // ==================== DRAW DETECTION ENGINE ====================
  // After 50 total moves (22 advance-phase moves per player), declare a draw
  const DRAW_MOVE_LIMIT = 50;
  useEffect(() => {
    if (winner || moveCount < DRAW_MOVE_LIMIT) return;
    if (gameMode === 'menu' || gameMode === 'setup-online') return;
    
    setWinner('draw');
    setRoundLog(prev => [...prev, { 
      text: `⚔️ Move limit reached (${DRAW_MOVE_LIMIT})! The match is declared a draw.`, 
      type: 'info' 
    }]);
    playSound('penalty');
  }, [moveCount, winner, gameMode]);

  // ==================== CYBERAI AUTOMATED TURN ENGINE ====================
  useEffect(() => {
    if (gameMode !== 'vs-ai' || winner || activeMark !== 'O') return;
    if (aiThinkingRef.current) return;

    aiThinkingRef.current = true;
    setAiThinking(true);

    const aiTimer = setTimeout(() => {
      let nextBoard = [...board];
      let nextMoveCount = moveCount;
      let nextP1 = { ...p1 };
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

        setBoard(nextBoard);
        setMoveCount(nextMoveCount);
        setWinner(nextWinner);
        setRoundLog(nextLog);
        setTwiceTurn(nextTwiceTurn);
      } 
      else if (aiMove.type === 'move') {
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

          setBoard(nextBoard);
          setMoveCount(nextMoveCount);
          setWinner(nextWinner);
          setRoundLog(nextLog);
          setTwiceTurn(nextTwiceTurn);
        } 
        else {
          // Illegal move fallback (penalized)
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

          setBoard(nextBoard);
          setMoveCount(nextMoveCount);
          setP2(nextP2);
          setTwiceTurn(nextTwiceTurn);
          setRoundLog(nextLog);
        }
      }

      setAiThinking(false);
      aiThinkingRef.current = false;
    }, 1000);

    return () => {
      clearTimeout(aiTimer);
    };
  }, [gameMode, board, moveCount, winner, activeMark, p1, p2, twiceTurn, roundLog]);

  // ==================== USERNAME SAVE FLOW ====================
  const handleSaveUsername = () => {
    if (!usernameInput.trim()) return alert('Username cannot be empty');
    playSound('click');
    localStorage.setItem('tiktacmove_username', usernameInput.trim());
    setUsername(usernameInput.trim());
    setShowUsernamePrompt(false);
  };

  const handleEditUsername = () => {
    playSound('click');
    setUsernameInput(username);
    setShowUsernamePrompt(true);
  };

  // ==================== LEADERBOARD API ====================
  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(LEADERBOARD_BIN);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (e) {
      console.error("Failed to load leaderboard", e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const syncStatsToLeaderboard = async (name, isWinner) => {
    try {
      const res = await fetch(LEADERBOARD_BIN);
      let data = await res.json();
      let list = data.leaderboard || [];
      
      if (!Array.isArray(list)) {
        list = [];
      }
      
      let player = list.find(p => p.username.toLowerCase() === name.toLowerCase());
      if (player) {
        if (isWinner) player.wins += 1;
        else player.losses += 1;
      } else {
        list.push({
          username: name,
          wins: isWinner ? 1 : 0,
          losses: isWinner ? 0 : 1
        });
      }
      
      // Sort: wins desc, then losses asc
      list.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
      
      // Keep top 15
      list = list.slice(0, 15);
      
      await fetch(LEADERBOARD_BIN, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderboard: list })
      });
      
      setLeaderboard(list);
    } catch (e) {
      console.error("Leaderboard post failed", e);
    }
  };

  // Listen for match outcomes to record statistics
  useEffect(() => {
    if (!winner || gameMode !== 'vs-online' || hasPostedStatsRef.current) return;
    
    hasPostedStatsRef.current = true;
    const isWin = (winner === 'X' && onlineRole === 'host') || (winner === 'O' && onlineRole === 'client');
    const isLoss = (winner === 'X' && onlineRole === 'client') || (winner === 'O' && onlineRole === 'host');
    
    if (isWin) {
      const nextStats = { ...localOnlineStats, wins: localOnlineStats.wins + 1 };
      setLocalOnlineStats(nextStats);
      localStorage.setItem('tiktacmove_online_stats', JSON.stringify(nextStats));
      syncStatsToLeaderboard(username, true);
    } else if (isLoss) {
      const nextStats = { ...localOnlineStats, losses: localOnlineStats.losses + 1 };
      setLocalOnlineStats(nextStats);
      localStorage.setItem('tiktacmove_online_stats', JSON.stringify(nextStats));
      syncStatsToLeaderboard(username, false);
    }
  }, [winner, gameMode]);

  // ==================== UNIFIED PEERJS ENGINE ====================
  const setupConnection = (connection, role) => {
    // If the host is already connected to a player, reject any secondary clients attempting to join
    if (role === 'host' && hasActiveConnectionRef.current) {
      console.log("Rejecting concurrent client connection:", connection.peer);
      try {
        const sendReject = () => {
          connection.send({ type: 'REJECTED', reason: 'LOBBY_FULL' });
          setTimeout(() => { connection.close(); }, 500);
        };
        if (connection.open) {
          sendReject();
        } else {
          connection.on('open', sendReject);
        }
      } catch (e) {
        connection.close();
      }
      return;
    }

    hasActiveConnectionRef.current = true;
    setConn(connection);
    setOnlineRole(role);
    setInQueue(false);
    setPrivateLobbyActive(false);

    const onOpen = () => {
      setOnlineStatus('connected');
      if (role === 'client') {
        // Client reports JOIN_GAME to the waiting Host
        connection.send({
          type: 'JOIN_GAME',
          p2Name: username
        });
      } else {
        // Host greets the Client with INIT_GAME
        connection.send({
          type: 'INIT_GAME',
          p1Name: username
        });
      }
    };

    if (connection.open) {
      onOpen();
    } else {
      connection.on('open', onOpen);
    }

    connection.on('data', (data) => {
      handleIncomingData(data);
    });

    connection.on('close', () => {
      handleOnlineDisconnect();
    });

    connection.on('error', (err) => {
      console.error("Connection channel error", err);
      handleOnlineDisconnect();
    });
  };

  // ==================== INSTANT MATCHMAKING QUEUE (FIREBASE RTDB) ====================
  const startQuickMatch = async () => {
    playSound('click');
    setOnlineStatus('connecting');
    setInQueue(true);
    setPrivateLobbyActive(false);
    hasPostedStatsRef.current = false;
    hasActiveConnectionRef.current = false;
    
    try {
      const { Peer } = await import('peerjs');
      const newPeer = new Peer();
      
      newPeer.on('open', async (id) => {
        setPeerId(id);
        setPeer(newPeer);
        
        // --- Step 1: Try to find and claim an existing host ---
        let claimed = false;
        try {
          const queueRef = ref(db, 'queue');
          const snapshot = await get(queueRef);
          
          if (snapshot.exists()) {
            const queueData = snapshot.val();
            for (const hostKey in queueData) {
              const hostData = queueData[hostKey];
              if (hostData.claimedBy || hostKey === id) continue;
              
              // Attempt atomic claim via transaction
              const hostEntryRef = ref(db, `queue/${hostKey}`);
              try {
                const { committed, snapshot: txSnapshot } = await runTransaction(hostEntryRef, (currentData) => {
                  if (currentData === null) return null; // entry deleted
                  if (currentData.claimedBy) return undefined; // abort — already claimed
                  currentData.claimedBy = id;
                  return currentData;
                });

                if (committed && txSnapshot.exists() && txSnapshot.val()?.claimedBy === id) {
                  // Successfully claimed this host
                  claimed = true;
                  console.log("Claimed host, connecting to:", hostData.peerId);
                  
                  const tempConn = newPeer.connect(hostData.peerId);
                  setupConnection(tempConn, 'client');
                  
                  // Set a timeout — if PeerJS can't connect in 10s, give up and become host
                  const connectTimeout = setTimeout(() => {
                    if (!hasActiveConnectionRef.current) {
                      console.warn("Connection to claimed host timed out, becoming host instead.");
                      try { tempConn.close(); } catch(e) {}
                      remove(hostEntryRef);
                      becomeHost(newPeer, id);
                    }
                  }, 10000);
                  
                  // Clear timeout once the connection actually opens
                  tempConn.on('open', () => clearTimeout(connectTimeout));
                  
                  remove(hostEntryRef);
                  return;
                }
              } catch(e) {
                console.error("Transaction failed for host:", hostKey, e);
              }
            }
          }
        } catch (e) {
          console.error("Queue fetch error", e);
        }

        // --- Step 2: No host found or claim failed — become host ourselves ---
        if (!claimed) {
          becomeHost(newPeer, id);
        }
      });
      
      newPeer.on('error', (err) => {
        console.error("PeerJS peer error:", err);
        setOnlineStatus('error');
        setInQueue(false);
        cleanupQueueListener();
      });
      
    } catch (e) {
      console.error(e);
      setOnlineStatus('error');
      setInQueue(false);
    }
  };

  // Become a host: register in queue AND start a real-time listener to auto-connect if someone claims us
  const becomeHost = async (peerInstance, myPeerId) => {
    setOnlineStatus('waiting');
    const myQueueRef = ref(db, `queue/${myPeerId}`);
    
    await set(myQueueRef, {
      peerId: myPeerId,
      name: username || 'Guest',
      timestamp: Date.now()
    });
    
    onDisconnect(myQueueRef).remove();

    // Listen for incoming PeerJS connections (normal path)
    peerInstance.on('connection', (connection) => {
      setupConnection(connection, 'host');
      remove(myQueueRef);
      cleanupQueueListener();
    });

    // ALSO: start a real-time watcher on the entire queue.
    // If another host appears (meaning someone else is also waiting),
    // we won't do anything — but if OUR entry gets claimed, we know a client is connecting.
    // More importantly: if we see an unclaimed entry from someone else, try to claim it.
    // This handles the race where both players registered as hosts simultaneously.
    const queueRef = ref(db, 'queue');
    const unsubscribe = onValue(queueRef, async (snapshot) => {
      // Don't act if we already have a connection
      if (hasActiveConnectionRef.current) return;
      
      if (!snapshot.exists()) return;
      const queueData = snapshot.val();
      
      for (const hostKey in queueData) {
        const hostData = queueData[hostKey];
        // Skip ourselves, skip already-claimed entries
        if (hostKey === myPeerId || hostData.claimedBy) continue;
        
        // Found another unclaimed host — try to claim them (we act as client)
        const otherHostRef = ref(db, `queue/${hostKey}`);
        try {
          const { committed, snapshot: txSnapshot } = await runTransaction(otherHostRef, (currentData) => {
            if (currentData === null) return null;
            if (currentData.claimedBy) return undefined; // abort
            currentData.claimedBy = myPeerId;
            return currentData;
          });

          if (committed && txSnapshot.exists() && txSnapshot.val()?.claimedBy === myPeerId) {
            console.log("Queue watcher: claimed another host, connecting to:", hostData.peerId);
            
            // Remove our own queue entry since we're now a client
            remove(myQueueRef);
            cleanupQueueListener();
            
            const tempConn = peerInstance.connect(hostData.peerId);
            setupConnection(tempConn, 'client');
            
            // Timeout for safety
            const connectTimeout = setTimeout(() => {
              if (!hasActiveConnectionRef.current) {
                console.warn("Queue watcher: connection timed out.");
                try { tempConn.close(); } catch(e) {}
                // Re-register as host
                becomeHost(peerInstance, myPeerId);
              }
            }, 10000);
            
            tempConn.on('open', () => clearTimeout(connectTimeout));
            
            remove(otherHostRef);
            return;
          }
        } catch(e) {
          console.error("Queue watcher transaction failed:", e);
        }
      }
    });

    // Store the unsubscribe function for cleanup
    queueListenerRef.current = { unsubscribe, queueRef: myQueueRef };
  };

  // Helper: clean up queue listener
  const cleanupQueueListener = () => {
    if (queueListenerRef.current) {
      try {
        queueListenerRef.current.unsubscribe();
      } catch(e) {}
      queueListenerRef.current = null;
    }
  };

  const cancelMatchmaking = async () => {
    playSound('click');
    hasActiveConnectionRef.current = false;
    cleanupQueueListener();
    
    if (peerId) {
      remove(ref(db, `queue/${peerId}`));
    }
    
    if (peer) {
      peer.destroy();
      setPeer(null);
      setConn(null);
    }
    setOnlineStatus('disconnected');
    setInQueue(false);
    setPrivateLobbyActive(false);
  };

  // ==================== PRIVATE ROOM SETUP FLOW ====================
  const initPrivateHost = async () => {
    playSound('click');
    setOnlineStatus('connecting');
    setPrivateLobbyActive(true);
    hasPostedStatsRef.current = false;
    hasActiveConnectionRef.current = false;
    
    try {
      const { Peer } = await import('peerjs');
      const newPeer = new Peer();
      
      newPeer.on('open', async (id) => {
        const shortCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        setPeerId(shortCode); // UI shows the short code
        setOnlineStatus('waiting');
        setPeer(newPeer);
        
        const roomRef = ref(db, `rooms/${shortCode}`);
        await set(roomRef, {
          hostPeerId: id,
          hostName: username || 'Host',
          timestamp: Date.now()
        });
        
        onDisconnect(roomRef).remove();

        newPeer.on('connection', (connection) => {
          setupConnection(connection, 'host');
          remove(roomRef);
        });
      });
      
      newPeer.on('error', (err) => {
        console.error(err);
        setOnlineStatus('error');
      });
      
    } catch (e) {
      console.error(e);
      setOnlineStatus('error');
    }
  };

  const joinPrivateLobby = async () => {
    if (!targetPeerId.trim()) return alert('Please enter a Room Code');
    playSound('click');
    setOnlineStatus('connecting');
    setPrivateLobbyActive(true);
    hasPostedStatsRef.current = false;
    hasActiveConnectionRef.current = false;
    
    try {
      const roomCode = targetPeerId.trim().toUpperCase();
      const snapshot = await get(ref(db, `rooms/${roomCode}`));
      
      if (!snapshot.exists()) {
        setOnlineStatus('error');
        alert('Room not found or expired.');
        return;
      }
      
      const hostData = snapshot.val();
      const actualPeerId = hostData.hostPeerId;
      
      const { Peer } = await import('peerjs');
      const newPeer = new Peer();
      
      newPeer.on('open', (id) => {
        setPeerId(id);
        setPeer(newPeer);
        
        const connection = newPeer.connect(actualPeerId);
        setupConnection(connection, 'client');
        
        // Timeout if PeerJS can't reach the host
        const connectTimeout = setTimeout(() => {
          if (!hasActiveConnectionRef.current) {
            setOnlineStatus('error');
            alert('Connection timed out. The host may have left.');
            try { connection.close(); } catch(e) {}
            try { newPeer.destroy(); } catch(e) {}
            setPeer(null);
            setConn(null);
          }
        }, 10000);
        
        connection.on('open', () => clearTimeout(connectTimeout));
      });
      
      newPeer.on('error', (err) => {
        console.error(err);
        setOnlineStatus('error');
        alert('Could not connect. Verify the Room Code.');
      });
      
    } catch (e) {
      console.error(e);
      setOnlineStatus('error');
    }
  };

  // ==================== DATA SYNC AND MESSAGING ====================
  const handleIncomingData = (data) => {
    if (data.type === 'REJECTED') {
      alert('This lobby is already full.');
      handleBackToMenu();
    }
    else if (data.type === 'INIT_GAME') {
      setP1({ name: data.p1Name, mark: 'X', penaltyCount: 0 });
      setP2({ name: username || 'Guest', mark: 'O', penaltyCount: 0 });
      setRoundLog([{ text: `🎮 Connected! Host: ${data.p1Name} (X). Client: ${username || 'Guest'} (O)`, type: 'info' }]);
      setGameMode('vs-online'); // Synchronously start game screen for guest!
    }
    else if (data.type === 'JOIN_GAME') {
      setP1({ name: username || 'Host', mark: 'X', penaltyCount: 0 });
      setP2({ name: data.p2Name, mark: 'O', penaltyCount: 0 });
      setRoundLog(prev => [...prev, { text: `🎮 Connected! Client: ${data.p2Name} (O) joined.`, type: 'info' }]);
      setGameMode('vs-online'); // Synchronously start game screen for host!
    }
    else if (data.type === 'SYNC_STATE') {
      setBoard(data.state.board);
      setMoveCount(data.state.moveCount);
      setP1(data.state.p1);
      setP2(data.state.p2);
      setTwiceTurn(data.state.twiceTurn);
      setWinner(data.state.winner);
      setRoundLog(data.state.roundLog);
      
      const lastLog = data.state.roundLog[data.state.roundLog.length - 1];
      if (lastLog) {
        if (lastLog.text.includes('illegal')) playSound('penalty');
        else if (lastLog.text.includes('won')) playSound('win');
        else if (lastLog.text.includes('selected')) playSound('select');
        else if (lastLog.text.includes('moved')) playSound('move');
        else playSound('click');
      }
    }
    else if (data.type === 'CHAT') {
      setChatMessages(prev => [...prev, { sender: 'them', text: data.text }]);
    }
    else if (data.type === 'PLAY_AGAIN') {
      resetGameStates();
    }
  };

  const handleOnlineDisconnect = () => {
    hasActiveConnectionRef.current = false;
    
    const activeMode = gameModeRef.current;
    if (activeMode === 'vs-online' || activeMode === 'setup-online') {
      setOnlineStatus('disconnected');
      alert('Opponent disconnected or lobby closed.');
      handleBackToMenu();
    } else {
      // We are in the menu. Only clean up the connection so we can accept new ones.
      if (conn) {
        try { conn.close(); } catch (e) {}
        setConn(null);
      }
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !conn) return;
    conn.send({
      type: 'CHAT',
      text: chatInput
    });
    setChatMessages(prev => [...prev, { sender: 'me', text: chatInput }]);
    setChatInput('');
  };

  const syncStateToPeer = (nextBoard, nextMoveCount, nextP1, nextP2, nextTwiceTurn, nextWinner, nextLog) => {
    if (conn) {
      conn.send({
        type: 'SYNC_STATE',
        state: {
          board: nextBoard,
          moveCount: nextMoveCount,
          p1: nextP1,
          p2: nextP2,
          twiceTurn: nextTwiceTurn,
          winner: nextWinner,
          roundLog: nextLog
        }
      });
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ==================== SINGLE PLAYER GAME LOGICS ====================
  const startLocalGame = () => {
    playSound('click');
    setBoard(Array(9).fill(null));
    setMoveCount(0);
    setP1({ name: username || 'Player 1', mark: 'X', penaltyCount: 0 });
    setP2({ name: 'Player 2', mark: 'O', penaltyCount: 0 });
    setSelectedPieceIndex(null);
    setTwiceTurn(null);
    setWinner(null);
    setRoundLog([{ text: 'Game started! Phase 1: Placement.', type: 'info' }]);
    setGameMode('vs-local');
  };

  const startAIGame = () => {
    playSound('click');
    setBoard(Array(9).fill(null));
    setMoveCount(0);
    setP1({ name: username || 'You', mark: 'X', penaltyCount: 0 });
    setP2({ name: 'CyberAI', mark: 'O', penaltyCount: 0 });
    setSelectedPieceIndex(null);
    setTwiceTurn(null);
    setWinner(null);
    setRoundLog([{ text: 'VS AI Game started! Defeat the CyberAI.', type: 'info' }]);
    setGameMode('vs-ai');
  };

  // ==================== CELL CLICK ACTIONS ====================
  const handleCellClick = (index) => {
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

      setBoard(nextBoard);
      setMoveCount(nextMoveCount);
      setWinner(nextWinner);
      setRoundLog(nextLog);
      syncStateToPeer(nextBoard, nextMoveCount, p1, p2, nextTwiceTurn, nextWinner, nextLog);
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
      } 
      else {
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
              syncStateToPeer(nextBoard, nextMoveCount + 1, p1, p2, nextTwiceTurn, nextWinner, nextLog);
              return;
            }

            if (twiceTurn === activeMark) {
              setBoard(nextBoard);
              setRoundLog(nextLog);
              setWinner(nextWinner);
              setSelectedPieceIndex(null);
              setShowTwiceTurnPrompt(true);
              return;
            }

            nextMoveCount += 1;
            setSelectedPieceIndex(null);
            setBoard(nextBoard);
            setMoveCount(nextMoveCount);
            setRoundLog(nextLog);
            syncStateToPeer(nextBoard, nextMoveCount, p1, p2, nextTwiceTurn, nextWinner, nextLog);
          } 
          // ILLEGAL MOVE PLAYED -> PENALTY INFLICTED
          else {
            let currentPenCount = 0;
            if (activeMark === 'X') {
              nextP1.penaltyCount += 1;
              currentPenCount = nextP1.penaltyCount;
            } else {
              nextP2.penaltyCount += 1;
              currentPenCount = nextP2.penaltyCount;
            }

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
            
            setBoard(nextBoard);
            setMoveCount(nextMoveCount);
            setP1(nextP1);
            setP2(nextP2);
            setTwiceTurn(nextTwiceTurn);
            setRoundLog(nextLog);
            
            syncStateToPeer(nextBoard, nextMoveCount, nextP1, nextP2, nextTwiceTurn, nextWinner, nextLog);
          }
        }
      }
    }
  };

  // Twice Turn Selection choice
  const handleTwiceTurnChoice = (accept) => {
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
    setShowTwiceTurnPrompt(false);
    setRoundLog(nextLog);

    if (gameMode === 'vs-online' && conn) {
      conn.send({
        type: 'SYNC_STATE',
        state: {
          board: board,
          moveCount: nextMoveCount,
          p1: p1,
          p2: p2,
          twiceTurn: null,
          winner: winner,
          roundLog: nextLog
        }
      });
    }
  };

  const resetGameStates = () => {
    setBoard(Array(9).fill(null));
    setMoveCount(0);
    setSelectedPieceIndex(null);
    setTwiceTurn(null);
    setShowTwiceTurnPrompt(false);
    setWinner(null);
    setRoundLog([{ text: 'Rematch started! Phase 1: Placement.', type: 'info' }]);
    
    let nextP1 = { ...p1, penaltyCount: 0 };
    let nextP2 = { ...p2, penaltyCount: 0 };
    setP1(nextP1);
    setP2(nextP2);

    setAiThinking(false);
    aiThinkingRef.current = false;
    hasPostedStatsRef.current = false;
  };

  const handlePlayAgain = () => {
    playSound('click');
    resetGameStates();
    if (gameMode === 'vs-online' && conn) {
      conn.send({
        type: 'PLAY_AGAIN'
      });
    }
  };

  // ==================== QUIT / RETURN TO MENU ====================
  const handleBackToMenu = () => {
    playSound('click');
    hasActiveConnectionRef.current = false;
    cleanupQueueListener();
    if (peerId) {
      remove(ref(db, `queue/${peerId}`));
      remove(ref(db, `rooms/${peerId}`));
    }
    if (conn) {
      try {
        conn.close();
      } catch (e) {}
      setConn(null);
    }
    if (peer) {
      try {
        peer.destroy();
      } catch (e) {}
      setPeer(null);
    }
    setGameMode('menu');
    setBoard(Array(9).fill(null));
    setMoveCount(0);
    setSelectedPieceIndex(null);
    setTwiceTurn(null);
    setWinner(null);
    setRoundLog([]);
    setOnlineRole('');
    setOnlineStatus('disconnected');
    setInQueue(false);
    setChatMessages([]);
    setChatInput('');
    setPrivateLobbyActive(false);
    setTargetPeerId('');

    setAiThinking(false);
    aiThinkingRef.current = false;
  };

  // ==================== RENDER LAYOUTS ====================
  return (
    <div className="app-container animate-fade-in">
      
      {/* 🚀 Header */}
      <header className="game-header">
        <div className="logo-container" onClick={handleBackToMenu}>
          <span className="logo-icon">💠</span>
          <span className="logo-text">TIKTACMOVE</span>
        </div>
        
        <div className="header-controls">
          <button className="icon-btn" onClick={() => { playSound('click'); setShowTutorial(true); setTutorialStep(0); }} title="How to Play Tutorial">
            <HelpCircle size={20} />
          </button>
          {gameMode !== 'menu' && (
            <button className="icon-btn" onClick={handleBackToMenu} title="Quit to Menu">
              <LogOut size={20} />
            </button>
          )}
          <button className="icon-btn" onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? "Mute Sound" : "Enable Sound"}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {/* ==================== SCREEN A: CACHED PROFILE PROMPT ==================== */}
      {showUsernamePrompt && (
        <div className="overlay-screen">
          <div className="glass-panel modal-content animate-scale-up" style={{ maxWidth: '420px' }}>
            <div className="winner-icon">💠</div>
            <h2>Create Your CyberProfile</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Enter a unique username for this browser instance. It will represent you globally on the public leaderboards!
            </p>
            <div className="input-group">
              <label htmlFor="uname">CyberName</label>
              <input 
                id="uname"
                className="input-field" 
                type="text" 
                maxLength={14}
                placeholder="Enter username..." 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveUsername}>
              Save CyberName ⚡
            </button>
          </div>
        </div>
      )}

      {/* ==================== 1. MAIN MENU ==================== */}
      {gameMode === 'menu' && (
        <main className="menu-view animate-scale-up">
          <div className="hero-section">
            <div className="user-profile-badge">
              <User size={14} />
              <span>Playing as: <strong>{username || 'Anonymous'}</strong></span>
              <button className="edit-btn" onClick={handleEditUsername} title="Edit Name">
                <Edit2 size={12} />
              </button>
            </div>
            <h1>The Strategic Sliding Game</h1>
            <p className="hero-subtitle">
              A premium, high-stakes evolution of classic Tic-Tac-Toe. Place your 3 pieces, slide them strategically across the board, dodge heavy penalties, and capture the victory!
            </p>
          </div>

          <div className="mode-grid">
            <div className="glass-panel mode-card ai" onClick={startAIGame}>
              <div className="mode-icon-wrapper">
                <Cpu size={32} color="var(--cyan)" />
              </div>
              <h3>VS CyberAI</h3>
              <p>Test your wits against a smart algorithmic engine in a cyber arena.</p>
            </div>

            <div className="glass-panel mode-card online" onClick={() => setGameMode('setup-online')}>
              <div className="mode-icon-wrapper">
                <Users size={32} color="var(--pink)" />
              </div>
              <h3>Online Arena</h3>
              <p>Queue instantly to match with players worldwide or start a private lobby.</p>
            </div>

            <div className="glass-panel mode-card local" onClick={startLocalGame}>
              <div className="mode-icon-wrapper">
                <Play size={32} color="var(--yellow)" />
              </div>
              <h3>Pass & Play</h3>
              <p>Classic 2-player local action on a shared screen.</p>
            </div>
          </div>

          {/* Quick Rules Summary */}
          <div className="glass-panel rules-card">
            <h4>💡 How to Play</h4>
            <ul className="rules-list">
              <li><strong>Phase 1 (Turns 1-6)</strong>: Alternately place your 3 pieces on empty spaces.</li>
              <li><strong>Phase 2 (Turns 7+)</strong>: Slide one of your pieces to an empty cell.</li>
              <li><strong>Valid Slides</strong>: Orthogonal (1-2 steps) or Diagonal (1-2 steps).</li>
              <li><strong>Slide Obstacles</strong>: Sliding 2 units requires the intermediate cell to be empty.</li>
              <li><strong>Penalties</strong>: An illegal move scores 1 penalty and ends your turn immediately.</li>
              <li><strong>Twice Turn</strong>: Hit 2 penalties, and your opponent gets an option to skip your next turn!</li>
            </ul>
          </div>
        </main>
      )}

      {/* ==================== 2. ONLINE LOBBY & LEADERBOARD DASHBOARD ==================== */}
      {gameMode === 'setup-online' && (
        <main className="online-dashboard animate-scale-up">
          
          {/* Left Column: Matchmaking Panels */}
          <section className="setup-panel-col">
            <div className="glass-panel setup-panel" style={{ flex: 'none' }}>
              <button className="icon-btn" style={{ marginBottom: '1.25rem', width: '38px', height: '38px' }} onClick={() => setGameMode('menu')}>
                <ArrowLeft size={16} />
              </button>
              
              <h2>Online Matchmaking</h2>

              {onlineStatus === 'disconnected' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  <button className="btn btn-primary btn-queue" onClick={startQuickMatch}>
                    ⚡ Quick Match (Find Player)
                  </button>
                  
                  <div className="divider"><span>OR PRIVATE LOBBY</span></div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={initPrivateHost}>
                      🔒 Create Room
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPrivateLobbyActive(true)}>
                      🔑 Join Room
                    </button>
                  </div>

                  {privateLobbyActive && (
                    <div className="private-join-box animate-scale-up" style={{ marginTop: '0.5rem' }}>
                      <div className="input-group">
                        <label htmlFor="rcode">Room Code</label>
                        <input 
                          id="rcode"
                          className="input-field" 
                          type="text" 
                          placeholder="Enter 5-character code" 
                          value={targetPeerId}
                          onChange={(e) => setTargetPeerId(e.target.value.toUpperCase())}
                        />
                      </div>
                      <button className="btn btn-primary" onClick={joinPrivateLobby} style={{ marginTop: '0.5rem', width: '100%' }}>
                        Join Private Lobby
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="lobby-waiting">
                  <div className="pulse-circle"></div>
                  
                  {onlineStatus === 'connecting' && <p>Connecting to peer servers...</p>}
                  
                  {onlineStatus === 'waiting' && (
                    <>
                      {!privateLobbyActive ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                          Searching for players globally...<br/>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Matchmaking queue is active.</span>
                        </p>
                      ) : (
                        <>
                          <p style={{ color: 'var(--text-secondary)' }}>Private Room Created! Share this code:</p>
                          <div className="room-code-container">
                            <span className="room-code">{peerId}</span>
                            <button className="copy-btn" onClick={copyRoomCode}>
                              {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Waiting for friend to connect...</p>
                        </>
                      )}
                    </>
                  )}
                  
                  <button className="btn btn-secondary" onClick={cancelMatchmaking} style={{ marginTop: '1rem', width: '100%' }}>
                    Cancel Search
                  </button>
                </div>
              )}
            </div>

            {/* Profile Statistics Card */}
            <div className="glass-panel setup-panel profile-stats-card" style={{ flex: 1 }}>
              <span className="stats-panel-header"><Award size={18} /> Your Arena Stats</span>
              <div className="stats-row-grid" style={{ marginTop: '1.25rem' }}>
                <div className="stat-box">
                  <span className="num green">{localOnlineStats.wins}</span>
                  <span className="lbl">Wins</span>
                </div>
                <div className="stat-box">
                  <span className="num pink">{localOnlineStats.losses}</span>
                  <span className="lbl">Losses</span>
                </div>
                <div className="stat-box">
                  <span className="num text-primary">
                    {localOnlineStats.wins + localOnlineStats.losses > 0 
                      ? Math.round((localOnlineStats.wins / (localOnlineStats.wins + localOnlineStats.losses)) * 100)
                      : 0}%
                  </span>
                  <span className="lbl">Win Rate</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Global Leaderboard */}
          <aside className="leaderboard-col">
            <div className="glass-panel leaderboard-panel">
              <div className="leaderboard-header">
                <h3>🏆 Global Cyber Arena Leaderboard</h3>
                <button className="icon-btn" onClick={loadLeaderboard} title="Refresh Scores" style={{ width: '36px', height: '36px' }}>
                  <RotateCcw size={16} />
                </button>
              </div>

              {loadingLeaderboard ? (
                <div className="leaderboard-loading">
                  <div className="pulse-circle" style={{ width: '40px', height: '40px' }}></div>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Fetching arena standings...</p>
                </div>
              ) : (
                <div className="leaderboard-table-wrapper">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>Rank</th>
                        <th>Username</th>
                        <th style={{ textAlign: 'center' }}>Wins</th>
                        <th style={{ textAlign: 'center' }}>Losses</th>
                        <th style={{ textAlign: 'right' }}>Win Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty-lb">No standings recorded. Be the first to win!</td>
                        </tr>
                      ) : (
                        leaderboard.map((player, idx) => {
                          const isSelf = player.username.toLowerCase() === username.toLowerCase();
                          const ratio = player.wins + player.losses > 0 
                            ? Math.round((player.wins / (player.wins + player.losses)) * 100) 
                            : 0;
                          return (
                            <tr key={idx} className={isSelf ? 'is-self' : ''}>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                {idx === 0 && '🥇'}
                                {idx === 1 && '🥈'}
                                {idx === 2 && '🥉'}
                                {idx > 2 && `${idx + 1}`}
                              </td>
                              <td style={{ fontWeight: 600 }}>{player.username} {isSelf && '(You)'}</td>
                              <td style={{ textAlign: 'center', color: 'var(--cyan)' }}>{player.wins}</td>
                              <td style={{ textAlign: 'center', color: 'var(--pink)' }}>{player.losses}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{ratio}%</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </aside>
        </main>
      )}

      {/* ==================== 3. GAMEPLAY BOARD VIEW ==================== */}
      {gameMode !== 'menu' && gameMode !== 'setup-online' && (
        <main className="game-view animate-scale-up">
          
          <section className="board-container">
            <div className={`glass-panel status-banner active-${activeMark.toLowerCase()}`}>
              <span className="banner-pulsar"></span>
              <h3>{statusMessage}</h3>
            </div>

            <div className={`game-board active-turn-${activeMark.toLowerCase()}`}>
              {board.map((cell, idx) => {
                const isSelected = selectedPieceIndex === idx;
                const isPossibleTarget = selectedPieceIndex !== null && cell === null;
                
                return (
                  <button 
                    key={idx}
                    id={`cell-${idx}`}
                    className={`board-cell 
                      ${isSelected ? 'selected-piece' : ''} 
                      ${isPossibleTarget ? 'highlight-target' : ''}
                    `}
                    onClick={() => handleCellClick(idx)}
                  >
                    {cell !== null && (
                      <span className={`piece ${cell === 'X' ? 'x-mark' : 'o-mark'}`}>
                        {cell}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '420px' }}>
              <button className="btn btn-secondary" onClick={handlePlayAgain} style={{ flex: 1 }}>
                <RotateCcw size={16} /> Reset Match
              </button>
            </div>
          </section>

          <aside className="sidebar-panel">
            <div className="glass-panel info-card">
              <div className="players-scores">
                <div className={`player-score-row ${activeMark === 'X' ? 'active' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem', textShadow: '0 0 5px var(--cyan-glow)' }}>🔵</span>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p1.name}</p>
                      <div className="penalties-container">
                        <span className="penalty-dot penalty-dot-empty"></span>
                        <span className={`penalty-dot ${p1.penaltyCount >= 1 ? 'penalty-1' : ''}`}></span>
                        <span className={`penalty-dot ${p1.penaltyCount >= 2 ? 'penalty-2' : ''}`}></span>
                      </div>
                    </div>
                  </div>
                  <span className="score-badge">X</span>
                </div>

                <div className={`player-score-row ${activeMark === 'O' ? 'active' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem', textShadow: '0 0 5px var(--pink-glow)' }}>🔴</span>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p2.name}</p>
                      <div className="penalties-container">
                        <span className="penalty-dot penalty-dot-empty"></span>
                        <span className={`penalty-dot ${p2.penaltyCount >= 1 ? 'penalty-1' : ''}`}></span>
                        <span className={`penalty-dot ${p2.penaltyCount >= 2 ? 'penalty-2' : ''}`}></span>
                      </div>
                    </div>
                  </div>
                  <span className="score-badge" style={{ color: 'var(--pink)' }}>O</span>
                </div>
              </div>
            </div>

            <div className="glass-panel info-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="history-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <FileText size={16} /> Action History
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Moves: {moveCount}
                </span>
              </div>
              
              <div className="history-list">
                {roundLog.length === 0 ? (
                  <p className="history-empty">No moves made yet</p>
                ) : (
                  roundLog.map((log, index) => (
                    <div 
                      key={index} 
                      className={`history-item ${log.type === 'warn' ? 'warn' : ''} ${log.type === 'danger' ? 'danger' : ''}`}
                    >
                      {log.text}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>

            {gameMode === 'vs-online' && (
              <div className="glass-panel info-card chat-container">
                <div className="history-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    💬 Lobby Chat
                  </span>
                </div>
                
                <div className="chat-messages">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-bubble ${msg.sender}`}>
                      {msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="chat-input-row">
                  <input 
                    className="chat-input"
                    type="text" 
                    placeholder="Type a message..." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  />
                  <button className="chat-send-btn" onClick={sendChatMessage}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </main>
      )}

      {/* ==================== 4. OVERLAYS & MODALS ==================== */}
      {/* twiceTurn Offer Skip Prompt */}
      {showTwiceTurnPrompt && (
        <div className="overlay-screen">
          <div className="glass-panel modal-content tutorial-modal animate-scale-up">
            <div className="twice-turn-icon">⚡</div>
            <h2>Twice Turn Opportunity!</h2>
            <p className="winner-detail">
              Your opponent triggered 2 penalties by playing illegal moves. You can choose to skip their next turn completely!
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => handleTwiceTurnChoice(true)}>
                Accept Skip (Yes)
              </button>
              <button className="btn btn-secondary" onClick={() => handleTwiceTurnChoice(false)}>
                Decline Skip (No)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Winner Overlay */}
      {winner && (
        <div className="overlay-screen">
          <div className="glass-panel modal-content animate-scale-up">
            <div className="winner-icon">🏆</div>
            <h2 className="winner-text">Game Over!</h2>
            <p className="winner-detail">
              {winner === 'draw' ? (
                "The match ended in a draw!"
              ) : (
                <>
                  <strong style={{ color: winner === 'X' ? 'var(--cyan)' : 'var(--pink)' }}>
                    {winner === 'X' ? p1.name : p2.name}
                  </strong> has dominated the grid and claimed the victory!
                </>
              )}
            </p>
            
            <div className="modal-actions" style={{ flexDirection: 'column' }}>
              <button className="btn btn-primary" onClick={handlePlayAgain} style={{ width: '100%' }}>
                <RotateCcw size={18} /> Play Again
              </button>
              <button className="btn btn-secondary" onClick={handleBackToMenu} style={{ width: '100%' }}>
                <LogOut size={18} /> Back to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Interactive Tutorial Modal */}
      {showTutorial && (
        <div className="overlay-screen">
          <div className="glass-panel modal-content tutorial-modal animate-scale-up">
            <div className="tutorial-header">
              <span className="step-count">Step {tutorialStep + 1} of 6</span>
              <button className="skip-link-btn" onClick={() => { playSound('click'); setShowTutorial(false); }}>
                Skip Tutorial
              </button>
            </div>
            
            <div className="tutorial-body">
              {tutorialStep === 0 && (
                <div className="tutorial-slide-content animate-scale-up">
                  <div className="tutorial-slide-icon">💠</div>
                  <h2>Step 1: Placement Setup</h2>
                  <p style={{ fontSize: '0.92rem' }}>
                    <strong>Turns 1-6</strong>: Alternately place your 3 pieces anywhere on open cells. Watch the staggered placements below:
                  </p>
                  
                  <div className="tutorial-board-preview">
                    <div className="preview-row">
                      <span className="preview-c active-o anim-place-2">O</span>
                      <span className="preview-c"></span>
                      <span className="preview-c active-x anim-place-5">X</span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c active-x anim-place-1">X</span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c active-o anim-place-4">O</span>
                      <span className="preview-c"></span>
                      <span className="preview-c active-o anim-place-3">O</span>
                    </div>
                  </div>
                  <p className="tutorial-subnote">Looping placement simulation above.</p>
                </div>
              )}

              {tutorialStep === 1 && (
                <div className="tutorial-slide-content animate-scale-up">
                  <div className="tutorial-slide-icon">🔄</div>
                  <h2>Step 2: Selection & Sliding</h2>
                  <p style={{ fontSize: '0.92rem' }}>
                    <strong>Turns 7+</strong>: No more placements! Click one of your existing pieces to select it, then slide it into a vacant empty cell.
                  </p>
                  
                  <div className="tutorial-board-preview">
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c active-x anim-slide-intro">X</span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                  </div>
                  <p className="tutorial-subnote">Loop: selecting piece and sliding it orthogonally.</p>
                </div>
              )}

              {tutorialStep === 2 && (
                <div className="tutorial-slide-content animate-scale-up">
                  <div className="tutorial-slide-icon">✅</div>
                  <h2>Step 3: Legal Move (1-Step)</h2>
                  <p style={{ fontSize: '0.92rem' }}>
                    You can slide your active piece **1 step** in any straight orthogonal (up/down/left/right) or diagonal direction.
                  </p>
                  
                  <div className="sandbox-feedback-banner fb-success">
                    ✅ LEGAL SLIDE: 1 step orthogonal or diagonal
                  </div>

                  <div className="tutorial-board-preview">
                    <div className="preview-row">
                      <span className="preview-c anim-step-glow" title="Legal diagonal slide target"></span>
                      <span className="preview-c anim-step-glow" title="Legal orthogonal slide target"></span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c active-x anim-slide-1step">X</span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                  </div>
                </div>
              )}

              {tutorialStep === 3 && (
                <div className="tutorial-slide-content animate-scale-up">
                  <div className="tutorial-slide-icon">🚀</div>
                  <h2>Step 4: Legal Move (2-Steps)</h2>
                  <p style={{ fontSize: '0.92rem' }}>
                    You can slide **2 steps** orthogonally or diagonally **IF** the intermediate cell in the path is completely empty!
                  </p>
                  
                  <div className="sandbox-feedback-banner fb-success">
                    ✅ LEGAL SLIDE: 2 steps (path is empty)
                  </div>

                  <div className="tutorial-board-preview">
                    <div className="preview-row">
                      <span className="preview-c active-x anim-slide-2step-open">X</span>
                      <span className="preview-c anim-path-empty" title="Intermediate cell is empty"></span>
                      <span className="preview-c anim-target-glow" title="Legal destination"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                  </div>
                </div>
              )}

              {tutorialStep === 4 && (
                <div className="tutorial-slide-content animate-scale-up">
                  <div className="tutorial-slide-icon">❌</div>
                  <h2>Step 5: Illegal (Blocked Path)</h2>
                  <p style={{ fontSize: '0.92rem' }}>
                    You **cannot** slide 2 steps if another piece blocks the path. Jumping over pieces is strictly forbidden!
                  </p>
                  
                  <div className="sandbox-feedback-banner fb-danger">
                    ❌ ILLEGAL: Path is blocked by opponent (O)!
                  </div>

                  <div className="tutorial-board-preview">
                    <div className="preview-row">
                      <span className="preview-c active-x anim-slide-2step-blocked">X</span>
                      <span className="preview-c active-o">O</span>
                      <span className="preview-c anim-error-glow" title="Blocked target"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                  </div>
                </div>
              )}

              {tutorialStep === 5 && (
                <div className="tutorial-slide-content animate-scale-up">
                  <div className="tutorial-slide-icon">⚠️</div>
                  <h2>Step 6: Illegal (Non-straight)</h2>
                  <p style={{ fontSize: '0.92rem' }}>
                    Moves must be in a single straight line. Curved paths (L-shapes or Knight jumps) are illegal and inflict penalties!
                  </p>
                  
                  <div className="sandbox-feedback-banner fb-danger">
                    ❌ ILLEGAL: L-shape jump or invalid direction!
                  </div>

                  <div className="tutorial-board-preview">
                    <div className="preview-row">
                      <span className="preview-c active-x anim-slide-invalid">X</span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c anim-error-glow" title="Invalid destination"></span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                      <span className="preview-c"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="tutorial-dots">
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <span 
                  key={idx} 
                  className={`dot ${idx === tutorialStep ? 'active' : ''}`}
                  onClick={() => { playSound('click'); setTutorialStep(idx); }}
                />
              ))}
            </div>

            <div className="modal-actions">
              {tutorialStep > 0 && (
                <button className="btn btn-secondary" onClick={() => { playSound('click'); setTutorialStep(prev => prev - 1); }}>
                  Back
                </button>
              )}
              {tutorialStep < 5 ? (
                <button className="btn btn-primary" onClick={() => { playSound('click'); setTutorialStep(prev => prev + 1); }} style={{ flex: 1 }}>
                  Next Step
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => { playSound('win'); setShowTutorial(false); }} style={{ flex: 1 }}>
                  Let's Play! 🎮
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
