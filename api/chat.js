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
y devolver una estructura JSON estricta.

NO calculas precios.
NO recomiendas funcionalidades.
NO completas el proyecto con "buenas prácticas".
NO sustituyes un requerimiento por la feature más parecida.

════════════════════════════════════════
1. FORMATO OBLIGATORIO
════════════════════════════════════════

Responde ÚNICAMENTE con un objeto JSON válido.

NO uses markdown.
NO escribas explicaciones.
NO escribas texto antes o después del JSON.

La respuesta debe tener EXACTAMENTE esta estructura:

{
  "projectType":        string,
  "features":           string[],
  "futureFeatures":     string[],
  "undecidedFeatures":  string[],
  "knownInformation":   string[],
  "complexity":         string,
  "summary":            string,
  "missingInformation": string[]
}

Todos los arrays deben existir aunque estén vacíos.

════════════════════════════════════════
2. VALORES PERMITIDOS
════════════════════════════════════════

TIPOS DE PROYECTO:

${catalog.projectTypes.join(', ')}

FEATURES DISPONIBLES:

${catalog.features.join(', ')}

COMPLEJIDAD:

simple
medium
complex

NO inventes valores fuera de estas listas.

════════════════════════════════════════
3. PROCEDIMIENTO OBLIGATORIO
════════════════════════════════════════

Analiza el mensaje en este orden:

PASO 1
Identifica qué funcionalidades necesita el usuario AHORA.

PASO 2
Identifica qué funcionalidades están confirmadas para DESPUÉS.

PASO 3
Identifica qué funcionalidades son solamente posibilidades,
ideas, dudas o aspectos todavía no confirmados.

PASO 4
Identifica hechos, restricciones y decisiones ya conocidas.

PASO 5
SOLO DESPUÉS intenta relacionar cada requerimiento con una feature
del catálogo.

IMPORTANTE:

Primero interpreta el requerimiento.
Después busca una feature.

NUNCA empieces buscando una feature parecida.

════════════════════════════════════════
4. REGLA FUNDAMENTAL DE EVIDENCIA
════════════════════════════════════════

Una feature solamente puede aparecer cuando existe una justificación
DIRECTA en el mensaje del usuario.

Antes de incluir cada feature debes poder responder internamente:

"¿Qué frase concreta del usuario demuestra que esta feature aplica?"

Si no puedes identificar una frase o consecuencia técnica inevitable,
NO incluyas la feature.

NO agregues funcionalidades porque:

- son comunes;
- son recomendables;
- mejoran la seguridad;
- suelen usarse en ese tipo de proyecto;
- normalmente acompañan a otra funcionalidad;
- parecen relacionadas semánticamente.

Es preferible devolver menos features que devolver una incorrecta.

════════════════════════════════════════
5. PROHIBIDO SUSTITUIR REQUERIMIENTOS
════════════════════════════════════════

Si un requerimiento NO tiene una feature exacta o suficientemente
equivalente en el catálogo:

→ NO selecciones otra feature parecida.
→ conserva el requerimiento en "knownInformation" cuando sea relevante.

Ejemplo:

Usuario:
"Quizá los clientes puedan firmar digitalmente una cotización."

Si no existe una feature específica para firma o aprobación digital:

→ NO notifications
→ NO authentication
→ NO two_factor_auth
→ NO file_upload

knownInformation:
[
  "Se está considerando permitir que los clientes firmen digitalmente una cotización."
]

Ejemplo:

Usuario:
"Estamos evaluando que el cliente apruebe un servicio desde un enlace."

→ NO implica notifications.
→ NO implica authentication.
→ NO implica two_factor_auth.

Ejemplo:

Usuario:
"Quizá integremos firma electrónica."

→ NO sustituir por ninguna feature de seguridad.

════════════════════════════════════════
6. CLASIFICACIÓN TEMPORAL
════════════════════════════════════════

Clasifica cada requerimiento ANTES de mapearlo a features.

────────────────────────────────────────
ALCANCE ACTUAL → features
────────────────────────────────────────

Expresiones como:

- quiero
- necesito
- debe permitir
- en esta versión
- primera versión
- primera etapa
- por ahora necesitamos
- actualmente queremos

indican alcance actual cuando no existe duda.

────────────────────────────────────────
FUTURO CONFIRMADO → futureFeatures
────────────────────────────────────────

Sólo utiliza futureFeatures cuando el usuario expresa una intención
futura suficientemente confirmada.

Ejemplos:

