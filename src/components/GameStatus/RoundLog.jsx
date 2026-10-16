import { useRef } from 'react';
import { FileText } from 'lucide-react';

export function RoundLog({ roundLog, moveCount }) {
  const logEndRef = useRef(null);

  return (
    <div className="glass-panel info-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="history-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
          <FileText size={16} /> Action History
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Moves: {moveCount}
        </span>
      </div>

      <div className="history-list">
        {roundLog.length === 0 ? (
          <p className="history-empty">No moves made yet</p>
        ) : (
          roundLog.map((log, index) => (
            <div
              key={index}
              className={`history-item ${log.type === 'warn' ? 'warn' : ''} ${log.type === 'danger' ? 'danger' : ''}`}
            >
              {log.text}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
