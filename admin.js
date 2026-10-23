const SUPABASE_URL = 'https://hfsmxrfvlygudusoyuij.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KwPDclPcrmdzcS4xclcbZA_Y4ZAcDKu';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentFactorId = null;
let currentChallengeId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabaseAdmin.auth.getSession();
  if (session) {
    checkMFAStatus(session);
  }
});

function showError(msg) {
  const errDiv = document.getElementById('error-message');
  errDiv.textContent = msg;
  errDiv.classList.remove('hidden');
}

function clearError() {
  const errDiv = document.getElementById('error-message');
  errDiv.classList.add('hidden');
  errDiv.textContent = '';
}

async function handleLogin(event) {
  event.preventDefault();
  clearError();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) {
    showError(error.message);
    return;
  }

  checkMFAStatus(data.session);
}

async function checkMFAStatus(session) {
  const { data: factors, error } = await supabaseAdmin.auth.mfa.listFactors();
  if (error) {
    showError(error.message);
    return;
  }

  const totpFactor = factors.totp ? factors.totp.find(f => f.status === 'verified') : null;

  if (totpFactor) {
    currentFactorId = totpFactor.id;
    const { data: challenge, error: challengeErr } = await supabaseAdmin.auth.mfa.challenge({ factorId: currentFactorId });

    if (challengeErr) {
      showError(challengeErr.message);
      return;
    }

    currentChallengeId = challenge.id;
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('mfa-form').classList.remove('hidden');
  } else {
    setupNewMFA();
  }
}

async function handleMFAChallenge(event) {
  event.preventDefault();
  clearError();

  const code = document.getElementById('mfa-code').value;
  const { error } = await supabaseAdmin.auth.mfa.verify({
    factorId: currentFactorId,
    challengeId: currentChallengeId,
    code: code
  });

  if (error) {
    showError('Código incorrecto o expirado.');
    return;
  }

  window.location.href = 'dashboard.html';
}

async function setupNewMFA() {
  const { data: enrollData, error } = await supabaseAdmin.auth.mfa.enroll({ factorType: 'totp' });
  if (error) {
    showError(error.message);
    return;
  }

  currentFactorId = enrollData.id;
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('mfa-setup').classList.remove('hidden');
  document.getElementById('qr-code-img').src = enrollData.totp.qr_code;
}

async function handleMFAEnrollVerify(event) {
  event.preventDefault();
  clearError();

  const code = document.getElementById('setup-mfa-code').value;
  const { data: challenge, error: challengeErr } = await supabaseAdmin.auth.mfa.challenge({ factorId: currentFactorId });
  if (challengeErr) {
    showError(challengeErr.message);
    return;
  }

  const { error } = await supabaseAdmin.auth.mfa.verify({
    factorId: currentFactorId,
    challengeId: challenge.id,
    code: code
  });

  if (error) {
    showError('Código de verificación no válido.');
    return;
  }

  alert('¡2FA configurado exitosamente!');
  window.location.href = 'dashboard.html';
}
