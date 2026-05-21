// ============================================
// KharchaPane - Dashboard
// ============================================
let expenseChart, incomeChart, trendChart;

async function initDashboard() {
  const session = await initApp();
  if (!session) return;
  setupMonthNav(loadDashboard);
  setupQuickAdd();
  await loadDashboard(currentBSYear, currentBSMonth);
}

async function loadDashboard(year, month) {
  try {
    const [expenses, incomes] = await Promise.all([
      getTransactions(year, month, 'expense'),
      getTransactions(year, month, 'income')
    ]);
    const totalExp = expenses.reduce((s,t) => s+Number(t.amount), 0);
    const totalInc = incomes.reduce((s,t) => s+Number(t.amount), 0);
    const net = totalInc - totalExp;
    const savRate = totalInc > 0 ? ((net/totalInc)*100) : 0;

    document.getElementById('total-income').textContent = formatCurrency(totalInc);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExp);
    document.getElementById('net-balance').textContent = formatCurrency(Math.abs(net));
    document.getElementById('savings-rate').textContent = Math.max(0,savRate).toFixed(1)+'%';
    document.getElementById('income-count').textContent = incomes.length+' entries';
    document.getElementById('expense-count').textContent = expenses.length+' entries';
    document.getElementById('net-balance').style.color = net>=0 ? 'var(--income)' : 'var(--expense)';
    document.getElementById('balance-status').textContent = net>=0 ? '✅ Positive balance' : '⚠️ Overspent';

    renderDonut('expense-donut', expenses, 'expense', 'expense-legend', 'expense-center-amount');
    renderDonut('income-donut', incomes, 'income', 'income-legend', 'income-center-amount');
    await renderTrend(year, month);
    await renderBudgetProgress(year, month, expenses);
    renderRecentTxns([...expenses, ...incomes]);
  } catch(e) { console.error('Dashboard load error:', e); }
}

function renderDonut(canvasId, entries, type, legendId, centerId) {
  const catTotals = {};
  entries.forEach(t => { catTotals[t.category] = (catTotals[t.category]||0)+Number(t.amount); });
  const total = Object.values(catTotals).reduce((s,v)=>s+v,0);
  const centerEl = document.getElementById(centerId);
  if (centerEl) centerEl.textContent = formatCurrency(total);

  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  if (type==='expense' && expenseChart) { expenseChart.destroy(); expenseChart=null; }
  if (type==='income' && incomeChart) { incomeChart.destroy(); incomeChart=null; }

  const sorted = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if (sorted.length===0) {
    const legendEl = document.getElementById(legendId);
    if (legendEl) legendEl.innerHTML = `<span style="font-size:.8rem;color:var(--text-muted)">No ${type} this month</span>`;
    return;
  }

  const chart = new Chart(ctx, {
    type:'doughnut',
    data: { labels:sorted.map(([id])=>getCategoryName(id,type)), datasets:[{
      data:sorted.map(([,v])=>v), backgroundColor:sorted.map(([id])=>getCategoryColor(id,type)),
      borderWidth:2, borderColor:'#fff', hoverOffset:4
    }]},
    options: { cutout:'70%', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>` ${c.label}: Rs.${Number(c.raw).toLocaleString()}`}} }
    }
  });
  if (type==='expense') expenseChart=chart; else incomeChart=chart;

  const legendEl = document.getElementById(legendId);
  if (legendEl) legendEl.innerHTML = sorted.slice(0,5).map(([id,v])=>`
    <div class="legend-item"><div class="legend-dot" style="background:${getCategoryColor(id,type)}"></div>
    <span>${getCategoryName(id,type)}: ${formatCurrency(v)}</span></div>`).join('');
}

async function renderTrend(currentYear, currentMonth) {
  const months = [];
  let y=currentYear, m=currentMonth;
  for(let i=0;i<6;i++) { months.unshift({year:y,month:m}); m--; if(m<1){m=12;y--;} }
  const data = await Promise.all(months.map(async ({year,month}) => {
    const [ex,inc] = await Promise.all([getTransactions(year,month,'expense'),getTransactions(year,month,'income')]);
    return { label: getBSMonthName(month).slice(0,3)+' '+String(year).slice(-2),
      expense:ex.reduce((s,t)=>s+Number(t.amount),0), income:inc.reduce((s,t)=>s+Number(t.amount),0) };
  }));
  const ctx = document.getElementById('trend-chart')?.getContext('2d');
  if (!ctx) return;
  if (trendChart) { trendChart.destroy(); trendChart=null; }
  trendChart = new Chart(ctx, {
    type:'bar', data:{ labels:data.map(d=>d.label), datasets:[
      {label:'Income',data:data.map(d=>d.income),backgroundColor:'rgba(22,163,74,0.75)',borderRadius:4},
      {label:'Expenses',data:data.map(d=>d.expense),backgroundColor:'rgba(220,38,38,0.7)',borderRadius:4}
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:c=>` Rs.${Number(c.raw).toLocaleString()}`}}},
      scales:{ y:{beginAtZero:true,ticks:{callback:v=>'Rs.'+(v/1000)+'k',font:{size:11}},grid:{color:'rgba(0,0,0,.05)'}},
        x:{ticks:{font:{size:11}},grid:{display:false}} }
    }
  });
}

