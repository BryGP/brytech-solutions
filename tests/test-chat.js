/* ============================================================
   tests/test-chat.js -- BryTech Solutions
   ------------------------------------------------------------
   Script de prueba para demostrar el flujo completo de:
     POST /api/chat → OpenAI → Pricing Engine → Respuesta combinada

   MODOS DE EJECUCIÓN:
     Sin OPENAI_API_KEY (simulado / modo mock):
       node tests/test-chat.js
       Usa respuestas simuladas de OpenAI para demostrar el flujo.

     Con OPENAI_API_KEY (modo real):
       set OPENAI_API_KEY=sk-... en .env.local
       Luego reiniciar: npm run dev:full
       Finalmente: node tests/test-chat.js

   Requisito: npm run dev:full corriendo en http://localhost:3000

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

const BASE_URL = 'http://localhost:3000';

/* ── Utilidades de presentación ─────────────────────────────── */

function header(title) {
  const line = '─'.repeat(65);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function printRequest(body) {
  console.log(`  HTTP Method:  POST`);
  console.log(`  Endpoint:     ${BASE_URL}/api/chat`);
  console.log(`  Headers:      Content-Type: application/json`);
  console.log(`  Request body:`);
  console.log(`    ${JSON.stringify(body, null, 4).split('\n').join('\n    ')}`);
}

function printResponse(status, statusText, data) {
  const icon = status >= 200 && status < 300 ? '✓' : '✗';
  console.log(`\n  ${icon} Status: ${status} ${statusText}`);
  console.log(`  Response:`);
  console.log(`    ${JSON.stringify(data, null, 4).split('\n').join('\n    ')}`);
}

/* ── Petición al endpoint ───────────────────────────────────── */

async function callChat(body) {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, statusText: response.statusText, data };
}

/* ── Modo mock: simula el endpoint completo localmente ──────── */
/* Esto permite entender el flujo sin necesitar la API key.      */

async function runMockDemo() {
  console.log('\n  [MODO MOCK — Sin OPENAI_API_KEY]');
  console.log('  Se simula lo que OpenAI devolvería y se muestra el flujo completo.');
  console.log('  Para usar OpenAI real: agrega OPENAI_API_KEY en .env.local\n');

  // Importar el Pricing Engine directamente para la demo
  const { calculateQuote } = await import('../api/lib/pricing.js');

  // Casos de prueba simulados
  const mockCases = [
    {
      label:   'Sistema de taller mecánico',
      message: 'Necesito un sistema para mi taller donde registre clientes, vehículos y servicios. Mis empleados deben entrar con usuario y contraseña.',
      // Esto es lo que OpenAI devolvería al interpretar el mensaje de arriba:
      mockOpenAIResponse: {
        projectType:        'web_system',
        features:           ['authentication', 'roles_permissions', 'database', 'crud'],
        complexity:         'medium',
        summary:            'Sistema web de gestión de taller mecánico con usuarios, clientes, vehículos y servicios.',
        missingInformation: [
          'Número de usuarios/empleados simultáneos',
          'Reportes o estadísticas (ingresos, servicios más frecuentes)',
          'Notificaciones al cliente (correo o WhatsApp cuando su auto esté listo)',
          'Acceso desde celular o solo escritorio',
          'Plazo de entrega deseado',
        ],
      },
    },
    {
      label:   'Landing page para despacho de abogados',
      message: 'Quiero una página para mi despacho de abogados donde la gente pueda conocer mis servicios y contactarme.',
      mockOpenAIResponse: {
        projectType:        'landing_page',
        features:           ['email_service'],
        complexity:         'simple',
        summary:            'Página de presentación profesional para despacho jurídico con formulario de contacto.',
        missingInformation: [
          'Número de servicios o áreas de práctica a mostrar',
          '¿Se necesita blog o artículos?',
          '¿Necesita calendario para agendar consultas?',
          '¿Tiene logotipo y branding ya definido?',
        ],
      },
    },
    {
      label:   'Tienda en línea con chatbot IA',
      message: 'Quiero una tienda en línea para vender ropa, con catálogo de productos, carrito de compras, pago con tarjeta y un chatbot que ayude a los clientes a encontrar productos.',
      mockOpenAIResponse: {
        projectType:        'ecommerce',
        features:           ['database', 'crud', 'payment_gateway', 'file_upload', 'search', 'ai_chatbot'],
        complexity:         'complex',
        summary:            'Tienda en línea de ropa con catálogo, carrito, pagos y asistente IA para clientes.',
        missingInformation: [
          'Número aproximado de productos en el catálogo',
          '¿Pasarela de pago? (Stripe, MercadoPago, OXXO)',
          'Gestión de inventario y tallas',
          '¿Se necesita panel de administración para gestionar pedidos?',
          '¿Envíos y tracking?',
        ],
      },
    },
  ];

  for (const testCase of mockCases) {
    header(`[MOCK] ${testCase.label}`);
    console.log(`\n  Usuario dice: "${testCase.message}"\n`);
    console.log(`  → Esto se envía a OpenAI con el system prompt del backend.\n`);
    console.log(`  → OpenAI interpreta y devuelve:`);
    console.log(`    ${JSON.stringify(testCase.mockOpenAIResponse, null, 4).split('\n').join('\n    ')}`);

    console.log(`\n  → Backend valida la respuesta de OpenAI...`);
    console.log(`  → Pricing Engine calcula el estimado...`);

    const estimate = calculateQuote({
      projectType: testCase.mockOpenAIResponse.projectType,
      features:    testCase.mockOpenAIResponse.features,
      complexity:  testCase.mockOpenAIResponse.complexity,
    });

    const fullResponse = {
      interpretation: {
        projectType:        testCase.mockOpenAIResponse.projectType,
        features:           testCase.mockOpenAIResponse.features,
        complexity:         testCase.mockOpenAIResponse.complexity,
        summary:            testCase.mockOpenAIResponse.summary,
        missingInformation: testCase.mockOpenAIResponse.missingInformation,
      },
      estimate,
    };

    console.log(`\n  ✓ Respuesta final que recibiría el frontend:`);
    console.log(`    ${JSON.stringify(fullResponse, null, 4).split('\n').join('\n    ')}`);
  }
}

