/* ============================================================
   BryTech Solutions — Contact Form (EmailJS)
   ============================================================
   SECURITY FEATURES:
   ✅ Honeypot anti-bot field
   ✅ Rate limiting (max 3 envíos por 10 minutos)
   ✅ Cooldown de 60 segundos entre envíos
   ✅ Input sanitization (previene XSS)
   ✅ Email validation avanzada (dominio real)
   ✅ Longitud máxima de campos
   ✅ Protección contra doble-submit
   ============================================================ */

import emailjs from '@emailjs/browser';

const EMAILJS_CONFIG = {
  publicKey: 'mit1CSeNxf3na8kIo',
  serviceId: 'service_9ut91b7',
  templateId: 'template_9385jds',       // Notificación → Bryan recibe el contacto
  welcomeTemplateId: 'template_ojcv5ye', // Auto-reply → Cliente recibe confirmación
};

// Security config
const SECURITY = {
  maxSubmitsPerWindow: 3,      // Max envíos permitidos
  rateLimitWindowMs: 10 * 60 * 1000, // Ventana de 10 minutos
  cooldownMs: 60 * 1000,      // 60 segundos entre envíos
  maxFieldLength: {
    name: 100,
    email: 254,
    phone: 20,
    message: 2000,
  },
  // Dominios de email desechables comunes (bloquear)
  blockedDomains: [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'dispostable.com',
    'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
    'tempail.com', 'fakeinbox.com', 'temp-mail.org',
  ],
};

let isSubmitting = false;
let cooldownTimer = null;

export function initContactForm() {
  emailjs.init(EMAILJS_CONFIG.publicKey);

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('form-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🔒 Anti double-submit
    if (isSubmitting) return;

    // 🔒 Honeypot check — si el campo oculto tiene valor, es un bot
    const honeypot = form.querySelector('#form-website');
    if (honeypot && honeypot.value) {
      // Simula éxito para que el bot crea que funcionó
      fakeSuccess(form, submitBtn);
      console.warn('🤖 Bot detected via honeypot');
      return;
    }

    // 🔒 Rate limiting check
    if (!checkRateLimit()) {
      showToast('Has enviado demasiados mensajes. Intenta de nuevo en unos minutos.', 'error');
      return;
    }

    // 🔒 Cooldown check
    if (!checkCooldown()) {
      const remaining = getCooldownRemaining();
      showToast(`Espera ${remaining} segundos antes de enviar otro mensaje.`, 'error');
      return;
    }

    // 🔒 Validate & sanitize
    if (!validateForm(form)) return;

    // Set loading state
    isSubmitting = true;
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      // Sanitize all inputs before sending
      sanitizeFormInputs(form);

      // Enviar ambos emails en paralelo
      await Promise.all([
        emailjs.sendForm(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templateId,
          form
        ),
        emailjs.sendForm(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.welcomeTemplateId,
          form
        ),
      ]);

      // Register successful submission for rate limiting
      registerSubmission();
      startCooldown();

      // Success state
      submitBtn.classList.remove('loading');
      submitBtn.classList.add('success');
      showToast('¡Mensaje enviado correctamente! Te contactaré pronto. 🚀');

      // Reset after delay
      setTimeout(() => {
        form.reset();
        submitBtn.classList.remove('success');
        submitBtn.disabled = false;
        isSubmitting = false;
      }, 3000);

    } catch (error) {
      console.error('EmailJS Error:', error);
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      isSubmitting = false;
      showToast('Hubo un error al enviar. Intenta de nuevo o contáctame directamente.', 'error');
    }
  });
}


// ============================================================
// 🔒 RATE LIMITING (localStorage-based)
// ============================================================
function getSubmissions() {
  try {
    const data = JSON.parse(localStorage.getItem('brytech_submissions') || '[]');
    const now = Date.now();
    // Only keep submissions within the rate limit window
    return data.filter(ts => now - ts < SECURITY.rateLimitWindowMs);
  } catch {
    return [];
  }
}

function registerSubmission() {
  try {
    const submissions = getSubmissions();
    submissions.push(Date.now());
    localStorage.setItem('brytech_submissions', JSON.stringify(submissions));
  } catch {
    // localStorage not available, silently fail
  }
}

function checkRateLimit() {
  const submissions = getSubmissions();
  return submissions.length < SECURITY.maxSubmitsPerWindow;
}

// ============================================================
// 🔒 COOLDOWN (prevent rapid re-submits)
// ============================================================
function startCooldown() {
  try {
    localStorage.setItem('brytech_cooldown', Date.now().toString());
  } catch {
    // fallback: just track in memory
  }
}

function checkCooldown() {
  try {
    const lastSubmit = parseInt(localStorage.getItem('brytech_cooldown') || '0');
    return Date.now() - lastSubmit >= SECURITY.cooldownMs;
  } catch {
    return true;
  }
}

function getCooldownRemaining() {
  try {
    const lastSubmit = parseInt(localStorage.getItem('brytech_cooldown') || '0');
    return Math.ceil((SECURITY.cooldownMs - (Date.now() - lastSubmit)) / 1000);
  } catch {
    return 60;
  }
}

