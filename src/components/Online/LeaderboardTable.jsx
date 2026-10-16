import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { getTodaySeasonKey, msUntilReset, formatResetCountdown } from '../../services/leaderboardService';

export function LeaderboardTable({
  leaderboard,
  loading,
  username,
  onRefresh
}) {
  const [countdown, setCountdown] = useState(() => formatResetCountdown(msUntilReset()));

  // Self-contained 1-second ticking countdown (isolated from parent re-renders)
  useEffect(() => {
    const tick = () => {
      setCountdown(formatResetCountdown(msUntilReset()));
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="glass-panel leaderboard-panel">
      <div className="leaderboard-header">
        <h3>🏆 Daily Cyber Arena</h3>
        <button
          className="icon-btn"
          onClick={onRefresh}
          title="Refresh Scores"
          style={{ width: '36px', height: '36px' }}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.8rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <span>Season: {getTodaySeasonKey()}</span>
        <span>Resets in <strong style={{ color: 'var(--cyan)' }}>{countdown}</strong></span>
      </div>

      {loading ? (
        <div className="leaderboard-loading">
          <div className="pulse-circle" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Fetching arena standings...
          </p>
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
                  <td colSpan={5} className="empty-lb">
                    No standings recorded. Be the first to win!
                  </td>
                </tr>
              ) : (
                leaderboard.map((player, idx) => {
                  const isSelf = username && player.username && player.username.toLowerCase() === username.toLowerCase();
                  const total = (player.wins || 0) + (player.losses || 0);
                  const ratio = total > 0 ? Math.round(((player.wins || 0) / total) * 100) : 0;

                  return (
                    <tr key={idx} className={isSelf ? 'is-self' : ''}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {idx === 0 && '🥇'}
                        {idx === 1 && '🥈'}
                        {idx === 2 && '🥉'}
                        {idx > 2 && `${idx + 1}`}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {player.username} {isSelf && '(You)'}
                      </td>
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
  );
}
