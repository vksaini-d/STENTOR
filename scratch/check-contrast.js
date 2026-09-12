// WCAG Contrast Checker for Stentor Design Tokens
// Run: node scratch/check-contrast.js

const pairs = [
  { fg: '#E8F0F1', bg: '#0D1D1F', label: 'text-primary on base' },
  { fg: '#E8F0F1', bg: '#152224', label: 'text-primary on surface' },
  { fg: '#6E9193', bg: '#0D1D1F', label: 'text-secondary on base' },
  { fg: '#6E9193', bg: '#152224', label: 'text-secondary on surface' },
  { fg: '#1DCCE0', bg: '#0D1D1F', label: 'signal on base' },
  { fg: '#1DCCE0', bg: '#152224', label: 'signal on surface' },
  { fg: '#22A66B', bg: '#0D1D1F', label: 'status-live on base' },
  { fg: '#C48D0F', bg: '#0D1D1F', label: 'status-warning on base' },
  { fg: '#C0392B', bg: '#0D1D1F', label: 'status-error on base' },
  { fg: '#0D1D1F', bg: '#1DCCE0', label: 'dark text on signal CTA' },
  { fg: '#4AB3C2', bg: '#0D1D1F', label: 'telemetry on base' },
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  return [r, g, b];
}

function linearize(c) {
  return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
}

function luminance([r,g,b]) {
  return 0.2126*linearize(r) + 0.7152*linearize(g) + 0.0722*linearize(b);
}

function contrast(fg, bg) {
  const L1 = luminance(hexToRgb(fg));
  const L2 = luminance(hexToRgb(bg));
  const lighter = Math.max(L1,L2);
  const darker = Math.min(L1,L2);
  return (lighter + 0.05) / (darker + 0.05);
}

console.log('\nWCAG Contrast Report — Stentor Design Tokens');
console.log('='.repeat(60));
let allPass = true;
for (const p of pairs) {
  const ratio = contrast(p.fg, p.bg);
  const aa = ratio >= 4.5;
  const aaLarge = ratio >= 3.0;
  const status = aa ? 'AA pass' : (aaLarge ? 'AA large only' : 'FAIL');
  if (!aa) allPass = false;
  console.log(`${status} ${ratio.toFixed(2)}:1  ${p.label}`);
}
console.log('='.repeat(60));
console.log(allPass ? 'All pairs pass WCAG AA' : 'Some pairs fail -- adjust token L% values');