// ============================================================
// 🔒 INPUT SANITIZATION (XSS protection)
// ============================================================
function sanitizeString(str) {
  const div = document.createElement('div');
  div.textContent = str; // textContent auto-escapes HTML
  return div.innerHTML
    .replace(/&amp;/g, '&')  // Keep regular ampersands
    .trim();
}

function sanitizeFormInputs(form) {
  const fields = ['form-name', 'form-phone', 'form-message'];
  fields.forEach(id => {
    const field = form.querySelector(`#${id}`);
    if (field && field.value) {
      // Remove any HTML tags
      field.value = field.value.replace(/<[^>]*>/g, '').trim();
    }
  });
}

// ============================================================
// 🔒 VALIDATION (enhanced)
// ============================================================
function validateForm(form) {
  const name = form.querySelector('#form-name');
  const email = form.querySelector('#form-email');
  const service = form.querySelector('#form-service');
  const message = form.querySelector('#form-message');

  // Name validation
  if (!name.value.trim()) {
    shakeField(name);
    name.focus();
    showToast('Por favor ingresa tu nombre.', 'error');
    return false;
  }
  if (name.value.trim().length < 2) {
    shakeField(name);
    name.focus();
    showToast('El nombre debe tener al menos 2 caracteres.', 'error');
    return false;
  }
  if (name.value.length > SECURITY.maxFieldLength.name) {
    shakeField(name);
    name.focus();
    showToast(`El nombre es demasiado largo (máx ${SECURITY.maxFieldLength.name} caracteres).`, 'error');
    return false;
  }

  // Email validation (advanced)
  if (!email.value.trim() || !isValidEmail(email.value)) {
    shakeField(email);
    email.focus();
    showToast('Por favor ingresa un correo electrónico válido.', 'error');
    return false;
  }
  if (isBlockedEmail(email.value)) {
    shakeField(email);
    email.focus();
    showToast('Por favor usa un correo electrónico real, no temporal.', 'error');
    return false;
  }
  if (email.value.length > SECURITY.maxFieldLength.email) {
    shakeField(email);
    email.focus();
    showToast('El correo electrónico es demasiado largo.', 'error');
    return false;
  }

  // Phone validation (optional but if filled, validate format)
  const phone = form.querySelector('#form-phone');
  if (phone.value.trim() && !isValidPhone(phone.value)) {
    shakeField(phone);
    phone.focus();
    showToast('El formato del teléfono no es válido.', 'error');
    return false;
  }

  // Service validation
  if (!service.value) {
    shakeField(service);
    service.focus();
    showToast('Por favor selecciona un tipo de servicio.', 'error');
    return false;
  }

  // Message validation
  if (!message.value.trim()) {
    shakeField(message);
    message.focus();
    showToast('Por favor escribe tu mensaje.', 'error');
    return false;
  }
  if (message.value.trim().length < 10) {
    shakeField(message);
    message.focus();
    showToast('El mensaje debe tener al menos 10 caracteres.', 'error');
    return false;
  }
  if (message.value.length > SECURITY.maxFieldLength.message) {
    shakeField(message);
    message.focus();
    showToast(`El mensaje es demasiado largo (máx ${SECURITY.maxFieldLength.message} caracteres).`, 'error');
    return false;
  }

  // Check for suspicious patterns (URLs, scripts)
  if (containsSuspiciousContent(message.value) || containsSuspiciousContent(name.value)) {
    showToast('El contenido contiene elementos no permitidos.', 'error');
    return false;
  }

  return true;
}

// Advanced email validation
function isValidEmail(email) {
  // RFC 5322 inspired regex — validates format, domain with TLD
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  return regex.test(email);
}

function isBlockedEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return SECURITY.blockedDomains.includes(domain);
}

function isValidPhone(phone) {
  // Allow digits, spaces, dashes, parentheses, plus sign
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return /^\d{7,15}$/.test(cleaned);
}

// Detect suspicious content (spam links, script tags, etc.)
function containsSuspiciousContent(text) {
  const patterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,                    // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /\[url[=\]]/i,                   // BBCode links
    /(https?:\/\/[^\s]+){3,}/i,      // 3+ URLs = likely spam
  ];
  return patterns.some(pattern => pattern.test(text));
}

// ============================================================
// FAKE SUCCESS (for bots that hit honeypot)
// ============================================================
function fakeSuccess(form, submitBtn) {
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  setTimeout(() => {
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    setTimeout(() => {
      form.reset();
      submitBtn.classList.remove('success');
      submitBtn.disabled = false;
    }, 3000);
  }, 1500);
}

// ============================================================
// UI HELPERS
// ============================================================
function shakeField(field) {
  field.style.animation = 'none';
  field.offsetHeight; // Force reflow
  field.style.animation = 'shake 0.5s ease';
  field.style.borderBottomColor = '#F44336';
  
  setTimeout(() => {
    field.style.borderBottomColor = '';
    field.style.animation = '';
  }, 2000);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.className = 'toast ' + type;
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Add shake keyframe dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);
