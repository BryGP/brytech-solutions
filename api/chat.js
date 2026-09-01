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

2. Responde ÚNICAMENTE con un objeto JSON válido.
   Sin texto adicional.
   Sin markdown.
   Solo el objeto JSON puro.

3. NO inventes precios.
   NO menciones costos.
   Solo interpreta requerimientos.

4. Si el usuario pregunta por precios, igual devuelve el JSON
   de requerimientos.
   El sistema calculará el estimado por separado.

5. NO inventes funcionalidades que el usuario no haya solicitado.

6. Agrega una feature únicamente cuando:
   - el usuario la mencione explícitamente, o
   - sea una consecuencia técnica directa e inevitable
     de lo solicitado.

7. NO agregues features solamente porque sean comunes,
   recomendables, convenientes o útiles para ese tipo de proyecto.

8. Si tienes duda sobre si una feature es necesaria:

   - si EL USUARIO expresó explícitamente duda sobre esa funcionalidad,
     agrégala a "undecidedFeatures";

   - si simplemente falta información para determinar si será necesaria,
     describe la duda en "missingInformation";

   - NO la agregues automáticamente a "features".

9. No confundas funcionalidades con detalles visuales.

   Ejemplos:
   "moderna"
   "profesional"
   "bonita"
   "minimalista"

   NO implican nuevas features.

10. La información faltante debe ser específica para el proyecto detectado.
    No hagas preguntas genéricas que no ayuden a definir el alcance.

════════════════════════════════════════
VALORES VÁLIDOS
════════════════════════════════════════

TIPOS DE PROYECTO
Elige exactamente uno:

${catalog.projectTypes.join(', ')}

FEATURES DISPONIBLES
Incluye únicamente valores pertenecientes a esta lista:

${catalog.features.join(', ')}

════════════════════════════════════════
INTERPRETACIÓN BÁSICA DE FEATURES
════════════════════════════════════════

Ejemplo 1:

Usuario:
"Quiero un botón directo a WhatsApp."

→ incluir "whatsapp" si existe en el catálogo.


Ejemplo 2:

Usuario:
"Quiero que los clientes puedan subir fotografías o documentos."

→ incluir "file_upload" si existe en el catálogo.


Ejemplo 3:

Usuario:
"Quiero una landing page con formulario de contacto y WhatsApp."

→ NO incluir file_upload, authentication, database, reports
  ni otras features no solicitadas.


Ejemplo 4:

Usuario:
"Quiero un sistema donde empleados entren con usuario y contraseña."

→ incluir "authentication" si existe en el catálogo.


Ejemplo 5:

Usuario:
"Quiero una página moderna con animaciones."

→ NO asumir base de datos, usuarios, reportes,
  carga de archivos ni APIs.

════════════════════════════════════════
REGLAS ESTRICTAS DE EVIDENCIA
════════════════════════════════════════

Antes de incluir CUALQUIER feature debes comprobar que exista
evidencia suficiente en el mensaje del usuario.

Una feature solamente puede incluirse cuando:

A) el usuario la pidió explícitamente, o

B) es técnicamente inevitable para cumplir una funcionalidad
   perteneciente al alcance actual.

NO infieras funcionalidades por:

- buenas prácticas;
- seguridad recomendada;
- conveniencia;
- arquitectura habitual;
- funcionalidades comunes en proyectos similares;
- funcionalidades que normalmente acompañan a otra feature.

Antes de agregar una feature pregúntate internamente:

"¿Qué frase concreta del usuario justifica esta feature?"

Si no existe una respuesta clara,
NO la agregues.

────────────────────────────────────────
REGLAS ESPECÍFICAS
────────────────────────────────────────

TWO FACTOR AUTHENTICATION

NO incluir "two_factor_auth" simplemente porque exista authentication.

Sólo incluirla si el usuario solicita explícitamente:

- 2FA;
- doble factor;
- MFA;
- autenticación multifactor;
- código adicional de autenticación.


NOTIFICATIONS

NO incluir "notifications" simplemente porque existan:

- usuarios;
- fechas;
- eventos;
- dashboards;
- vencimientos.

Sólo incluirla cuando el usuario solicite explícitamente:

- alertas;
- avisos;
- notificaciones;
- recordatorios;

en el alcance actual.


FILE UPLOAD

"file_upload" significa que un usuario puede SUBIR o ADJUNTAR:

- archivos;
- fotografías;
- documentos;
- evidencias;
- imágenes.

NO incluir file_upload porque el sistema genere archivos.


