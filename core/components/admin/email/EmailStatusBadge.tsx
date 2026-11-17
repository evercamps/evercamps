import React from 'react';

const COLORS: Record<string, { background: string; color: string }> = {
  sent: { background: '#dbeafe', color: '#1e40af' },
  delivered: { background: '#dcfce7', color: '#166534' },
  queued: { background: '#f3f4f6', color: '#374151' },
  skipped: { background: '#f3f4f6', color: '#6b7280' },
  failed: { background: '#fee2e2', color: '#991b1b' },
  bounced: { background: '#fee2e2', color: '#991b1b' },
  spam: { background: '#fef3c7', color: '#92400e' },
  blocked: { background: '#fee2e2', color: '#991b1b' }
};

export function EmailStatusBadge({ status }: { status: string }) {
  const style = COLORS[status] || COLORS.queued;
  return (
    <span
      style={{
        ...style,
        borderRadius: '1rem',
        padding: '0.1rem 0.6rem',
        fontSize: '0.85em',
        whiteSpace: 'nowrap'
      }}
    >
      {status}
    </span>
  );
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
