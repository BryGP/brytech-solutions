/* ============================================================
   tests/test-webhook-whatsapp.js -- BryTech Solutions
   ------------------------------------------------------------
   Script de prueba para demostrar el flujo completo del
   webhook de WhatsApp Cloud API.

   CASOS QUE CUBRE:
     1. GET verificación exitosa (token correcto)
     2. GET verificación fallida (token incorrecto)
     3. POST mensaje de texto (flujo completo → /api/chat)
     4. POST actualización de estado (delivered) → ignorado
     5. POST mensaje de imagen (tipo no soportado) → ignorado
     6. POST objeto inválido (no es WhatsApp) → ignorado

   Cómo ejecutar:
     node tests/test-webhook-whatsapp.js

   Requisito:
     npm run dev:full corriendo en http://localhost:3000
     WEBHOOK_VERIFY_TOKEN definido en .env.local

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

const BASE_URL = 'http://localhost:3000';

// Debe coincidir con WEBHOOK_VERIFY_TOKEN en .env.local
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN ?? 'brytech_verify_2026';

/* ── Presentación ───────────────────────────────────────────── */

function header(title) {
  const line = '─'.repeat(65);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function printRequest(method, endpoint, queryOrBody = null) {
  console.log(`\n  HTTP Method:  ${method}`);
  console.log(`  Endpoint:     ${BASE_URL}${endpoint}`);
  if (queryOrBody && method === 'GET') {
    console.log(`  Query params: ${queryOrBody}`);
  }
  if (queryOrBody && method === 'POST') {
    console.log(`  Body (payload de WhatsApp):`);
    const bodyStr = JSON.stringify(queryOrBody, null, 4);
    console.log(bodyStr.split('\n').map(l => `    ${l}`).join('\n'));
  }
}

function printResponse(status, statusText, data) {
  const icon = status >= 200 && status < 300 ? '✓' : '✗';
  console.log(`\n  ${icon} Status: ${status} ${statusText}`);
  console.log(`  Response:`);
  const resStr = JSON.stringify(data, null, 4);
  console.log(resStr.split('\n').map(l => `    ${l}`).join('\n'));
}

/* ── Payloads de WhatsApp simulados ─────────────────────────── */

/**
 * Payload real que WhatsApp Cloud API envía cuando alguien
 * manda un mensaje de TEXTO.
 */
function makeTextPayload(fromName, fromPhone, messageText) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID_SIMULADO',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '5214421234567',
            phone_number_id:      'PHONE_NUMBER_ID_BRYTECH',
          },
          contacts: [{
            profile: { name: fromName },
            wa_id:   fromPhone,
          }],
          messages: [{
            from:      fromPhone,
            id:        `wamid.HBgN${Date.now()}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            text:      { body: messageText },
            type:      'text',
          }],
        },
        field: 'messages',
      }],
    }],
  };
}

/**
 * Payload que WhatsApp envía cuando un mensaje fue ENTREGADO.
 * (Actualización de estado — no es un mensaje del cliente)
 */
function makeStatusPayload(status = 'delivered') {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID_SIMULADO',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '5214421234567',
            phone_number_id:      'PHONE_NUMBER_ID_BRYTECH',
          },
          statuses: [{
            id:           'wamid.MENSAJE_ENVIADO_ID',
            recipient_id: '5214421234567',
            status:        status,
            timestamp:     String(Math.floor(Date.now() / 1000)),
          }],
        },
        field: 'messages',
      }],
    }],
  };
}

/**
 * Payload de mensaje de IMAGEN (tipo no soportado aún).
 */
function makeImagePayload(fromPhone) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID_SIMULADO',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '5214421234567',
            phone_number_id:      'PHONE_NUMBER_ID_BRYTECH',
          },
          contacts: [{
            profile: { name: 'Usuario Imagen' },
            wa_id:   fromPhone,
          }],
          messages: [{
            from:      fromPhone,
            id:        `wamid.IMG${Date.now()}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            image: {
              caption:  'Mira este diseño',
              mime_type: 'image/jpeg',
              sha256:   'hash_simulado',
              id:       'IMAGE_ID_SIMULADO',
            },
            type: 'image',
          }],
        },
        field: 'messages',
      }],
    }],
  };
}

/* ── Funciones de petición ──────────────────────────────────── */

async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  let data;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text(); // El challenge llega como texto plano
  }
  return { status: response.status, statusText: response.statusText, data };
}

async function post(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, statusText: response.statusText, data };
}

/* ── Tests ──────────────────────────────────────────────────── */

