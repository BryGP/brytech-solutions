/* ============================================================
   api/webhook-whatsapp.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — Webhook de WhatsApp Cloud API.

   ¿QUÉ ES UN WEBHOOK?
     En lugar de que TÚ preguntes "¿hay mensajes nuevos?" cada
     cierto tiempo (polling), WhatsApp llama a ESTE endpoint
     automáticamente cuando alguien te manda un mensaje.
     Es arquitectura event-driven (orientada a eventos).

   ── DOS TIPOS DE REQUEST ─────────────────────────────────────

   1. GET /api/webhook-whatsapp  →  Verificación del webhook
      Cuando registras este URL en Meta Developer, Meta envía
      un GET con un "challenge" para confirmar que el servidor
      es tuyo. Debes responder con el mismo challenge.

      Parámetros:
        hub.mode         = "subscribe"
        hub.verify_token = tu WEBHOOK_VERIFY_TOKEN secreto
        hub.challenge    = número aleatorio de Meta

      Respuesta: el valor de hub.challenge como texto plano.

   2. POST /api/webhook-whatsapp  →  Recepción de mensajes
      Cada que alguien te escribe por WhatsApp, Meta hace un
      POST con el mensaje en JSON. El servidor debe responder
      200 OK en menos de 5 segundos (o Meta reintentará).

   ── FLUJO COMPLETO ───────────────────────────────────────────

     Cliente escribe por WhatsApp
           ↓
     Meta hace POST a /api/webhook-whatsapp
           ↓
     Webhook valida el payload y extrae el texto
           ↓
     Llama internamente a /api/chat (OpenAI → Pricing Engine)
           ↓
     [TODO Paso 6] Responde al cliente por WhatsApp Cloud API
           ↓
     Retorna 200 OK a Meta (obligatorio, máx 5s)

   ── Variables de entorno requeridas ─────────────────────────
   WEBHOOK_VERIFY_TOKEN — Token secreto para la verificación.
     Valor libre. Ejemplo: "brytech_verify_2026"
     Agregar en .env.local (local) y en Vercel Dashboard (prod).

   BASE_URL — URL base del servidor (para llamadas internas).
     Local:      http://localhost:3000  (default automático)
     Producción: https://tu-proyecto.vercel.app

   ── Seguridad (producción) ───────────────────────────────────
   WhatsApp firma cada POST con HMAC-SHA256 usando tu App Secret.
   La firma viene en el header X-Hub-Signature-256.
   Validar esta firma es obligatorio en producción para evitar
   que actores externos envíen payloads falsos.
   → Pendiente de implementar cuando Meta apruebe la cuenta.

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

/* ── Configuración ──────────────────────────────────────────── */

// Token secreto que configuramos en Meta Developer Console.
// Meta lo envía en cada GET de verificación.
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// URL base para llamadas internas entre funciones de la API.
// En producción se debe configurar como variable de entorno.
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

/* ── Utilidades de payload ──────────────────────────────────── */

/**
 * Extrae el mensaje de texto y datos del remitente desde el
 * payload JSON que envía WhatsApp Cloud API.
 *
 * La estructura del payload de WhatsApp es profundamente anidada:
 *   body.entry[0].changes[0].value.messages[0]
 *
 * @param {Object} body — req.body del POST de WhatsApp
 * @returns {{ text, from, senderName, messageId } | null}
 *   null si el payload no contiene un mensaje de texto procesable
 */
function extractTextMessage(body) {
  const entry   = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value   = changes?.value;

  // WhatsApp también envía actualizaciones de estado (delivered, read, etc.)
  // Esos payloads tienen "statuses" en lugar de "messages".
  // Los ignoramos — no son mensajes del cliente.
  if (!value?.messages || value.messages.length === 0) {
    return null;
  }

  const message = value.messages[0];

  // Por ahora solo procesamos mensajes de texto.
  // Tipos posibles: text, image, audio, video, document, sticker, location, etc.
  if (message.type !== 'text') {
    return null;
  }

  return {
    text:       message.text?.body ?? '',
    from:       message.from,                                    // Número de WhatsApp del cliente
    senderName: value?.contacts?.[0]?.profile?.name ?? 'Cliente',
    messageId:  message.id,                                      // ID único del mensaje (para deduplicación futura)
    timestamp:  message.timestamp,
  };
}

/* ── Handler principal ──────────────────────────────────────── */

