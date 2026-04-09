// Format number Italian style: 14.123,32
export function fmtEuro(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format percentage Italian style: 30,29%
export function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

// Format integer with thousand separator
export function fmtInt(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('it-IT');
}

// Traffic light color
export function budgetColor(used, budget) {
  if (budget === 0) return 'gray';
  const pct = used / budget;
  if (pct < 0.8) return 'green';
  if (pct <= 1) return 'yellow';
  return 'red';
}

// Mini sparkline as inline SVG data
export function sparklinePath(values) {
  const max = Math.max(...values, 1);
  const w = 60;
  const h = 20;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 2);
    return `${x},${y}`;
  });
  return `M${points.join(' L')}`;
}