- "En la segunda etapa integraremos..."
- "Más adelante queremos agregar..."
- "Posteriormente necesitaremos..."
- "Después incluiremos..."

────────────────────────────────────────
INCIERTO → undecidedFeatures
────────────────────────────────────────

CUALQUIER expresión de duda tiene prioridad sobre el tiempo verbal.

Indicadores de incertidumbre incluyen:

- quizá
- tal vez
- posiblemente
- probablemente
- podría
- podríamos
- estamos considerando
- estamos evaluando
- no sabemos si
- todavía no está decidido
- falta confirmar
- tenemos que confirmar
- debemos confirmar
- si el proveedor lo permite
- si existe esa opción
- si es posible
- dependiendo de
- aún no sabemos

REGLA ABSOLUTA:

FUTURO + DUDA = INCIERTO

Ejemplos:

"Más adelante quizá integremos la API."
→ undecidedFeatures

"Posteriormente probablemente conectemos el ERP."
→ undecidedFeatures

"En el futuro podríamos agregar pagos."
→ undecidedFeatures

"Más adelante queremos integrar la API."
→ futureFeatures

"En la segunda etapa integraremos la API."
→ futureFeatures

La incertidumbre SIEMPRE tiene prioridad sobre la temporalidad.

════════════════════════════════════════
7. REQUERIMIENTOS DESCARTADOS
════════════════════════════════════════

Si el usuario dice:

- no quiero
- no necesito
- no debe incluirse
- no formará parte
- no en esta versión
- no por ahora

NO incluyas esa funcionalidad en:

- features
- futureFeatures
- undecidedFeatures

Conserva la restricción en knownInformation si es relevante.

Ejemplo:

"No necesito pagos en línea."

→ NO payment_gateway.

knownInformation puede indicar:
"No se requieren pagos en línea en la versión actual."

════════════════════════════════════════
8. REGLAS DE FEATURES ESPECÍFICAS
════════════════════════════════════════

────────────────────────────────────────
authentication
────────────────────────────────────────

Incluye authentication cuando:

- el usuario solicita inicio de sesión;
- usuarios tendrán cuentas individuales;
- es necesario identificar qué usuario accede al sistema;
- existen permisos individuales por usuario o rol.

────────────────────────────────────────
roles_permissions
────────────────────────────────────────

Incluye roles_permissions cuando diferentes usuarios tienen diferentes
niveles de acceso o pueden realizar acciones distintas.

Ejemplos:

"Administración tendrá acceso completo."

"Los técnicos sólo verán sus trabajos."

"Los supervisores sólo verán sus sucursales."

→ roles_permissions
→ authentication

────────────────────────────────────────
two_factor_auth
────────────────────────────────────────

two_factor_auth requiere evidencia EXPLÍCITA.

Sólo incluir si el usuario menciona:

- 2FA
- MFA
- doble factor
- dos factores
- autenticación multifactor

NO inferirlo por seguridad.

Firma electrónica NO implica two_factor_auth.

Aprobación digital NO implica two_factor_auth.

────────────────────────────────────────
crud
────────────────────────────────────────

Incluye crud si el sistema debe permitir administrar información:

- crear
- registrar
- editar
- actualizar
- eliminar
- gestionar registros o contenido

Ejemplo:

"Queremos actualizar las galerías sin modificar código."

→ crud actual.

────────────────────────────────────────
file_upload
────────────────────────────────────────

file_upload significa que un usuario de la NUEVA solución debe poder
SUBIR o ADJUNTAR archivos.

Ejemplos válidos:

"Los supervisores subirán fotografías como evidencia."
→ file_upload

"El cliente podrá adjuntar un documento."
→ file_upload

"Necesito cargar un CSV al nuevo sistema."
→ file_upload

NO implica file_upload:

- generar PDF
- generar constancias
- descargar Excel
- exportar CSV
- generar reportes
- un sistema externo exporta archivos
- un sistema anterior permite importar CSV

Ejemplo:

"Nuestro sistema contable exporta XML y PDF."

→ NO file_upload.

Ejemplo:

"El sistema viejo puede exportar clientes a CSV."

→ NO file_upload.

────────────────────────────────────────
reports
────────────────────────────────────────

Incluye reports cuando el usuario solicita explícitamente:

- reportes
- informes
- resultados consolidados
- análisis periódicos de información

────────────────────────────────────────
data_export
────────────────────────────────────────

Incluye data_export cuando la NUEVA solución debe permitir exportar
o generar información descargable y esa feature representa
correctamente el requerimiento.

