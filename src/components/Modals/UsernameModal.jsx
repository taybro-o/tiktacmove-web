import { useState } from 'react';
import { checkUsernameAvailability } from '../../services/leaderboardService';

export function UsernameModal({
  currentUsername,
  onSave,
  playSound
}) {
  const [usernameInput, setUsernameInput] = useState(currentUsername || '');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const name = usernameInput.trim();
    if (!name) {
      setUsernameError('Username cannot be empty');
      return;
    }
    if (name.length < 2) {
      setUsernameError('Must be at least 2 characters');
      return;
    }
    setUsernameError('');
    setIsSaving(true);

    const check = await checkUsernameAvailability(name, currentUsername);
    if (!check.available) {
      setUsernameError(check.error || 'Username is taken. Choose another!');
      setIsSaving(false);
      return;
    }

    if (playSound) playSound('click');
    localStorage.setItem('tiktacmove_username', name);
    setIsSaving(false);
    onSave(name);
  };

  return (
    <div className="overlay-screen">
      <div className="glass-panel modal-content animate-scale-up" style={{ maxWidth: '420px' }}>
        <div className="winner-icon">💠</div>
        <h2>Create Your CyberProfile</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Enter a unique username for this browser instance. It will represent you globally on the public leaderboards!
        </p>
        <div className="input-group">
          <label htmlFor="uname">CyberName</label>
          <input
            id="uname"
            className="input-field"
            type="text"
            maxLength={14}
            placeholder="Enter username..."
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value);
              setUsernameError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            disabled={isSaving}
          />
          {usernameError && (
            <p style={{ color: 'var(--pink)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
              {usernameError}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Checking...' : 'Save CyberName ⚡'}
        </button>
      </div>
    </div>
  );
}
