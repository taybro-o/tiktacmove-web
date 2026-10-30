import { Lock, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { AI_CONFIGS, AI_DIFFICULTIES, isDifficultyUnlocked } from '../../aiEngine';

export function AIDifficultyModal({
  beatenDifficulties = [],
  onSelectDifficulty,
  onClose,
  playSound
}) {
  const isImpossibleUnlocked = isDifficultyUnlocked(AI_DIFFICULTIES.IMPOSSIBLE, beatenDifficulties);
  const baseTiers = [AI_DIFFICULTIES.EASY, AI_DIFFICULTIES.MEDIUM, AI_DIFFICULTIES.HARD];
  const beatenCount = baseTiers.filter(d => beatenDifficulties.includes(d)).length;

  const handleSelect = (diffId) => {
    if (!isDifficultyUnlocked(diffId, beatenDifficulties)) {
      if (playSound) playSound('penalty');
      return;
    }
    if (playSound) playSound('select');
    onSelectDifficulty(diffId);
  };

  return (
    <div className="overlay-screen">
      <div className="glass-panel modal-content ai-difficulty-modal animate-scale-up">
        {/* Header */}
        <div className="difficulty-modal-header">
          <div className="difficulty-modal-title-wrap">
            <span className="modal-kicker">Solo Opposition</span>
            <h2 className="difficulty-modal-title">Select Difficulty</h2>
            <p className="difficulty-modal-subtitle">
              Master the Apprentice, Tactician, and Grandmaster to unlock <strong>The Arbiter</strong>.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => {
              if (playSound) playSound('click');
              onClose();
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress tracker */}
        <div className="ai-unlock-progress-bar">
          <div className="progress-info">
            <span className="progress-label">Foundational Tiers</span>
            <span className="progress-count">
              {beatenCount} of 3 Mastered
              {isImpossibleUnlocked && <span className="unlocked-text"> • The Arbiter Unlocked</span>}
            </span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${isImpossibleUnlocked ? 'fill-complete' : ''}`}
              style={{ width: `${(beatenCount / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Difficulty Cards Grid */}
        <div className="difficulty-cards-grid">
          {Object.values(AI_CONFIGS).map((config) => {
            const isUnlocked = isDifficultyUnlocked(config.id, beatenDifficulties);
            const isBeaten = beatenDifficulties.includes(config.id);
            const isFinalBoss = config.id === AI_DIFFICULTIES.IMPOSSIBLE;

            return (
              <div
                key={config.id}
                className={`difficulty-card glass-panel ${!isUnlocked ? 'card-locked' : ''} ${isFinalBoss ? 'card-final-boss' : ''} ${isBeaten ? 'card-beaten' : ''}`}
                style={{ '--card-accent': config.color }}
                onClick={() => handleSelect(config.id)}
              >
                {/* Header row */}
                <div className="diff-card-top">
                  <div className="diff-card-title-group">
                    <span className="diff-tier-tag">{config.tier} • {config.title}</span>
                    <h3 className="diff-name">{config.name}</h3>
                  </div>

                  <div className="diff-status-icon">
                    {isBeaten ? (
                      <span className="badge-beaten" title="Mastered">
                        <CheckCircle2 size={13} /> Mastered
                      </span>
                    ) : !isUnlocked ? (
                      <span className="badge-locked" title="Locked">
                        <Lock size={13} /> Locked
                      </span>
                    ) : (
                      <span className="badge-ready">
                        Available
                      </span>
                    )}
                  </div>
                </div>

                {/* Description & Flavor text */}
                <p className="diff-desc">{config.description}</p>
                <p className="diff-flavor">"{config.flavor}"</p>

                {/* Footer action */}
                <div className="diff-card-footer">
                  {isUnlocked ? (
                    <button
                      type="button"
                      className="btn btn-primary diff-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(config.id);
                      }}
                    >
                      <span>{isBeaten ? 'Rematch' : 'Begin Match'}</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div className="locked-requirement">
                      <Lock size={13} /> Clear Tier 1, 2 & 3 ({beatenCount}/3)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
