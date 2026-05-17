// ============================================
// KharchaPane - Dashboard
// ============================================

let expenseChart, incomeChart, trendChart;

async function initDashboard() {
  await initApp();
  setupMonthNav(loadDashboard);
  setupQuickAdd();
  await loadDashboard(currentBSYear, currentBSMonth);
}

async function loadDashboard(year, month) {
  const [expenses, incomes] = await Promise.all([
    getTransactions(year, month, 'expense'),
    getTransactions(year, month, 'income')
  ]);

  const totalExp = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalInc = incomes.reduce((s, t) => s + Number(t.amount), 0);
  const netBalance = totalInc - totalExp;
  const savingsRate = totalInc > 0 ? ((netBalance / totalInc) * 100) : 0;

  // Update summary cards
  document.getElementById('total-income').textContent = formatCurrency(totalInc);
  document.getElementById('total-expenses').textContent = formatCurrency(totalExp);
  document.getElementById('net-balance').textContent = formatCurrency(Math.abs(netBalance));
  document.getElementById('savings-rate').textContent = Math.max(0, savingsRate).toFixed(1) + '%';
  document.getElementById('income-count').textContent = incomes.length + ' entries';
  document.getElementById('expense-count').textContent = expenses.length + ' entries';

  const balCard = document.getElementById('balance-card');
  if (netBalance >= 0) {
    balCard.style.setProperty('--accent', 'var(--balance-pos)');
    document.getElementById('balance-status').textContent = '✅ Positive balance';
    document.getElementById('net-balance').style.color = 'var(--income)';
  } else {
    document.getElementById('balance-status').textContent = '⚠️ Overspent';
    document.getElementById('net-balance').style.color = 'var(--expense)';
  }

  // Charts
  renderExpenseDonut(expenses);
  renderIncomeDonut(incomes);
  await renderTrendChart(year, month);

  // Budget progress
  await renderBudgetProgress(year, month, expenses);

  // Recent transactions (combined, sorted)
  renderRecentTransactions([...expenses, ...incomes]);
}

function renderExpenseDonut(expenses) {
  const catTotals = {};
  expenses.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
  });

  const total = Object.values(catTotals).reduce((s, v) => s + v, 0);
  document.getElementById('expense-center-amount').textContent = formatCurrency(total);

  const sorted = Object.entries(catTotals).sort((a,b) => b[1] - a[1]).slice(0, 8);
  const labels = sorted.map(([id]) => getCategoryName(id, 'expense'));
  const data = sorted.map(([,v]) => v);
  const colors = sorted.map(([id]) => getCategoryColor(id, 'expense'));

  const ctx = document.getElementById('expense-donut').getContext('2d');
  if (expenseChart) expenseChart.destroy();

  if (data.length === 0) {
    renderEmptyDonut(ctx, '#fee2e2');
    document.getElementById('expense-legend').innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted)">No expenses this month</span>';
    return;
  }

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ` ${ctx.label}: ₨ ${Number(ctx.raw).toLocaleString()}` }
      }},
      responsive: true,
      maintainAspectRatio: false,
    }
  });

  // Legend
  const legendEl = document.getElementById('expense-legend');
  legendEl.innerHTML = sorted.slice(0,5).map(([id, v]) =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${getCategoryColor(id,'expense')}"></div>
      <span>${getCategoryName(id,'expense')}: ${formatCurrency(v)}</span>
    </div>`
  ).join('');
}

function renderIncomeDonut(incomes) {
  const catTotals = {};
  incomes.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
  });

  const total = Object.values(catTotals).reduce((s, v) => s + v, 0);
  document.getElementById('income-center-amount').textContent = formatCurrency(total);

  const sorted = Object.entries(catTotals).sort((a,b) => b[1] - a[1]).slice(0, 8);
  const labels = sorted.map(([id]) => getCategoryName(id, 'income'));
  const data = sorted.map(([,v]) => v);
  const colors = sorted.map(([id]) => getCategoryColor(id, 'income'));

  const ctx = document.getElementById('income-donut').getContext('2d');
  if (incomeChart) incomeChart.destroy();

  if (data.length === 0) {
    renderEmptyDonut(ctx, '#dcfce7');
    document.getElementById('income-legend').innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted)">No income this month</span>';
    return;
  }

  incomeChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ` ${ctx.label}: ₨ ${Number(ctx.raw).toLocaleString()}` }
      }},
      responsive: true, maintainAspectRatio: false,
    }
  });

  const legendEl = document.getElementById('income-legend');
  legendEl.innerHTML = sorted.slice(0,4).map(([id, v]) =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${getCategoryColor(id,'income')}"></div>
      <span>${getCategoryName(id,'income')}: ${formatCurrency(v)}</span>
    </div>`
  ).join('');
}