async function runTests() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  BryTech Solutions — Test Suite: Webhook de WhatsApp');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Token de verificación: ${VERIFY_TOKEN}`);

  // ────────────────────────────────────────────────────────────
  // TEST 1 — GET: Verificación exitosa (token correcto)
  // Este es el request que Meta envía cuando registras el webhook.
  // ────────────────────────────────────────────────────────────
  header('TEST 1 — GET: Verificación de webhook (token correcto)');
  const challengeValue = '1234567890';
  const verifyQuery = `?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challengeValue}`;
  printRequest('GET', `/api/webhook-whatsapp${verifyQuery}`);

  console.log('\n  Qué esperamos: status 200 + body = "' + challengeValue + '" (texto plano)');
  const t1 = await get(`/api/webhook-whatsapp${verifyQuery}`);
  printResponse(t1.status, t1.statusText, t1.data);
  console.log(`  ${t1.data === challengeValue ? '✓ Challenge correcto' : '✗ Challenge incorrecto'}`);


  // ────────────────────────────────────────────────────────────
  // TEST 2 — GET: Verificación fallida (token incorrecto)
  // Meta envía un token que no coincide → rechazar con 403.
  // ────────────────────────────────────────────────────────────
  header('TEST 2 — GET: Verificación fallida (token incorrecto)');
  const badTokenQuery = `?hub.mode=subscribe&hub.verify_token=token_falso_123&hub.challenge=${challengeValue}`;
  printRequest('GET', `/api/webhook-whatsapp${badTokenQuery}`);
  console.log('\n  Qué esperamos: status 403 (token no coincide)');

  const t2 = await get(`/api/webhook-whatsapp${badTokenQuery}`);
  printResponse(t2.status, t2.statusText, t2.data);


  // ────────────────────────────────────────────────────────────
  // TEST 3 — POST: Mensaje de texto real de un cliente
  // Simula exactamente el payload que WhatsApp enviaría.
  // ────────────────────────────────────────────────────────────
  header('TEST 3 — POST: Mensaje de texto de cliente (flujo completo)');
  const payload3 = makeTextPayload(
    'Carlos Ramírez',
    '5214421234567',
    'Necesito un sistema para mi restaurante donde registre pedidos y mis meseros puedan tomar órdenes desde el celular.'
  );
  printRequest('POST', '/api/webhook-whatsapp', payload3);
  console.log('\n  Flujo: WhatsApp payload → extraer texto → /api/chat → OpenAI → Pricing Engine');
  console.log('  (Esta petición llama a OpenAI — puede tardar unos segundos)\n');

  const t3 = await post('/api/webhook-whatsapp', payload3);
  printResponse(t3.status, t3.statusText, t3.data);


  // ────────────────────────────────────────────────────────────
  // TEST 4 — POST: Actualización de estado (delivered)
  // WhatsApp envía estos eventos cuando un mensaje fue entregado.
  // El webhook debe ignorarlos (pero siempre responder 200).
  // ────────────────────────────────────────────────────────────
  header('TEST 4 — POST: Status update "delivered" (debe ignorarse)');
  const payload4 = makeStatusPayload('delivered');
  printRequest('POST', '/api/webhook-whatsapp', payload4);
  console.log('\n  Qué esperamos: status 200 + { status: "ignored" }');

  const t4 = await post('/api/webhook-whatsapp', payload4);
  printResponse(t4.status, t4.statusText, t4.data);


  // ────────────────────────────────────────────────────────────
  // TEST 5 — POST: Mensaje de imagen (tipo no soportado)
  // Solo procesamos texto por ahora. Imágenes se ignoran.
  // ────────────────────────────────────────────────────────────
  header('TEST 5 — POST: Mensaje de imagen (tipo no soportado → ignorado)');
  const payload5 = makeImagePayload('5214429876543');
  printRequest('POST', '/api/webhook-whatsapp', payload5);
  console.log('\n  Qué esperamos: status 200 + { status: "ignored", reason: "...image..." }');

  const t5 = await post('/api/webhook-whatsapp', payload5);
  printResponse(t5.status, t5.statusText, t5.data);


  // ────────────────────────────────────────────────────────────
  // TEST 6 — POST: Objeto no relacionado con WhatsApp
  // Por ejemplo, si alguien llama directamente al endpoint.
  // ────────────────────────────────────────────────────────────
  header('TEST 6 — POST: Payload inválido (object ≠ whatsapp_business_account)');
  const payload6 = { object: 'instagram', entry: [] };
  printRequest('POST', '/api/webhook-whatsapp', payload6);
  console.log('\n  Qué esperamos: status 200 + { status: "ignored" }');

  const t6 = await post('/api/webhook-whatsapp', payload6);
  printResponse(t6.status, t6.statusText, t6.data);


  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Tests completados.');
  console.log('══════════════════════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('\n[ERROR] ¿Está corriendo el servidor? (npm run dev:full)');
  console.error(err.message);
  process.exit(1);
});
