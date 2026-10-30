import { useRef, useState, useEffect } from 'react';
import { BoardCell } from './BoardCell';

export function GameBoard({
  board,
  activeMark,
  selectedPieceIndex,
  onCellClick,
  replayHighlights,
  slidingMove,
  onSlideComplete
}) {
  const boardRef = useRef(null);
  const [slideData, setSlideData] = useState(null);
  const [landingCell, setLandingCell] = useState(null);

  useEffect(() => {
    if (!slidingMove || !boardRef.current) {
      setSlideData(null);
      setLandingCell(null);
      return;
    }

    setLandingCell(null);

    const fromEl = boardRef.current.querySelector(`#cell-${slidingMove.from}`);
    const toEl = boardRef.current.querySelector(`#cell-${slidingMove.to}`);
    const boardEl = boardRef.current;

    if (!fromEl || !toEl || !boardEl) return;

    const boardRect = boardEl.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const startX = fromRect.left - boardRect.left;
    const startY = fromRect.top - boardRect.top;
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    setSlideData({
      mark: slidingMove.mark,
      left: startX,
      top: startY,
      width: fromRect.width,
      height: fromRect.height,
      dx,
      dy,
      animating: false
    });

    let timer3 = null;

    // Animate to target in the next animation frame
    const timer1 = setTimeout(() => {
      setSlideData((prev) => (prev ? { ...prev, animating: true } : null));
    }, 20);

    // Complete slide after duration
    const timer2 = setTimeout(() => {
      setLandingCell(slidingMove.to);
      setSlideData(null);
      if (onSlideComplete) {
        onSlideComplete(slidingMove);
      }
      timer3 = setTimeout(() => {
        setLandingCell(null);
      }, 250);
    }, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (timer3) clearTimeout(timer3);
    };
  }, [slidingMove, onSlideComplete]);

  return (
    <div
      ref={boardRef}
      className={`game-board active-turn-${activeMark.toLowerCase()} ${replayHighlights ? 'is-replaying' : ''}`}
      style={{ position: 'relative' }}
    >
      {board.map((cell, idx) => {
        const isSelected = selectedPieceIndex === idx;
        const isPossibleTarget = selectedPieceIndex !== null && cell === null;

        const isWinning = Boolean(
          replayHighlights?.winningLine && replayHighlights.winningLine.includes(idx)
        );

        // Hide static piece on source & target cells while floating slide is in motion
        const isSliding = Boolean(
          slideData &&
          slidingMove &&
          (slidingMove.from === idx || slidingMove.to === idx)
        );
        const isLanding = landingCell === idx;

        return (
          <BoardCell
            key={idx}
            index={idx}
            value={cell}
            isSelected={isSelected}
            isPossibleTarget={isPossibleTarget}
            isWinning={isWinning}
            isSliding={isSliding}
            isLanding={isLanding}
            onClick={onCellClick}
          />
        );
      })}

      {/* Floating Animated Sliding Piece */}
      {slideData && (
        <div
          className={`sliding-piece piece ${slideData.mark === 'X' ? 'x-mark' : 'o-mark'}`}
          style={{
            position: 'absolute',
            left: `${slideData.left}px`,
            top: `${slideData.top}px`,
            width: `${slideData.width}px`,
            height: `${slideData.height}px`,
            transform: slideData.animating
              ? `translate3d(${slideData.dx}px, ${slideData.dy}px, 0)`
              : 'translate3d(0, 0, 0)',
            transition: 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)',
            pointerEvents: 'none',
            zIndex: 30
          }}
        >
          {slideData.mark}
        </div>
      )}
    </div>
  );
}
