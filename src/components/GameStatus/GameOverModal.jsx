import { RotateCcw, LogOut, ArrowRight, Sparkles } from 'lucide-react';
import { AI_CONFIGS } from '../../aiEngine';

export function GameOverModal({
  winner,
  p1Name,
  p2Name,
  gameMode,
  aiDifficulty,
  justUnlockedImpossible,
  onPlayAgain,
  onBackToMenu,
  onChangeDifficulty
}) {
  const winningPlayerName = winner === 'X' ? p1Name : p2Name;
  const isAIGame = gameMode === 'vs-ai';
  const aiConfig = isAIGame && aiDifficulty ? AI_CONFIGS[aiDifficulty] : null;

  return (
    <div className="game-over-panel glass-panel animate-scale-up">
      {/* Tier Unlock Notice */}
      {justUnlockedImpossible && (
        <div className="unlock-banner animate-fade-in">
          <Sparkles size={16} className="unlock-icon" />
          <div className="unlock-text">
            <strong>The Arbiter Unlocked</strong>
            <span>All foundational tiers cleared. Challenge the ultimate engine.</span>
          </div>
        </div>
      )}

      {/* Outcome Header */}
      <div className="game-over-header">
        <div className="outcome-text-group">
          <div className="outcome-badge-row">
            <span className="outcome-kicker">Round Finished</span>
            {aiConfig && (
              <span className="diff-pill" style={{ '--pill-color': aiConfig.color }}>
                {aiConfig.name} • {aiConfig.title}
              </span>
            )}
          </div>
          
          <h2 className="game-over-title">
            {winner === 'draw' ? (
              'Match Drawn'
            ) : (
              <>
                <span className={winner === 'X' ? 'winner-name-x' : 'winner-name-o'}>
                  {winningPlayerName}
                </span>{' '}
                wins
              </>
            )}
          </h2>
        </div>

        {/* Quiet replay status indicator */}
        <div className="replay-loop-indicator" title="Boomerang replay of final moves">
          <span className="loop-pulse-dot" />
          <span>Boomerang replay</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="game-over-actions">
        <button className="btn btn-primary" onClick={onPlayAgain} style={{ flex: 1.2 }}>
          <RotateCcw size={16} /> Play Again
        </button>

        {isAIGame && onChangeDifficulty && (
          <button className="btn btn-secondary" onClick={onChangeDifficulty} style={{ flex: 1 }}>
            Opponent <ArrowRight size={14} />
          </button>
        )}

        <button className="btn btn-secondary" onClick={onBackToMenu} style={{ flex: 0.9 }}>
          <LogOut size={16} /> Menu
        </button>
      </div>
    </div>
  );
}
