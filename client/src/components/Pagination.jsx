export default function Pagination({ pagination, onPageChange, onLimitChange }) {
  const { page, totalPages, total, limit } = pagination;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="pagination-summary">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total.toLocaleString()}`}
      </span>

      <div className="pagination-controls">
        <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} aria-label="Rows per page">
          {[25, 50, 100, 200].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>

        <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)}>
          «
        </button>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹
        </button>
        <span className="pagination-page">
          Page {page} of {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          ›
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
          »
        </button>
      </div>
    </div>
  );
}
