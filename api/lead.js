/* ============================================================
   api/lead.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — Lead Ingestion & Webhook Proxy.

   RESPONSABILIDAD:
     Recibe los datos del formulario de contacto desde el frontend
     y los reenvía de forma segura al Webhook de Make.com usando
     la variable de entorno MAKE_WEBHOOK_URL.

   ARQUITECTURA DE SEGURIDAD:
     Frontend (Navegador)
          ↓ POST /api/lead (ruta interna relativa)
     Vercel Serverless Function (Backend seguro)
          ↓ Lee MAKE_WEBHOOK_URL de process.env
     Make.com Webhook (Oculto al cliente y no visible en bundle JS)
          ↓
     Escenario Make (OpenAI → Sheets → Gmail)

   ── Especificación HTTP ──────────────────────────────────────
   Método:   POST
   Endpoint: /api/lead
   Headers:  Content-Type: application/json
   Body:
     {
       "nombre":      string,
       "email":       string,
       "telefono":    string,
       "descripcion": string
     }

   Response (200):
     { "status": "success", "message": "Lead enviado a Make correctamente." }

   ── Variables de entorno requeridas ─────────────────────────
   MAKE_WEBHOOK_URL — URL secreta del webhook de Make.com.
     Configurar en .env.local (local) y en Vercel Dashboard (prod).

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

export default async function handler(req, res) {
  // Solo permitimos método POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: `Método ${req.method} no permitido. Usa POST.`,
    });
  }

  const {
    nombre,
    email,
    telefono,
    servicio,
    descripcion,
  } = req.body ?? {};

  // Validaciones básicas de entrada
  if (!nombre || !email || !descripcion) {
    return res.status(400).json({
      status: 'error',
      message: 'Los campos "nombre", "email" y "descripcion" son obligatorios.',
    });
  }

  // Obtener URL secreta de Make desde variables de entorno
  const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
  if (!MAKE_WEBHOOK_URL) {
    console.error('[lead.js] MAKE_WEBHOOK_URL no está configurada en las variables de entorno.');
    return res.status(503).json({
      status: 'error',
      message: 'MAKE_WEBHOOK_URL no configurada en las variables de entorno.',
      hint: 'Agrega MAKE_WEBHOOK_URL en .env.local y en Vercel Dashboard.',
    });
  }

  try {
    const payload = {
      nombre:      String(nombre).trim(),
      email:       String(email).trim(),
      telefono:    String(telefono || 'No proporcionado').trim(),
      servicio:    String(servicio || 'No especificado').trim(),
      descripcion: String(descripcion).trim(),
      timestamp:   new Date().toISOString(),
    };

    // Reenviar al webhook de Make.com
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[lead.js] Make respondió con status ${response.status}`);
      return res.status(502).json({
        status: 'error',
        message: `Make webhook respondió con error ${response.status}`,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Lead procesado y enviado a Make correctamente.',
    });

  } catch (error) {
    console.error('[lead.js] Error al contactar el webhook de Make:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno al enviar el lead al webhook.',
      detail: error.message,
    });
  }
}