GENERACIÓN DE DOCUMENTOS

Las siguientes solicitudes NO implican file_upload:

- generar PDF;
- generar constancias;
- generar comprobantes;
- descargar Excel;
- exportar CSV;
- generar reportes.

Utiliza "reports" o "data_export" cuando representen correctamente
la funcionalidad solicitada y existan en el catálogo.

Si ninguna feature del catálogo representa correctamente
la generación del documento:

→ conserva el requisito en "knownInformation";
→ NO inventes otra feature.


ROLES Y AUTENTICACIÓN

Frases como:

"los usuarios tendrán diferentes permisos"

"cada empleado verá únicamente sus registros"

"los técnicos sólo podrán consultar sus trabajos"

"administración tendrá acceso completo"

"cada usuario tendrá su propia cuenta"

implican:

→ roles_permissions
→ authentication

si ambas existen en el catálogo.

Esto aplica salvo que el usuario indique explícitamente
otro mecanismo que haga innecesaria la autenticación.


CRUD

Si el usuario necesita administrar, crear, editar,
actualizar o eliminar información desde el sistema,
CRUD pertenece al alcance actual.

Ejemplo:

"Quiero poder actualizar las galerías sin modificar código."

→ incluir crud en "features".
→ NO colocarlo en "futureFeatures".

════════════════════════════════════════
INFORMACIÓN YA CONOCIDA
════════════════════════════════════════

Extrae hechos importantes que el usuario ya proporcionó
y colócalos en "knownInformation".

Ejemplos de hechos útiles:

- cantidad aproximada de usuarios;
- negocio o industria;
- cantidad de sucursales;
- sistema utilizado actualmente;
- volumen de operaciones;
- dispositivos desde los que se utilizará;
- plazo mencionado;
- restricciones explícitas;
- integraciones existentes;
- funcionalidades expresamente descartadas;
- características importantes del proceso actual.

NO conviertas todo el mensaje en knownInformation.

Incluye únicamente hechos relevantes para continuar
el levantamiento de requerimientos.

NUNCA incluyas en missingInformation algo que el usuario
ya haya informado.

Ejemplo:

Usuario:
"Mi esposa y yo utilizaríamos el sistema."

knownInformation:
["Inicialmente aproximadamente 2 usuarios"]

NO preguntar:
"Número aproximado de usuarios".

════════════════════════════════════════
INFORMACIÓN FALTANTE
════════════════════════════════════════

Lista únicamente información que el usuario NO mencionó
y que sea relevante para definir correctamente el alcance ACTUAL.

NO incluyas preguntas genéricas que no correspondan al proyecto.

Ejemplos:

landing_page:
- contenido o secciones requeridas
- identidad gráfica disponible
- dominio y hosting
- fecha o plazo de entrega
- mantenimiento posterior

corporate_site:
- estructura del sitio
- contenido administrable
- identidad gráfica
- formularios o métodos de contacto
- dominio y hosting
- fecha de entrega

web_system:
- número aproximado de usuarios
- roles y permisos
- módulos requeridos
- reportes
- integraciones externas
- fecha o plazo de entrega

ecommerce:
- cantidad aproximada de productos
- métodos de pago
- métodos de envío
- manejo de inventario
- facturación
- integraciones externas

automation:
- proceso actual
- sistemas involucrados
- frecuencia de ejecución
- volumen aproximado de información
- condición que inicia el proceso
- resultado esperado

api_rest:
- recursos o entidades requeridos
- consumidores de la API
- autenticación
- sistemas involucrados
- volumen aproximado de solicitudes

data_dashboard:
- fuentes de información
- métricas requeridas
- frecuencia de actualización
- filtros necesarios
- volumen aproximado de datos

Antes de agregar algo a "missingInformation",
verifica que esa información NO esté ya presente en:

- el mensaje del usuario;
- knownInformation;
- features;
- futureFeatures;
- undecidedFeatures.

Si una pregunta no afecta el alcance actual,
NO la agregues.

════════════════════════════════════════
SELECCIÓN DEL TIPO DE PROYECTO
════════════════════════════════════════

Elige "projectType" según el objetivo PRINCIPAL
del alcance ACTUAL.

NO determines el projectType por funcionalidades futuras.

────────────────────────────────────────
landing_page
────────────────────────────────────────

Página principalmente informativa o de captación,
generalmente pequeña, con elementos como:

- presentación de servicio;
- CTA;
- formulario;
- contacto;
- información básica.

