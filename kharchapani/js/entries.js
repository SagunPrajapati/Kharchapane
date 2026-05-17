// ============================================
// KharchaPane - Entries Page (Expenses & Income)
// ============================================

let allEntries = [];
let deleteTargetId = null;
let entryType = 'expense';

async function initEntriesPage(type) {
  entryType = type;
  await initApp();

  // Populate category filter
  populateCategoryFilter(document.getElementById('filter-category'), type);

  setupMonthNav(loadEntries);
  setupEntryModal();
  setupDeleteModal();
  setupFilters();

  document.getElementById('quick-add-btn')?.addEventListener('click', () => openAddModal());

  await loadEntries(currentBSYear, currentBSMonth);
}

async function loadEntries(year, month) {
  const tbody = document.getElementById('expense-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading-state">Loading...</td></tr>';

  allEntries = await getTransactions(year, month, entryType);
  renderEntries(allEntries);
  updateSummaryStrip(allEntries);
}

function renderEntries(entries) {
  const tbody = document.getElementById('expense-tbody');

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">
      No ${entryType === 'expense' ? 'expenses' : 'income'} this month.
      <br><button onclick="openAddModal()" style="margin-top:0.5rem;padding:0.4rem 0.9rem;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem">Add Entry</button>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(t => {
    const cat = getCategoryById(t.category, t.type);
    const bsDateStr = formatBSDate(t.date_bs_year, t.date_bs_month, t.date_bs_day);
    const adDateStr = formatADDate(t.date_ad);
    const amtClass = entryType === 'expense' ? 'amount-expense' : 'amount-income';
    const sign = entryType === 'expense' ? '-' : '+';

    return `<tr data-id="${t.id}">
      <td>${bsDateStr}</td>
      <td style="color:var(--text-muted);font-size:0.83rem">${adDateStr}</td>
      <td><strong>${escHtml(t.particular)}</strong>${t.note ? `<br><small style="color:var(--text-muted)">${escHtml(t.note)}</small>` : ''}</td>
      <td><span class="cat-tag" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.name}</span></td>
      <td style="color:var(--text-muted);font-size:0.83rem">${escHtml(t.note || '')}</td>
      <td class="text-right amount-cell ${amtClass}">${sign}${formatCurrencyFull(t.amount)}</td>
      <td class="text-center">
        <div class="action-btns">
          <button class="action-btn edit" onclick="openEditModal('${t.id}')">✏️ Edit</button>
          <button class="action-btn delete" onclick="confirmDelete('${t.id}')">🗑️ Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function updateSummaryStrip(entries) {
  const total = entries.reduce((s, t) => s + Number(t.amount), 0);
  const largest = entries.length > 0 ? Math.max(...entries.map(t => Number(t.amount))) : 0;
  const avg = entries.length > 0 ? total / entries.length : 0;

  document.getElementById('month-total').textContent = formatCurrency(total);
  document.getElementById('entry-count').textContent = entries.length;
  document.getElementById('daily-avg').textContent = formatCurrency(avg);
  document.getElementById('largest-entry').textContent = formatCurrency(largest);
}

function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const catFilter = document.getElementById('filter-category');
  const sortSelect = document.getElementById('sort-select');

  function applyFilters() {
    let filtered = [...allEntries];
    const search = searchInput?.value.toLowerCase() || '';
    const cat = catFilter?.value || '';
    const sort = sortSelect?.value || 'date_desc';

    if (search) {
      filtered = filtered.filter(t =>
        t.particular.toLowerCase().includes(search) ||
        (t.note || '').toLowerCase().includes(search)
      );
    }
    if (cat) filtered = filtered.filter(t => t.category === cat);

    filtered.sort((a, b) => {
      if (sort === 'date_desc') return new Date(b.date_ad) - new Date(a.date_ad);
      if (sort === 'date_asc') return new Date(a.date_ad) - new Date(b.date_ad);
      if (sort === 'amount_desc') return b.amount - a.amount;
      if (sort === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

    renderEntries(filtered);
  }

  searchInput?.addEventListener('input', applyFilters);
  catFilter?.addEventListener('change', applyFilters);
  sortSelect?.addEventListener('change', applyFilters);
}

// ---- ADD/EDIT MODAL ----
function openAddModal() {
  const today = getCurrentNepaliDate();
  document.getElementById('modal-title').textContent = `Add ${entryType === 'expense' ? 'Expense' : 'Income'}`;
  document.getElementById('edit-id').value = '';
  document.getElementById('entry-particular').value = '';
  document.getElementById('entry-amount').value = '';
  document.getElementById('entry-note').value = '';
  document.getElementById('modal-error').textContent = '';

  populateYearSelect(document.getElementById('entry-year'), today.year);
  populateMonthSelect(document.getElementById('entry-month'), today.month);
  populateDaySelect(document.getElementById('entry-day'), today.year, today.month, today.day);
  populateCategorySelect(document.getElementById('entry-category'), entryType);
  updateEntryDatePreview();
  openModal('expense-modal');
}

function openEditModal(id) {
  const t = allEntries.find(e => e.id === id);
  if (!t) return;

  document.getElementById('modal-title').textContent = `Edit ${entryType === 'expense' ? 'Expense' : 'Income'}`;
  document.getElementById('edit-id').value = id;
  document.getElementById('entry-particular').value = t.particular;
  document.getElementById('entry-amount').value = t.amount;
  document.getElementById('entry-note').value = t.note || '';
  document.getElementById('modal-error').textContent = '';

  populateYearSelect(document.getElementById('entry-year'), t.date_bs_year);
  populateMonthSelect(document.getElementById('entry-month'), t.date_bs_month);
  populateDaySelect(document.getElementById('entry-day'), t.date_bs_year, t.date_bs_month, t.date_bs_day);
  populateCategorySelect(document.getElementById('entry-category'), entryType);
  document.getElementById('entry-category').value = t.category;
  updateEntryDatePreview();
  openModal('expense-modal');
}

function updateEntryDatePreview() {
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

function setupEntryModal() {
  document.getElementById('close-modal')?.addEventListener('click', () => closeModal('expense-modal'));
  document.getElementById('cancel-modal')?.addEventListener('click', () => closeModal('expense-modal'));

  ['entry-year','entry-month'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const y = parseInt(document.getElementById('entry-year').value);
      const m = parseInt(document.getElementById('entry-month').value);
      const d = parseInt(document.getElementById('entry-day')?.value) || 1;
      populateDaySelect(document.getElementById('entry-day'), y, m, d);
      updateEntryDatePreview();
    });
  });

  document.getElementById('entry-day')?.addEventListener('change', updateEntryDatePreview);

  document.getElementById('expense-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const y = parseInt(document.getElementById('entry-year').value);
    const m = parseInt(document.getElementById('entry-month').value);
    const d = parseInt(document.getElementById('entry-day').value);
    const particular = document.getElementById('entry-particular').value.trim();
    const category = document.getElementById('entry-category').value;
    const amount = parseFloat(document.getElementById('entry-amount').value);
    const note = document.getElementById('entry-note').value.trim();
    const errEl = document.getElementById('modal-error');

    if (!particular || !amount || amount <= 0) {
      errEl.textContent = 'Please fill all required fields with valid values';
      return;
    }

    const adDate = bsToAD(y, m, d);
    const adStr = adDate.toISOString().split('T')[0];
    const payload = { type: entryType, date_ad: adStr, date_bs_year: y, date_bs_month: m, date_bs_day: d, particular, category, amount, note };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Saving...';

    let error;
    if (editId) {
      ({ error } = await updateTransaction(editId, payload));
    } else {
      ({ error } = await saveTransaction(payload));
    }

    btn.disabled = false;
    btn.textContent = editId ? `Update ${entryType}` : `Save ${entryType}`;

    if (error) {
      errEl.textContent = error.message;
    } else {
      closeModal('expense-modal');
      showToast(editId ? 'Entry updated!' : 'Entry saved!');
      await loadEntries(currentBSYear, currentBSMonth);
    }
  });
}

function confirmDelete(id) {
  deleteTargetId = id;
  openModal('delete-modal');
}

function setupDeleteModal() {
  document.getElementById('close-delete-modal')?.addEventListener('click', () => closeModal('delete-modal'));
  document.getElementById('cancel-delete')?.addEventListener('click', () => closeModal('delete-modal'));
  document.getElementById('confirm-delete')?.addEventListener('click', async () => {
    if (!deleteTargetId) return;
    const btn = document.getElementById('confirm-delete');
    btn.textContent = 'Deleting...'; btn.disabled = true;
    const { error } = await deleteTransaction(deleteTargetId);
    btn.textContent = 'Delete'; btn.disabled = false;
    closeModal('delete-modal');
    if (!error) {
      showToast('Entry deleted', 'error');
      await loadEntries(currentBSYear, currentBSMonth);
    }
    deleteTargetId = null;
  });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
