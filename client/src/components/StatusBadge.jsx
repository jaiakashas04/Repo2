const STATUS_CLASS = {
  Unresolved: 'status-unresolved',
  'In Progress': 'status-progress',
  Resolved: 'status-resolved',
};

export default function StatusBadge({ value }) {
  const cls = STATUS_CLASS[value] || 'status-unresolved';
  return <span className={`pill ${cls}`}>{value}</span>;
}
