// ============================================
// KharchaPane - Supabase Configuration
// ============================================
// IMPORTANT: Replace these with your actual Supabase credentials
// Get them from: https://supabase.com/dashboard/project/kqfaatfbyhgeueptbyym/settings/api

const SUPABASE_URL = 'https://kqfaatfbyhgeueptbyym.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace this!

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// SUPABASE SQL SETUP - Run this in SQL Editor:
// https://supabase.com/dashboard/project/kqfaatfbyhgeueptbyym/sql
// ============================================
/*
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Transactions table (both expenses and income)
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('expense', 'income')) not null,
  date_ad date not null,
  date_bs_year integer not null,
  date_bs_month integer not null,
  date_bs_day integer not null,
  particular text not null,
  category text not null,
  amount numeric(12,2) not null,
  note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Budget goals table
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  amount numeric(12,2) not null,
  bs_year integer not null,
  bs_month integer not null,
  created_at timestamptz default now(),
  unique(user_id, category, bs_year, bs_month)
);

-- User profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text default 'NPR',
  created_at timestamptz default now()
);

-- Row Level Security
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table profiles enable row level security;

create policy "Users own their transactions"
  on transactions for all using (auth.uid() = user_id);

create policy "Users own their budgets"
  on budgets for all using (auth.uid() = user_id);

create policy "Users own their profiles"
  on profiles for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
*/
