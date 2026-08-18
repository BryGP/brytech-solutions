/* ============================================================
   api/lib/pricing.js -- BryTech Solutions
   ------------------------------------------------------------
   Pricing Engine — Motor interno de cotización.

   Este módulo contiene TODA la lógica de precios. Es la única
   fuente de verdad para estimar el costo de un proyecto.

   ARQUITECTURA:
     Frontend →  POST /api/quote  →  quote.js  →  pricing.js
                                                       ↓
                                              Calcula estimado
                                                       ↓
     Frontend ← { min, max, currency, requiresManualReview }

   REGLAS CLAVE:
     - La tarifa por hora (HOURLY_RATE) nunca se expone al frontend.
     - El engine siempre devuelve un RANGO, no un precio fijo.
     - requiresManualReview = true en todos los casos. El cliente
       recibe un estimado; la cotización definitiva la aprueba Bryan.
     - Toda la lógica pertenece al backend. Nunca a src/.

   FÓRMULA:
     totalHours  = baseHours(projectType) + sum(featureHours(features))
     totalHours *= complexityMultiplier(complexity)
     baseCost    = totalHours * HOURLY_RATE
     baseCost   *= (1 + RISK_FACTOR)        ← contingencia 20%
     estimatedMin = baseCost * 0.90
     estimatedMax = baseCost * 1.15

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

/* ── Tarifa interna ─────────────────────────────────────────── */

/**
 * Tarifa por hora en MXN. NUNCA se expone al frontend.
 * Ajustar según mercado local de Querétaro / tipo de proyecto.
 */
const HOURLY_RATE = 350; // MXN por hora

/**
 * Factor de riesgo y contingencia (20%).
 * Cubre imprevistos, cambios de scope y comunicación con el cliente.
 */
const RISK_FACTOR = 0.20;

/* ── Tipos de proyecto (horas base estimadas) ───────────────── */

/**
 * Horas base por tipo de proyecto.
 * Representan el esfuerzo mínimo para entregar el proyecto
 * sin características adicionales y con complejidad simple.
 *
 * Formato: [horasMinimas, horasMaximas]
 */
const PROJECT_BASE_HOURS = {
  landing_page:     [8,   16],   // Página de aterrizaje (1 sección clave + CTA)
  corporate_site:   [20,  40],   // Sitio corporativo (5-8 páginas informativas)
  web_system:       [40, 120],   // Sistema web con lógica de negocio
  api_rest:         [16,  40],   // API REST standalone sin frontend
  ecommerce:        [60, 150],   // Tienda en línea con catálogo y pagos
  automation:       [12,  35],   // Automatización de procesos / bots
  data_dashboard:   [25,  60],   // Dashboard con visualización de datos
  consulting:       [2,    8],   // Asesoría / consultoría técnica (por sesión)
  maintenance:      [4,   12],   // Mantenimiento mensual de sistema existente
};

/* ── Características adicionales (horas extra por feature) ─── */

/**
 * Horas adicionales que se suman al base por cada característica
 * que requiere el proyecto.
 *
 * Formato: [horasMinimas, horasMaximas]
 */
const FEATURE_HOURS = {
  // Acceso y usuarios
  authentication:     [8,  16],  // Login/logout con sesiones o JWT
  roles_permissions:  [6,  14],  // Roles de usuario (admin, operador, cliente)
  social_login:       [4,   8],  // Login con Google / Facebook / GitHub

  // Base de datos
  database:           [8,  20],  // Diseño e implementación de BD relacional/NoSQL
  crud:               [6,  12],  // Módulo CRUD adicional (por módulo)
  migrations:         [3,   6],  // Migraciones y control de versiones de BD

  // Reportes y visualización
  reports:            [8,  20],  // Reportes con filtros, exportación PDF/Excel
  dashboard:          [10, 24],  // Panel de control con gráficas y KPIs
  data_export:        [4,   8],  // Exportación de datos (CSV, Excel, PDF)

  // Integraciones externas
  api_integration:    [10, 20],  // Integración con API de terceros (por API)
  payment_gateway:    [12, 24],  // Integración con pasarela de pago (Stripe, OXXO)
  whatsapp:           [8,  16],  // Integración con WhatsApp Business API
  email_service:      [4,   8],  // Envío de correos transaccionales (EmailJS / SMTP)
  maps:               [4,  10],  // Google Maps / geolocalización

  // Inteligencia Artificial
  ai_chatbot:         [12, 30],  // Chatbot con LLM (OpenAI / Gemini)
  ai_classification:  [16, 35],  // Clasificación o análisis con IA
  ai_generation:      [10, 25],  // Generación de contenido con IA

  // Infraestructura y despliegue
  deployment:         [4,   8],  // Configuración de servidor y CI/CD
  hosting_setup:      [2,   5],  // Configuración de hosting (Vercel, VPS, etc.)
  ssl_domain:         [1,   2],  // Configuración de dominio y certificado SSL
  docker:             [6,  12],  // Dockerización del proyecto

  // Funcionalidades de negocio
  notifications:      [4,   8],  // Notificaciones push / en-app
  calendar_booking:   [8,  18],  // Calendario y reservas de citas
  file_upload:        [4,  10],  // Carga y gestión de archivos/imágenes
  search:             [6,  14],  // Búsqueda y filtros avanzados
  multi_language:     [8,  16],  // Soporte para múltiples idiomas (i18n)

  // Seguridad adicional
  two_factor_auth:    [6,  10],  // Autenticación de dos factores (2FA)
  audit_log:          [4,   8],  // Registro de actividades / auditoría
  rate_limiting:      [2,   4],  // Rate limiting y protección anti-spam
};

