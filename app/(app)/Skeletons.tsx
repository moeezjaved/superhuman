/** Shared loading skeletons — final geometry, no layout shift, no spinners. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ marginTop: 18 }} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skel-card" style={{ height: 72, marginBottom: 12, opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

export function ReceiptSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skel-line" style={{ width: `${88 - i * 6}%`, height: 13, margin: '12px 0' }} />
      ))}
    </div>
  );
}
