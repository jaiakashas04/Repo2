export default function FilterBar({ facets, filters, onChange, onClear }) {
  const handle = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Severity</label>
        <select value={filters.severity || ''} onChange={handle('severity')}>
          <option value="">All</option>
          {(facets.severity || []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Status</label>
        <select value={filters.status || ''} onChange={handle('status')}>
          <option value="">All</option>
          {(facets.status || []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Role</label>
        <select value={filters.role || ''} onChange={handle('role')}>
          <option value="">All</option>
          {(facets.role || []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Resource type</label>
        <select value={filters.resourceType || ''} onChange={handle('resourceType')}>
          <option value="">All</option>
          {(facets.resourceType || []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Region</label>
        <select value={filters.region || ''} onChange={handle('region')}>
          <option value="">All</option>
          {(facets.region || []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group filter-group--dates">
        <label>From</label>
        <input type="date" value={filters.startDate || ''} onChange={handle('startDate')} />
      </div>
      <div className="filter-group filter-group--dates">
        <label>To</label>
        <input type="date" value={filters.endDate || ''} onChange={handle('endDate')} />
      </div>

      {hasActiveFilters && (
        <button className="btn-ghost" onClick={onClear} type="button">
          Clear filters
        </button>
      )}
    </div>
  );
}
