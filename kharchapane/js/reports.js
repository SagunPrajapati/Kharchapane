// ============================================
// KharchaPane - Reports
// ============================================

async function initReports() {
  await initApp();

  const today = getCurrentNepaliDate();
  const yearSelect = document.getElementById('report-year');

  // Populate year select
  for (let y = today.year - 4; y <= today.year; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + ' BS';
    if (y === today.year) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  yearSelect.addEventListener('change', () => loadReports(parseInt(yearSelect.value)));
  await loadReports(today.year);
}

async function loadReports(bsYear) {
  // Load all 12 months
  const monthData = await Promise.all(
    Array.from({length:12}, (_,i) => i+1).map(async m => {
      const [exps, incs] = await Promise.all([
        getTransactions(bsYear, m, 'expense'),
        getTransactions(bsYear, m, 'income')
      ]);
      return {
        month: m,
        expense: exps.reduce((s,t) => s + Number(t.amount), 0),
        income: incs.reduce((s,t) => s + Number(t.amount), 0),
        expEntries: exps
      };
    })
  );

  const totalInc = monthData.reduce((s,d) => s + d.income, 0);
  const totalExp = monthData.reduce((s,d) => s + d.expense, 0);
  const totalSav = totalInc - totalExp;

  document.getElementById('annual-income').textContent = formatCurrency(totalInc);
  document.getElementById('annual-expenses').textContent = formatCurrency(totalExp);
  document.getElementById('annual-savings').textContent = formatCurrency(Math.abs(totalSav));
  document.getElementById('annual-savings').style.color = totalSav >= 0 ? 'var(--income)' : 'var(--expense)';

  // Monthly bar chart
  const ctx = document.getElementById('monthly-bar-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: NEPALI_MONTHS.map(m => m.slice(0,3)),
      datasets: [
        { label: 'Income', data: monthData.map(d => d.income), backgroundColor: 'rgba(22,163,74,0.75)', borderRadius: 4 },
        { label: 'Expenses', data: monthData.map(d => d.expense), backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position:'top' }, tooltip: { callbacks: { label: ctx => ` ₨ ${Number(ctx.raw).toLocaleString()}` }}},
      scales: {
        y: { beginAtZero:true, ticks: { callback: v => '₨'+(v/1000)+'k' }, grid: { color:'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });

  // Category breakdown
  const catTotals = {};
  monthData.forEach(d => {
    d.expEntries.forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
    });
  });

  const sorted = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
  const el = document.getElementById('category-breakdown-table');
  el.innerHTML = `
    <div class="cat-row header">
      <span>Category</span><span class="text-right">Amount</span>
      <span class="text-right">% of Total</span><span class="text-right">Entries</span>
    </div>
    ${sorted.map(([id, amt]) => {
      const cat = getCategoryById(id, 'expense');
      const pct = totalExp > 0 ? ((amt/totalExp)*100).toFixed(1) : '0.0';
      const count = monthData.reduce((s,d) => s + d.expEntries.filter(t=>t.category===id).length, 0);
      return `<div class="cat-row">
        <span><span class="cat-tag" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.name}</span></span>
        <span class="text-right" style="font-weight:600;color:var(--expense)">${formatCurrency(amt)}</span>
        <span class="text-right" style="color:var(--text-secondary)">${pct}%</span>
        <span class="text-right" style="color:var(--text-muted)">${count}</span>
      </div>`;
    }).join('')}`;
}

if (typeof initReports !== 'undefined' && document.getElementById('monthly-bar-chart')) {
  initReports();
}