NO incluir data_export solamente porque un SISTEMA EXTERNO pueda
exportar información.

────────────────────────────────────────
notifications
────────────────────────────────────────

notifications requiere una solicitud real de:

- alerta
- aviso
- notificación
- recordatorio

Ejemplo:

"Enviar un aviso un día antes de la devolución."
→ notifications

Si todavía no está decidido:
→ undecidedFeatures

NO implica notifications:

- firmar un documento
- aprobar una cotización
- aprobar un servicio
- acceder mediante un enlace
- cambiar un estatus
- generar un PDF

────────────────────────────────────────
api_integration
────────────────────────────────────────

La existencia de una API externa NO implica automáticamente
api_integration.

Ejemplo:

"El ERP tiene API REST."

Eso es únicamente información conocida.

Sólo incluye api_integration si la nueva solución debe conectarse
realmente con esa API.

Ejemplo:

"En esta versión consultaremos clientes mediante la API del ERP."
→ features: ["api_integration"]

Ejemplo:

"Más adelante quizá conectemos la API del ERP."
→ undecidedFeatures: ["api_integration"]

Ejemplo:

"En la segunda etapa integraremos la API del ERP."
→ futureFeatures: ["api_integration"]

════════════════════════════════════════
9. CAPACIDADES DE SISTEMAS EXTERNOS
════════════════════════════════════════

No conviertas capacidades de sistemas existentes en features
de la nueva solución.

Ejemplos:

"El sistema actual exporta CSV."
→ información conocida.
→ NO data_export.
→ NO file_upload.

"El proveedor tiene API."
→ información conocida.
→ NO api_integration salvo que exista intención de conectarla.

"El sistema actual genera PDF."
→ información conocida.
→ NO file_upload.

Primero debes determinar qué hará la NUEVA solución.

════════════════════════════════════════
10. MISMA FEATURE EN DOS ETAPAS
════════════════════════════════════════

Una feature NO puede aparecer simultáneamente en:

- features
- futureFeatures
- undecidedFeatures

Si la misma tecnología existe ahora y después tendrá una ampliación:

→ conserva la feature en "features";
→ describe la ampliación futura en "knownInformation".

Ejemplo:

"Ahora consultaremos el ERP mediante API.
Después también actualizaremos estados."

features:
["api_integration"]

knownInformation:
[
  "La primera versión utilizará la API únicamente para consultar información.",
  "Una etapa futura podría ampliar la integración para actualizar estados."
]

NO dupliques api_integration.

════════════════════════════════════════
11. PROJECT TYPE
════════════════════════════════════════

Determina projectType únicamente por el objetivo principal
del ALCANCE ACTUAL.

NO uses funcionalidades futuras o inciertas para cambiar projectType.

landing_page:
Página pequeña principalmente informativa o de captación,
con presentación, CTA, formulario o contacto.

corporate_site:
Sitio informativo con varias secciones, catálogo visual,
portafolio o contenido administrable, sin lógica operativa compleja.

web_system:
Aplicación con lógica de negocio, usuarios, roles, módulos,
procesos internos o gestión operativa.

ecommerce:
Sólo cuando el alcance ACTUAL realmente incluye compra,
carrito, checkout, pedidos transaccionales o pagos online.

Mostrar productos o precios NO convierte un proyecto en ecommerce.

automation:
El objetivo principal es automatizar procesos, reaccionar a eventos,
sincronizar sistemas o reducir tareas manuales.

api_rest:
El entregable principal es una API.

data_dashboard:
El objetivo principal es visualizar métricas, KPIs,
gráficas o información analítica.

════════════════════════════════════════
12. COMPLEJIDAD
════════════════════════════════════════

Evalúa solamente el ALCANCE ACTUAL.

simple:
Proyecto pequeño, pocas funcionalidades y alcance claro.

medium:
Varios módulos, roles, cierta lógica de negocio,
integraciones moderadas o incertidumbre razonable.

complex:
Muchos módulos, múltiples sistemas actuales interconectados,
gran escala, alta personalización o arquitectura exigente.

NO aumentes la complejidad por funcionalidades futuras
o inciertas.

════════════════════════════════════════
13. knownInformation
════════════════════════════════════════

Incluye hechos relevantes ya proporcionados, como:

- cantidad de usuarios;
- sucursales;
- volumen de operaciones;
- roles;
- sistema actual;
- restricciones;
- integraciones existentes;
- periodicidad;
- funcionalidades descartadas;
- capacidades de sistemas externos;
- requerimientos futuros;
- requerimientos inciertos.

