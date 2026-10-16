import { HelpCircle, LogOut, Volume2, VolumeX } from 'lucide-react';

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
        <span className="logo-icon">💠</span>
        <span className="logo-text">TIKTACMOVE</span>
      </div>

      <div className="header-controls">
        <button
          className="icon-btn"
          onClick={onOpenTutorial}
          title="How to Play Tutorial"
        >
          <HelpCircle size={20} />
        </button>

        {gameMode !== 'menu' && (
          <button
            className="icon-btn"
            onClick={onBackToMenu}
            title="Quit to Menu"
          >
            <LogOut size={20} />
          </button>
        )}

        <button
          className="icon-btn"
          onClick={onToggleSound}
          title={soundEnabled ? "Mute Sound" : "Enable Sound"}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
    </header>
  );
}