function renderEmptyDonut(ctx, color) {
  new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [1], backgroundColor: [color], borderWidth: 0 }] },
    options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false }}, responsive: true, maintainAspectRatio: false }
  });
}

async function renderTrendChart(currentYear, currentMonth) {
  // Load last 6 months
  const months = [];
  let y = currentYear, m = currentMonth;
  for (let i = 0; i < 6; i++) {
    months.unshift({ year: y, month: m });
    m--; if (m < 1) { m = 12; y--; }
  }

  const monthData = await Promise.all(months.map(async ({ year, month }) => {
    const [exps, incs] = await Promise.all([
      getTransactions(year, month, 'expense'),
      getTransactions(year, month, 'income')
    ]);
    return {
      label: getBSMonthName(month).slice(0, 3) + ' ' + String(year).slice(-2),
      expense: exps.reduce((s, t) => s + Number(t.amount), 0),
      income: incs.reduce((s, t) => s + Number(t.amount), 0),
    };
  }));

  const ctx = document.getElementById('trend-chart').getContext('2d');
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthData.map(d => d.label),
      datasets: [
        {
          label: 'Income',
          data: monthData.map(d => d.income),
          backgroundColor: 'rgba(22,163,74,0.75)',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Expenses',
          data: monthData.map(d => d.expense),
          backgroundColor: 'rgba(220,38,38,0.7)',
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 }},
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ₨ ${Number(ctx.raw).toLocaleString()}` }}
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '₨' + (v/1000) + 'k', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

async function renderBudgetProgress(year, month, expenses) {
  const { data: budgets } = await supabaseClient
    .from('budgets')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('bs_year', year)
    .eq('bs_month', month);

  const el = document.getElementById('budget-progress-list');

  if (!budgets || budgets.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;text-align:center;padding:1rem">No budget goals set. <a href="budget.html" style="color:var(--primary)">Set one →</a></p>';
    return;
  }

  const catTotals = {};
  expenses.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
  });

  el.innerHTML = budgets.map(b => {
    const spent = catTotals[b.category] || 0;
    const pct = Math.min(100, (spent / b.amount) * 100);
    const fillClass = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';

    return `
      <div style="margin-bottom:0.8rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem">
          <span style="font-size:0.85rem;font-weight:500">${getCategoryName(b.category,'expense')}</span>
          <span style="font-size:0.82rem;color:var(--text-secondary)">
            ${formatCurrency(spent)} / ${formatCurrency(b.amount)}
            ${pct >= 100 ? '<span style="color:var(--expense);font-weight:600"> Over!</span>' : ''}
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function renderRecentTransactions(transactions) {
  const el = document.getElementById('recent-transactions');
  const sorted = [...transactions]
    .sort((a, b) => new Date(b.date_ad) - new Date(a.date_ad))
    .slice(0, 10);

  if (sorted.length === 0) {
    el.innerHTML = '<div class="empty-state">No transactions this month. Add your first entry!</div>';
    return;
  }

  el.innerHTML = sorted.map(t => {
    const cat = getCategoryById(t.category, t.type);
    return `
      <div class="transaction-row">
        <div class="txn-icon ${t.type}">${cat.icon}</div>
        <div class="txn-info">
          <div class="txn-particular">${escHtml(t.particular)}</div>
          <div class="txn-meta">${formatBSDate(t.date_bs_year, t.date_bs_month, t.date_bs_day)} BS • ${formatADDate(t.date_ad)}</div>
        </div>
        <span class="txn-category">${cat.name}</span>
        <span class="txn-amount ${t.type}">${t.type === 'expense' ? '-' : '+'}${formatCurrency(t.amount)}</span>
      </div>`;
  }).join('');
}

// Quick Add Modal
function setupQuickAdd() {
  const modal = document.getElementById('quick-add-modal');
  const today = getCurrentNepaliDate();
  let currentType = 'expense';

  document.getElementById('quick-add-btn')?.addEventListener('click', () => {
    initDateSelects(today.year, today.month, today.day);
    populateCategorySelect(document.getElementById('entry-category'), 'expense');
    updateDatePreview();
    openModal('quick-add-modal');
  });

  document.getElementById('close-modal')?.addEventListener('click', () => closeModal('quick-add-modal'));
  document.getElementById('cancel-modal')?.addEventListener('click', () => closeModal('quick-add-modal'));

  // Tabs
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      populateCategorySelect(document.getElementById('entry-category'), currentType);
      document.getElementById('particular-label').textContent =
        currentType === 'expense' ? 'Item / Expense Detail' : 'Particular / Source';
    });
  });

  // Date change listener
  ['entry-year','entry-month','entry-day'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      // Repopulate days when year/month changes
      const y = parseInt(document.getElementById('entry-year').value);
      const m = parseInt(document.getElementById('entry-month').value);
      const d = parseInt(document.getElementById('entry-day').value);
      if (id !== 'entry-day') {
        populateDaySelect(document.getElementById('entry-day'), y, m, d);
      }
      updateDatePreview();
    });
  });

  document.getElementById('quick-add-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSaveEntry(currentType);
  });
}

