// ============================================
// KharchaPane - App Shared Utilities
// ============================================

let currentUser = null;
let currentBSYear, currentBSMonth;

// Auth guard - redirect if not logged in
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = '../index.html';
    return null;
  }
  currentUser = session.user;
  return session;
}

// Initialize common app elements
async function initApp() {
  const session = await requireAuth();
  if (!session) return;

  // Set current BS month
  const today = getCurrentNepaliDate();
  currentBSYear = today.year;
  currentBSMonth = today.month;

  // Update sidebar user info
  const name = session.user.user_metadata?.full_name ||
               session.user.email?.split('@')[0] || 'User';
  const email = session.user.email || '';

  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = name[0].toUpperCase();

  // Sidebar date display
  const nepaliDateEl = document.getElementById('today-nepali');
  const adDateEl = document.getElementById('today-ad');
  if (nepaliDateEl) {
    nepaliDateEl.textContent = `${today.day} ${getBSMonthName(today.month)} ${today.year} BS`;
  }
  if (adDateEl) {
    adDateEl.textContent = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = '../index.html';
  });

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
  });

  // Mobile menu
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    sidebar?.classList.toggle('mobile-open');
  });

  return session;
}

// Format currency
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  if (n >= 100000) return '₨ ' + (n / 100000).toFixed(2) + 'L';
  if (n >= 1000) return '₨ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return '₨ ' + n.toFixed(2);
}

// Format currency compact
function formatCurrencyFull(amount) {
  const n = Number(amount) || 0;
  return '₨ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Get transactions for a BS month
async function getTransactions(bsYear, bsMonth, type) {
  const range = getBSMonthADRange(bsYear, bsMonth);

  let query = supabaseClient
    .from('transactions')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date_ad', range.start)
    .lte('date_ad', range.end)
    .order('date_ad', { ascending: false });

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data || [];
}

// Save transaction
async function saveTransaction(payload) {
  const { data, error } = await supabaseClient
    .from('transactions')
    .insert([{ ...payload, user_id: currentUser.id }])
    .select()
    .single();
  return { data, error };
}

// Update transaction
async function updateTransaction(id, payload) {
  const { data, error } = await supabaseClient
    .from('transactions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', currentUser.id)
    .select()
    .single();
  return { data, error };
}

// Delete transaction
async function deleteTransaction(id) {
  const { error } = await supabaseClient
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUser.id);
  return { error };
}

// Setup month navigation
function setupMonthNav(onMonthChange) {
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');
  const monthLabel = document.getElementById('month-label');
  const monthDisplay = document.getElementById('current-month-display');

  function updateLabel() {
    const label = getMonthDisplayString(currentBSYear, currentBSMonth);
    if (monthLabel) monthLabel.textContent = label;
    if (monthDisplay) monthDisplay.textContent = label;
  }

  prevBtn?.addEventListener('click', () => {
    currentBSMonth--;
    if (currentBSMonth < 1) { currentBSMonth = 12; currentBSYear--; }
    updateLabel();
    onMonthChange(currentBSYear, currentBSMonth);
  });

  nextBtn?.addEventListener('click', () => {
    currentBSMonth++;
    if (currentBSMonth > 12) { currentBSMonth = 1; currentBSYear++; }
    updateLabel();
    onMonthChange(currentBSYear, currentBSMonth);
  });

  updateLabel();
}

// Show/hide modal
function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// Show toast notification
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;
    background:${type==='success'?'var(--income)':'var(--expense)'};
    color:white;padding:0.75rem 1.25rem;
    border-radius:8px;font-size:0.88rem;font-weight:500;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    z-index:9999;animation:slideIn 0.2s ease;
  `;

  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
