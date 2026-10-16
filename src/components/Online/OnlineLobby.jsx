import { ArrowLeft, Award, Copy, Check } from 'lucide-react';
import { LeaderboardTable } from './LeaderboardTable';

export function OnlineLobby({
  onlineStatus,
  privateLobbyActive,
  setPrivateLobbyActive,
  roomCodeInput,
  setRoomCodeInput,
  gameId,
  copied,
  localOnlineStats,
  leaderboard,
  loadingLeaderboard,
  username,
  onStartQuickMatch,
  onInitPrivateHost,
  onJoinPrivateLobby,
  onCancelMatchmaking,
  onCopyRoomCode,
  onRefreshLeaderboard,
  onBackToMenu
}) {
  const totalGames = (localOnlineStats.wins || 0) + (localOnlineStats.losses || 0);
  const winRate = totalGames > 0 ? Math.round(((localOnlineStats.wins || 0) / totalGames) * 100) : 0;

  return (
    <main className="online-dashboard animate-scale-up">
      {/* Left Column: Matchmaking Panels */}
      <section className="setup-panel-col">
        <div className="glass-panel setup-panel" style={{ flex: 'none' }}>
          <button
            className="icon-btn"
            style={{ marginBottom: '1.25rem', width: '38px', height: '38px' }}
            onClick={onBackToMenu}
            title="Back to Menu"
          >
            <ArrowLeft size={16} />
          </button>

          <h2>Online Matchmaking</h2>

          {onlineStatus === 'disconnected' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <button className="btn btn-primary btn-queue" onClick={onStartQuickMatch}>
                ⚡ Quick Match (Find Player)
              </button>

              <div className="divider"><span>OR PRIVATE LOBBY</span></div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onInitPrivateHost}>
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
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={onJoinPrivateLobby}
                    style={{ marginTop: '0.5rem', width: '100%' }}
                  >
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
                      Searching for players globally...<br />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Matchmaking queue is active.
                      </span>
                    </p>
                  ) : (
                    <>
                      <p style={{ color: 'var(--text-secondary)' }}>Private Room Created! Share this code:</p>
                      <div className="room-code-container">
                        <span className="room-code">{gameId}</span>
                        <button className="copy-btn" onClick={onCopyRoomCode} title="Copy Code">
                          {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Waiting for friend to connect...
                      </p>
                    </>
                  )}
                </>
              )}

              <button
                className="btn btn-secondary"
                onClick={onCancelMatchmaking}
                style={{ marginTop: '1rem', width: '100%' }}
              >
                Cancel Search
              </button>
            </div>
          )}
        </div>

        {/* Profile Statistics Card */}
        <div className="glass-panel setup-panel profile-stats-card" style={{ flex: 1 }}>
          <span className="stats-panel-header">
            <Award size={18} /> Your Arena Stats
          </span>
          <div className="stats-row-grid" style={{ marginTop: '1.25rem' }}>
            <div className="stat-box">
              <span className="num green">{localOnlineStats.wins || 0}</span>
              <span className="lbl">Wins</span>
            </div>
            <div className="stat-box">
              <span className="num pink">{localOnlineStats.losses || 0}</span>
              <span className="lbl">Losses</span>
            </div>
            <div className="stat-box">
              <span className="num text-primary">{winRate}%</span>
              <span className="lbl">Win Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Global Leaderboard */}
      <aside className="leaderboard-col">
        <LeaderboardTable
          leaderboard={leaderboard}
          loading={loadingLeaderboard}
          username={username}
          onRefresh={onRefreshLeaderboard}
        />
      </aside>
    </main>
  );
}
