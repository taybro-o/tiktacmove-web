
export function TwiceTurnModal({ onChoice }) {
  return (
    <div className="overlay-screen">
      <div className="glass-panel modal-content tutorial-modal animate-scale-up">
        <div className="twice-turn-icon">⚡</div>
        <h2>Twice Turn Opportunity!</h2>
        <p className="winner-detail">
          Your opponent triggered 2 penalties by playing illegal moves. You can choose to skip their next turn completely!
        </p>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => onChoice(true)}>
            Accept Skip (Yes)
          </button>
          <button className="btn btn-secondary" onClick={() => onChoice(false)}>
            Decline Skip (No)
          </button>
        </div>
      </div>
    </div>
  );
}
