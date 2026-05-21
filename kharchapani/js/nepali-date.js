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
    // Try different ways the library might expose itself
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
  // Fallback: manual conversion
  return adToBS_manual(adDate || new Date());
}

// Manual AD to BS conversion fallback
function adToBS_manual(adDate) {
  const d = new Date(adDate);
  const year = d.getFullYear();
  const month = d.getMonth()+1;
  const day = d.getDate();
  // Approximate conversion: BS = AD + 56 years 8.5 months
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

function getCurrentNepaliDate() {
  return getNepaliDate(new Date());
}

function adToBS(adDate) {
  return getNepaliDate(new Date(adDate));
}

function bsToAD(year, month, day) {
  try {
    if (typeof NepaliDate !== 'undefined') {
      const nd = new NepaliDate(year, month-1, day);
      return nd.toJsDate();
    }
  } catch(e) {}
  return bsToAD_manual(year, month, day);
}

function formatBSDate(year, month, day) {
  return `${day} ${NEPALI_MONTHS[month-1]} ${year}`;
}

function formatBSShort(year, month, day) {
  return `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
}

function formatADDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function getBSMonthName(month) { return NEPALI_MONTHS[month-1] || ''; }

function getBSYearRange() {
  const current = getCurrentNepaliDate();
  const years = [];
  for (let y = current.year-3; y <= current.year+1; y++) years.push(y);
  return years;
}

function populateYearSelect(selectEl, selectedYear) {
  const years = getBSYearRange();
  selectEl.innerHTML = years.map(y =>
    `<option value="${y}" ${y===selectedYear?'selected':''}>${y}</option>`
  ).join('');
}

function populateMonthSelect(selectEl, selectedMonth) {
  selectEl.innerHTML = NEPALI_MONTHS.map((name, i) =>
    `<option value="${i+1}" ${(i+1)===selectedMonth?'selected':''}>${String(i+1).padStart(2,'0')} - ${name}</option>`
  ).join('');
}

function populateDaySelect(selectEl, year, month, selectedDay) {
  const days = getBSMonthDays(year, month);
  selectEl.innerHTML = '';
  for (let d=1; d<=days; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = String(d).padStart(2,'0');
    if (d === selectedDay) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

function getBSMonthADRange(bsYear, bsMonth) {
  const firstAD = bsToAD(bsYear, bsMonth, 1);
  const lastDay = getBSMonthDays(bsYear, bsMonth);
  const lastAD = bsToAD(bsYear, bsMonth, lastDay);
  const fmt = d => {
    const dd = new Date(d);
    return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
  };
  return { start: fmt(firstAD), end: fmt(lastAD) };
}

function getMonthDisplayString(year, month) {
  return `${NEPALI_MONTHS[month-1]} ${year} BS`;
}
