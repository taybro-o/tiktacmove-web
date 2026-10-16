
export function BoardCell({
  index,
  value,
  isSelected,
  isPossibleTarget,
  onClick
}) {
  return (
    <button
      id={`cell-${index}`}
      className={`board-cell ${isSelected ? 'selected-piece' : ''} ${isPossibleTarget ? 'highlight-target' : ''}`}
      onClick={() => onClick(index)}
    >
      {value !== null && (
        <span className={`piece ${value === 'X' ? 'x-mark' : 'o-mark'}`}>
          {value}
        </span>
      )}
    </button>
  );
}
