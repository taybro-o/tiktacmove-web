import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import './App.css';

// Constants & Services
import { syncGameState } from './services/firebaseService';
import { subscribeLeaderboard, syncStatsToLeaderboard } from './services/leaderboardService';

// Custom Hooks
import { useAudio } from './hooks/useAudio';
import { useGameState } from './hooks/useGameState';
import { useOnlineMultiplayer } from './hooks/useOnlineMultiplayer';
import { useReplayAnimation } from './hooks/useReplayAnimation';

// Components
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { GameBoard } from './components/GameBoard/GameBoard';
import { PlayerCard } from './components/GameStatus/PlayerCard';
import { StatusBanner } from './components/GameStatus/StatusBanner';
import { RoundLog } from './components/GameStatus/RoundLog';
import { GameOverModal } from './components/GameStatus/GameOverModal';
import { TwiceTurnModal } from './components/GameStatus/TwiceTurnModal';
import { OnlineLobby } from './components/Online/OnlineLobby';
import { ChatDrawer } from './components/Online/ChatDrawer';
import { UsernameModal } from './components/Modals/UsernameModal';
import { TutorialModal } from './components/Modals/TutorialModal';
import { AIDifficultyModal } from './components/Modals/AIDifficultyModal';
import { AI_CONFIGS, AI_DIFFICULTIES } from './aiEngine';