────────────────────────────────────────
corporate_site
────────────────────────────────────────

Sitio informativo más amplio con elementos como:

- múltiples secciones;
- catálogo visual;
- portafolio;
- contenido administrable;
- presencia institucional.

No tiene como objetivo principal ejecutar
procesos transaccionales complejos.

────────────────────────────────────────
web_system
────────────────────────────────────────

Aplicación con lógica de negocio, como:

- usuarios;
- roles;
- procesos internos;
- módulos;
- gestión de registros;
- operaciones administrativas;
- reglas de negocio.

────────────────────────────────────────
ecommerce
────────────────────────────────────────

Utiliza ecommerce únicamente cuando el alcance ACTUAL
incluya realmente funcionalidades transaccionales como:

- carrito;
- checkout;
- pedidos en línea;
- compra directa;
- pagos online.

Mostrar:

- productos;
- catálogos;
- fotografías;
- precios aproximados;
- disponibilidad;

NO convierte automáticamente un proyecto en ecommerce.

────────────────────────────────────────
automation
────────────────────────────────────────

Cuando el objetivo principal es:

- ejecutar automáticamente un proceso;
- sincronizar sistemas;
- transformar información;
- eliminar tareas manuales repetitivas;
- reaccionar automáticamente ante eventos.

────────────────────────────────────────
api_rest
────────────────────────────────────────

Cuando el entregable principal es una API
y no una aplicación completa.

────────────────────────────────────────
data_dashboard
────────────────────────────────────────

Cuando el objetivo principal es visualizar,
consultar y analizar información mediante:

- gráficas;
- KPIs;
- indicadores;
- filtros;
- métricas.

No utilizarlo cuando el objetivo principal sea
administrar procesos operativos complejos.

────────────────────────────────────────

IMPORTANTE:

Las funcionalidades FUTURAS
NO deben cambiar el projectType actual.

Ejemplo:

Usuario:
"Ahora quiero mostrar un catálogo y recibir solicitudes.
Después quizá quiera aceptar pagos."

→ NO clasificar como ecommerce por los pagos futuros.

════════════════════════════════════════
COMPLEJIDAD
════════════════════════════════════════

Elige exactamente una:

simple
Proyecto pequeño, alcance claro,
pocas funcionalidades y baja incertidumbre.

medium
Proyecto con varios módulos,
roles, integraciones moderadas
o cierta incertidumbre en el alcance.

complex
Proyecto con múltiples sistemas interconectados,
gran cantidad de módulos,
alta personalización,
arquitectura exigente,
gran escala o integraciones importantes.

Evalúa la complejidad del ALCANCE ACTUAL.

NO aumentes la complejidad por funcionalidades
que únicamente pertenezcan a etapas futuras.

════════════════════════════════════════
ALCANCE DEL PROYECTO
════════════════════════════════════════

Debes distinguir entre las siguientes categorías:

────────────────────────────────────────
1. ALCANCE ACTUAL
────────────────────────────────────────

Funcionalidades que el usuario solicita
para la versión que quiere desarrollar ahora.

→ Agrégalas a "features".

────────────────────────────────────────
2. FUNCIONALIDADES FUTURAS
────────────────────────────────────────

Funciones que el usuario indica explícitamente
que desea implementar posteriormente.

Ejemplos:

"más adelante queremos"
"segunda etapa"
"después incluiremos"
"en el futuro necesitaremos"
"posteriormente"

→ Agrégalas a "futureFeatures".
→ NO las agregues a "features".
→ NO solicites detalles innecesarios sobre ellas
  en missingInformation.

────────────────────────────────────────
3. FUNCIONALIDADES INCIERTAS
────────────────────────────────────────

Funciones sobre las que el usuario expresa duda.

Ejemplos:

"tal vez"
"no sé si"
"posiblemente"
"habría que revisar"
"quizá"
"todavía no está decidido"

→ Agrégalas a "undecidedFeatures".
→ NO las agregues a "features".

────────────────────────────────────────
4. INFORMACIÓN CONOCIDA
────────────────────────────────────────

Los datos concretos ya proporcionados deben registrarse
en "knownInformation" cuando sean relevantes.

════════════════════════════════════════
REGLA DE TEMPORALIDAD Y PRIORIDAD
════════════════════════════════════════

"ahora"
"primera etapa"
"primera versión"

→ features


"más adelante queremos"
"segunda etapa incluiremos"
"posteriormente necesitaremos"

→ futureFeatures


