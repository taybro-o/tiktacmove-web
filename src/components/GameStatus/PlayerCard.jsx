
export function PlayerCard({
  p1,
  p2,
  activeMark
}) {
  return (
    <div className="glass-panel info-card">
      <div className="players-scores">
        {/* Player 1 (X) */}
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

        {/* Player 2 (O) */}
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
  );
}
