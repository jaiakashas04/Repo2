const SEVERITY_CLASS = {
  LOW: 'sev-low',
  MEDIUM: 'sev-medium',
  HIGH: 'sev-high',
  CRITICAL: 'sev-critical',
};

export default function SeverityBadge({ value }) {
  const cls = SEVERITY_CLASS[value] || 'sev-low';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {value}
    </span>
  );
}
