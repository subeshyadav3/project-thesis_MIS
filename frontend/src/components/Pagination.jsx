import React from 'react';
import { Icon } from './ui';

function Pagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, pageSizeOptions, totalItems }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        <span className="font-label text-xs text-on-surface-variant">
          {totalItems != null && (
            <>Showing {(currentPage - 1) * (pageSize || 10) + 1}–{Math.min(currentPage * (pageSize || 10), totalItems)} of {totalItems}</>
          )}
        </span>
        {onPageSizeChange && pageSizeOptions && (
          <div className="page-size-selector">
            <span className="font-label text-xs text-on-surface-variant">Per page:</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="input"
              style={{ width: 60, padding: '2px 4px', fontSize: 11, borderRadius: 4 }}
            >
              {pageSizeOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="pagination">
        <button
          className="btn btn-xs btn-outline"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          title="First page"
        >
          <Icon name="first_page" className="material-symbols-outlined" />
        </button>
        <button
          className="btn btn-xs btn-outline"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous"
        >
          <Icon name="chevron_left" className="material-symbols-outlined" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`btn btn-xs ${p === currentPage ? 'pagination-active' : 'btn-outline'}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-xs btn-outline"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next"
        >
          <Icon name="chevron_right" className="material-symbols-outlined" />
        </button>
        <button
          className="btn btn-xs btn-outline"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
        >
          <Icon name="last_page" className="material-symbols-outlined" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
