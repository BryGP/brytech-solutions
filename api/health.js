/* ============================================================
   api/health.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — Health Check Endpoint.

   Propósito:
     Validar que la tubería completa funciona correctamente:
     Navegador → Vercel → Función backend → JSON response

   Este es el punto de partida de toda la capa API.
   Si este endpoint responde, todo lo demás puede construirse.

   ── Desglose técnico ─────────────────────────────────────────
   HTTP Method:   GET
   Endpoint:      /api/health
   Headers:       Ninguno requerido
   Request body:  Ninguno
   Response:      JSON { status, service, version, timestamp }
   Status codes:
     200 OK      — servidor funcionando correctamente
     405         — método HTTP incorrecto (solo se acepta GET)

   ── Cómo probarlo ────────────────────────────────────────────
   Local (vercel dev):
     1. Correr:  npm run dev:full
     2. Abrir:   http://localhost:3000/api/health

   Local (curl):
     curl http://localhost:3000/api/health

   Producción:
     curl https://brygp-solutions.vercel.app/api/health

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

export default function handler(req, res) {
  // Solo aceptamos GET. Cualquier otro método recibe 405.
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      message: `Método ${req.method} no permitido. Usa GET.`,
    });
  }

  // Respuesta de salud del servidor.
  return res.status(200).json({
    status:    'ok',
    service:   'brytech-api',
    version:   '2.0.0',
    timestamp: new Date().toISOString(),
  });
}
