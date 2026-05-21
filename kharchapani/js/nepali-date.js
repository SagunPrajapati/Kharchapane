// ============================================
// KharchaPane - Nepali Date Utilities
// Robust implementation with fallback
// ============================================

const NEPALI_MONTHS = [
  'Baisakh','Jestha','Ashadh','Shrawan',
  'Bhadra','Ashwin','Kartik','Mangsir',
  'Poush','Magh','Falgun','Chaitra'
];

// BS month days lookup
const BS_DAYS = {
  2079:[31,32,31,32,31,30,30,30,29,30,29,31],
  2080:[31,31,32,32,31,30,30,30,29,29,30,30],
  2081:[31,31,32,31,31,31,30,29,30,29,30,30],
  2082:[31,32,31,32,31,30,30,29,30,29,30,30],
  2083:[31,32,31,32,31,30,30,30,29,29,30,31],
  2084:[31,31,32,31,31,30,30,30,29,30,29,31],
  2085:[31,31,32,32,31,31,30,29,30,29,30,30],
  2086:[31,32,31,32,31,30,30,29,30,29,30,30],
  2087:[31,32,31,32,31,30,30,30,29,29,30,31],
  2088:[31,32,31,32,31,30,30,30,29,30,30,30],
  2089:[31,31,32,31,31,31,30,29,30,29,30,30],
  2090:[31,31,32,32,31,30,30,29,30,29,30,30],
};

function getBSMonthDays(year, month) {
  return (BS_DAYS[year] && BS_DAYS[year][month-1]) || 30;
}

// Safe NepaliDate wrapper
function getNepaliDate(adDate) {
  try {
    if (typeof NepaliDate !== 'undefined') {
      const nd = new NepaliDate(adDate || new Date());
      return { year: nd.getYear(), month: nd.getMonth()+1, day: nd.getDate() };
    }
    if (typeof nepaliDate !== 'undefined' && nepaliDate.NepaliDate) {
      const nd = new nepaliDate.NepaliDate(adDate || new Date());
      return { year: nd.getYear(), month: nd.getMonth()+1, day: nd.getDate() };
    }
    if (window.NepaliDateConverter) {
      const nd = new window.NepaliDateConverter(adDate || new Date());
      return { year: nd.getYear(), month: nd.getMonth()+1, day: nd.getDate() };
    }
  } catch(e) { console.warn('NepaliDate lib error:', e.message); }
  return adToBS_manual(adDate || new Date());
}

function adToBS_manual(adDate) {
  const d = new Date(adDate);
  const year = d.getFullYear();
  const month = d.getMonth()+1;
  const day = d.getDate();
  let bsYear = year + 56;
  let bsMonth = month + 9;
  let bsDay = day + 17;
  if (bsMonth > 12) { bsMonth -= 12; bsYear++; }
  const maxDays = getBSMonthDays(bsYear, bsMonth);
  if (bsDay > maxDays) { bsDay -= maxDays; bsMonth++; }
  if (bsMonth > 12) { bsMonth = 1; bsYear++; }
  return { year: bsYear, month: bsMonth, day: bsDay };
}

function bsToAD_manual(bsYear, bsMonth, bsDay) {
  let adYear = bsYear - 56;
  let adMonth = bsMonth - 9;
  let adDay = bsDay - 17;
  if (adMonth <= 0) { adMonth += 12; adYear--; }
  if (adDay <= 0) { adMonth--; if (adMonth<=0){adMonth=12;adYear--;} adDay += 30; }
  return new Date(adYear, adMonth-1, adDay);
}

function getCurrentNepaliDate() { return getNepaliDate(new Date()); }
function adToBS(adDate) { return getNepaliDate(new Date(adDate)); }
function bsToAD(year,month,day) { try { if(typeof NepaliDate!=='undefined'){const nd=new NepaliDate(year,month-1,day);return nd.toJsDate();} }catch(e){} return bsToAD_manual(year,month,day); }
function formatBSDate(y,m,d){return `${d} ${NEPALI_MONTHS[m-1]} ${y}`;}
function formatBSShort(y,m,d){return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;}
function formatADDate(s){if(!s)return'';return new Date(s+'T00:00:00').toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}
function getBSMonthName(m){return NEPALI_MONTHS[m-1]||'';}
function getBSYearRange(){const c=getCurrentNepaliDate();const y=[];for(let i=c.year-3;i<=c.year+1;i++)y.push(i);return y;}
function populateYearSelect(el,sy){el.innerHTML=getBSYearRange().map(y=>`<option value="${y}" ${y===sy?'selected':''}>${y}</option>`).join('');}
function populateMonthSelect(el,sm){el.innerHTML=NEPALI_MONTHS.map((n,i)=>`<option value="${i+1}" ${(i+1)===sm?'selected':''}>${String(i+1).padStart(2,'0')} - ${n}</option>`).join('');}
function populateDaySelect(el,y,m,sd){const days=getBSMonthDays(y,m);el.innerHTML='';for(let d=1;d<=days;d++){const o=document.createElement('option');o.value=d;o.textContent=String(d).padStart(2,'0');if(d===sd)o.selected=true;el.appendChild(o);}}
function getBSMonthADRange(y,m){const f=bsToAD(y,m,1);const ld=getBSMonthDays(y,m);const l=bsToAD(y,m,ld);const fmt=d=>{new Date(d);return new Date(d).toISOString().split('T')[0];};return{start:fmt(f),end:fmt(l)};}
function getMonthDisplayString(y,m){return `${NEPALI_MONTHS[m-1]} ${y} BS`;}
