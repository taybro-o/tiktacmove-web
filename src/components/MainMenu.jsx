import { User, Edit2, Cpu, Users, Play } from 'lucide-react';

export function MainMenu({
  username,
  onEditUsername,
  onStartAIGame,
  onStartOnlineSetup,
  onStartLocalGame
}) {
  return (
    <main className="menu-view animate-scale-up">
      <div className="hero-section">
        <div className="user-profile-badge">
          <User size={14} />
          <span>Playing as: <strong>{username || 'Anonymous'}</strong></span>
          <button className="edit-btn" onClick={onEditUsername} title="Edit Name">
            <Edit2 size={12} />
          </button>
        </div>
        <h1>The Strategic Sliding Game</h1>
        <p className="hero-subtitle">
          A premium, high-stakes evolution of classic Tic-Tac-Toe. Place your 3 pieces, slide them strategically across the board, dodge heavy penalties, and capture the victory!
        </p>
      </div>

      <div className="mode-grid">
        <div className="glass-panel mode-card ai" onClick={onStartAIGame}>
          <div className="mode-icon-wrapper">
            <Cpu size={32} color="var(--cyan)" />
          </div>
          <h3>VS CyberAI</h3>
          <p>Test your wits against a smart algorithmic engine in a cyber arena.</p>
        </div>

        <div className="glass-panel mode-card online" onClick={onStartOnlineSetup}>
          <div className="mode-icon-wrapper">
            <Users size={32} color="var(--pink)" />
          </div>
          <h3>Online Arena</h3>
          <p>Queue instantly to match with players worldwide or start a private lobby.</p>
        </div>

        <div className="glass-panel mode-card local" onClick={onStartLocalGame}>
          <div className="mode-icon-wrapper">
            <Play size={32} color="var(--yellow)" />
          </div>
          <h3>Pass & Play</h3>
          <p>Classic 2-player local action on a shared screen.</p>
        </div>
      </div>

      {/* Quick Rules Summary */}
      <div className="glass-panel rules-card">
        <h4>💡 How to Play</h4>
        <ul className="rules-list">
          <li><strong>Phase 1 (Turns 1-6)</strong>: Alternately place your 3 pieces on empty spaces.</li>
          <li><strong>Phase 2 (Turns 7+)</strong>: Slide one of your pieces to an empty cell.</li>
          <li><strong>Valid Slides</strong>: Orthogonal (1-2 steps) or Diagonal (1-2 steps).</li>
          <li><strong>Slide Obstacles</strong>: Sliding 2 units requires the intermediate cell to be empty.</li>
          <li><strong>Penalties</strong>: An illegal move scores 1 penalty and ends your turn immediately.</li>
          <li><strong>Twice Turn</strong>: Hit 2 penalties, and your opponent gets an option to skip your next turn!</li>
        </ul>
      </div>
    </main>
  );
}