function initDateSelects(year, month, day) {
  populateYearSelect(document.getElementById('entry-year'), year);
  populateMonthSelect(document.getElementById('entry-month'), month);
  populateDaySelect(document.getElementById('entry-day'), year, month, day);
}

function updateDatePreview() {
  const y = parseInt(document.getElementById('entry-year')?.value);
  const m = parseInt(document.getElementById('entry-month')?.value);
  const d = parseInt(document.getElementById('entry-day')?.value);
  if (!y || !m || !d) return;
  const adDate = bsToAD(y, m, d);
  const preview = document.getElementById('date-ad-preview');
  if (preview) {
    preview.textContent = 'AD: ' + adDate.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  }
}

async function handleSaveEntry(type) {
  const y = parseInt(document.getElementById('entry-year').value);
  const m = parseInt(document.getElementById('entry-month').value);
  const d = parseInt(document.getElementById('entry-day').value);
  const particular = document.getElementById('entry-particular').value.trim();
  const category = document.getElementById('entry-category').value;
  const amount = parseFloat(document.getElementById('entry-amount').value);
  const note = document.getElementById('entry-note')?.value.trim() || '';
  const errEl = document.getElementById('modal-error');

  if (!particular || !amount || amount <= 0) {
    if (errEl) errEl.textContent = 'Please fill all required fields';
    return;
  }

  const adDate = bsToAD(y, m, d);
  const adStr = adDate.toISOString().split('T')[0];

  const btn = document.getElementById('save-entry-btn');
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

  const { error } = await saveTransaction({
    type, date_ad: adStr,
    date_bs_year: y, date_bs_month: m, date_bs_day: d,
    particular, category, amount, note
  });

  if (btn) { btn.textContent = 'Save Entry'; btn.disabled = false; }

  if (error) {
    if (errEl) errEl.textContent = error.message;
  } else {
    closeModal('quick-add-modal');
    document.getElementById('quick-add-form').reset();
    showToast(type === 'expense' ? 'Expense added!' : 'Income added!');
    await loadDashboard(currentBSYear, currentBSMonth);
  }
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Initialize
initDashboard();
