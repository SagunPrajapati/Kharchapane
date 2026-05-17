// ============================================
// KharchaPane - Auth
// ============================================

// Get the base path dynamically (works on GitHub Pages and locally)
const BASE_PATH = window.location.pathname.replace('/index.html', '').replace(/\/$/, '');
const DASHBOARD_URL = BASE_PATH + '/pages/dashboard.html';

// Handle email confirmation tokens in URL hash
(async () => {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    // Exchange the token from the URL
    const { data, error } = await supabaseClient.auth.getSession();
    if (data.session) {
      window.location.href = DASHBOARD_URL;
      return;
    }
  }

  // Redirect if already logged in
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = DASHBOARD_URL;
  }
})();

// Listen for auth state changes (catches email confirmation)
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    window.location.href = DASHBOARD_URL;
  }
});

// Google Sign In
document.getElementById('google-signin')?.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.replace('index.html','').replace(/\/$/, '') + '/pages/dashboard.html' }
  });
  if (error) showError('login-error', error.message);
});

document.getElementById('google-signup')?.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.replace('index.html','').replace(/\/$/, '') + '/pages/dashboard.html' }
  });
  if (error) showError('signup-error', error.message);
});

// Email Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showError('login-error', error.message);
    btn.textContent = 'Sign In';
    btn.disabled = false;
  } else {
    window.location.href = 'pages/dashboard.html';
  }
});

// Email Signup
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  if (password.length < 6) {
    showError('signup-error', 'Password must be at least 6 characters');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  const { data, error } = await supabaseClient.auth.signUp({
    email, password,
    options: { data: { full_name: name } }
  });

  if (error) {
    showError('signup-error', error.message);
    btn.textContent = 'Create Account';
    btn.disabled = false;
  } else {
    showError('signup-error', '✅ Check your email to confirm your account!');
    document.getElementById('signup-error').style.color = 'var(--income)';
    btn.textContent = 'Account Created';
  }
});

// Toggle between login/signup
document.getElementById('go-signup')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-card').classList.add('hidden');
  document.getElementById('signup-card').classList.remove('hidden');
});

document.getElementById('go-login')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signup-card').classList.add('hidden');
  document.getElementById('login-card').classList.remove('hidden');
});

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
