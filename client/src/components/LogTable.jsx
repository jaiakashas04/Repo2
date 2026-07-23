import SeverityBadge from './SeverityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';

const COLUMNS = [
  { key: 'timestamp', label: 'Timestamp', sortable: true },
  { key: 'actor', label: 'Actor', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'action', label: 'Action', sortable: true },
  { key: 'resource', label: 'Resource', sortable: false },
  { key: 'region', label: 'Region', sortable: true },
  { key: 'severity', label: 'Severity', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LogTable({ logs, loading, sortBy, sortOrder, onSort, onSelectLog }) {
  const handleHeaderClick = (col) => {
    if (!col.sortable) return;
    if (sortBy === col.key) {
      onSort(col.key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(col.key, 'desc');
    }
  };

  return (
    <div className="table-wrap">
      <table className="log-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? 'sortable' : ''}
                onClick={() => handleHeaderClick(col)}
              >
                {col.label}
                {sortBy === col.key && (
                  <span className="sort-arrow">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={COLUMNS.length} className="table-empty">
                Loading…
              </td>
            </tr>
          )}
          {!loading && logs.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="table-empty">
                No log records match the current filters.
              </td>
            </tr>
          )}
          {!loading &&
            logs.map((log) => (
              <tr key={log._id} onClick={() => onSelectLog(log)} className="log-row">
                <td className="mono">{formatTimestamp(log.timestamp)}</td>
                <td className="mono">{log.actor}</td>
                <td>{log.role}</td>
                <td className="mono">{log.action}</td>
                <td className="mono truncate">{log.resource}</td>
                <td>{log.region}</td>
                <td>
                  <SeverityBadge value={log.severity} />
                </td>
                <td>
                  <StatusBadge value={log.status} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