/* ── Multiplicadores de complejidad ─────────────────────────── */

/**
 * Factores que multiplican el total de horas estimadas.
 * Reflejan el overhead de coordinación, arquitectura y pruebas.
 */
const COMPLEXITY_MULTIPLIERS = {
  simple:  1.0,  // Proyecto pequeño, requisitos claros, cliente disponible
  medium:  1.3,  // Integraciones moderadas, algo de incertidumbre en el scope
  complex: 1.7,  // Múltiples sistemas, alta personalización, arquitectura exigente
};

/* ── Función principal ──────────────────────────────────────── */

/**
 * Calcula la estimación de precio para un proyecto.
 *
 * @param {Object} params
 * @param {string}   params.projectType  - Tipo de proyecto (ver PROJECT_BASE_HOURS)
 * @param {string[]} params.features     - Lista de características adicionales
 * @param {string}   params.complexity   - Nivel de complejidad: 'simple'|'medium'|'complex'
 *
 * @returns {Object} Estimación de precio
 * @returns {number}   .estimatedMin          - Precio mínimo estimado (MXN)
 * @returns {number}   .estimatedMax          - Precio máximo estimado (MXN)
 * @returns {string}   .currency              - Moneda ('MXN')
 * @returns {number}   .estimatedHoursMin     - Horas mínimas estimadas
 * @returns {number}   .estimatedHoursMax     - Horas máximas estimadas
 * @returns {boolean}  .requiresManualReview  - Siempre true: requiere aprobación manual
 * @returns {string[]} .unknownFeatures       - Features no reconocidas (para debug)
 */
export function calculateQuote({ projectType, features = [], complexity = 'medium' }) {

  // ── Validar tipo de proyecto ────────────────────────────────
  const baseRange = PROJECT_BASE_HOURS[projectType];
  if (!baseRange) {
    throw new Error(`Tipo de proyecto no reconocido: "${projectType}". ` +
      `Tipos disponibles: ${Object.keys(PROJECT_BASE_HOURS).join(', ')}`);
  }

  // ── Validar complejidad ─────────────────────────────────────
  const multiplier = COMPLEXITY_MULTIPLIERS[complexity];
  if (!multiplier) {
    throw new Error(`Complejidad no reconocida: "${complexity}". ` +
      `Valores válidos: simple, medium, complex`);
  }

  // ── Calcular horas base ─────────────────────────────────────
  let [hoursMin, hoursMax] = baseRange;

  // ── Sumar horas de cada feature ─────────────────────────────
  const unknownFeatures = [];

  for (const feature of features) {
    const featureRange = FEATURE_HOURS[feature];
    if (featureRange) {
      hoursMin += featureRange[0];
      hoursMax += featureRange[1];
    } else {
      unknownFeatures.push(feature); // Feature no catalogada — no suma horas
    }
  }

  // ── Aplicar multiplicador de complejidad ────────────────────
  hoursMin = hoursMin * multiplier;
  hoursMax = hoursMax * multiplier;

  // ── Calcular costo base ─────────────────────────────────────
  const costMin = hoursMin * HOURLY_RATE;
  const costMax = hoursMax * HOURLY_RATE;

  // ── Aplicar factor de riesgo y contingencia ─────────────────
  const withRiskMin = costMin * (1 + RISK_FACTOR);
  const withRiskMax = costMax * (1 + RISK_FACTOR);

  // ── Redondear a centenas de MXN ─────────────────────────────
  const estimatedMin = Math.ceil(withRiskMin / 100) * 100;
  const estimatedMax = Math.ceil(withRiskMax / 100) * 100;

  return {
    estimatedMin,
    estimatedMax,
    currency: 'MXN',
    estimatedHoursMin: Math.round(hoursMin),
    estimatedHoursMax: Math.round(hoursMax),
    requiresManualReview: true,   // Siempre: el cliente recibe un rango,
                                  // Bryan aprueba la cotización definitiva.
    unknownFeatures,              // Para detectar features que habría que catalogar.
  };
}

/* ── Catálogo público (para el frontend) ────────────────────── */

/**
 * Devuelve el catálogo de tipos de proyecto y features disponibles.
 * NO incluye precios ni tarifas — solo los identificadores válidos.
 * Útil para que el frontend construya formularios dinámicamente.
 *
 * @returns {Object} Catálogo de opciones
 */
export function getCatalog() {
  return {
    projectTypes: Object.keys(PROJECT_BASE_HOURS),
    features:     Object.keys(FEATURE_HOURS),
    complexities: Object.keys(COMPLEXITY_MULTIPLIERS),
  };
}
