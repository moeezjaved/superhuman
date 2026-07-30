/**
 * Minimal 5-field cron matcher: "min hour dom month dow".
 * Supports *, lists (1,2), ranges (1-5), and step (*\/5). Enough to decide if a
 * schedule is due at a given minute. (Production uses Inngest's own cron; this
 * powers the local dispatcher demo.)
 */
export function cronMatches(cron: string, d: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hr, dom, mon, dow] = parts;
  return (
    field(min, d.getMinutes(), 0, 59) &&
    field(hr, d.getHours(), 0, 23) &&
    field(dom, d.getDate(), 1, 31) &&
    field(mon, d.getMonth() + 1, 1, 12) &&
    field(dow, d.getDay(), 0, 6) // 0 = Sunday
  );
}

function field(expr: string, value: number, lo: number, hi: number): boolean {
  return expr.split(',').some((token) => {
    let step = 1;
    let range = token;
    const slash = token.split('/');
    if (slash.length === 2) {
      range = slash[0];
      step = parseInt(slash[1], 10) || 1;
    }
    let start = lo;
    let end = hi;
    if (range !== '*') {
      const dash = range.split('-');
      start = parseInt(dash[0], 10);
      end = dash.length === 2 ? parseInt(dash[1], 10) : start;
    }
    if (value < start || value > end) return false;
    return (value - start) % step === 0;
  });
}
