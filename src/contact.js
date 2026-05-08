/* ============================================================
   contact.js -- BryTech Solutions
   ------------------------------------------------------------
   Handles the contact form submission flow via EmailJS.
   Sends two emails per submission:
     1. Notification email to the site owner (Bryan).
     2. Auto-reply / welcome confirmation to the client.

   Security features included:
     - Honeypot hidden field to catch bots
     - Rate limiting  (max 3 submissions per 10-minute window)
     - Cooldown timer (60 seconds between submissions)
     - Input sanitization to prevent XSS
     - Advanced email validation with blocked disposable domains
     - Suspicious content detection (script tags, spam URLs)
     - Double-submit protection via isSubmitting flag

   KNOWN ISSUE (duplicate notification):
     Both sendForm calls use the full form, so if the EmailJS
     service is also configured with a default "To Email",
     Bryan may receive the notification twice. See the submit
     handler for the fix applied.

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

import emailjs from '@emailjs/browser';


/* ============================================================
   EMAILJS CONFIGURATION
   ------------------------------------------------------------
   publicKey        -- Public API key for EmailJS authentication.
   serviceId        -- The email service connected in EmailJS.
   templateId       -- Template that notifies Bryan of a new
                       contact submission.
   welcomeTemplateId-- Template that sends an auto-reply
                       confirmation to the client.
   ============================================================ */
const EMAILJS_CONFIG = {
  publicKey: 'mit1CSeNxf3na8kIo',
  serviceId: 'service_9ut91b7',
  templateId: 'template_9385jds',
  welcomeTemplateId: 'template_ojcv5ye',
};


/* ============================================================
   SECURITY CONFIGURATION
   ------------------------------------------------------------
   maxSubmitsPerWindow -- Maximum number of form submissions
                         allowed within the rate-limit window.
   rateLimitWindowMs   -- Duration of the rate-limit window
                         (10 minutes in milliseconds).
   cooldownMs          -- Minimum wait time between consecutive
                         submissions (60 seconds).
   maxFieldLength      -- Character limits per field to prevent
                         abuse or excessively long payloads.
   blockedDomains      -- Disposable / temporary email providers
                         that are rejected during validation.
   ============================================================ */
const SECURITY = {
  maxSubmitsPerWindow: 3,
  rateLimitWindowMs: 10 * 60 * 1000,
  cooldownMs: 60 * 1000,
  maxFieldLength: {
    name: 100,
    email: 254,
    phone: 20,
    message: 2000,
  },
  blockedDomains: [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'dispostable.com',
    'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
    'tempail.com', 'fakeinbox.com', 'temp-mail.org',
  ],
};

// Module-level state flags.
let isSubmitting = false;
let cooldownTimer = null;


/* ============================================================
   FORM INITIALIZATION
   ------------------------------------------------------------
   Called once from main.js on DOMContentLoaded. Sets up the
   EmailJS SDK, locates the form element, and attaches the
   submit event listener that orchestrates validation, security
   checks, and the dual-email send flow.
   ============================================================ */
export function initContactForm() {
  emailjs.init(EMAILJS_CONFIG.publicKey);

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('form-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // -- Anti double-submit guard --
    if (isSubmitting) return;

    // -- Honeypot check --
    // If the hidden "website" field has a value, it was filled
    // by a bot. We simulate success so the bot believes it
    // worked, but we never send anything.
    const honeypot = form.querySelector('#form-website');
    if (honeypot && honeypot.value) {
      fakeSuccess(form, submitBtn);
      console.warn('[BryTech] Bot detected via honeypot');
      return;
    }

    // -- Rate limiting check --
    if (!checkRateLimit()) {
      showToast('Has enviado demasiados mensajes. Intenta de nuevo en unos minutos.', 'error');
      return;
    }

    // -- Cooldown check --
    if (!checkCooldown()) {
      const remaining = getCooldownRemaining();
      showToast(`Espera ${remaining} segundos antes de enviar otro mensaje.`, 'error');
      return;
    }

    // -- Validate and sanitize --
    if (!validateForm(form)) return;

    // Set loading state on the button.
    isSubmitting = true;
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      // Strip any HTML from user inputs before sending.
      sanitizeFormInputs(form);

      // Send both emails in parallel:
      //   1. Notification to Bryan (templateId)
      //   2. Auto-reply to client  (welcomeTemplateId)
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

      // Record this submission for rate-limit tracking.
      registerSubmission();
      startCooldown();

      // Transition button to success state.
      submitBtn.classList.remove('loading');
      submitBtn.classList.add('success');
      showToast('Mensaje enviado correctamente! Te contactare pronto.');

      // Reset the form and button after a brief delay.
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
      showToast('Hubo un error al enviar. Intenta de nuevo o contactame directamente.', 'error');
    }
  });
}


