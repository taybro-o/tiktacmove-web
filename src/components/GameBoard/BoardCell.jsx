export function BoardCell({
  index,
  value,
  isSelected,
  isPossibleTarget,
  isWinning,
  isSliding,
  isLanding,
  onClick
}) {
  const classes = [
    'board-cell',
    isSelected && 'selected-piece',
    isPossibleTarget && 'highlight-target',
    isWinning && 'cell-winning'
  ].filter(Boolean).join(' ');

  return (
    <button
      id={`cell-${index}`}
      className={classes}
      onClick={() => onClick(index)}
      aria-label={`Cell ${index + 1}${value ? `, ${value}` : ''}`}
    >
      {value !== null ? (
        <span
          className={`piece ${value === 'X' ? 'x-mark' : 'o-mark'} ${isWinning ? 'winning-piece-bounce' : ''} ${isLanding ? 'piece-landing-bounce' : ''}`}
          style={{ opacity: isSliding ? 0 : 1 }}
        >
          {value}
        </span>
      ) : null}
    </button>
  );
}
