/* ============================================================
   api/send-email.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — Contact Form Email Endpoint.

   Processes contact form submissions server-side via the
   EmailJS REST API. Moving this to the backend prevents the
   EmailJS Service ID, Template ID, and Public Key from being
   exposed in the client-side bundle.

   Route:    POST /api/send-email
   Body:     { "name": string, "email": string,
               "service": string, "message": string }
   Response: { "success": true } | { "error": string }

   Environment Variables Required:
     EMAILJS_SERVICE_ID   — EmailJS service identifier
     EMAILJS_TEMPLATE_ID  — EmailJS template identifier
     EMAILJS_PRIVATE_KEY  — EmailJS private key (NOT the public key)

   NOTE: This endpoint is a scaffold. The frontend (src/contact.js)
   currently sends directly to EmailJS. To activate this backend
   route, update contact.js to call POST /api/send-email instead.

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

/* ── Validation helpers ─────────────────────────────────────── */

/**
 * Basic email format check.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ── Handler ────────────────────────────────────────────────── */

export default async function handler(req, res) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { name, email, service, message } = req.body ?? {};

  // ── Input validation ──────────────────────────────────────
  if (!name    || typeof name    !== 'string' || name.trim().length    < 2)   return res.status(400).json({ error: 'El nombre es requerido (mínimo 2 caracteres).' });
  if (!email   || typeof email   !== 'string' || !isValidEmail(email))        return res.status(400).json({ error: 'Correo electrónico inválido.' });
  if (!service || typeof service !== 'string' || service.trim().length  === 0) return res.status(400).json({ error: 'El tipo de servicio es requerido.' });
  if (!message || typeof message !== 'string' || message.trim().length  < 10)  return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres.' });

  // ── Environment variables ─────────────────────────────────
  const serviceId  = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !privateKey) {
    console.error('[send-email.js] Variables de entorno de EmailJS no configuradas.');
    return res.status(500).json({ error: 'Servicio de correo no disponible temporalmente.' });
  }

  // ── Send via EmailJS REST API ─────────────────────────────
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  serviceId,
        template_id: templateId,
        user_id:     privateKey,
        template_params: {
          from_name:    name.trim(),
          from_email:   email.trim(),
          service_type: service.trim(),
          message:      message.trim(),
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[send-email.js] Error de EmailJS:', errText);
      return res.status(502).json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[send-email.js] Error interno:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
