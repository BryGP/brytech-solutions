/* ============================================================
   api/webhook/whatsapp.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — WhatsApp Business API Webhook.

   Handles two roles required by the WhatsApp Cloud API:
     GET  — Webhook verification challenge (required by Meta
            when you register the webhook URL).
     POST — Receives incoming messages and events from WhatsApp.
            Parses the payload and routes messages to the AI
            chat handler (api/chat.js) for automated replies.

   Route:    GET  /api/webhook/whatsapp  (verification)
             POST /api/webhook/whatsapp  (incoming messages)

   Environment Variables Required:
     WHATSAPP_VERIFY_TOKEN — Custom token you define in Meta dashboard
     WHATSAPP_API_TOKEN    — Bearer token from Meta for sending messages
     WHATSAPP_PHONE_ID     — Phone Number ID from Meta Business dashboard

   STATUS: SCAFFOLD — Inactive until Meta Business account
   restriction is resolved and API access is granted.

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

/* ── Helpers ────────────────────────────────────────────────── */

/**
 * Sends a text message reply back to a WhatsApp user.
 * @param {string} to      - Recipient phone number (WhatsApp format, e.g. "521234567890")
 * @param {string} text    - Message content to send
 * @param {string} phoneId - WhatsApp Phone Number ID from Meta
 * @param {string} token   - Bearer token from Meta
 */
async function sendWhatsAppMessage(to, text, phoneId, token) {
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('[whatsapp.js] Error sending message:', err);
    throw new Error('Failed to send WhatsApp message.');
  }
}

/* ── Handler ────────────────────────────────────────────────── */

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const API_TOKEN    = process.env.WHATSAPP_API_TOKEN;
  const PHONE_ID     = process.env.WHATSAPP_PHONE_ID;

  // ── GET: Webhook verification ─────────────────────────────
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[whatsapp.js] Webhook verified successfully.');
      return res.status(200).send(challenge);
    }

    return res.status(403).json({ error: 'Verification failed. Token mismatch.' });
  }

  // ── POST: Incoming messages ───────────────────────────────
  if (req.method === 'POST') {
    const body = req.body;

    // Validate it's a WhatsApp event.
    if (body?.object !== 'whatsapp_business_account') {
      return res.status(404).json({ error: 'Not a WhatsApp event.' });
    }

    try {
      const entry    = body.entry?.[0];
      const changes  = entry?.changes?.[0];
      const value    = changes?.value;
      const messages = value?.messages;

      // If there are no messages (status updates, etc.), acknowledge and exit.
      if (!messages || messages.length === 0) {
        return res.status(200).json({ status: 'no_message' });
      }

      const incomingMsg = messages[0];
      const from        = incomingMsg.from;       // Sender's phone number.
      const msgText     = incomingMsg.text?.body; // Message body text.

      if (!msgText) {
        // Non-text message (image, audio, etc.) — acknowledge but don't process.
        return res.status(200).json({ status: 'non_text_message' });
      }

      console.log(`[whatsapp.js] Message from ${from}: ${msgText}`);

      // ── Route to AI chat endpoint ──────────────────────────
      // Call our own /api/chat endpoint to get an AI reply.
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const chatResponse = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText }),
      });

      const { reply } = await chatResponse.json();

      if (reply && API_TOKEN && PHONE_ID) {
        await sendWhatsAppMessage(from, reply, PHONE_ID, API_TOKEN);
      }

      // Always return 200 to acknowledge receipt to Meta.
      return res.status(200).json({ status: 'processed' });

    } catch (error) {
      console.error('[whatsapp.js] Error processing message:', error);
      // Return 200 anyway so Meta doesn't retry endlessly.
      return res.status(200).json({ status: 'error', detail: error.message });
    }
  }

  // ── Other methods ─────────────────────────────────────────
  return res.status(405).json({ error: 'Método no permitido.' });
}