/* ── Modo real: prueba el endpoint HTTP ─────────────────────── */

async function runRealTests() {
  console.log('\n  [MODO REAL — Con OPENAI_API_KEY configurada]');
  console.log('  Haciendo peticiones reales a POST /api/chat...\n');

  // Test 1: Descripción de taller mecánico
  header('TEST 1 — Sistema de gestión de taller mecánico');
  const body1 = {
    message: 'Necesito un sistema para mi taller mecánico donde pueda registrar clientes, vehículos y servicios. Mis empleados deben poder entrar con usuario y contraseña.',
  };
  printRequest(body1);
  const t1 = await callChat(body1);
  printResponse(t1.status, t1.statusText, t1.data);

  // Test 2: Landing page
  header('TEST 2 — Landing page para despacho de abogados');
  const body2 = {
    message: 'Quiero una página para mi despacho de abogados donde la gente pueda conocer mis servicios y contactarme fácilmente.',
  };
  printRequest(body2);
  const t2 = await callChat(body2);
  printResponse(t2.status, t2.statusText, t2.data);

  // Test 3: Proyecto complejo
  header('TEST 3 — Tienda en línea con chatbot IA');
  const body3 = {
    message: 'Quiero una tienda en línea para vender ropa con catálogo, carrito, pago con tarjeta y un chatbot que ayude a los clientes.',
  };
  printRequest(body3);
  const t3 = await callChat(body3);
  printResponse(t3.status, t3.statusText, t3.data);

  // Test 4: Error — mensaje muy corto
  header('TEST 4 — Error 400: mensaje demasiado corto');
  const body4 = { message: 'web' };
  printRequest(body4);
  const t4 = await callChat(body4);
  printResponse(t4.status, t4.statusText, t4.data);

  // Test 5: Error — sin mensaje
  header('TEST 5 — Error 400: mensaje faltante');
  const body5 = {};
  printRequest(body5);
  const t5 = await callChat(body5);
  printResponse(t5.status, t5.statusText, t5.data);
}

/* ── Entry point ────────────────────────────────────────────── */

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  BryTech Solutions — Test Suite: POST /api/chat (Chatbot IA)');
  console.log('══════════════════════════════════════════════════════════════');

  // Detectar si la API key está presente probando el endpoint
  // (si el servidor devuelve 503, es que no hay key)
  let hasApiKey = false;
  try {
    const probe = await callChat({ message: 'prueba de conectividad' });
    hasApiKey = probe.status !== 503;
  } catch {
    console.error('\n  [ERROR] ¿Está corriendo el servidor? (npm run dev:full)');
    process.exit(1);
  }

  if (hasApiKey) {
    await runRealTests();
  } else {
    console.log('\n  OPENAI_API_KEY no encontrada → ejecutando modo mock.');
    await runMockDemo();
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Tests completados.');
  console.log('══════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
