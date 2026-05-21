# KharchaPane — Setup Guide 🇳🇵

Personal expense & income tracker using Nepali (BS) calendar, built for GitHub Pages + Supabase.

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Supabase Setup

1. Go to: https://supabase.com/dashboard/project/kqfaatfbyhgeueptbyym
2. Click **SQL Editor** in the left menu
3. Paste and run the SQL from `js/supabase-config.js` (the block in the comment at the bottom)
4. Go to **Settings → API** and copy your **anon/public** key
5. Open `js/supabase-config.js` and replace `YOUR_SUPABASE_ANON_KEY` with your key

### Step 2: Enable Google OAuth (optional)

1. In Supabase dashboard: **Authentication → Providers → Google**
2. Enable it and follow the instructions to get Google OAuth credentials
3. Add your GitHub Pages URL as an allowed redirect URL:
   `https://YOUR_USERNAME.github.io/kharchapane/pages/dashboard.html`

### Step 3: Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g. `kharchapane`)
2. Upload all files maintaining the folder structure
3. Go to **Settings → Pages**
4. Set source to `main` branch, `/ (root)` folder
5. Your site will be at: `https://YOUR_USERNAME.github.io/kharchapane/`

### Step 4: Update Redirect URLs

In `js/auth.js`, the Google OAuth redirect already uses `window.location.origin` so it adapts automatically.

---

## 📁 File Structure

```
kharchapane/
├── index.html              ← Login/Signup page
├── css/
│   ├── style.css           ← Base styles (auth)
│   └── app.css             ← App styles (dashboard, sidebar)
├── js/
│   ├── supabase-config.js  ← 🔑 PUT YOUR API KEY HERE
│   ├── auth.js             ← Login/signup logic
│   ├── app.js              ← Shared utilities
│   ├── nepali-date.js      ← BS calendar utilities
│   ├── categories.js       ← Expense/income categories
│   ├── dashboard.js        ← Dashboard + charts
│   ├── entries.js          ← Expense/income CRUD
│   ├── budget.js           ← Budget goals
│   └── reports.js          ← Annual reports
└── pages/
    ├── dashboard.html      ← Main dashboard
    ├── expenses.html       ← Expense tracker
    ├── income.html         ← Income tracker
    ├── reports.html        ← Annual reports
    ├── budget.html         ← Budget goals
    └── profile.html        ← User profile
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | Email/password + Google OAuth sign-in |
| 📅 Nepali Calendar | All dates in BS (Bikram Sambat), AD shown as reference |
| 📊 Donut Charts | Separate expense & income breakdowns by category |
| 📈 Trend Chart | 6-month income vs expense bar chart |
| ✏️ Editable Entries | All entries can be edited or deleted |
| 🎯 Budget Goals | Set monthly limits per category with progress bars |
| 📋 Reports | Annual summary with monthly breakdown |
| 📥 CSV Export | Download all your data |
| 📱 Responsive | Works on mobile and desktop |
| 🌙 Eye Comfort | Clean white theme, no harsh colors |

---

## 🗓️ Nepali Calendar Notes

- Month boundaries follow **BS (Bikram Sambat)** calendar
- Months start/end per official Nepali calendar dates
- AD date is stored in database for reliable sorting and filtering
- BS date is stored separately (year, month, day) for display
- Current BS year: **2082** (as of 2025 AD)

---

## 📊 Expense Categories

Food & Groceries, Transport, Rent & Housing, Utilities, Health & Medical, 
Education, Clothing, Entertainment, Internet & Phone, Personal Care,
Festival & Gifts, Savings/Investment, Other

## 💰 Income Categories

Salary/Job, Freelance, Business, Rent Income, Investment Returns, 
Bonus/Incentive, Remittance, Other Income

---

## 🛠️ Supabase Tables

| Table | Purpose |
|-------|---------|
| `transactions` | All expense and income entries |
| `budgets` | Monthly budget goals per category |
| `profiles` | User display names |

All tables have **Row Level Security** — users can only see their own data.

---

## ⚡ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no framework)
- **Auth**: Supabase Auth (email + Google OAuth)
- **Database**: Supabase PostgreSQL
- **Charts**: Chart.js
- **Nepali Dates**: nepali-date-converter (CDN)
- **Hosting**: GitHub Pages (free)
