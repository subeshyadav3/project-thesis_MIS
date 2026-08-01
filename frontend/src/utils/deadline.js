export function getDeadlineInfo(expirationDate) {
  if (!expirationDate) return null;
  const now = new Date();
  const deadline = new Date(expirationDate);
  const diffMs = deadline - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffMs < 0) return { expired: true, label: 'Deadline passed', urgent: false };
  if (diffDays > 30) return { expired: false, label: `${deadline.toLocaleDateString()}`, urgent: false };
  if (diffDays > 7) return { expired: false, label: `${diffDays} days left`, urgent: false };
  if (diffDays > 1) return { expired: false, label: `${diffDays} days left`, urgent: true };
  if (diffHours >= 1) return { expired: false, label: `${diffHours} hours left`, urgent: true };
  return { expired: false, label: 'Due soon', urgent: true };
}