async function renderBudgetProgress(year, month, expenses) {
  const el = document.getElementById('budget-progress-list');
  if (!el) return;
  const { data: budgets } = await supabaseClient.from('budgets').select('*')
    .eq('user_id', currentUser.id).eq('bs_year', year).eq('bs_month', month);
  if (!budgets || budgets.length===0) {
    el.innerHTML='<p style="color:var(--text-muted);font-size:.88rem;text-align:center;padding:1rem">No budget goals set. <a href="budget.html" style="color:var(--primary)">Set one →</a></p>';
    return;
  }
  const catTotals={};
  expenses.forEach(t=>{catTotals[t.category]=(catTotals[t.category]||0)+Number(t.amount);});
  el.innerHTML = budgets.map(b=>{
    const spent=catTotals[b.category]||0;
    const pct=Math.min(100,(spent/b.amount)*100);
    const fc=pct>=100?'over':pct>=80?'warn':'ok';
    return `<div style="margin-bottom:.8rem">
      <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
        <span style="font-size:.85rem;font-weight:500">${getCategoryName(b.category,'expense')}</span>
        <span style="font-size:.82rem;color:var(--text-secondary)">${formatCurrency(spent)} / ${formatCurrency(b.amount)}${pct>=100?' <span style="color:var(--expense);font-weight:600">Over!</span>':''}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill ${fc}" style="width:${pct}%"></div></div></div>`;
  }).join('');
}

function renderRecentTxns(transactions) {
  const el = document.getElementById('recent-transactions');
  if (!el) return;
  const sorted = [...transactions].sort((a,b)=>new Date(b.date_ad)-new Date(a.date_ad)).slice(0,10);
  if (sorted.length===0) { el.innerHTML='<div class="empty-state">No transactions this month. Add your first entry!</div>'; return; }
  el.innerHTML = sorted.map(t=>{
    const cat=getCategoryById(t.category,t.type);
    return `<div class="transaction-row">
      <div class="txn-icon ${t.type}">${cat.icon}</div>
      <div class="txn-info">
        <div class="txn-particular">${escHtml(t.particular)}</div>
        <div class="txn-meta">${formatBSDate(t.date_bs_year,t.date_bs_month,t.date_bs_day)} BS</div>
      </div>
      <span class="txn-category">${cat.name}</span>
      <span class="txn-amount ${t.type}">${t.type==='expense'?'-':'+'}${formatCurrency(t.amount)}</span>
    </div>`;
  }).join('');
}

// Quick Add Modal
function setupQuickAdd() {
  let entryType='expense';
  document.getElementById('quick-add-btn')?.addEventListener('click', () => {
    const today=getCurrentNepaliDate();
    initDateFields(today.year,today.month,today.day);
    populateCategorySelect(document.getElementById('entry-category'),'expense');
    updateDatePreview();
    document.getElementById('entry-particular').value='';
    document.getElementById('entry-amount').value='';
    if(document.getElementById('entry-note')) document.getElementById('entry-note').value='';
    document.getElementById('modal-error').textContent='';
    openModal('quick-add-modal');
  });
  document.getElementById('close-modal')?.addEventListener('click',()=>closeModal('quick-add-modal'));
  document.getElementById('cancel-modal')?.addEventListener('click',()=>closeModal('quick-add-modal'));

  document.querySelectorAll('.modal-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      entryType=tab.dataset.type;
      populateCategorySelect(document.getElementById('entry-category'),entryType);
      const lbl=document.getElementById('particular-label');
      if(lbl) lbl.textContent=entryType==='expense'?'Item / Expense Detail':'Particular / Source';
    });
  });

  ['entry-year','entry-month','entry-day'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change',()=>{
      const y=parseInt(document.getElementById('entry-year').value);
      const m=parseInt(document.getElementById('entry-month').value);
      const d=parseInt(document.getElementById('entry-day')?.value)||1;
      if(id!=='entry-day') populateDaySelect(document.getElementById('entry-day'),y,m,d);
      updateDatePreview();
    });
  });

  document.getElementById('quick-add-form')?.addEventListener('submit',async(e)=>{
    e.preventDefault();
    await saveEntry(entryType);
  });
}

function initDateFields(year,month,day) {
  populateYearSelect(document.getElementById('entry-year'),year);
  populateMonthSelect(document.getElementById('entry-month'),month);
  populateDaySelect(document.getElementById('entry-day'),year,month,day);
}

function updateDatePreview() {
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

async function saveEntry(type) {
  const y=parseInt(document.getElementById('entry-year').value);
  const m=parseInt(document.getElementById('entry-month').value);
  const d=parseInt(document.getElementById('entry-day').value);
  const particular=document.getElementById('entry-particular').value.trim();
  const category=document.getElementById('entry-category').value;
  const amount=parseFloat(document.getElementById('entry-amount').value);
  const note=document.getElementById('entry-note')?.value.trim()||'';
  const errEl=document.getElementById('modal-error');

  if(!particular||!amount||amount<=0) { if(errEl) errEl.textContent='Please fill all required fields'; return; }

  const adDate=bsToAD(y,m,d);
  const adStr=new Date(adDate).toISOString().split('T')[0];
  const btn=document.getElementById('save-entry-btn');
  if(btn){btn.textContent='Saving...';btn.disabled=true;}

  const {error}=await saveTransaction({type,date_ad:adStr,date_bs_year:y,date_bs_month:m,date_bs_day:d,particular,category,amount,note});
  if(btn){btn.textContent='Save Entry';btn.disabled=false;}

  if(error){if(errEl)errEl.textContent=error.message;}
  else {
    closeModal('quick-add-modal');
    showToast(type==='expense'?'Expense added! ✅':'Income added! ✅');
    await loadDashboard(currentBSYear,currentBSMonth);
  }
}

initDashboard();
