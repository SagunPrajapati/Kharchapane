// ============================================
// KharchaPane - Nepali Date Utilities
// Using nepali-date-converter library
// ============================================

const NEPALI_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
  'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const NEPALI_MONTHS_NP = [
  'बैशाख', 'जेष्ठ', 'असाढ', 'श्रावण',
  'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर',
  'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
];

// Month days data (BS) for years 2075-2090
const BS_MONTH_DAYS = {
  2075: [31,31,32,32,31,30,30,29,30,29,30,30],
  2076: [31,32,31,32,31,30,30,30,29,29,30,31],
  2077: [31,31,32,31,31,30,30,30,29,30,30,30],
  2078: [31,31,32,32,31,30,30,29,30,29,30,30],
  2079: [31,32,31,32,31,30,30,30,29,30,29,31],
  2080: [31,31,32,32,31,30,30,30,29,29,30,30],
  2081: [31,31,32,31,31,31,30,29,30,29,30,30],
  2082: [31,32,31,32,31,30,30,29,30,29,30,30],
  2083: [31,32,31,32,31,30,30,30,29,29,30,31],
  2084: [31,31,32,31,31,30,30,30,29,30,29,31],
  2085: [31,31,32,32,31,31,30,29,30,29,30,30],
  2086: [31,32,31,32,31,30,30,29,30,29,30,30],
  2087: [31,32,31,32,31,30,30,30,29,29,30,31],
  2088: [31,32,31,32,31,30,30,30,29,30,30,30],
  2089: [31,31,32,31,31,31,30,29,30,29,30,30],
  2090: [31,31,32,32,31,30,30,29,30,29,30,30],
};

// Get number of days in a BS month
function getBSMonthDays(year, month) {
  if (BS_MONTH_DAYS[year]) {
    return BS_MONTH_DAYS[year][month - 1] || 30;
  }
  return 30;
}

// Convert AD date to BS using the library
function adToBS(adDate) {
  try {
    const nd = new NepaliDate(adDate);
    return {
      year: nd.getYear(),
      month: nd.getMonth() + 1,
      day: nd.getDate()
    };
  } catch(e) {
    // Fallback: return current BS date
    const nd = new NepaliDate(new Date());
    return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() };
  }
}

// Convert BS to AD
function bsToAD(year, month, day) {
  try {
    const nd = new NepaliDate(year, month - 1, day);
    return nd.toJsDate();
  } catch(e) {
    return new Date();
  }
}

// Get current Nepali date
function getCurrentNepaliDate() {
  const nd = new NepaliDate(new Date());
  return {
    year: nd.getYear(),
    month: nd.getMonth() + 1,
    day: nd.getDate()
  };
}

// Format BS date string
function formatBSDate(year, month, day) {
  return `${day} ${NEPALI_MONTHS[month - 1]} ${year}`;
}

// Short format
function formatBSShort(year, month, day) {
  return `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
}

// Format AD date nicely
function formatADDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

// Get BS month name
function getBSMonthName(month) {
  return NEPALI_MONTHS[month - 1] || '';
}

// Get Nepali month in Devanagari
function getBSMonthNameNP(month) {
  return NEPALI_MONTHS_NP[month - 1] || '';
}

// Get BS year range for selects
function getBSYearRange() {
  const current = getCurrentNepaliDate();
  const years = [];
  for (let y = current.year - 5; y <= current.year + 1; y++) {
    years.push(y);
  }
  return years;
}

// Populate year select
function populateYearSelect(selectEl, selectedYear) {
  const years = getBSYearRange();
  selectEl.innerHTML = '';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === selectedYear) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// Populate month select
function populateMonthSelect(selectEl, selectedMonth) {
  selectEl.innerHTML = '';
  NEPALI_MONTHS.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = `${String(i+1).padStart(2,'0')} - ${name}`;
    if ((i + 1) === selectedMonth) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// Populate day select
function populateDaySelect(selectEl, year, month, selectedDay) {
  const days = getBSMonthDays(year, month);
  selectEl.innerHTML = '';
  for (let d = 1; d <= days; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = String(d).padStart(2, '0');
    if (d === selectedDay) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

// Get first and last AD date of a BS month
function getBSMonthADRange(bsYear, bsMonth) {
  const firstAD = bsToAD(bsYear, bsMonth, 1);
  const lastDay = getBSMonthDays(bsYear, bsMonth);
  const lastAD = bsToAD(bsYear, bsMonth, lastDay);

  const fmt = d => d.toISOString().split('T')[0];
  return { start: fmt(firstAD), end: fmt(lastAD) };
}

// Format display string for month navigation
function getMonthDisplayString(year, month) {
  return `${NEPALI_MONTHS[month - 1]} ${year} BS`;
}
