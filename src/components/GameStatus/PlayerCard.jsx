export function PlayerCard({
  p1,
  p2,
  activeMark
}) {
  return (
    <div className="glass-panel info-card">
      <div className="players-scores">
        {/* Player 1 (X) */}
        <div className={`player-score-row ${activeMark === 'X' ? 'active active-x' : ''}`}>
          <div className="player-meta-left">
            <span className="player-mark-indicator mark-x">X</span>
            <div>
              <p className="player-name-text">{p1.name}</p>
              <div className="penalties-container" title={`Penalties: ${p1.penaltyCount} / 2`}>
                <span className={`penalty-dot ${p1.penaltyCount >= 1 ? 'penalty-active' : 'penalty-empty'}`} />
                <span className={`penalty-dot ${p1.penaltyCount >= 2 ? 'penalty-active' : 'penalty-empty'}`} />
              </div>
            </div>
          </div>
          <span className="score-badge badge-x">Piece 1</span>
        </div>

        {/* Player 2 (O) */}
        <div className={`player-score-row ${activeMark === 'O' ? 'active active-o' : ''}`}>
          <div className="player-meta-left">
            <span className="player-mark-indicator mark-o">O</span>
            <div>
              <p className="player-name-text">{p2.name}</p>
              <div className="penalties-container" title={`Penalties: ${p2.penaltyCount} / 2`}>
                <span className={`penalty-dot ${p2.penaltyCount >= 1 ? 'penalty-active' : 'penalty-empty'}`} />
                <span className={`penalty-dot ${p2.penaltyCount >= 2 ? 'penalty-active' : 'penalty-empty'}`} />
              </div>
            </div>
          </div>
          <span className="score-badge badge-o">Piece 2</span>
        </div>
      </div>
    </div>
  );
}
