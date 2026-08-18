/* ============================================================
   api/chat.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — Chatbot IA / Interpretador de
   Requerimientos.

   RESPONSABILIDAD DE ESTE ENDPOINT:
     Recibir texto libre del usuario, enviarlo a OpenAI con un
     system prompt que instruye al modelo a responder SOLO con
     JSON estructurado, validar esa respuesta y pasarla al
     Pricing Engine para obtener un estimado de precio.

   ARQUITECTURA (regla estricta):
     OpenAI interpreta texto → estructura de requerimientos
          ↓
     Backend valida la estructura (projectType, features, etc.)
          ↓
     Pricing Engine calcula el estimado
          ↓
     Respuesta combinada al frontend

   LO QUE OPENAI NUNCA HACE:
     - Inventar un precio.
     - Decidir el costo del proyecto.
     - Ver la tarifa interna ($350 MXN/hr).

   ── Especificación HTTP ──────────────────────────────────────
   Método:   POST
   Endpoint: /api/chat
   Headers:  Content-Type: application/json
   Body:     { "message": string }

   Response (200):
     {
       "interpretation": {
         "projectType":        string,
         "features":           string[],
         "complexity":         string,
         "summary":            string,
         "missingInformation": string[]
       },
       "estimate": {
         "estimatedMin":         number,
         "estimatedMax":         number,
         "currency":             "MXN",
         "estimatedHoursMin":    number,
         "estimatedHoursMax":    number,
         "requiresManualReview": true,
         "unknownFeatures":      string[]
       }
     }

   ── Variables de entorno requeridas ─────────────────────────
   OPENAI_API_KEY — Clave secreta de OpenAI.
     Configurar en Vercel Dashboard → Project Settings → Env Vars.
     Nunca incluir en código fuente ni en el frontend.

   Si la variable no está definida en local, el endpoint responde
   con { "error": "OPENAI_API_KEY no configurada" } (503).

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

import { calculateQuote, getCatalog } from './lib/pricing.js';

/* ── System Prompt ──────────────────────────────────────────── */

/**
 * Construye el system prompt para OpenAI usando el catálogo actual
 * del Pricing Engine. Así si se agregan nuevos tipos/features al
 * catálogo, el prompt se actualiza automáticamente.
 */
function buildSystemPrompt() {
  const catalog = getCatalog();

  return `
Eres el asistente de análisis de requerimientos de BryTech Solutions,
empresa de Ingeniería en Sistemas Computacionales en Querétaro, México.

Tu ÚNICA función es interpretar la descripción de un proyecto de software
del usuario y convertirla en una estructura JSON estrictamente definida.

════════════════════════════════════════
INSTRUCCIONES OBLIGATORIAS
════════════════════════════════════════
1. Analiza la descripción del usuario con cuidado.
2. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional.
   Sin markdown (no uses bloques \`\`\`json). Solo el objeto JSON puro.
3. NO inventes precios. NO menciones costos. Solo interpreta requerimientos.
4. Si el usuario pregunta por precios, igual devuelve el JSON de requerimientos
   — el sistema calculará el estimado por separado.

════════════════════════════════════════
VALORES VÁLIDOS
════════════════════════════════════════

TIPOS DE PROYECTO (elige exactamente uno):
${catalog.projectTypes.join(', ')}

FEATURES disponibles (lista solo las que apliquen al proyecto):
${catalog.features.join(', ')}

COMPLEJIDAD (elige una):
simple   — Proyecto pequeño, requisitos claros, cliente con buena disponibilidad.
medium   — Integraciones moderadas, cierta incertidumbre en el scope.
complex  — Múltiples sistemas interconectados, alta personalización, arquitectura exigente.

════════════════════════════════════════
INFORMACIÓN FALTANTE
════════════════════════════════════════
Lista los aspectos importantes que el usuario NO mencionó y que afectan el
scope o el precio. Ejemplos: número de usuarios, reportes específicos,
integraciones adicionales, plazos, mantenimiento posterior, acceso móvil.

════════════════════════════════════════
FORMATO DE RESPUESTA (JSON estricto)
════════════════════════════════════════
{
  "projectType":        string,    ← uno de los tipos listados arriba
  "features":           string[],  ← solo features del catálogo
  "complexity":         string,    ← "simple" | "medium" | "complex"
  "summary":            string,    ← máx 1 oración describiendo el proyecto
  "missingInformation": string[]   ← aspectos no mencionados que afectan el scope
}
`.trim();
}

/* ── Llamada a OpenAI ───────────────────────────────────────── */

