// ============================================
// KharchaPane - App Core
// ============================================

let currentUser = null;
let currentBSYear, currentBSMonth;

function getBasePath() {
  const path = window.location.pathname;
  return path.includes('/pages/') ? path.split('/pages/')[0] : path.replace(/\/[^\/]*$/, '');
}

async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.replace(getBasePath() + '/index.html'); return null; }
  currentUser = session.user;
  return session;
}

async function initApp() {
  const session = await requireAuth();
  if (!session) return null;

  // Set current BS month using safe date function
  let today;
  try { today = getCurrentNepaliDate(); }
  catch(e) { today = { year: 2082, month: 2, day: 1 }; }
  currentBSYear = today.year;
  currentBSMonth = today.month;

  // User info
  const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
  const email = session.user.email || '';

  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = name[0].toUpperCase();

  // Date display
  const nepaliEl = document.getElementById('today-nepali');
  const adEl = document.getElementById('today-ad');
  if (nepaliEl) try { nepaliEl.textContent = `${today.day} ${getBSMonthName(today.month)} ${today.year} BS`; } catch(e){}
  if (adEl) adEl.textContent = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.replace(getBasePath() + '/index.html');
  });

  // Sidebar
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => sidebar?.classList.toggle('mobile-open'));

  return session;
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  if (n >= 100000) return 'Rs. ' + (n/100000).toFixed(2) + 'L';
  if (n >= 1000) return 'Rs. ' + n.toLocaleString('en-IN', {maximumFractionDigits:0});
  return 'Rs. ' + n.toFixed(2);
}

function formatCurrencyFull(amount) {
  const n = Number(amount) || 0;
  return 'Rs. ' + n.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
}

async function getTransactions(bsYear, bsMonth, type) {
  if (!currentUser) return [];
  try {
    const range = getBSMonthADRange(bsYear, bsMonth);
    let query = supabaseClient.from('transactions').select('*')
      .eq('user_id', currentUser.id)
      .gte('date_ad', range.start)
      .lte('date_ad', range.end)
      .order('date_ad', { ascending: false });
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) { console.error('DB error:', error.message); return []; }
    return data || [];
  } catch(e) { console.error('getTransactions failed:', e); return []; }
}

async function saveTransaction(payload) {
  const { data, error } = await supabaseClient.from('transactions')
    .insert([{ ...payload, user_id: currentUser.id }]).select().single();
  return { data, error };
}

async function updateTransaction(id, payload) {
  const { data, error } = await supabaseClient.from('transactions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', currentUser.id).select().single();
  return { data, error };
}

async function deleteTransaction(id) {
  const { error } = await supabaseClient.from('transactions')
    .delete().eq('id', id).eq('user_id', currentUser.id);
  return { error };
}

function setupMonthNav(onMonthChange) {
  function updateLabel() {
    const label = getMonthDisplayString(currentBSYear, currentBSMonth);
    const ml = document.getElementById('month-label');
    const md = document.getElementById('current-month-display');
    if (ml) ml.textContent = label;
    if (md) md.textContent = label;
  }
  document.getElementById('prev-month')?.addEventListener('click', () => {
    currentBSMonth--; if (currentBSMonth < 1) { currentBSMonth = 12; currentBSYear--; }
    updateLabel(); onMonthChange(currentBSYear, currentBSMonth);
  });
  document.getElementById('next-month')?.addEventListener('click', () => {
    currentBSMonth++; if (currentBSMonth > 12) { currentBSMonth = 1; currentBSYear++; }
    updateLabel(); onMonthChange(currentBSYear, currentBSMonth);
  });
  updateLabel();
}

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function showToast(msg, type='success') {
  document.querySelector('.kp-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'kp-toast';
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;background:${type==='success'?'#16a34a':'#dc2626'};color:white;padding:.75rem 1.25rem;border-radius:8px;font-size:.88rem;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:9999;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
