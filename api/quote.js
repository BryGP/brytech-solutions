/* ============================================================
   api/quote.js -- BryTech Solutions
   ------------------------------------------------------------
   Vercel Serverless Function — REST API de Cotización.

   Recibe los parámetros del proyecto del frontend, los pasa
   al Pricing Engine (api/lib/pricing.js) y devuelve un rango
   de precio estimado en JSON.

   La lógica de precios vive SOLO en pricing.js.
   Este archivo solo orquesta: recibe → valida → delega → responde.

   ── Flujo completo ───────────────────────────────────────────
     Frontend
        ↓
     POST /api/quote
        ↓
     quote.js  (valida input)
        ↓
     pricing.js  (calcula estimado)
        ↓
     JSON response al frontend

   ── Especificación HTTP ──────────────────────────────────────
   Método:   POST
   Endpoint: /api/quote
   Headers:  Content-Type: application/json
   Body:
     {
       "projectType": string,    ← tipo de proyecto (requerido)
       "features":   string[],   ← características adicionales (opcional, default [])
       "complexity": string      ← "simple" | "medium" | "complex" (opcional, default "medium")
     }
   Response (200):
     {
       "estimatedMin":       number,   ← precio mínimo en MXN
       "estimatedMax":       number,   ← precio máximo en MXN
       "currency":           "MXN",
       "estimatedHoursMin":  number,
       "estimatedHoursMax":  number,
       "requiresManualReview": true,
       "unknownFeatures":    string[]  ← features no reconocidas
     }
   Response (400): { "error": string }  ← input inválido
   Response (405): { "error": string }  ← método HTTP incorrecto
   Response (500): { "error": string }  ← error interno

   ── GET /api/quote (catálogo) ─────────────────────────────────
   Método:   GET
   Endpoint: /api/quote
   Response (200): catálogo de projectTypes, features y complexities disponibles.
   Útil para que el frontend construya formularios dinámicamente sin precios.

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

import { calculateQuote, getCatalog } from './lib/pricing.js';

export default function handler(req, res) {

  // ── GET: devuelve el catálogo de opciones disponibles ───────
  if (req.method === 'GET') {
    return res.status(200).json(getCatalog());
  }

  // ── POST: calcula la cotización ──────────────────────────────
  if (req.method === 'POST') {
    const { projectType, features = [], complexity = 'medium' } = req.body ?? {};

    // Validar que projectType está presente.
    if (!projectType || typeof projectType !== 'string') {
      return res.status(400).json({
        error: 'El campo "projectType" es requerido y debe ser un string.',
      });
    }

    // Validar que features es un array.
    if (!Array.isArray(features)) {
      return res.status(400).json({
        error: 'El campo "features" debe ser un array de strings.',
      });
    }

    // Validar complejidad.
    const validComplexities = ['simple', 'medium', 'complex'];
    if (!validComplexities.includes(complexity)) {
      return res.status(400).json({
        error: `El campo "complexity" debe ser uno de: ${validComplexities.join(', ')}.`,
      });
    }

    try {
      // Delegar el cálculo al Pricing Engine.
      const estimate = calculateQuote({ projectType, features, complexity });

      return res.status(200).json(estimate);

    } catch (error) {
      // El Pricing Engine lanza errores si el projectType no está catalogado.
      // Esos son errores del cliente (400), no del servidor (500).
      if (error.message.includes('no reconocido') || error.message.includes('no reconocida')) {
        return res.status(400).json({ error: error.message });
      }

      console.error('[quote.js] Error inesperado:', error);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }

  // ── Método no permitido ──────────────────────────────────────
  return res.status(405).json({
    error: `Método ${req.method} no permitido. Usa GET o POST.`,
  });
}
