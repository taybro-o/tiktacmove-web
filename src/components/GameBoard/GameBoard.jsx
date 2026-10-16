import { BoardCell } from './BoardCell';

export function GameBoard({
  board,
  activeMark,
  selectedPieceIndex,
  onCellClick
}) {
  return (
    <div className={`game-board active-turn-${activeMark.toLowerCase()}`}>
      {board.map((cell, idx) => {
        const isSelected = selectedPieceIndex === idx;
        const isPossibleTarget = selectedPieceIndex !== null && cell === null;

        return (
          <BoardCell
            key={idx}
            index={idx}
            value={cell}
            isSelected={isSelected}
            isPossibleTarget={isPossibleTarget}
            onClick={onCellClick}
          />
        );
      })}
    </div>
  );
}
