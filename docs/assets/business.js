// The licence calculator on the "For business" page: people × price × 12 months.
(() => {
  const box = document.querySelector('.bz-calc'); if (!box) return;
  const n = document.getElementById('bzN'), p = document.getElementById('bzP'), out = document.getElementById('bzOut');
  const fmt = new Intl.NumberFormat(box.dataset.lang || undefined, { maximumFractionDigits: 0 });
  const run = () => { const v = Math.max(0, +n.value || 0) * Math.max(0, +String(p.value).replace(',', '.') || 0) * 12; out.textContent = `${fmt.format(v)} ${box.dataset.cur}`; };
  n.addEventListener('input', run); p.addEventListener('input', run); run();
})();
