// ============================================
// KharchaPane - Entries (Expenses & Income)
// ============================================
let allEntries=[], deleteTargetId=null, entryType='expense';

async function initEntriesPage(type) {
  entryType=type;
  const session=await initApp();
  if(!session) return;
  populateCategoryFilter(document.getElementById('filter-category'),type);
  setupMonthNav(loadEntries);
  setupEntryModal();
  setupDeleteModal();
  setupFilters();
  document.getElementById('quick-add-btn')?.addEventListener('click',()=>openAddModal());
  await loadEntries(currentBSYear,currentBSMonth);
}

async function loadEntries(year,month) {
  const tbody=document.getElementById('expense-tbody');
  if(tbody) tbody.innerHTML='<tr><td colspan="7" class="loading-state">Loading...</td></tr>';
  allEntries=await getTransactions(year,month,entryType);
  renderEntries(allEntries);
  updateStrip(allEntries);
}

function renderEntries(entries) {
  const tbody=document.getElementById('expense-tbody');
  if(!tbody) return;
  if(entries.length===0) {
    tbody.innerHTML=`<tr><td colspan="7" class="empty-state">No ${entryType==='expense'?'expenses':'income'} this month.<br>
      <button onclick="openAddModal()" style="margin-top:.5rem;padding:.4rem .9rem;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;font-size:.85rem">+ Add Entry</button></td></tr>`;
    return;
  }
  tbody.innerHTML=entries.map(t=>{
    const cat=getCategoryById(t.category,t.type);
    return `<tr data-id="${t.id}">
      <td>${formatBSDate(t.date_bs_year,t.date_bs_month,t.date_bs_day)}</td>
      <td style="color:var(--text-muted);font-size:.83rem">${formatADDate(t.date_ad)}</td>
      <td><strong>${escHtml(t.particular)}</strong>${t.note?`<br><small style="color:var(--text-muted)">${escHtml(t.note)}</small>`:''}</td>
      <td><span class="cat-tag" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.name}</span></td>
      <td style="color:var(--text-muted);font-size:.83rem">${escHtml(t.note||'')}</td>
      <td class="text-right amount-cell ${entryType==='expense'?'amount-expense':'amount-income'}">${entryType==='expense'?'-':'+'}${formatCurrencyFull(t.amount)}</td>
      <td class="text-center"><div class="action-btns">
        <button class="action-btn edit" onclick="openEditModal('${t.id}')">✏️ Edit</button>
        <button class="action-btn delete" onclick="confirmDelete('${t.id}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}

function updateStrip(entries) {
  const total=entries.reduce((s,t)=>s+Number(t.amount),0);
  const largest=entries.length>0?Math.max(...entries.map(t=>Number(t.amount))):0;
  const avg=entries.length>0?total/entries.length:0;
  const et=document.getElementById('month-total');
  const ec=document.getElementById('entry-count');
  const da=document.getElementById('daily-avg');
  const le=document.getElementById('largest-entry');
  if(et) et.textContent=formatCurrency(total);
  if(ec) ec.textContent=entries.length;
  if(da) da.textContent=formatCurrency(avg);
  if(le) le.textContent=formatCurrency(largest);
}

function setupFilters() {
  const si=document.getElementById('search-input');
  const cf=document.getElementById('filter-category');
  const ss=document.getElementById('sort-select');
  function apply() {
    let f=[...allEntries];
    const s=si?.value.toLowerCase()||'';
    const c=cf?.value||'';
    const sort=ss?.value||'date_desc';
    if(s) f=f.filter(t=>t.particular.toLowerCase().includes(s)||(t.note||'').toLowerCase().includes(s));
    if(c) f=f.filter(t=>t.category===c);
    f.sort((a,b)=>{
      if(sort==='date_desc') return new Date(b.date_ad)-new Date(a.date_ad);
      if(sort==='date_asc') return new Date(a.date_ad)-new Date(b.date_ad);
      if(sort==='amount_desc') return b.amount-a.amount;
      return a.amount-b.amount;
    });
    renderEntries(f);
  }
  si?.addEventListener('input',apply);
  cf?.addEventListener('change',apply);
  ss?.addEventListener('change',apply);
}

function openAddModal() {
  let today;
  try { today=getCurrentNepaliDate(); } catch(e) { today={year:currentBSYear,month:currentBSMonth,day:1}; }
  document.getElementById('modal-title').textContent=`Add ${entryType==='expense'?'Expense':'Income'}`;
  document.getElementById('edit-id').value='';
  document.getElementById('entry-particular').value='';
  document.getElementById('entry-amount').value='';
  if(document.getElementById('entry-note')) document.getElementById('entry-note').value='';
  document.getElementById('modal-error').textContent='';
  populateYearSelect(document.getElementById('entry-year'),today.year);
  populateMonthSelect(document.getElementById('entry-month'),today.month);
  populateDaySelect(document.getElementById('entry-day'),today.year,today.month,today.day);
  populateCategorySelect(document.getElementById('entry-category'),entryType);
  updateEntryDatePreview();
  openModal('expense-modal');
}

function openEditModal(id) {
  const t=allEntries.find(e=>e.id===id);
  if(!t) return;
  document.getElementById('modal-title').textContent=`Edit ${entryType==='expense'?'Expense':'Income'}`;
  document.getElementById('edit-id').value=id;
  document.getElementById('entry-particular').value=t.particular;
  document.getElementById('entry-amount').value=t.amount;
  if(document.getElementById('entry-note')) document.getElementById('entry-note').value=t.note||'';
  document.getElementById('modal-error').textContent='';
  populateYearSelect(document.getElementById('entry-year'),t.date_bs_year);
  populateMonthSelect(document.getElementById('entry-month'),t.date_bs_month);
  populateDaySelect(document.getElementById('entry-day'),t.date_bs_year,t.date_bs_month,t.date_bs_day);
  populateCategorySelect(document.getElementById('entry-category'),entryType);
  document.getElementById('entry-category').value=t.category;
  updateEntryDatePreview();
  openModal('expense-modal');
}

function updateEntryDatePreview() {
  try {
    const y=parseInt(document.getElementById('entry-year')?.value);
    const m=parseInt(document.getElementById('entry-month')?.value);
    const d=parseInt(document.getElementById('entry-day')?.value);
    if(!y||!m||!d) return;
    const ad=bsToAD(y,m,d);
    const preview=document.getElementById('date-ad-preview');
    if(preview) preview.textContent='AD: '+new Date(ad).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  } catch(e){}
}

function setupEntryModal() {
  document.getElementById('close-modal')?.addEventListener('click',()=>closeModal('expense-modal'));
  document.getElementById('cancel-modal')?.addEventListener('click',()=>closeModal('expense-modal'));
  ['entry-year','entry-month'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change',()=>{
      const y=parseInt(document.getElementById('entry-year').value);
      const m=parseInt(document.getElementById('entry-month').value);
      const d=parseInt(document.getElementById('entry-day')?.value)||1;
      populateDaySelect(document.getElementById('entry-day'),y,m,d);
      updateEntryDatePreview();
    });
  });
  document.getElementById('entry-day')?.addEventListener('change',updateEntryDatePreview);

  document.getElementById('expense-form')?.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const editId=document.getElementById('edit-id').value;
    const y=parseInt(document.getElementById('entry-year').value);
    const m=parseInt(document.getElementById('entry-month').value);
    const d=parseInt(document.getElementById('entry-day').value);
    const particular=document.getElementById('entry-particular').value.trim();
    const category=document.getElementById('entry-category').value;
    const amount=parseFloat(document.getElementById('entry-amount').value);
    const note=document.getElementById('entry-note')?.value.trim()||'';
    const errEl=document.getElementById('modal-error');
    if(!particular||!amount||amount<=0){if(errEl)errEl.textContent='Please fill all required fields';return;}
    const adDate=bsToAD(y,m,d);
    const adStr=new Date(adDate).toISOString().split('T')[0];
    const payload={type:entryType,date_ad:adStr,date_bs_year:y,date_bs_month:m,date_bs_day:d,particular,category,amount,note};
    const btn=e.target.querySelector('button[type="submit"]');
    if(btn){btn.disabled=true;btn.textContent='Saving...';}
    let error;
    if(editId){({error}=await updateTransaction(editId,payload));}
    else{({error}=await saveTransaction(payload));}
    if(btn){btn.disabled=false;btn.textContent=editId?'Update':'Save';}
    if(error){if(errEl)errEl.textContent=error.message;}
    else{closeModal('expense-modal');showToast(editId?'Entry updated! ✅':'Entry saved! ✅');await loadEntries(currentBSYear,currentBSMonth);}
  });
}

function confirmDelete(id){deleteTargetId=id;openModal('delete-modal');}

function setupDeleteModal() {
  document.getElementById('close-delete-modal')?.addEventListener('click',()=>closeModal('delete-modal'));
  document.getElementById('cancel-delete')?.addEventListener('click',()=>closeModal('delete-modal'));
  document.getElementById('confirm-delete')?.addEventListener('click',async()=>{
    if(!deleteTargetId) return;
    const btn=document.getElementById('confirm-delete');
    btn.textContent='Deleting...';btn.disabled=true;
    const{error}=await deleteTransaction(deleteTargetId);
    btn.textContent='Delete';btn.disabled=false;
    closeModal('delete-modal');
    if(!error){showToast('Entry deleted','error');await loadEntries(currentBSYear,currentBSMonth);}
    deleteTargetId=null;
  });
}
