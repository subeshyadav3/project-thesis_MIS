import React from 'react';

function SearchInput({ value, onChange, placeholder = 'Search...', style }) {
  return (
    <div className="search-input-wrapper" style={{ position: 'relative', ...style }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--color-on-surface-variant)', pointerEvents: 'none' }}>search</span>
      <input
        type="text"
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 32, width: '100%' }}
      />
      {value && (
        <button className="btn btn-icon" onClick={() => onChange('')} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      )}
    </div>
  );
}

export default SearchInput;
