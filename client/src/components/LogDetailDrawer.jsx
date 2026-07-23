import SeverityBadge from './SeverityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';

const FIELDS = [
  ['actor', 'Actor'],
  ['role', 'Role'],
  ['action', 'Action'],
  ['resource', 'Resource'],
  ['resourceType', 'Resource type'],
  ['ipAddress', 'IP address'],
  ['region', 'Region'],
  ['timestamp', 'Timestamp'],
];

export default function LogDetailDrawer({ log, onClose }) {
  if (!log) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Log detail</h2>
          <button className="btn-ghost" onClick={onClose} type="button" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="drawer-badges">
          <SeverityBadge value={log.severity} />
          <StatusBadge value={log.status} />
        </div>

        <dl className="drawer-fields">
          {FIELDS.map(([key, label]) => (
            <div className="drawer-field" key={key}>
              <dt>{label}</dt>
              <dd className="mono">
                {key === 'timestamp' ? new Date(log[key]).toLocaleString() : String(log[key])}
              </dd>
            </div>
          ))}
        </dl>

        <div className="drawer-raw">
          <h3>Raw record</h3>
          <pre>{JSON.stringify(log, null, 2)}</pre>
        </div>
      </aside>
    </div>
  );
}
