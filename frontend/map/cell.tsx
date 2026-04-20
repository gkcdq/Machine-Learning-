import React from "react";

export type CellType = "empty" | "wall" | "collectible" | "exit" | "start" | "agent";

interface CellProps {
  type: CellType;
  row: number;
  col: number;
  onClick: (row: number, col: number) => void;
  onRightClick: (row: number, col: number, e: React.MouseEvent) => void;
  onMouseEnter: (row: number, col: number) => void;
  qValue?: number; // 0-1, heat for Q-learning visualization
}

const CELL_ICONS: Record<CellType, string> = {
  empty: "",
  wall: "█",
  collectible: "◈",
  exit: "⬡",
  start: "◉",
  agent: "▲",
};

const CELL_COLORS: Record<CellType, string> = {
  empty: "var(--cell-empty)",
  wall: "var(--cell-wall)",
  collectible: "var(--cell-collectible)",
  exit: "var(--cell-exit)",
  start: "var(--cell-start)",
  agent: "var(--cell-agent)",
};

export const Cell: React.FC<CellProps> = ({
  type,
  row,
  col,
  onClick,
  onRightClick,
  onMouseEnter,
  qValue,
}) => {
  const heatOpacity = qValue !== undefined ? qValue * 0.6 : 0;

  return (
    <div
      className={`cell cell--${type}`}
      onClick={() => onClick(row, col)}
      onContextMenu={(e) => onRightClick(row, col, e)}
      onMouseEnter={() => onMouseEnter(row, col)}
      style={{
        backgroundColor: CELL_COLORS[type],
        position: "relative",
        cursor: "crosshair",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 0.15s ease, transform 0.1s ease",
        userSelect: "none",
      }}
      title={`[${row},${col}] ${type}`}
    >
      {/* Q-value heat overlay */}
      {qValue !== undefined && type === "empty" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(255, 80, 80, ${heatOpacity})`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Icon */}
      <span
        style={{
          fontSize: "clamp(10px, 1.4vw, 20px)",
          lineHeight: 1,
          zIndex: 1,
          color: type === "wall" ? "var(--wall-icon)" : "var(--icon-color)",
          filter:
            type === "agent" ? "drop-shadow(0 0 4px var(--cell-agent))" : "none",
          animation: type === "agent" ? "agentPulse 1s infinite alternate" : "none",
        }}
      >
        {CELL_ICONS[type]}
      </span>
    </div>
  );
};