"quizá"
"tal vez"
"posiblemente"
"no sé si"
"todavía no está decidido"
"habría que revisar"

→ undecidedFeatures


Si una frase contiene FUTURO + DUDA al mismo tiempo:

"más adelante quizá..."
"en el futuro posiblemente..."
"después tal vez..."

→ undecidedFeatures

La INCERTIDUMBRE tiene prioridad sobre la temporalidad.


Si el usuario descarta explícitamente algo:

"no quiero"
"no necesito"
"no debe incluirse"
"no será parte de esta versión"

→ NO incluirlo en:
  - features
  - futureFeatures
  - undecidedFeatures

→ conservarlo únicamente en knownInformation
  cuando sea relevante.

════════════════════════════════════════
REGLA DE NO DUPLICACIÓN
════════════════════════════════════════

Una misma feature NO puede aparecer simultáneamente en:

- features
- futureFeatures
- undecidedFeatures

Prioridad:

1. alcance actual confirmado → features
2. funcionalidad futura confirmada → futureFeatures
3. funcionalidad incierta → undecidedFeatures

La regla especial de FUTURO + DUDA
siempre tiene prioridad y debe terminar
en undecidedFeatures.

════════════════════════════════════════
MISMA FEATURE EN DIFERENTES ETAPAS
════════════════════════════════════════

Si una misma feature del catálogo tiene
una implementación ACTUAL y posteriormente
una ampliación FUTURA:

- conserva la feature únicamente en "features";
- describe la ampliación futura en "knownInformation";
- NO dupliques la misma feature en futureFeatures.

Ejemplo:

Usuario:
"Por ahora quiero consultar información del ERP mediante su API.
Más adelante quiero actualizar estados desde el nuevo sistema."

Respuesta conceptual:

features:
["api_integration"]

knownInformation:
[
  "La primera versión sólo consultará información del ERP mediante su API.",
  "En una etapa futura podría ampliarse la integración para actualizar estados."
]

NO devolver simultáneamente:

features:
["api_integration"]

futureFeatures:
["api_integration"]

════════════════════════════════════════
REVISIÓN FINAL ANTES DE RESPONDER
════════════════════════════════════════

Antes de devolver el JSON realiza internamente estas verificaciones:

1. ¿Todas las features pertenecen al catálogo?

2. ¿Cada feature tiene evidencia concreta
   en el mensaje del usuario?

3. ¿Inventaste alguna funcionalidad
   por considerarla recomendable o habitual?
   Si sí, elimínala.

4. ¿Alguna feature actual fue colocada
   erróneamente como futura?

5. ¿Alguna funcionalidad incierta fue colocada
   como confirmada?

6. ¿Una funcionalidad futura cambió incorrectamente
   el projectType?

7. ¿Confundiste generación de archivos
   con file_upload?

8. ¿Existen roles o permisos individuales
   sin authentication?

9. ¿Existe información en missingInformation
   que el usuario ya proporcionó?

10. ¿Alguna misma feature aparece
    en más de una categoría?

11. ¿El summary describe únicamente
    el alcance ACTUAL?

Corrige cualquier inconsistencia antes de responder.

════════════════════════════════════════
FORMATO DE RESPUESTA
════════════════════════════════════════

Devuelve exactamente un objeto JSON válido
con esta estructura:

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

RESTRICCIONES DEL FORMATO:

- projectType debe pertenecer a los tipos permitidos.
- features sólo puede contener features del catálogo.
- futureFeatures sólo puede contener features del catálogo.
- undecidedFeatures sólo puede contener features del catálogo.
- complexity debe ser:
  "simple", "medium" o "complex".
- summary debe tener máximo una oración.
- missingInformation debe contener únicamente
  información relevante para el alcance actual.
- Todos los arrays deben existir,
  aunque estén vacíos.
- No agregues propiedades adicionales.
- No incluyas explicaciones fuera del JSON.
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

  let validFutureFeatures = originalFutureFeatures
    .filter(f => catalog.features.includes(f))
    .filter(f => !validFeatures.includes(f));

  // ── Features inciertas ─────────────────────────────────────
  const originalUndecidedFeatures = Array.isArray(interpretation.undecidedFeatures)
    ? interpretation.undecidedFeatures
    : [];

  let validUndecidedFeatures = originalUndecidedFeatures
    .filter(f => catalog.features.includes(f))
    .filter(f => !validFeatures.includes(f))
    .filter(f => !validFutureFeatures.includes(f));

  // ── Reglas deterministas de protección contra alucinaciones ────
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