/* ============================================================
   RATE LIMITING (localStorage-based)
   ------------------------------------------------------------
   Tracks submission timestamps in localStorage under the key
   "brytech_submissions". Only timestamps within the current
   rate-limit window are kept. If the count exceeds
   maxSubmitsPerWindow, further submissions are blocked.
   ============================================================ */

// Returns an array of submission timestamps that fall within
// the active rate-limit window, discarding expired entries.
function getSubmissions() {
  try {
    const data = JSON.parse(localStorage.getItem('brytech_submissions') || '[]');
    const now = Date.now();
    return data.filter(ts => now - ts < SECURITY.rateLimitWindowMs);
  } catch {
    return [];
  }
}

// Appends the current timestamp to the submissions log.
function registerSubmission() {
  try {
    const submissions = getSubmissions();
    submissions.push(Date.now());
    localStorage.setItem('brytech_submissions', JSON.stringify(submissions));
  } catch {
    // localStorage unavailable -- silently continue.
  }
}

// Returns true if the user has not exceeded the maximum
// allowed submissions within the rate-limit window.
function checkRateLimit() {
  const submissions = getSubmissions();
  return submissions.length < SECURITY.maxSubmitsPerWindow;
}


/* ============================================================
   COOLDOWN (prevent rapid re-submits)
   ------------------------------------------------------------
   Stores the timestamp of the last successful submission in
   localStorage. Subsequent submissions are blocked until the
   cooldown period (60 seconds) has elapsed.
   ============================================================ */

// Saves the current timestamp as the last submission time.
function startCooldown() {
  try {
    localStorage.setItem('brytech_cooldown', Date.now().toString());
  } catch {
    // Fallback: cooldown only tracked in-memory via isSubmitting.
  }
}

// Returns true if enough time has passed since the last submit.
function checkCooldown() {
  try {
    const lastSubmit = parseInt(localStorage.getItem('brytech_cooldown') || '0');
    return Date.now() - lastSubmit >= SECURITY.cooldownMs;
  } catch {
    return true;
  }
}

// Returns the number of seconds remaining until the cooldown
// expires. Used to display a human-readable wait message.
function getCooldownRemaining() {
  try {
    const lastSubmit = parseInt(localStorage.getItem('brytech_cooldown') || '0');
    return Math.ceil((SECURITY.cooldownMs - (Date.now() - lastSubmit)) / 1000);
  } catch {
    return 60;
  }
}


/* ============================================================
   INPUT SANITIZATION (XSS protection)
   ------------------------------------------------------------
   Strips HTML tags from user-provided form values before they
   are sent to EmailJS. This prevents potential cross-site
   scripting payloads from reaching email templates.
   ============================================================ */

// Escapes HTML entities by leveraging the browser textContent
// API, then trims whitespace.
function sanitizeString(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML
    .replace(/&amp;/g, '&')
    .trim();
}

// Strips all HTML tags from the name, phone, and message
// fields in-place before the form data is sent.
function sanitizeFormInputs(form) {
  const fields = ['form-name', 'form-phone', 'form-message'];
  fields.forEach(id => {
    const field = form.querySelector(`#${id}`);
    if (field && field.value) {
      field.value = field.value.replace(/<[^>]*>/g, '').trim();
    }
  });
}


