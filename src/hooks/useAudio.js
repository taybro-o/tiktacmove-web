import { useState, useCallback } from 'react';
import { synth } from '../audio';

export function useAudio() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('tiktacmove_sound');
    return saved !== null ? saved === 'true' : true;
  });

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      if (type === 'click') synth.playClick();
      else if (type === 'select') synth.playSelect();
      else if (type === 'move') synth.playMove();
      else if (type === 'penalty') synth.playPenalty();
      else if (type === 'win') synth.playWin();
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('tiktacmove_sound', String(next));
      if (next) {
        try { synth.playClick(); } catch (e) { void e; }
      }
      return next;
    });
  }, []);

  return {
    soundEnabled,
    toggleSound,
    playSound
  };
}
