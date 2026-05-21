// ============================================
// KharchaPane - Budget Goals
// ============================================

async function initBudget() {
  await initApp();
  setupMonthNav(loadBudgets);
  setupBudgetModal();

  document.getElementById('add-budget-btn')?.addEventListener('click', openBudgetModal);

  await loadBudgets(currentBSYear, currentBSMonth);
}

async function loadBudgets(year, month) {
  const [budgets, expenses] = await Promise.all([
    supabaseClient.from('budgets').select('*').eq('user_id', currentUser.id).eq('bs_year', year).eq('bs_month', month),
    getTransactions(year, month, 'expense')
  ]);

  const catTotals = {};
  expenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount); });

  const el = document.getElementById('budget-list');
  const data = budgets.data || [];

  if (data.length === 0) {
    el.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-muted)">
        <div style="font-size:2rem;margin-bottom:0.5rem">🎯</div>
        <p>No budget goals set for this month.</p>
        <p style="margin-top:0.4rem;font-size:0.85rem">Set spending limits per category to stay on track.</p>
        <button onclick="openBudgetModal()" style="margin-top:1rem;padding:0.5rem 1.2rem;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;font-family:var(--font)">+ Set First Budget</button>
      </div>`;
    return;
  }

  // Also show unbudgeted categories that have spending
  const budgetedCats = data.map(b => b.category);
  const unbudgeted = Object.entries(catTotals)
    .filter(([id]) => !budgetedCats.includes(id))
    .map(([id, amt]) => ({ category: id, amount: null, spent: amt }));

  el.innerHTML = [
    ...data.map(b => {
      const spent = catTotals[b.category] || 0;
      const pct = Math.min(100, (spent / b.amount) * 100);
      const fillClass = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
      const cat = getCategoryById(b.category, 'expense');

      return `<div class="budget-row">
        <div class="budget-info" style="flex:1">
          <div class="budget-top">
            <span class="budget-cat-name">${cat.icon} ${cat.name}</span>
            <span class="budget-amounts">
              ${formatCurrency(spent)} / ${formatCurrency(b.amount)}
              ${pct >= 100 ? '<span class="over"> ⚠️ Over budget!</span>' : ''}
              ${pct >= 80 && pct < 100 ? '<span style="color:var(--warning)"> 🔶 Near limit</span>' : ''}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem">
            Remaining: ${formatCurrency(Math.max(0, b.amount - spent))} (${(100-pct).toFixed(0)}%)
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;flex-shrink:0">
          <button class="budget-btn-sm" onclick="openEditBudget('${b.id}','${b.category}',${b.amount})">Edit</button>
          <button class="budget-btn-sm" style="color:var(--expense)" onclick="deleteBudget('${b.id}')">Remove</button>
        </div>
      </div>`;
    }),
    unbudgeted.length > 0 ? `
      <div style="margin-top:0.5rem;padding-top:1rem;border-top:1px solid var(--border)">
        <p style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-bottom:0.6rem">SPENDING WITHOUT BUDGET</p>
        ${unbudgeted.map(({category, spent}) => {
          const cat = getCategoryById(category, 'expense');
          return `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;font-size:0.86rem;border-bottom:1px solid var(--border)">
            <span>${cat.icon} ${cat.name}</span>
            <span style="color:var(--expense);font-weight:600">${formatCurrency(spent)}</span>
          </div>`;
        }).join('')}
      </div>` : ''
  ].join('');
}

function openBudgetModal(id, category, amount) {
  document.getElementById('budget-id').value = id || '';
  document.getElementById('budget-error').textContent = '';

  populateCategorySelect(document.getElementById('budget-category'), 'expense');
  if (category) document.getElementById('budget-category').value = category;
  if (amount) document.getElementById('budget-amount').value = amount;
  else document.getElementById('budget-amount').value = '';

  document.getElementById('budget-modal-title').textContent = id ? 'Edit Budget' : 'Set Budget Goal';
  openModal('budget-modal');
}

function openEditBudget(id, category, amount) {
  openBudgetModal(id, category, amount);
}

async function deleteBudget(id) {
  const { error } = await supabaseClient.from('budgets').delete().eq('id', id);
  if (!error) {
    showToast('Budget removed');
    await loadBudgets(currentBSYear, currentBSMonth);
  }
}

function setupBudgetModal() {
  document.getElementById('close-budget-modal')?.addEventListener('click', () => closeModal('budget-modal'));
  document.getElementById('cancel-budget')?.addEventListener('click', () => closeModal('budget-modal'));

  document.getElementById('budget-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('budget-id').value;
    const category = document.getElementById('budget-category').value;
    const amount = parseFloat(document.getElementById('budget-amount').value);
    const errEl = document.getElementById('budget-error');

    if (!amount || amount <= 0) {
      errEl.textContent = 'Please enter a valid amount';
      return;
    }

    const payload = { category, amount, bs_year: currentBSYear, bs_month: currentBSMonth, user_id: currentUser.id };
    let error;

    if (id) {
      ({ error } = await supabaseClient.from('budgets').update({ amount }).eq('id', id));
    } else {
      ({ error } = await supabaseClient.from('budgets').upsert(payload, { onConflict: 'user_id,category,bs_year,bs_month' }));
    }

    if (error) {
      errEl.textContent = error.message;
    } else {
      closeModal('budget-modal');
      showToast('Budget saved!');
      await loadBudgets(currentBSYear, currentBSMonth);
    }
  });
}

initBudget();
