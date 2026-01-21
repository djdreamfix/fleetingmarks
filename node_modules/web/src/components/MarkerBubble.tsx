import React, { useMemo } from 'react';

export default function MarkerBubble({
  color,
  createdAt,
  expiresAt,
  street
}: {
  color: 'blue' | 'green' | 'split';
  createdAt: string;
  expiresAt: string;
  street?: string;
}) {
  const minutesLeft = useMemo(() => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    const m = Math.ceil(ms / 60000);
    return Math.max(0, m);
  }, [expiresAt, Date.now()]);

  const cls =
    color === 'blue'
      ? 'marker-bubble marker-blue'
      : color === 'green'
      ? 'marker-bubble marker-green'
      : 'marker-bubble marker-split';

  return (
    <div className={cls} title={street ? `${street}` : ''}>
      {minutesLeft}
    </div>
  );
}
