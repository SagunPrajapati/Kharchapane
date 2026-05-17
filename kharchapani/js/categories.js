// ============================================
// KharchaPane - Categories
// ============================================

const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food & Groceries', icon: '🍛', color: '#f97316' },
  { id: 'transport', name: 'Transport', icon: '🚌', color: '#3b82f6' },
  { id: 'rent', name: 'Rent & Housing', icon: '🏠', color: '#8b5cf6' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#eab308' },
  { id: 'health', name: 'Health & Medical', icon: '🏥', color: '#ef4444' },
  { id: 'education', name: 'Education', icon: '📚', color: '#06b6d4' },
  { id: 'clothing', name: 'Clothing', icon: '👔', color: '#ec4899' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#a855f7' },
  { id: 'internet', name: 'Internet & Phone', icon: '📱', color: '#14b8a6' },
  { id: 'personal', name: 'Personal Care', icon: '🧴', color: '#f43f5e' },
  { id: 'festival', name: 'Festival & Gifts', icon: '🎁', color: '#fb923c' },
  { id: 'savings_out', name: 'Savings / Investment', icon: '🏦', color: '#10b981' },
  { id: 'other_exp', name: 'Other', icon: '📦', color: '#64748b' },
];

const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary / Job', icon: '💼', color: '#16a34a' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#0ea5e9' },
  { id: 'business', name: 'Business', icon: '🏪', color: '#7c3aed' },
  { id: 'rent_inc', name: 'Rent Income', icon: '🏠', color: '#d97706' },
  { id: 'investment', name: 'Investment Returns', icon: '📈', color: '#059669' },
  { id: 'bonus', name: 'Bonus / Incentive', icon: '🎯', color: '#0284c7' },
  { id: 'remittance', name: 'Remittance', icon: '💸', color: '#be185d' },
  { id: 'other_inc', name: 'Other Income', icon: '📦', color: '#64748b' },
];

function getCategoryById(id, type) {
  const list = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return list.find(c => c.id === id) || { id, name: id, icon: '📦', color: '#64748b' };
}

function getCategoryColor(id, type) {
  return getCategoryById(id, type).color;
}

function getCategoryName(id, type) {
  return getCategoryById(id, type).name;
}

function populateCategorySelect(selectEl, type) {
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  selectEl.innerHTML = cats.map(c =>
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');
}

function populateCategoryFilter(selectEl, type) {
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const defaultOpt = type === 'expense' ? 'All Categories' : 'All Sources';
  selectEl.innerHTML = `<option value="">${defaultOpt}</option>` +
    cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}
