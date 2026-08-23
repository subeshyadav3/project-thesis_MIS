const STATUS_CLASS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ACCEPTED: 'active',
  APPROVED: 'completed',
  REJECTED: 'error',
};

export default function StatusBadge({ status, sm }) {
  const raw = status || 'PENDING';
  const key = String(raw).toUpperCase();
  const cls = STATUS_CLASS[key] || key.toLowerCase();
  return (
    <span className={`badge badge-${cls}${sm ? ' badge-sm' : ''}`}>
      <span className="dot" />
      {raw}
    </span>
  );
}
