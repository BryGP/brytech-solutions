/* ============================================================
   BryTech Solutions — Contact Form (EmailJS)
   ============================================================
   
   SETUP INSTRUCTIONS:
   1. Go to https://www.emailjs.com/ and create a free account
   2. Add an Email Service (Gmail recommended) — copy the Service ID
   3. Create an Email Template with these variables:
      - {{user_name}}
      - {{user_email}}  
      - {{user_phone}}
      - {{service_type}}
      - {{message}}
   4. Copy the Template ID
   5. Replace SERVICE_ID and TEMPLATE_ID below with your actual IDs
   
   Your Public Key is already configured: mit1CSeNxf3na8kIo
   ============================================================ */

import emailjs from '@emailjs/browser';

const EMAILJS_CONFIG = {
  publicKey: 'mit1CSeNxf3na8kIo',
  serviceId: 'service_9ut91b7',
  templateId: 'template_9385jds',       // Notificación → Bryan recibe el contacto
  welcomeTemplateId: 'template_ojcv5ye', // Auto-reply → Cliente recibe confirmación
};

export function initContactForm() {
  // Initialize EmailJS
  emailjs.init(EMAILJS_CONFIG.publicKey);

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('form-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate
    if (!validateForm(form)) return;

    // Set loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      // Enviar ambos emails en paralelo:
      // 1. Notificación a Bryan con los datos del contacto
      // 2. Auto-reply de bienvenida al cliente
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

      // Success state
      submitBtn.classList.remove('loading');
      submitBtn.classList.add('success');
      showToast('¡Mensaje enviado correctamente! Te contactaré pronto. 🚀');

      // Reset after delay
      setTimeout(() => {
        form.reset();
        submitBtn.classList.remove('success');
        submitBtn.disabled = false;
      }, 3000);

    } catch (error) {
      console.error('EmailJS Error:', error);
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      showToast('Hubo un error al enviar. Intenta de nuevo o contáctame directamente.', 'error');
    }
  });
}

function validateForm(form) {
  const name = form.querySelector('#form-name');
  const email = form.querySelector('#form-email');
  const service = form.querySelector('#form-service');
  const message = form.querySelector('#form-message');

  if (!name.value.trim()) {
    shakeField(name);
    name.focus();
    return false;
  }

  if (!email.value.trim() || !isValidEmail(email.value)) {
    shakeField(email);
    email.focus();
    return false;
  }

  if (!service.value) {
    shakeField(service);
    service.focus();
    return false;
  }

  if (!message.value.trim()) {
    shakeField(message);
    message.focus();
    return false;
  }

  return true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
  
  // Show
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Hide after 4 seconds
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
