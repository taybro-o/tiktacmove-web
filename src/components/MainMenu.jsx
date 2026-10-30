import { User, Edit2, Compass, Globe, Users2, Sparkles } from 'lucide-react';
import { AI_DIFFICULTIES, isDifficultyUnlocked } from '../aiEngine';

export function MainMenu({
  username,
  beatenDifficulties = [],
  onEditUsername,
  onStartAIGame,
  onStartOnlineSetup,
  onStartLocalGame
}) {
  const isFinalUnlocked = isDifficultyUnlocked(AI_DIFFICULTIES.IMPOSSIBLE, beatenDifficulties);
  const baseTiers = [AI_DIFFICULTIES.EASY, AI_DIFFICULTIES.MEDIUM, AI_DIFFICULTIES.HARD];
  const beatenCount = baseTiers.filter(d => beatenDifficulties.includes(d)).length;

  return (
    <main className="menu-view animate-scale-up">
      <div className="hero-section">
        <div className="user-profile-badge">
          <User size={13} />
          <span>Player: <strong>{username || 'Anonymous'}</strong></span>
          <button className="edit-btn" onClick={onEditUsername} title="Edit Name">
            <Edit2 size={11} />
          </button>
        </div>
        <h1>Tactical Sliding & Alignment</h1>
        <p className="hero-subtitle">
          Place three pieces, slide across unobstructed corridors, manage penalties, and claim the decisive alignment.
        </p>
      </div>

      <div className="mode-grid">
        <div className="glass-panel mode-card ai" onClick={onStartAIGame}>
          <div className="mode-icon-wrapper">
            <Compass size={28} />
          </div>
          <div className="mode-card-header-row">
            <h3>Solo vs Engine</h3>
            {isFinalUnlocked ? (
              <span className="mode-pill pill-gold">
                <Sparkles size={11} /> Arbiter Unlocked
              </span>
            ) : (
              <span className="mode-pill pill-slate">
                {beatenCount} / 3 Cleared
              </span>
            )}
          </div>
          <p>
            Face four tiers of positional play, from the intuitive Apprentice to the unbroken Arbiter.
          </p>
        </div>

        <div className="glass-panel mode-card online" onClick={onStartOnlineSetup}>
          <div className="mode-icon-wrapper">
            <Globe size={28} />
          </div>
          <h3>Online Match</h3>
          <p>Match with challengers across the web or create private rooms with friends.</p>
        </div>

        <div className="glass-panel mode-card local" onClick={onStartLocalGame}>
          <div className="mode-icon-wrapper">
            <Users2 size={28} />
          </div>
          <h3>Pass & Play</h3>
          <p>Local two-player contest on a single shared screen.</p>
        </div>
      </div>

      {/* Rules Summary */}
      <div className="glass-panel rules-card">
        <h4>Game Rules</h4>
        <ul className="rules-list">
          <li><strong>Phase 1 (Turns 1–6)</strong>: Take turns placing your three pieces on open cells.</li>
          <li><strong>Phase 2 (Turns 7+)</strong>: Slide one of your pieces along orthogonal or diagonal paths.</li>
          <li><strong>Corridor Clearance</strong>: Sliding 2 units requires the intermediate cell to be vacant.</li>
          <li><strong>Penalties</strong>: Illegal moves register a penalty and immediately conclude your turn.</li>
          <li><strong>Twice-Turn Opportunity</strong>: Reaching 2 penalties grants your opponent a skip-turn option.</li>
        </ul>
      </div>
    </main>
  );
}