/**
 * Envía el mensaje del usuario a OpenAI y devuelve el JSON parseado.
 *
 * @param {string} userMessage
 * @param {string} apiKey
 * @returns {Promise<Object>} — El JSON de requerimientos interpretado por OpenAI
 * @throws {Error} si la respuesta de OpenAI no es JSON válido
 */
async function callOpenAI(userMessage, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       'gpt-4o-mini',
      temperature: 0.2,           // Baja temperatura = respuestas más consistentes
      max_tokens:  500,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user',   content: userMessage },
      ],
      // Forzar respuesta en JSON (disponible en gpt-4o-mini y gpt-4o)
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${response.status}: ${errBody?.error?.message ?? 'unknown'}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  // Parsear el JSON devuelto por OpenAI.
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`OpenAI devolvió respuesta no-JSON: ${content.slice(0, 200)}`);
  }
}

/* ── Validación de la respuesta de OpenAI ───────────────────── */

/**
 * Verifica que la estructura devuelta por OpenAI sea válida antes de
 * pasarla al Pricing Engine. Si OpenAI alucinó un valor fuera del
 * catálogo, lo filtramos aquí.
 *
 * @param {Object} interpretation — JSON devuelto por OpenAI
 * @returns {{ valid: boolean, errors: string[], cleaned: Object }}
 */
function validateInterpretation(interpretation) {
  const catalog = getCatalog();
  const errors  = [];

  // Validar projectType
  if (!interpretation.projectType) {
    errors.push('Falta projectType en la respuesta de OpenAI.');
  } else if (!catalog.projectTypes.includes(interpretation.projectType)) {
    errors.push(`projectType "${interpretation.projectType}" no está en el catálogo.`);
  }

  // Validar complexity
  const validComplexities = catalog.complexities;
  if (!validComplexities.includes(interpretation.complexity)) {
    // Fallback a medium si OpenAI devolvió algo inválido
    interpretation.complexity = 'medium';
  }

  // Filtrar features no catalogadas (no bloqueamos, solo limpiamos)
  const originalFeatures = Array.isArray(interpretation.features) ? interpretation.features : [];
  const validFeatures    = originalFeatures.filter(f => catalog.features.includes(f));
  const invalidFeatures  = originalFeatures.filter(f => !catalog.features.includes(f));

  const cleaned = {
    projectType:        interpretation.projectType,
    features:           validFeatures,
    complexity:         interpretation.complexity || 'medium',
    summary:            interpretation.summary || '',
    missingInformation: Array.isArray(interpretation.missingInformation)
                          ? interpretation.missingInformation
                          : [],
    _removedFeatures:   invalidFeatures, // Features que OpenAI inventó
  };

  return {
    valid:   errors.length === 0,
    errors,
    cleaned,
  };
}

/* ── Handler ────────────────────────────────────────────────── */

export default async function handler(req, res) {

  // Solo aceptamos POST.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { message } = req.body ?? {};

  // Validar input.
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'El campo "message" es requerido.' });
  }

  if (message.trim().length < 10) {
    return res.status(400).json({
      error: 'Describe tu proyecto con más detalle (mínimo 10 caracteres).',
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'El mensaje no puede superar 2000 caracteres.' });
  }

  // Verificar API key.
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'OPENAI_API_KEY no está configurada en las variables de entorno.',
      hint:  'Agrega OPENAI_API_KEY en Vercel Dashboard → Project Settings → Env Vars.',
    });
  }

  try {
    // ── Paso 1: OpenAI interpreta el requerimiento ────────────
    const rawInterpretation = await callOpenAI(message.trim(), OPENAI_API_KEY);

    // ── Paso 2: Backend valida la respuesta de OpenAI ─────────
    const { valid, errors, cleaned } = validateInterpretation(rawInterpretation);

    if (!valid) {
      console.error('[chat.js] Respuesta inválida de OpenAI:', errors, rawInterpretation);
      return res.status(502).json({
        error: 'La IA no pudo interpretar el requerimiento correctamente.',
        details: errors,
      });
    }

    // ── Paso 3: Pricing Engine calcula el estimado ────────────
    const estimate = calculateQuote({
      projectType: cleaned.projectType,
      features:    cleaned.features,
      complexity:  cleaned.complexity,
    });

    // ── Paso 4: Respuesta combinada ───────────────────────────
    return res.status(200).json({
      interpretation: {
        projectType:        cleaned.projectType,
        features:           cleaned.features,
        complexity:         cleaned.complexity,
        summary:            cleaned.summary,
        missingInformation: cleaned.missingInformation,
      },
      estimate,
    });

  } catch (error) {
    console.error('[chat.js] Error:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor.', detail: error.message });
  }
}
