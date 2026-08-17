/* ============================================================
   api/chat.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — AI Chatbot Endpoint.

   Receives a user message from the frontend, sends it to
   OpenAI GPT with a BryTech-specific system prompt, and
   returns the AI-generated reply. The OpenAI API key is
   stored as an environment variable (never exposed to the
   browser).

   Route:    POST /api/chat
   Body:     { "message": string }
   Response: { "reply": string } | { "error": string }

   Environment Variables Required:
     OPENAI_API_KEY — OpenAI secret key (set in Vercel dashboard)

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

const SYSTEM_PROMPT = `
Eres el asistente virtual de BryTech Solutions, empresa de servicios de
Ingeniería en Sistemas Computacionales en Santiago de Querétaro, México.

Tu objetivo es ayudar a los visitantes del sitio web a:
- Entender qué servicios ofrece BryTech Solutions.
- Obtener una cotización aproximada según su necesidad.
- Saber cómo contactar directamente a Bryan (WhatsApp: 55 5506 8830).
- Resolver dudas técnicas básicas.

Servicios que ofrece BryTech Solutions:
1. Desarrollo de Software (sistemas web, apps de escritorio, automatizaciones)
2. Infraestructura en la Nube (Google Workspace, Microsoft 365, Google Cloud)
3. Seguridad Informática & Redes (redes corporativas, ciberseguridad, Cisco)
4. Respaldo y Recuperación (backup, bases de datos, restauración de archivos)
5. Armado de PCs & Workstations (gaming, oficina, ingeniería)
6. Despliegue e Instalación de Software (Windows, Linux, licencias corporativas)
7. Soporte Técnico Especializado (diagnóstico avanzado de hardware y software)
8. Mantenimiento Preventivo (limpieza, optimización)
9. Mantenimiento Correctivo (reparación de componentes)
10. Consultoría & Capacitación TI (asesoría tecnológica, capacitación de equipos)

Reglas de comportamiento:
- Responde siempre en español.
- Sé breve, claro y profesional. Máximo 3 párrafos por respuesta.
- Si preguntan por precios, da rangos aproximados y sugiere contactar a Bryan para una cotización exacta.
- Si la pregunta no está relacionada con tecnología o servicios IT, indica amablemente que estás especializado en ese tema.
- No inventes precios exactos ni plazos de entrega específicos.
`.trim();

export default async function handler(req, res) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { message } = req.body ?? {};

  // Validate input.
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'El campo "message" es requerido.' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'El mensaje no puede superar los 1000 caracteres.' });
  }

  // Require the API key — must be set in Vercel environment variables.
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error('[chat.js] OPENAI_API_KEY no está configurada.');
    return res.status(500).json({ error: 'Servicio no disponible temporalmente.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: message.trim() },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[chat.js] Error de OpenAI:', err);
      return res.status(502).json({ error: 'Error al contactar el servicio de IA.' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('[chat.js] Error interno:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