IMPORTANTE:

Si un requerimiento FUTURO o INCIERTO no puede representarse
correctamente mediante una feature del catálogo:

→ CONSÉRVALO en knownInformation.

NO lo reemplaces por otra feature.

Ejemplo:

"Estamos considerando firma digital."

Si no existe feature exacta:

knownInformation:
[
  "Se está considerando incorporar firma digital."
]

════════════════════════════════════════
14. missingInformation
════════════════════════════════════════

Incluye únicamente información que:

A) el usuario NO proporcionó;
B) afecta significativamente el alcance ACTUAL;
C) sería útil preguntar antes de cotizar o diseñar.

Máximo 3 elementos.

Antes de incluir una pregunta, compara SEMÁNTICAMENTE
contra todo el mensaje.

NO preguntes algo que ya fue respondido con otras palabras.

Ejemplo:

Usuario:
"Necesito reportes mensuales de ingresos."

NO preguntar:

"¿Qué periodicidad tendrán los reportes?"

NO preguntar:

"¿Con qué frecuencia se generan los reportes?"

La frecuencia ya está informada.

Ejemplo:

Usuario:
"Somos 22 personas."

NO preguntar:
"¿Cuántos usuarios tendrá el sistema?"

════════════════════════════════════════
15. summary
════════════════════════════════════════

summary debe:

- tener máximo una oración;
- describir únicamente el alcance ACTUAL;
- no mencionar features futuras o inciertas;
- no mencionar precios.

════════════════════════════════════════
16. REVISIÓN FINAL OBLIGATORIA
════════════════════════════════════════

Antes de responder revisa internamente:

1. ¿Cada feature está respaldada por una frase concreta?

2. ¿Sustituí algún requerimiento por una feature simplemente parecida?
   Si sí, ELIMÍNALA.

3. ¿Alguna capacidad pertenece en realidad a un sistema externo?
   Si sí, NO convertirla en feature de la nueva solución.

4. ¿Existe alguna expresión de duda?
   Si sí, la funcionalidad NO puede estar en futureFeatures
   como una decisión confirmada.

5. ¿Hay FUTURO + DUDA?
   Si sí → undecidedFeatures.

6. ¿Confundí firma/aprobación digital con:
   notifications,
   authentication,
   two_factor_auth
   o file_upload?
   Si sí → ELIMINAR esa asociación.

7. ¿Confundí generación/exportación con file_upload?
   Si sí → ELIMINAR file_upload.

8. ¿Hay roles diferentes sin authentication?
   Si sí → agregar authentication.

9. ¿Pregunté en missingInformation algo que ya está contestado?
   Si sí → eliminar la pregunta.

10. ¿Una feature aparece en más de una lista?
    Si sí → corregirla.

11. ¿El projectType refleja únicamente el alcance actual?

12. ¿El summary describe únicamente la versión actual?

════════════════════════════════════════
17. SALIDA
════════════════════════════════════════

Devuelve exclusivamente:

{
  "projectType":        string,
  "features":           string[],
  "futureFeatures":     string[],
  "undecidedFeatures":  string[],
  "knownInformation":   string[],
  "complexity":         string,
  "summary":            string,
  "missingInformation": string[]
}

