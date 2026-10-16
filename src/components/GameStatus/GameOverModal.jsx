import { RotateCcw, LogOut } from 'lucide-react';

export function GameOverModal({
  winner,
  p1Name,
  p2Name,
  onPlayAgain,
  onBackToMenu
}) {
  return (
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
                {winner === 'X' ? p1Name : p2Name}
              </strong> has dominated the grid and claimed the victory!
            </>
          )}
        </p>

        <div className="modal-actions" style={{ flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={onPlayAgain} style={{ width: '100%' }}>
            <RotateCcw size={18} /> Play Again
          </button>
          <button className="btn btn-secondary" onClick={onBackToMenu} style={{ width: '100%' }}>
            <LogOut size={18} /> Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