function App() {
  // ==================== USER PROFILE & LOCAL STATS ====================
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

  // ==================== AI DIFFICULTY & PROGRESSION ====================
  const [beatenDifficulties, setBeatenDifficulties] = useState(() => {
    try {
      const saved = localStorage.getItem('tiktacmove_beaten_ai');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [showAIDifficultyModal, setShowAIDifficultyModal] = useState(false);
  const [justUnlockedImpossible, setJustUnlockedImpossible] = useState(false);

  // ==================== APP FLOW STATE ====================
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'vs-ai', 'vs-local', 'vs-online', 'setup-online'
  const [showTutorial, setShowTutorial] = useState(() => {
    const isFirstTime = localStorage.getItem('tiktacmove_first_time') === null;
    if (isFirstTime) {
      localStorage.setItem('tiktacmove_first_time', 'visited');
      return true;
    }
    return false;
  });

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const hasPostedStatsRef = useRef(false);
  const gameModeRef = useRef(gameMode);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  // ==================== AUDIO HOOK ====================
  const { soundEnabled, toggleSound, playSound } = useAudio();

  // Forward declarations for multiplayer callbacks
  const gameStateRef = useRef(null);

  // ==================== MULTIPLAYER HOOK ====================
  const handleReceiveOpponentState = useCallback((data) => {
    if (!gameStateRef.current) return;
    const { setBoard, setMoveCount, setP1, setP2, setTwiceTurn, setWinner, setRoundLog, setMoveHistory } = gameStateRef.current;

    setBoard(data.board);
    setMoveCount(data.moveCount);
    setP1(data.p1);
    setP2(data.p2);
    setTwiceTurn(data.twiceTurn);
    setWinner(data.winner);
    setRoundLog(data.roundLog);
    if (data.moveHistory && setMoveHistory) {
      setMoveHistory(data.moveHistory);
    }

    if (gameModeRef.current === 'setup-online') {
      setGameMode('vs-online');
    }

    if (data.roundLog && data.roundLog.length > 0) {
      const lastLog = data.roundLog[data.roundLog.length - 1];
      if (lastLog?.text?.includes('illegal')) playSound('penalty');
      else if (lastLog?.text?.includes('won')) playSound('win');
      else if (lastLog?.text?.includes('selected')) playSound('select');
      else if (lastLog?.text?.includes('moved')) playSound('move');
      else if (!lastLog?.text?.includes('Waiting')) playSound('click');
    }
  }, [playSound]);

  const handleConnected = useCallback(({ p1Name, p2Name, initLog }) => {
    if (!gameStateRef.current) return;
    const { setBoard, setMoveCount, setP1, setP2, setTwiceTurn, setWinner, setRoundLog, setMoveHistory } = gameStateRef.current;

    setBoard(Array(9).fill(null));
    setMoveCount(0);
    setP1({ name: p1Name, mark: 'X', penaltyCount: 0 });
    setP2({ name: p2Name, mark: 'O', penaltyCount: 0 });
    setTwiceTurn(null);
    setWinner(null);
    setRoundLog(initLog);
    if (setMoveHistory) setMoveHistory([]);
    setGameMode('vs-online');
  }, []);

  const handleOpponentPlayAgain = useCallback(() => {
    if (gameStateRef.current) {
      gameStateRef.current.resetGameStates();
    }
  }, []);

  const {
    gameId,
    onlineRole,
    onlineStatus,
    chatMessages,
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
  } = useOnlineMultiplayer({
    username,
    playSound,
    onConnected: handleConnected,
    onReceiveOpponentState: handleReceiveOpponentState,
    onOpponentPlayAgain: handleOpponentPlayAgain
  });

  // State sync to Firebase relay
  const handleSyncState = useCallback((nextBoard, nextMoveCount, nextP1, nextP2, nextTwiceTurn, nextWinner, nextLog, nextMoveHistory) => {
    if (gameModeRef.current === 'vs-online' && gameId) {
      syncGameState(gameId, {
        board: nextBoard,
        moveCount: nextMoveCount,
        p1: nextP1,
        p2: nextP2,
        twiceTurn: nextTwiceTurn,
        winner: nextWinner,
        roundLog: nextLog,
        moveHistory: nextMoveHistory,
        role: onlineRole
      });
    }
  }, [gameId, onlineRole]);

  // ==================== GAME STATE HOOK ====================
  const {
    board,
    setBoard,
    moveCount,
    setMoveCount,
    p1,
    setP1,
    p2,
    setP2,
    selectedPieceIndex,
    setTwiceTurn,
    showTwiceTurnPrompt,
    winner,
    setWinner,
    roundLog,
    setRoundLog,
    moveHistory,
    setMoveHistory,
    slidingMove,
    statusMessage,
    activeMark,
    handleCellClick,
    handleTwiceTurnChoice,
    resetGameStates
  } = useGameState({
    gameMode,
    onlineRole,
    playSound,
    onSyncState: handleSyncState,
    aiDifficulty
  });

  // Replay animation hook for end of match
  const replayState = useReplayAnimation({
    winner,
    board,
    moveHistory
  });

  // Keep ref up to date for multiplayer callbacks
  useEffect(() => {
    gameStateRef.current = {
      setBoard,
      setMoveCount,
      setP1,
      setP2,
      setTwiceTurn,
      setWinner,
      setRoundLog,
      setMoveHistory,
      resetGameStates
    };
  }, [setBoard, setMoveCount, setP1, setP2, setTwiceTurn, setWinner, setRoundLog, setMoveHistory, resetGameStates]);

  // ==================== OUTCOME STATS TRACKING ====================
  useEffect(() => {
    if (!winner || gameMode !== 'vs-online' || hasPostedStatsRef.current) return;
    hasPostedStatsRef.current = true;

    const isWin = (winner === 'X' && onlineRole === 'host') || (winner === 'O' && onlineRole === 'client');
    const isLoss = (winner === 'X' && onlineRole === 'client') || (winner === 'O' && onlineRole === 'host');

    if (isWin || isLoss) {
      queueMicrotask(() => {
        setLocalOnlineStats((prev) => {
          const updated = {
            wins: (prev.wins || 0) + (isWin ? 1 : 0),
            losses: (prev.losses || 0) + (isLoss ? 1 : 0)
          };
          localStorage.setItem('tiktacmove_online_stats', JSON.stringify(updated));
          return updated;
        });
      });
      syncStatsToLeaderboard(username, isWin);
    }
  }, [winner, gameMode, onlineRole, username]);

  // ==================== AI VICTORY & PROGRESSION ====================
  useEffect(() => {
    if (winner === 'X' && gameMode === 'vs-ai') {
      queueMicrotask(() => {
        setBeatenDifficulties((prev) => {
          if (!prev.includes(aiDifficulty)) {
            const updated = [...prev, aiDifficulty];
            localStorage.setItem('tiktacmove_beaten_ai', JSON.stringify(updated));
            const base3 = [AI_DIFFICULTIES.EASY, AI_DIFFICULTIES.MEDIUM, AI_DIFFICULTIES.HARD];
            const wasUnlocked = base3.every(d => prev.includes(d));
            const nowUnlocked = base3.every(d => updated.includes(d));
            if (!wasUnlocked && nowUnlocked) {
              setJustUnlockedImpossible(true);
              playSound('win');
            }
            return updated;
          }
          return prev;
        });
      });
    }
  }, [winner, gameMode, aiDifficulty, playSound]);

  // ==================== LEADERBOARD SUBSCRIPTION ====================
  const fetchLeaderboard = useCallback(() => {
    return subscribeLeaderboard(
      (list) => {
        setLeaderboard(list);
        setLoadingLeaderboard(false);
      },
      () => setLoadingLeaderboard(false)
    );
  }, []);

  useEffect(() => {
    if (gameMode !== 'setup-online') return;
    const unsub = fetchLeaderboard();
    return () => unsub();
  }, [gameMode, fetchLeaderboard]);

  const handleRefreshLeaderboard = useCallback(() => {
    setLoadingLeaderboard(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ==================== MODE SWITCHING & GAME CONTROL ====================
  const startAIGame = useCallback((diff = aiDifficulty) => {
    const config = AI_CONFIGS[diff] || AI_CONFIGS.medium;
    setAiDifficulty(diff);
    setJustUnlockedImpossible(false);
    playSound('click');
    resetGameStates();
    setP1({ name: username || 'You', mark: 'X', penaltyCount: 0 });
    setP2({ name: config.name, mark: 'O', penaltyCount: 0 });
    setRoundLog([{ text: `VS ${config.name} (${config.title}) started! ${config.flavor}`, type: 'info' }]);
    setGameMode('vs-ai');
    setShowAIDifficultyModal(false);
  }, [playSound, resetGameStates, setP1, setP2, setRoundLog, username, aiDifficulty]);

  const startLocalGame = useCallback(() => {
    playSound('click');
    resetGameStates();
    setP1({ name: username || 'Player 1', mark: 'X', penaltyCount: 0 });
    setP2({ name: 'Player 2', mark: 'O', penaltyCount: 0 });
    setRoundLog([{ text: 'Game started! Phase 1: Placement.', type: 'info' }]);
    setGameMode('vs-local');
  }, [playSound, resetGameStates, setP1, setP2, setRoundLog, username]);

  const handleBackToMenu = useCallback(() => {
    playSound('click');
    disconnectOnline();
    resetGameStates();
    setJustUnlockedImpossible(false);
    setGameMode('menu');
  }, [playSound, disconnectOnline, resetGameStates]);

  const handlePlayAgain = useCallback(() => {
    playSound('click');
    resetGameStates();
    hasPostedStatsRef.current = false;
    setJustUnlockedImpossible(false);
    if (gameMode === 'vs-ai') {
      const config = AI_CONFIGS[aiDifficulty] || AI_CONFIGS.medium;
      setP1({ name: username || 'You', mark: 'X', penaltyCount: 0 });
      setP2({ name: config.name, mark: 'O', penaltyCount: 0 });
      setRoundLog([{ text: `Rematch with ${config.name} (${config.title}) started!`, type: 'info' }]);
    } else if (gameMode === 'vs-online') {
      handlePlayAgainOnline();
    }
  }, [playSound, resetGameStates, gameMode, handlePlayAgainOnline, aiDifficulty, username, setP1, setP2, setRoundLog]);

  return (
    <div className="app-container animate-fade-in">
      {/* Top Header */}
      <Header
        gameMode={gameMode}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenTutorial={() => {
          playSound('click');
          setShowTutorial(true);
        }}
        onBackToMenu={handleBackToMenu}
      />

      {/* Screen Modals */}
      {showUsernamePrompt && (
        <UsernameModal
          currentUsername={username}
          playSound={playSound}
          onSave={(newName) => {
            setUsername(newName);
            setShowUsernamePrompt(false);
          }}
        />
      )}

      {showTutorial && (
        <TutorialModal
          onClose={() => setShowTutorial(false)}
          playSound={playSound}
        />
      )}

      {showAIDifficultyModal && (
        <AIDifficultyModal
          beatenDifficulties={beatenDifficulties}
          onSelectDifficulty={(selectedDiff) => {
            startAIGame(selectedDiff);
          }}
          onClose={() => setShowAIDifficultyModal(false)}
          playSound={playSound}
        />
      )}

      {/* View 1: Main Menu */}
      {gameMode === 'menu' && (
        <MainMenu
          username={username}
          beatenDifficulties={beatenDifficulties}
          onEditUsername={() => {
            playSound('click');
            setShowUsernamePrompt(true);
          }}
          onStartAIGame={() => {
            playSound('click');
            setShowAIDifficultyModal(true);
          }}
          onStartOnlineSetup={() => {
            playSound('click');
            setLoadingLeaderboard(true);
            setGameMode('setup-online');
          }}
          onStartLocalGame={startLocalGame}
        />
      )}

      {/* View 2: Online Setup & Leaderboard */}
      {gameMode === 'setup-online' && (
        <OnlineLobby
          onlineStatus={onlineStatus}
          privateLobbyActive={privateLobbyActive}
          setPrivateLobbyActive={setPrivateLobbyActive}
          roomCodeInput={roomCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          gameId={gameId}
          copied={copied}
          localOnlineStats={localOnlineStats}
          leaderboard={leaderboard}
          loadingLeaderboard={loadingLeaderboard}
          username={username}
          onStartQuickMatch={startQuickMatch}
          onInitPrivateHost={initPrivateHost}
          onJoinPrivateLobby={joinPrivateLobby}
          onCancelMatchmaking={disconnectOnline}
          onCopyRoomCode={copyRoomCode}
          onRefreshLeaderboard={handleRefreshLeaderboard}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {/* View 3: In-Game Arena */}
      {gameMode !== 'menu' && gameMode !== 'setup-online' && (
        <main className="game-view animate-scale-up">
          {/* Main Board Container */}
          <section className="board-container">
            <StatusBanner statusMessage={statusMessage} activeMark={activeMark} />

            <GameBoard
              board={replayState.isReplayActive ? replayState.displayBoard : board}
              activeMark={activeMark}
              selectedPieceIndex={selectedPieceIndex}
              onCellClick={handleCellClick}
              replayHighlights={replayState.isReplayActive ? replayState.highlights : null}
              slidingMove={replayState.isReplayActive ? replayState.slidingMove : slidingMove}
            />

            {winner ? (
              <GameOverModal
                winner={winner}
                p1Name={p1.name}
                p2Name={p2.name}
                gameMode={gameMode}
                aiDifficulty={aiDifficulty}
                justUnlockedImpossible={justUnlockedImpossible}
                replayState={replayState}
                onPlayAgain={handlePlayAgain}
                onBackToMenu={handleBackToMenu}
                onChangeDifficulty={() => setShowAIDifficultyModal(true)}
              />
            ) : (
              <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '420px' }}>
                <button className="btn btn-secondary" onClick={handlePlayAgain} style={{ flex: 1 }}>
                  <RotateCcw size={16} /> Reset Match
                </button>
              </div>
            )}
          </section>

          {/* Right Sidebar: Scores, Log, and Chat */}
          <aside className="sidebar-panel">
            <PlayerCard p1={p1} p2={p2} activeMark={activeMark} />

            <RoundLog roundLog={roundLog} moveCount={moveCount} />

            {gameMode === 'vs-online' && (
              <ChatDrawer chatMessages={chatMessages} onSendMessage={sendChat} />
            )}
          </aside>
        </main>
      )}

      {/* In-Game Modals */}
      {showTwiceTurnPrompt && (
        <TwiceTurnModal onChoice={handleTwiceTurnChoice} />
      )}
    </div>
  );
}

export default App;