export default async function handler(req, res) {

  // Guardia: si WEBHOOK_VERIFY_TOKEN no está configurado, el webhook
  // no puede operar de forma segura. Falla de forma explícita.
  if (!VERIFY_TOKEN) {
    console.error('[webhook-whatsapp] WEBHOOK_VERIFY_TOKEN no está configurado.');
    return res.status(503).json({
      error: 'WEBHOOK_VERIFY_TOKEN no está configurado en las variables de entorno.',
      hint:  'Agrega WEBHOOK_VERIFY_TOKEN en .env.local (local) o en Vercel Dashboard (producción).',
    });
  }

  /* ── GET: Verificación del webhook ───────────────────────── */
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verificar que Meta está suscribiendo el webhook y el token es correcto.
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhook-whatsapp] Verificación exitosa. Meta confirmó el webhook. ✓');
      // Responder con el challenge como texto plano (no JSON).
      // Meta espera exactamente el valor de hub.challenge en el body.
      return res.status(200).send(challenge);
    }

    // Token incorrecto o modo diferente → rechazar.
    console.warn('[webhook-whatsapp] Verificación fallida. Token recibido:', token);
    return res.status(403).json({
      error: 'Verificación fallida. Token inválido o modo incorrecto.',
    });
  }

  /* ── POST: Recepción de mensajes de WhatsApp ─────────────── */
  if (req.method === 'POST') {
    const body = req.body;

    // ── Validar que el evento es de WhatsApp Business ────────
    // Esto protege contra payloads de otras fuentes.
    if (body?.object !== 'whatsapp_business_account') {
      console.log('[webhook-whatsapp] Evento ignorado: object =', body?.object);
      // Importante: siempre retornar 200 aunque ignoremos el evento.
      // Si retornamos un error, Meta reintentará el envío repetidamente.
      return res.status(200).json({ status: 'ignored', reason: 'Not a WhatsApp Business event.' });
    }

    // ── Extraer el mensaje de texto ──────────────────────────
    const extracted = extractTextMessage(body);

    if (!extracted) {
      const statusUpdate = body?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
      const messageType  = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type;

      if (statusUpdate) {
        // Actualización de estado: delivered, read, sent — ignorar silenciosamente.
        console.log(`[webhook-whatsapp] Status update: ${statusUpdate.status} para mensaje ${statusUpdate.id}`);
        return res.status(200).json({ status: 'ignored', reason: `Status update: ${statusUpdate.status}` });
      }

      if (messageType && messageType !== 'text') {
        // Mensaje de tipo no soportado (imagen, audio, sticker, etc.)
        console.log(`[webhook-whatsapp] Tipo de mensaje no soportado: ${messageType}`);
        return res.status(200).json({
          status:  'ignored',
          reason:  `Message type "${messageType}" not yet supported. Only text messages are processed.`,
        });
      }

      return res.status(200).json({ status: 'ignored', reason: 'No processable message found.' });
    }

    const { text, from, senderName, messageId } = extracted;

    console.log(`[webhook-whatsapp] Mensaje de ${senderName} (${from}): "${text}" [id: ${messageId}]`);

    // ── Validar que el mensaje tenga contenido útil ──────────
    if (!text || text.trim().length < 5) {
      console.log('[webhook-whatsapp] Mensaje muy corto, ignorado.');
      return res.status(200).json({ status: 'ignored', reason: 'Message too short.' });
    }

    // ── Llamada interna a /api/chat ──────────────────────────
    // Reutilizamos el endpoint de OpenAI ya construido en el Paso 4.
    // Esto demuestra cómo los servicios de un mismo backend se comunican.
    try {
      console.log(`[webhook-whatsapp] Enviando a /api/chat...`);

      const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text }),
      });

      const chatResult = await chatResponse.json();

      if (!chatResponse.ok) {
        console.error('[webhook-whatsapp] /api/chat respondió con error:', chatResult);
        // Retornar 200 a Meta de todas formas (para no causar reintentos).
        return res.status(200).json({
          status: 'chat_error',
          from,
          senderName,
          error: chatResult,
        });
      }

      console.log(`[webhook-whatsapp] Interpretación de OpenAI recibida.`);
      console.log(`  → projectType: ${chatResult.interpretation?.projectType}`);
      console.log(`  → features:    ${chatResult.interpretation?.features?.join(', ')}`);
      console.log(`  → estimado:    $${chatResult.estimate?.estimatedMin?.toLocaleString()} – $${chatResult.estimate?.estimatedMax?.toLocaleString()} MXN`);

      // ── TODO: Responder al cliente por WhatsApp ──────────
      // Cuando Meta apruebe la cuenta, aquí iría:
      //
      //   await sendWhatsAppMessage({
      //     to:      from,
      //     message: formatEstimateMessage(chatResult),
      //     token:   process.env.WHATSAPP_ACCESS_TOKEN,
      //     phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      //   });
      //
      // Por ahora solo logueamos el resultado.

      return res.status(200).json({
        status: 'processed',
        from,
        senderName,
        messageId,
        chatResult,
      });

    } catch (error) {
      console.error('[webhook-whatsapp] Error interno:', error.message);
      // SIEMPRE retornar 200 a Meta aunque el procesamiento interno falle.
      // Si retornamos 5xx, Meta reintentará el webhook hasta 20 veces.
      return res.status(200).json({
        status: 'internal_error',
        detail: error.message,
      });
    }
  }

  /* ── Método no soportado ────────────────────────────────── */
  return res.status(405).json({ error: 'Método no permitido. Solo GET y POST.' });
}