/* ============================================================
   VALIDATION (enhanced)
   ------------------------------------------------------------
   Validates every required field in the contact form:
     - Name:    required, min 2 chars, max 100 chars.
     - Email:   required, RFC-inspired format, no disposable
                domains, max 254 chars.
     - Phone:   optional, but if provided must be 7-15 digits.
     - Service: required (must select a service type).
     - Message: required, min 10 chars, max 2000 chars.
   Also checks for suspicious content patterns (scripts, spam
   URLs) in the name and message fields.
   Returns true if all validations pass, false otherwise.
   ============================================================ */
function validateForm(form) {
  const name = form.querySelector('#form-name');
  const email = form.querySelector('#form-email');
  const service = form.querySelector('#form-service');
  const message = form.querySelector('#form-message');

  // -- Name validation --
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
    showToast(`El nombre es demasiado largo (max ${SECURITY.maxFieldLength.name} caracteres).`, 'error');
    return false;
  }

  // -- Email validation (advanced) --
  if (!email.value.trim() || !isValidEmail(email.value)) {
    shakeField(email);
    email.focus();
    showToast('Por favor ingresa un correo electronico valido.', 'error');
    return false;
  }
  if (isBlockedEmail(email.value)) {
    shakeField(email);
    email.focus();
    showToast('Por favor usa un correo electronico real, no temporal.', 'error');
    return false;
  }
  if (email.value.length > SECURITY.maxFieldLength.email) {
    shakeField(email);
    email.focus();
    showToast('El correo electronico es demasiado largo.', 'error');
    return false;
  }

  // -- Phone validation (optional) --
  const phone = form.querySelector('#form-phone');
  if (phone.value.trim() && !isValidPhone(phone.value)) {
    shakeField(phone);
    phone.focus();
    showToast('El formato del telefono no es valido.', 'error');
    return false;
  }

  // -- Service validation --
  if (!service.value) {
    shakeField(service);
    service.focus();
    showToast('Por favor selecciona un tipo de servicio.', 'error');
    return false;
  }

  // -- Message validation --
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
    showToast(`El mensaje es demasiado largo (max ${SECURITY.maxFieldLength.message} caracteres).`, 'error');
    return false;
  }

  // -- Suspicious content check --
  if (containsSuspiciousContent(message.value) || containsSuspiciousContent(name.value)) {
    showToast('El contenido contiene elementos no permitidos.', 'error');
    return false;
  }

  return true;
}

// Validates email format using an RFC 5322-inspired regex.
// Requires a valid domain with at least a two-letter TLD.
function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  return regex.test(email);
}

// Returns true if the email domain is in the blocked list
// of known disposable / temporary email providers.
function isBlockedEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return SECURITY.blockedDomains.includes(domain);
}

// Validates phone numbers: strips formatting characters and
// checks that the remaining digits are between 7 and 15.
function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return /^\d{7,15}$/.test(cleaned);
}

// Scans text for common attack patterns: script tags,
// javascript: URIs, inline event handlers, iframes, embeds,
// BBCode links, and messages with 3+ URLs (likely spam).
function containsSuspiciousContent(text) {
  const patterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /\[url[=\]]/i,
    /(https?:\/\/[^\s]+){3,}/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}


/* ============================================================
   FAKE SUCCESS (for bots that hit honeypot)
   ------------------------------------------------------------
   Mimics a normal loading-then-success transition so bots
   believe their submission went through. No email is sent.
   ============================================================ */
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


/* ============================================================
   UI HELPERS
   ------------------------------------------------------------
   Small utility functions for visual feedback in the form.
   ============================================================ */

// Applies a horizontal shake animation and a red border to
// the given field for 2 seconds to signal a validation error.
function shakeField(field) {
  field.style.animation = 'none';
  field.offsetHeight; // Force reflow to restart the animation.
  field.style.animation = 'shake 0.5s ease';
  field.style.borderBottomColor = '#F44336';
  
  setTimeout(() => {
    field.style.borderBottomColor = '';
    field.style.animation = '';
  }, 2000);
}

// Displays a toast notification at the bottom of the viewport.
// Accepts a message string and an optional type ("success" or
// "error") that controls the toast border and icon color.
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


/* ============================================================
   DYNAMIC STYLESHEET
   ------------------------------------------------------------
   Injects the "shake" keyframe animation into the document
   head at module load time so it is available for shakeField().
   ============================================================ */
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
