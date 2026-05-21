// ============================================
// KharchaPane - Auth (with Forgot Password)
// ============================================

function getDashboardUrl() {
  const base = window.location.href.replace(/\/index\.html.*$/, '').replace(/\/$/, '');
  return base + '/pages/dashboard.html';
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
    window.location.replace(getDashboardUrl());
  }
  if (event === 'PASSWORD_RECOVERY') { showCard('reset-card'); }
});

(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.replace(getDashboardUrl());
})();

document.getElementById('google-signin')?.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getDashboardUrl() } });
  if (error) showErr('login-error', error.message);
});

document.getElementById('google-signup')?.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getDashboardUrl() } });
  if (error) showErr('signup-error', error.message);
});

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { showErr('login-error', error.message); btn.textContent = 'Sign In'; btn.disabled = false; }
});

document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (password.length < 6) { showErr('signup-error', 'Password must be at least 6 characters'); return; }
  btn.textContent = 'Creating...'; btn.disabled = true;
  const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: getDashboardUrl() } });
  if (error) { showErr('signup-error', error.message); btn.textContent = 'Create Account'; btn.disabled = false; }
  else { const el = document.getElementById('signup-error'); el.textContent = '✅ Check your email!'; el.style.color='#16a34a'; btn.textContent=' Done!'; setTimeout(()=>{showCard('login-card');document.getElementById('login-email').value=email;},2500); }
});

document.getElementById('forgot-link')?.addEventListener('click',(e)=>{e.preventDefault();showCard('forgot-card');});

document.getElementById('forgot-form')?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const email=document.getElementById('forgot-email').value.trim();
  const btn=e.target.querySelector('button[type="submit"]');
  btn.textContent='Sending...';btn.disabled=true;
  const{error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:getDashboardUrl()});
  const msg=document.getElementById('forgot-msg');
  if(error){msg.textContent=error.message;msg.style.color='#dc2626';}
  else{msg.textContent='✅ Reset link sent!';msg.style.color='#16a34a';}
  btn.textContent='Send Reset Link';btn.disabled=false;
});

document.getElementById('reset-form')?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const password=document.getElementById('reset-password').value;
  const btn=e.target.querySelector('button[type="submit"]');
  if(password.length<6){showErr('reset-error','Password must be at least 6 chars');return;}
  btn.textContent='Updating...';btn.disabled=true;
  const{error}=await supabaseClient.auth.updateUser({password});
  if(error){showErr('reset-error',error.message);btn.textContent='Update Password';btn.disabled=false;}
  else{showErr('reset-error','✅ Updated! Redirecting...');document.getElementById('reset-error').style.color='#16a34a';setTimeout(()=>window.location.replace(getDashboardUrl()),2000);}
});

document.getElementById('go-signup')?.addEventListener('click',(e)=>{e.preventDefault();showCard('signup-card');});
document.getElementById('go-login')?.addEventListener('click',(e)=>{e.preventDefault();showCard('login-card');});
document.getElementById('back-to-login')?.addEventListener('click',(e)=>{e.preventDefault();showCard('login-card');});
document.getElementById('back-to-login-2')?.addEventListener('click',(e)=>{e.preventDefault();showCard('login-card');});

function showCard(id){['login-card','signup-card','forgot-card','reset-card'].forEach(c=>document.getElementById(c)?.classList.add('hidden'));document.getElementById(id)?.classList.remove('hidden');}
function showErr(id,msg){const el=document.getElementById(id);if(el){el.textContent=msg;el.style.color='#dc2626';}}