No agregues ninguna propiedad adicional.
No agregues explicaciones.
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
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,           // Baja temperatura = respuestas más consistentes
      max_tokens: 500,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userMessage },
      ],
      // Forzar respuesta en JSON (disponible en gpt-4o-mini y gpt-4o)
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${response.status}: ${errBody?.error?.message ?? 'unknown'}`);
  }

  const data = await response.json();
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
 * Detecta si el usuario solicitó explícitamente autenticación de dos factores / 2FA.
 *
 * @param {string} message
 * @returns {boolean}
 */

// Helper functions to detect specific features
function hasExplicitTwoFactorAuth(message) {
  if (!message || typeof message !== 'string') return false;
  const text = message.toLowerCase();

  return (
    /\b2fa\b/.test(text) ||
    /\bmfa\b/.test(text) ||
    text.includes('doble factor') ||
    text.includes('dos factores') ||
    text.includes('autenticación multifactor') ||
    text.includes('autenticacion multifactor')
  );
}

// Helper function to detect if the user explicitly requested file upload functionality
function hasExplicitFileUpload(message) {
  if (!message || typeof message !== 'string') return false;

  const text = message.toLowerCase();

  return /\b(subir|adjuntar|cargar)\b.{0,40}\b(archivo|archivos|foto|fotos|fotografía|fotografías|fotografia|fotografias|imagen|imágenes|imagenes|documento|documentos|csv)\b/.test(text);

}

// Helper function to detect if the user mentioned API integration with uncertainty
function hasUncertainApiIntegration(message) {
  if (!message || typeof message !== 'string') return false;

  const text = message.toLowerCase();

  const mentionsApi =
    /\bapi\b/.test(text) ||
    text.includes('integración') ||
    text.includes('integracion');

  const hasUncertainty =
    text.includes('quizá') ||
    text.includes('quiza') ||
    text.includes('tal vez') ||
    text.includes('posiblemente') ||
    text.includes('probablemente') ||
    text.includes('podríamos') ||
    text.includes('podriamos') ||
    text.includes('podría') ||
    text.includes('podria') ||
    text.includes('tenemos que confirmar') ||
    text.includes('debemos confirmar') ||
    text.includes('falta confirmar') ||
    text.includes('si el proveedor lo permite') ||
    text.includes('si el proveedor ofrece') ||
    text.includes('si es posible');

  return mentionsApi && hasUncertainty;
}

// Helper function to detect if the user mentioned notifications with uncertainty
function hasUncertainNotifications(message) {
  if (!message || typeof message !== 'string') return false;

  const text = message.toLowerCase();

  const mentionsNotifications =
    text.includes('notificación') ||
    text.includes('notificacion') ||
    text.includes('notificaciones') ||
    text.includes('recordatorio') ||
    text.includes('recordatorios') ||
    text.includes('aviso') ||
    text.includes('avisos');

  const hasUncertainty =
    text.includes('quizá') ||
    text.includes('quiza') ||
    text.includes('tal vez') ||
    text.includes('posiblemente') ||
    text.includes('probablemente') ||
    text.includes('podríamos') ||
    text.includes('podriamos') ||
    text.includes('podría') ||
    text.includes('podria') ||
    text.includes('estamos considerando') ||
    text.includes('estamos evaluando') ||
    text.includes('todavía no') ||
    text.includes('todavia no') ||
    text.includes('no hemos decidido');

  return mentionsNotifications && hasUncertainty;
}

/**
 * Verifica que la estructura devuelta por OpenAI sea válida antes de
 * pasarla al Pricing Engine. Si OpenAI alucinó un valor fuera del
 * catálogo o infirió features peligrosas sin mención explícita,
 * lo filtramos aquí.
 *
 * @param {Object} interpretation — JSON devuelto por OpenAI
 * @param {string} message — Mensaje original del usuario
 * @returns {{ valid: boolean, errors: string[], cleaned: Object }}
 */
function validateInterpretation(interpretation, message = '') {
  const catalog = getCatalog();
  const errors = [];

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

  // ── Features de alcance actual ─────────────────────────────
  const originalFeatures = Array.isArray(interpretation.features)
    ? interpretation.features
    : [];

  let validFeatures = [
    ...new Set(
      originalFeatures.filter(
        f => catalog.features.includes(f)
      )
    )
  ];

  // Regla de consistencia:
  // Si existen roles/permisos en el alcance actual,
  // el sistema necesita identificar al usuario.
  if (
    validFeatures.includes('roles_permissions') &&
    catalog.features.includes('authentication') &&
    !validFeatures.includes('authentication')
  ) {
    validFeatures.push('authentication');
  }

  const invalidFeatures = originalFeatures.filter(
    f => !catalog.features.includes(f)
  );

  // ── Features futuras ───────────────────────────────────────
  const originalFutureFeatures = Array.isArray(interpretation.futureFeatures)
    ? interpretation.futureFeatures
    : [];

  let validFutureFeatures = [
    ...new Set(
      originalFutureFeatures
        .filter(f => catalog.features.includes(f))
        .filter(f => !validFeatures.includes(f))
    )
  ];

  // ── Features inciertas ─────────────────────────────────────
  const originalUndecidedFeatures = Array.isArray(interpretation.undecidedFeatures)
    ? interpretation.undecidedFeatures
    : [];

  let validUndecidedFeatures = [
    ...new Set(
      originalUndecidedFeatures
        .filter(f => catalog.features.includes(f))
        .filter(f => !validFeatures.includes(f))
        .filter(f => !validFutureFeatures.includes(f))
    )
  ];

  // ── Reglas deterministas de protección contra alucinaciones ────

  // 1. two_factor_auth sólo puede existir si el usuario lo pidió
  // explícitamente.
  if (!hasExplicitTwoFactorAuth(message)) {
    validFeatures = validFeatures.filter(
      feature => feature !== 'two_factor_auth'
    );

    validFutureFeatures = validFutureFeatures.filter(
      feature => feature !== 'two_factor_auth'
    );

    validUndecidedFeatures = validUndecidedFeatures.filter(
      feature => feature !== 'two_factor_auth'
    );
  }

  // 2. file_upload sólo puede existir si el usuario indicó
  // explícitamente que necesita subir, cargar o adjuntar archivos.
  if (!hasExplicitFileUpload(message)) {
    validFeatures = validFeatures.filter(
      feature => feature !== 'file_upload'
    );

    validFutureFeatures = validFutureFeatures.filter(
      feature => feature !== 'file_upload'
    );

    validUndecidedFeatures = validUndecidedFeatures.filter(
      feature => feature !== 'file_upload'
    );
  }

  // 3. api_integration futura + duda → incierta
  if (
    validFutureFeatures.includes('api_integration') &&
    hasUncertainApiIntegration(message)
  ) {
    validFutureFeatures = validFutureFeatures.filter(
      feature => feature !== 'api_integration'
    );

    if (!validUndecidedFeatures.includes('api_integration')) {
      validUndecidedFeatures.push('api_integration');
    }
  }

  // 4. notifications futura + duda → incierta
  console.log('DEBUG notifications:', {
    detected: hasUncertainNotifications(message),
    futureFeatures: validFutureFeatures,
    undecidedFeatures: validUndecidedFeatures,
  });

  if (
    validFutureFeatures.includes('notifications') &&
    hasUncertainNotifications(message)
  ) {
    validFutureFeatures = validFutureFeatures.filter(
      feature => feature !== 'notifications'
    );

    if (!validUndecidedFeatures.includes('notifications')) {
      validUndecidedFeatures.push('notifications');
    }
  }

  // ── Información conocida ───────────────────────────────────
  const knownInformation = Array.isArray(interpretation.knownInformation)
    ? interpretation.knownInformation
    : [];

  const cleaned = {
    projectType: interpretation.projectType,
    features: validFeatures,
    futureFeatures: validFutureFeatures,
    undecidedFeatures: validUndecidedFeatures,
    knownInformation: knownInformation,
    complexity: interpretation.complexity || 'medium',
    summary: interpretation.summary || '',
    missingInformation: Array.isArray(interpretation.missingInformation)
      ? interpretation.missingInformation
      : [],
    _removedFeatures: invalidFeatures,
  };

  return {
    valid: errors.length === 0,
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
    return res.status(400).json({
      error: 'El campo "message" es requerido.',
    });
  }

  // Detectar placeholders sin resolver.
  if (/{{[^{}]+}}/.test(message)) {
    return res.status(400).json({
      error: 'El mensaje contiene variables sin resolver.',
    });
  }

  if (message.trim().length < 10) {
    return res.status(400).json({
      error: 'Describe tu proyecto con más detalle (mínimo 10 caracteres).',
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      error: 'El mensaje no puede superar 2000 caracteres.',
    });
  }

  // Verificar API key.
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'OPENAI_API_KEY no está configurada en las variables de entorno.',
      hint: 'Agrega OPENAI_API_KEY en Vercel Dashboard → Project Settings → Env Vars.',
    });
  }

  try {
    // ── Paso 1: OpenAI interpreta el requerimiento ────────────
    const rawInterpretation = await callOpenAI(message.trim(), OPENAI_API_KEY);

    // ── Paso 2: Backend valida la respuesta de OpenAI ─────────
    const { valid, errors, cleaned } = validateInterpretation(rawInterpretation, message.trim());

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
      features: cleaned.features,
      complexity: cleaned.complexity,
    });

    // ── Paso 4: Respuesta combinada ───────────────────────────
    return res.status(200).json({
      interpretation: {
        projectType: cleaned.projectType,
        features: cleaned.features,
        futureFeatures: cleaned.futureFeatures,
        undecidedFeatures: cleaned.undecidedFeatures,
        knownInformation: cleaned.knownInformation,
        complexity: cleaned.complexity,
        summary: cleaned.summary,
        missingInformation: cleaned.missingInformation,
      },
      estimate,
    });

  } catch (error) {
    console.error('[chat.js] Error:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor.', detail: error.message });
  }
}
