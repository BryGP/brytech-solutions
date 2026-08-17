/* ============================================================
   api/quote.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — Auto-Quote Endpoint.

   Returns a price range estimate for a given service type
   based on a static pricing catalog. Designed to be extended
   with a database or CMS in the future.

   Route:    POST /api/quote
   Body:     { "service": string }
   Response: { "service": string, "min": number, "max": number,
               "unit": string, "note": string }
             | { "error": string }

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

/* ── Price catalog ──────────────────────────────────────────── */

/**
 * Pricing reference table. Prices are in MXN.
 * Fields:
 *   min  — minimum estimated price
 *   max  — maximum estimated price
 *   unit — basis of the price ("proyecto", "visita", "hora", etc.)
 *   note — contextual clarification shown to the user
 */
const CATALOG = {
  'Desarrollo de Software': {
    min: 5000, max: 35000, unit: 'proyecto',
    note: 'El costo varía según complejidad. Incluye análisis, desarrollo y entrega.',
  },
  'Infraestructura en la Nube': {
    min: 1500, max: 8000, unit: 'implementación',
    note: 'Incluye configuración de Google Workspace o Microsoft 365 para tu empresa.',
  },
  'Seguridad Informática & Redes': {
    min: 800, max: 5000, unit: 'proyecto',
    note: 'Diagnóstico, configuración de red y hardening de seguridad incluidos.',
  },
  'Respaldo y Recuperación': {
    min: 500, max: 3000, unit: 'servicio',
    note: 'Depende de la cantidad de datos y complejidad de la recuperación.',
  },
  'Armado de PCs & Workstations': {
    min: 400, max: 1200, unit: 'ensamblaje',
    note: 'Precio de mano de obra. Los componentes se cotizan por separado.',
  },
  'Despliegue de Software': {
    min: 300, max: 900, unit: 'visita',
    note: 'Incluye instalación, configuración y pruebas del software.',
  },
  'Soporte Técnico Especializado': {
    min: 300, max: 800, unit: 'visita',
    note: 'Diagnóstico avanzado de hardware y software con reporte incluido.',
  },
  'Mantenimiento Preventivo': {
    min: 250, max: 500, unit: 'equipo',
    note: 'Limpieza física, optimización del sistema y revisión completa.',
  },
  'Mantenimiento Correctivo': {
    min: 350, max: 1500, unit: 'reparación',
    note: 'El precio varía según el componente dañado. Diagnóstico sin costo.',
  },
  'Consultoría & Capacitación TI': {
    min: 500, max: 3000, unit: 'sesión',
    note: 'Asesoría personalizada y capacitación para ti o tu equipo de trabajo.',
  },
};

/* ── Handler ────────────────────────────────────────────────── */

export default function handler(req, res) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { service } = req.body ?? {};

  if (!service || typeof service !== 'string') {
    return res.status(400).json({ error: 'El campo "service" es requerido.' });
  }

  const entry = CATALOG[service.trim()];

  if (!entry) {
    // Service not found — return full catalog list so the frontend can show options.
    return res.status(404).json({
      error: 'Servicio no encontrado.',
      available: Object.keys(CATALOG),
    });
  }

  return res.status(200).json({
    service: service.trim(),
    min:  entry.min,
    max:  entry.max,
    unit: entry.unit,
    note: entry.note,
    currency: 'MXN',
  });
}
