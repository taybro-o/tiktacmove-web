const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Add Firebase imports and remove MATCHMAKING_BIN
code = code.replace(
  "import './App.css';\n\n// Public Shared Free JSON Bins on ExtendsClass\nconst LEADERBOARD_BIN = 'https://extendsclass.com/api/json-storage/bin/fbbaaad';\nconst MATCHMAKING_BIN = '/api/matchmaking';",
  "import './App.css';\nimport { ref, get, set, runTransaction, onDisconnect, remove, query, orderByChild, limitToFirst } from 'firebase/database';\nimport { db } from './firebase';\n\n// Public Shared Free JSON Bins on ExtendsClass\nconst LEADERBOARD_BIN = 'https://extendsclass.com/api/json-storage/bin/fbbaaad';"
);

// 2. Replace the matchmaking block (from INSTANT MATCHMAKING QUEUE to DATA SYNC AND MESSAGING)
const startMarker = "  // ==================== INSTANT MATCHMAKING QUEUE ====================";
const endMarker = "  // ==================== DATA SYNC AND MESSAGING ====================";
const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newMatchmakingBlock = `  // ==================== INSTANT MATCHMAKING QUEUE (FIREBASE RTDB) ====================
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
        
        // 1. Check if there's an active host waiting
        const queueRef = query(ref(db, 'queue'), orderByChild('timestamp'), limitToFirst(1));
        const snapshot = await get(queueRef);
        
        let foundHost = null;
        if (snapshot.exists()) {
          const queueData = snapshot.val();
          const hostKey = Object.keys(queueData)[0];
          const hostData = queueData[hostKey];
          
          // Check if it's recent (less than 2 mins old) and not claimed
          if (Date.now() - hostData.timestamp < 120000 && !hostData.claimedBy) {
            foundHost = { key: hostKey, data: hostData };
          }
        }

        if (foundHost) {
          // Attempt atomic transaction to claim the slot
          const hostRef = ref(db, \`queue/\${foundHost.key}\`);
          const { committed, snapshot: txSnapshot } = await runTransaction(hostRef, (currentData) => {
            if (currentData === null) return null;
            if (currentData.claimedBy) return;
            currentData.claimedBy = id;
            return currentData;
          });

          if (committed && txSnapshot.val().claimedBy === id) {
            console.log("Found host, attempting to connect:", foundHost.data.peerId);
            const tempConn = newPeer.connect(foundHost.data.peerId);
            setupConnection(tempConn, 'client');
            
            remove(hostRef);
            return;
          }
        }

        // 2. Become Host
        setOnlineStatus('waiting');
        const myQueueRef = ref(db, \`queue/\${id}\`);
        await set(myQueueRef, {
          peerId: id,
          name: username || 'Guest',
          timestamp: Date.now()
        });
        
        onDisconnect(myQueueRef).remove();

        newPeer.on('connection', (connection) => {
          setupConnection(connection, 'host');
          remove(myQueueRef);
        });
      });
      
      newPeer.on('error', (err) => {
        console.error("PeerJS peer error:", err);
        setOnlineStatus('error');
        setInQueue(false);
      });
      
    } catch (e) {
      console.error(e);
      setOnlineStatus('error');
      setInQueue(false);
    }
  };

  const cancelMatchmaking = async () => {
    playSound('click');
    hasActiveConnectionRef.current = false;
    
    if (peerId) {
      remove(ref(db, \`queue/\${peerId}\`));
      remove(ref(db, \`rooms/\${peerId}\`));
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

  // ==================== PRIVATE ROOM SETUP FLOW (FIREBASE RTDB) ====================
  const initPrivateHost = async () => {
    playSound('click');
    setOnlineStatus('connecting');
    setPrivateLobbyActive(true);
    hasPostedStatsRef.current = false;
    
    try {
      const { Peer } = await import('peerjs');
      const newPeer = new Peer();
      
      newPeer.on('open', async (id) => {
        const shortCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        setPeerId(shortCode);
        setOnlineStatus('waiting');
        setPeer(newPeer);
        
        const roomRef = ref(db, \`rooms/\${shortCode}\`);
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
    
    try {
      const roomCode = targetPeerId.trim().toUpperCase();
      const snapshot = await get(ref(db, \`rooms/\${roomCode}\`));
      
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

`;
  code = code.substring(0, startIndex) + newMatchmakingBlock + code.substring(endIndex);
}

// 3. Remove matchmakingIntervalRef completely
code = code.replace(/const matchmakingIntervalRef = useRef\(null\);\n/g, "");
code = code.replace(/if \(matchmakingIntervalRef\.current\) {\n\s*clearInterval\(matchmakingIntervalRef\.current\);\n\s*}\n/g, "");
code = code.replace(/if \(matchmakingIntervalRef\.current\) clearInterval\(matchmakingIntervalRef\.current\);\n/g, "");

// Add cleanup of Firebase queues on Back to Menu
code = code.replace(
  "  const handleBackToMenu = () => {\n    playSound('click');\n    hasActiveConnectionRef.current = false;\n",
  "  const handleBackToMenu = () => {\n    playSound('click');\n    hasActiveConnectionRef.current = false;\n    if (peerId) {\n      remove(ref(db, `queue/${peerId}`));\n      remove(ref(db, `rooms/${peerId}`));\n    }\n"
);

fs.writeFileSync('src/App.jsx', code);
console.log("App.jsx updated successfully.");
