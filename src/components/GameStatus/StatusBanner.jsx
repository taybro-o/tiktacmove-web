
export function StatusBanner({ statusMessage, activeMark }) {
  const markClass = activeMark ? `active-${activeMark.toLowerCase()}` : '';

  return (
    <div className={`glass-panel status-banner ${markClass}`}>
      <span className="banner-pulsar"></span>
      <h3>{statusMessage}</h3>
    </div>
  );
}
