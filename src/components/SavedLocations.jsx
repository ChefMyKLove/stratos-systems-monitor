export default function SavedLocations({ locations, current, onLoad, onRemove, onSave }) {
  const currentKey = current ? `${current.name}, ${current.country}` : '';

  return (
    <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-label">
        <span className="dot" style={{ background: 'var(--accent2)', boxShadow: '0 0 6px var(--accent2)' }} />&nbsp;Saved Locations
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {locations.length === 0
          ? <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>No saved locations yet.</div>
          : locations.map(loc => {
            const isActive = loc === currentKey;
            return (
              <div
                key={loc}
                className={`saved-loc-row${isActive ? ' active' : ''}`}
                onClick={() => onLoad(loc)}
              >
                <span className="saved-loc-name">{loc}</span>
                <span
                  className="saved-loc-del"
                  onClick={e => { e.stopPropagation(); onRemove(loc); }}
                >×</span>
              </div>
            );
          })
        }
      </div>
      <button className="save-loc-btn" onClick={onSave}>＋ Save Current City</button>
    </div>
  );
}
