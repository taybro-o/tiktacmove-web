import { HelpCircle, LogOut, Volume2, VolumeX, Grid3X3 } from 'lucide-react';

export function Header({
  gameMode,
  soundEnabled,
  onToggleSound,
  onOpenTutorial,
  onBackToMenu
}) {
  return (
    <header className="game-header">
      <div className="logo-container" onClick={onBackToMenu}>
        <div className="logo-icon-box">
          <Grid3X3 size={18} />
        </div>
        <div className="logo-text-group">
          <span className="logo-text">TIKTACMOVE</span>
        </div>
      </div>

      <div className="header-controls">
        <button
          className="icon-btn"
          onClick={onOpenTutorial}
          title="How to Play"
          aria-label="Tutorial"
        >
          <HelpCircle size={18} />
        </button>

        {gameMode !== 'menu' && (
          <button
            className="icon-btn"
            onClick={onBackToMenu}
            title="Leave Match"
            aria-label="Menu"
          >
            <LogOut size={18} />
          </button>
        )}

        <button
          className="icon-btn"
          onClick={onToggleSound}
          title={soundEnabled ? "Mute Sound" : "Enable Sound"}
          aria-label="Toggle sound"
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>
    </header>
  );
}
