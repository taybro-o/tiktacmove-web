import { useState } from 'react';

export function TutorialModal({ onClose, playSound }) {
  const [tutorialStep, setTutorialStep] = useState(0);

  const handleNext = () => {
    if (playSound) playSound('click');
    setTutorialStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (playSound) playSound('click');
    setTutorialStep((prev) => prev - 1);
  };

  const handleFinish = () => {
    if (playSound) playSound('win');
    onClose();
  };

  const handleSkip = () => {
    if (playSound) playSound('click');
    onClose();
  };

  const handleDotClick = (idx) => {
    if (playSound) playSound('click');
    setTutorialStep(idx);
  };

  return (
    <div className="overlay-screen">
      <div className="glass-panel modal-content tutorial-modal animate-scale-up">
        <div className="tutorial-header">
          <span className="step-count">Step {tutorialStep + 1} of 6</span>
          <button className="skip-link-btn" onClick={handleSkip}>
            Skip Tutorial
          </button>
        </div>

        <div className="tutorial-body">
          {tutorialStep === 0 && (
            <div className="tutorial-slide-content animate-scale-up">
              <div className="tutorial-slide-icon">💠</div>
              <h2>Step 1: Placement Setup</h2>
              <p style={{ fontSize: '0.92rem' }}>
                <strong>Turns 1-6</strong>: Alternately place your 3 pieces anywhere on open cells. Watch the staggered placements below:
              </p>

              <div className="tutorial-board-preview">
                <div className="preview-row">
                  <span className="preview-c active-o anim-place-2">O</span>
                  <span className="preview-c"></span>
                  <span className="preview-c active-x anim-place-5">X</span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c active-x anim-place-1">X</span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c active-o anim-place-4">O</span>
                  <span className="preview-c"></span>
                  <span className="preview-c active-o anim-place-3">O</span>
                </div>
              </div>
              <p className="tutorial-subnote">Looping placement simulation above.</p>
            </div>
          )}

          {tutorialStep === 1 && (
            <div className="tutorial-slide-content animate-scale-up">
              <div className="tutorial-slide-icon">🔄</div>
              <h2>Step 2: Selection & Sliding</h2>
              <p style={{ fontSize: '0.92rem' }}>
                <strong>Turns 7+</strong>: No more placements! Click one of your existing pieces to select it, then slide it into a vacant empty cell.
              </p>

              <div className="tutorial-board-preview">
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c active-x anim-slide-intro">X</span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
              </div>
              <p className="tutorial-subnote">Loop: selecting piece and sliding it orthogonally.</p>
            </div>
          )}

          {tutorialStep === 2 && (
            <div className="tutorial-slide-content animate-scale-up">
              <div className="tutorial-slide-icon">✅</div>
              <h2>Step 3: Legal Move (1-Step)</h2>
              <p style={{ fontSize: '0.92rem' }}>
                You can slide your active piece <strong>1 step</strong> in any straight orthogonal (up/down/left/right) or diagonal direction.
              </p>

              <div className="sandbox-feedback-banner fb-success">
                ✅ LEGAL SLIDE: 1 step orthogonal or diagonal
              </div>

              <div className="tutorial-board-preview">
                <div className="preview-row">
                  <span className="preview-c anim-step-glow" title="Legal diagonal slide target"></span>
                  <span className="preview-c anim-step-glow" title="Legal orthogonal slide target"></span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c active-x anim-slide-1step">X</span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
              </div>
            </div>
          )}

          {tutorialStep === 3 && (
            <div className="tutorial-slide-content animate-scale-up">
              <div className="tutorial-slide-icon">🚀</div>
              <h2>Step 4: Legal Move (2-Steps)</h2>
              <p style={{ fontSize: '0.92rem' }}>
                You can slide <strong>2 steps</strong> orthogonally or diagonally <strong>IF</strong> the intermediate cell in the path is completely empty!
              </p>

              <div className="sandbox-feedback-banner fb-success">
                ✅ LEGAL SLIDE: 2 steps (path is empty)
              </div>

              <div className="tutorial-board-preview">
                <div className="preview-row">
                  <span className="preview-c active-x anim-slide-2step-open">X</span>
                  <span className="preview-c anim-path-empty" title="Intermediate cell is empty"></span>
                  <span className="preview-c anim-target-glow" title="Legal destination"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
              </div>
            </div>
          )}

          {tutorialStep === 4 && (
            <div className="tutorial-slide-content animate-scale-up">
              <div className="tutorial-slide-icon">❌</div>
              <h2>Step 5: Illegal (Blocked Path)</h2>
              <p style={{ fontSize: '0.92rem' }}>
                You <strong>cannot</strong> slide 2 steps if another piece blocks the path. Jumping over pieces is strictly forbidden!
              </p>

              <div className="sandbox-feedback-banner fb-danger">
                ❌ ILLEGAL: Path is blocked by opponent (O)!
              </div>

              <div className="tutorial-board-preview">
                <div className="preview-row">
                  <span className="preview-c active-x anim-slide-2step-blocked">X</span>
                  <span className="preview-c active-o">O</span>
                  <span className="preview-c anim-error-glow" title="Blocked target"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
              </div>
            </div>
          )}

          {tutorialStep === 5 && (
            <div className="tutorial-slide-content animate-scale-up">
              <div className="tutorial-slide-icon">⚠️</div>
              <h2>Step 6: Illegal (Non-straight)</h2>
              <p style={{ fontSize: '0.92rem' }}>
                Moves must be in a single straight line. Curved paths (L-shapes or Knight jumps) are illegal and inflict penalties!
              </p>

              <div className="sandbox-feedback-banner fb-danger">
                ❌ ILLEGAL: L-shape jump or invalid direction!
              </div>

              <div className="tutorial-board-preview">
                <div className="preview-row">
                  <span className="preview-c active-x anim-slide-invalid">X</span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c anim-error-glow" title="Invalid destination"></span>
                </div>
                <div className="preview-row">
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                  <span className="preview-c"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="tutorial-dots">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <span
              key={idx}
              className={`dot ${idx === tutorialStep ? 'active' : ''}`}
              onClick={() => handleDotClick(idx)}
            />
          ))}
        </div>

        <div className="modal-actions">
          {tutorialStep > 0 && (
            <button className="btn btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          {tutorialStep < 5 ? (
            <button className="btn btn-primary" onClick={handleNext} style={{ flex: 1 }}>
              Next Step
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleFinish} style={{ flex: 1 }}>
              Let's Play! 🎮
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
