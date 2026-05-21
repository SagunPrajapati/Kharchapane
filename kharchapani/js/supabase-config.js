const SUPABASE_URL = 'https://kqqwpvavmusyjvfzibbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZmFhdGZieWhnZXVlcHRieXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjEzNDMsImV4cCI6MjA5MzczNzM0M30.5roD8PA1_SXesgFKywfDnv3TbDeCrtzDQ9WH6KzJ6nc';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});
