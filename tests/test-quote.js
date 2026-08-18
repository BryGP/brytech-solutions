/* ============================================================
   tests/test-quote.js -- BryTech Solutions
   ------------------------------------------------------------
   Script de prueba para demostrar el flujo completo de la
   REST API de cotización (POST /api/quote).

   Propósito:
     Documentar y verificar el flujo:
       Frontend → POST /api/quote → Backend → Pricing Engine → JSON

   Cómo correrlo (con el servidor activo en otro terminal):
     node tests/test-quote.js

   Requisito: npm run dev:full corriendo en http://localhost:3000

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

const BASE_URL = 'http://localhost:3000';

/* ── Utilidades de presentación ─────────────────────────────── */

function header(title) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function printRequest(method, endpoint, body = null) {
  console.log(`  HTTP Method:  ${method}`);
  console.log(`  Endpoint:     ${BASE_URL}${endpoint}`);
  console.log(`  Headers:      Content-Type: application/json`);
  if (body) {
    console.log(`  Request body:`);
    console.log(JSON.stringify(body, null, 4).split('\n').map(l => `    ${l}`).join('\n'));
  } else {
    console.log(`  Request body: (ninguno)`);
  }
}

function printResponse(status, statusText, data) {
  const icon = status >= 200 && status < 300 ? '✓' : '✗';
  console.log(`\n  ${icon} Status code: ${status} ${statusText}`);
  console.log(`  Response:`);
  console.log(JSON.stringify(data, null, 4).split('\n').map(l => `    ${l}`).join('\n'));
}

/* ── Función de petición genérica ───────────────────────────── */

async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, statusText: response.statusText, data };
}

/* ── Casos de prueba ────────────────────────────────────────── */

async function runTests() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  BryTech Solutions — Test Suite: REST API de Cotización');
  console.log('════════════════════════════════════════════════════════════');

  // ──────────────────────────────────────────────────────────────
  // TEST 1: GET /api/quote — Catálogo de opciones
  // Propósito: el frontend usa esta respuesta para construir
  // formularios dinámicos sin conocer precios ni tarifas.
  // ──────────────────────────────────────────────────────────────
  header('TEST 1 — GET /api/quote (catálogo de opciones)');
  printRequest('GET', '/api/quote');
  const t1 = await request('GET', '/api/quote');
  printResponse(t1.status, t1.statusText, t1.data);

  // ──────────────────────────────────────────────────────────────
  // TEST 2: POST /api/quote — Landing page simple
  // Menor complejidad posible.
  // ──────────────────────────────────────────────────────────────
  header('TEST 2 — POST /api/quote (landing page simple)');
  const body2 = {
    projectType: 'landing_page',
    features:    ['email_service'],
    complexity:  'simple',
  };
  printRequest('POST', '/api/quote', body2);
  const t2 = await request('POST', '/api/quote', body2);
  printResponse(t2.status, t2.statusText, t2.data);

  // ──────────────────────────────────────────────────────────────
  // TEST 3: POST /api/quote — Sistema web mediano con varias features
  // Caso típico de cliente de BryTech.
  // ──────────────────────────────────────────────────────────────
  header('TEST 3 — POST /api/quote (sistema web + auth + BD + reportes, medium)');
  const body3 = {
    projectType: 'web_system',
    features:    ['authentication', 'database', 'reports'],
    complexity:  'medium',
  };
  printRequest('POST', '/api/quote', body3);
  const t3 = await request('POST', '/api/quote', body3);
  printResponse(t3.status, t3.statusText, t3.data);

  // ──────────────────────────────────────────────────────────────
  // TEST 4: POST /api/quote — Proyecto complejo con IA y WhatsApp
  // Caso avanzado con múltiples integraciones.
  // ──────────────────────────────────────────────────────────────
  header('TEST 4 — POST /api/quote (sistema web complejo + IA + WhatsApp)');
  const body4 = {
    projectType: 'web_system',
    features:    [
      'authentication', 'roles_permissions', 'database',
      'crud', 'reports', 'dashboard', 'whatsapp', 'ai_chatbot',
      'deployment', 'hosting_setup',
    ],
    complexity: 'complex',
  };
  printRequest('POST', '/api/quote', body4);
  const t4 = await request('POST', '/api/quote', body4);
  printResponse(t4.status, t4.statusText, t4.data);

  // ──────────────────────────────────────────────────────────────
  // TEST 5: POST /api/quote — Error 400: projectType inválido
  // El Pricing Engine rechaza tipos de proyecto no catalogados.
  // ──────────────────────────────────────────────────────────────
  header('TEST 5 — POST /api/quote (error 400: projectType inválido)');
  const body5 = { projectType: 'red_social', features: [], complexity: 'medium' };
  printRequest('POST', '/api/quote', body5);
  const t5 = await request('POST', '/api/quote', body5);
  printResponse(t5.status, t5.statusText, t5.data);

  // ──────────────────────────────────────────────────────────────
  // TEST 6: POST /api/quote — Feature desconocida (unknownFeatures)
  // El engine no falla; incluye la feature en unknownFeatures para debug.
  // ──────────────────────────────────────────────────────────────
  header('TEST 6 — POST /api/quote (feature no catalogada → unknownFeatures)');
  const body6 = {
    projectType: 'web_system',
    features:    ['authentication', 'blockchain_nft', 'metaverso'],
    complexity:  'medium',
  };
  printRequest('POST', '/api/quote', body6);
  const t6 = await request('POST', '/api/quote', body6);
  printResponse(t6.status, t6.statusText, t6.data);

  // ──────────────────────────────────────────────────────────────
  // TEST 7: PUT /api/quote — Error 405: método no permitido
  // Solo GET y POST están soportados.
  // ──────────────────────────────────────────────────────────────
  header('TEST 7 — PUT /api/quote (error 405: método no permitido)');
  printRequest('PUT', '/api/quote', { projectType: 'landing_page' });
  const t7 = await request('PUT', '/api/quote', { projectType: 'landing_page' });
  printResponse(t7.status, t7.statusText, t7.data);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  Tests completados.');
  console.log('════════════════════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('\n[ERROR] ¿Está corriendo el servidor? (npm run dev:full)');
  console.error(err.message);
  process.exit(1);
});
