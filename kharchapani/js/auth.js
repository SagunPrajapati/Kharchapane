// ============================================
// KharchaPane - Auth
// ============================================

const DASHBOARD = window.location.pathname.replace('index.html','').replace(/\/$/,'') + '/pages/dashboard.html';

// Handle auth state - covers email confirmation, Google OAuth, and normal sessions
supabaseClient.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
    window.location.href = DASHBOARD;
  }
});

// Also check existing session on page load
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.href = DASHBOARD;
})();

// Google Sign In/Up
document.getElementById('google-signin')?.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.replace('index.html','').replace(/\/$/,'') + '/pages/dashboard.html' }
  });
  if (error) showErr('login-error', error.message);
});

document.getElementById('google-signup')?.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.replace('index.html','').replace(/\/$/,'') + '/pages/dashboard.html' }
  });
  if (error) showErr('signup-error', error.message);
});

// Email Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Signing in...'; btn.disabled = true;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    showErr('login-error', error.message);
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
  // onAuthStateChange handles redirect on success
});

// Email Signup
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const btn = e.target.querySelector('button[type="submit"]');

  if (password.length < 6) { showErr('signup-error', 'Password must be at least 6 characters'); return; }

  btn.textContent = 'Creating...'; btn.disabled = true;

  const { error } = await supabaseClient.auth.signUp({
    email, password,
    options: {
      data: { full_name: name },
      emailRedirectTo: window.location.href.replace('index.html','').replace(/\/$/,'') + '/pages/dashboard.html'
    }
  });

  if (error) {
    showErr('signup-error', error.message);
    btn.textContent = 'Create Account'; btn.disabled = false;
  } else {
    showErr('signup-error', '✅ Account created! Check your email to confirm, then sign in below.');
    document.getElementById('signup-error').style.color = '#16a34a';
    btn.textContent = 'Done!';
    // Switch to login after 2s
    setTimeout(() => {
      document.getElementById('signup-card').classList.add('hidden');
      document.getElementById('login-card').classList.remove('hidden');
      document.getElementById('login-email').value = email;
    }, 2000);
  }
});

// Toggle login/signup
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

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.color = '#dc2626'; }
}
