import React from 'react';

function Skeleton({ width = '100%', height = 20, count = 1, style }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width, height, marginBottom: count > 1 ? 8 : 0, borderRadius: 4, background: 'var(--color-surface-variant)', animation: 'skeleton-pulse 1.5s ease-in-out infinite', ...style }} />
      ))}
    </>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton height={16} width="80%" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton height={14} width={c === cols - 1 ? '40%' : '70%'} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { Skeleton, TableSkeleton };
