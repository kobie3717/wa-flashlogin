import { createFlashLogin } from '../../packages/vanilla/src/index.js';

const API_BASE = 'http://localhost:3050/auth';

const phoneInput = document.querySelector('#phone');
const loginContainer = document.querySelector('#login-container');
const verifiedContainer = document.querySelector('#verified-container');
const verifiedPhoneSpan = document.querySelector('#verified-phone');
const logoutBtn = document.querySelector('#logout-btn');
const simulateExample = document.querySelector('#simulate-example');

let flash = null;

function initFlashLogin() {
  const phone = phoneInput.value.trim();

  if (flash) {
    flash.cleanup();
  }

  flash = createFlashLogin({
    apiBase: API_BASE,
    phone,
  });

  flash.on('verified', ({ phone }) => {
    verifiedPhoneSpan.textContent = phone;
    loginContainer.style.display = 'none';
    verifiedContainer.style.display = 'block';
  });

  flash.on('error', (error) => {
    alert(`Login failed: ${error.message}`);
  });

  flash.on('deeplink', ({ deeplink }) => {
    const sessionId = flash.getSessionId();
    simulateExample.textContent = `POST ${API_BASE.replace('/auth', '')}/simulate
${JSON.stringify({ sessionId, phone }, null, 2)}`;
  });

  flash.mountButton(loginContainer, {
    label: 'Login with WhatsApp',
    qrFallback: true,
  });
}

logoutBtn.addEventListener('click', () => {
  verifiedContainer.style.display = 'none';
  loginContainer.style.display = 'block';
  if (flash) {
    flash.cleanup();
  }
  initFlashLogin();
});

phoneInput.addEventListener('change', () => {
  if (flash) {
    flash.cleanup();
  }
  initFlashLogin();
});

initFlashLogin();
