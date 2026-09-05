# BryTech Solutions

Sitio web oficial y plataforma de servicios de **BryTech Solutions** — ingeniería de software y tecnología profesional con base en Querétaro, México.

Producción: [brygp-solutions.vercel.app](https://brygp-solutions.vercel.app)

---

## Descripción

Aplicación full-stack que funciona como presencia digital principal de BryTech Solutions: catálogo de servicios, portal de contacto y API backend para cotización automatizada, chat asistido por IA y automatización de leads vía Make.com.

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Build Tool | Vite 6 |
| Backend | Vercel Serverless Functions (Node.js 20+) |
| IA | OpenAI GPT-4o-mini |
| Automatización | Make.com (webhook → OpenAI → Sheets → Gmail) |
| Email | EmailJS (auto-reply al cliente) |
| Deployment | Vercel (CI/CD automático desde `main`) |

---

## Arquitectura

```
[Formulario Web]
      │
      ▼  POST /api/lead  (proxy seguro — URL de Make nunca expuesta)
[Vercel Serverless]
      │
      ▼
[Make.com Webhook]
      ├──▶  POST /api/chat  →  OpenAI GPT-4o-mini  →  Pricing Engine
      ├──▶  Google Sheets   →  Registro del lead
      └──▶  Gmail           →  Notificación a Bryan con análisis de IA

[EmailJS]  →  Auto-reply de confirmación al cliente
```

---

## Estructura del Proyecto

```
brytech-solutions/
│
├── api/                          # BACKEND — Vercel Serverless Functions
│   ├── chat.js                   # Chatbot IA: GPT-4o-mini + Pricing Engine + guards
│   ├── quote.js                  # Cotización automática por tipo de servicio
│   ├── lead.js                   # Proxy seguro → Make.com webhook
│   ├── health.js                 # Health check
│   ├── send-email.js             # Scaffold — manejo de correo server-side
│   ├── webhook-whatsapp.js       # WhatsApp Business webhook (backend listo, Meta pendiente)
│   └── lib/
│       └── pricing.js            # Pricing Engine: catálogo, fórmula, tarifa interna
│
├── src/                          # FRONTEND
│   ├── style.css                 # Sistema de diseño global
│   ├── main.js                   # Interacciones UI y animaciones
│   ├── contact.js                # Formulario de contacto (EmailJS + /api/lead)
│   └── particles.js              # Canvas de partículas del hero
│
├── public/
│   └── branding/                 # Logo, portada e isotipo
│
├── docs/                         # Documentación técnica por paso
│   ├── paso-1-health-endpoint.txt
│   ├── paso-2-pricing-engine.txt
│   ├── paso-3-rest-api-quote.txt
│   ├── paso-4-chatbot-openai.txt
│   ├── paso-5-webhook-whatsapp.txt
│   └── paso-6-make-automatizacion.txt
│
├── index.html                    # SPA principal
├── vite.config.js
├── vercel.json                   # Headers HTTP, CSP, rewrites SPA
└── .gitignore
```

---

## API Endpoints

| Método | Ruta | Estado | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | ✅ Activo | Health check — estado del servidor |
| `POST` | `/api/quote` | ✅ Activo | Cotización automática por tipo de proyecto |
| `POST` | `/api/chat` | ✅ Activo | Chatbot IA — interpreta descripción y devuelve estimado |
| `POST` | `/api/lead` | ✅ Activo | Captura lead y reenvía a Make.com de forma segura |
| `GET/POST` | `/api/webhook-whatsapp` | ⏳ Pendiente | WhatsApp Business API (backend listo, activación Meta pendiente) |

### `/api/chat` — Respuesta de ejemplo

```json
{
  "interpretation": {
    "projectType": "web_system",
    "features": ["authentication", "roles_permissions", "database", "crud"],
    "futureFeatures": ["api_integration"],
    "undecidedFeatures": ["notifications"],
    "knownInformation": ["7 usuarios", "industria: fisioterapia"],
    "complexity": "medium",
    "summary": "Sistema web de gestión de clínica con roles de terapeuta y recepción.",
    "missingInformation": ["¿Necesita acceso desde celular?"]
  },
  "estimate": {
    "estimatedMin": 37200,
    "estimatedMax": 99400,
    "currency": "MXN",
    "estimatedHoursMin": 88,
    "estimatedHoursMax": 237,
    "requiresManualReview": true
  }
}
```

---

## Guards Deterministas en `/api/chat`

El sistema aplica reglas de validación en backend para prevenir alucinaciones del modelo:

| Guard | Feature | Comportamiento |
|---|---|---|
| 1 | `two_factor_auth` | Solo si el usuario menciona 2FA / MFA explícitamente |
| 2 | `file_upload` | Solo si el usuario menciona subir/adjuntar/cargar archivos |
| 3 | `api_integration` | Pasa a `undecidedFeatures` si el usuario expresa duda |
| 4 | `authentication` | Se agrega automáticamente si `roles_permissions` está presente |
| 5 | `notifications` | Pasa a `undecidedFeatures` si el usuario expresa duda |

---

## Variables de Entorno

Configuradas en el dashboard de Vercel → **Project Settings → Environment Variables**:

| Variable | Endpoint | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | `api/chat.js` | API key de OpenAI |
| `MAKE_WEBHOOK_URL` | `api/lead.js` | URL del webhook de Make.com (no expuesta al frontend) |
| `WHATSAPP_ACCESS_TOKEN` | `api/webhook-whatsapp.js` | Token Meta — futuro |
| `WHATSAPP_PHONE_NUMBER_ID` | `api/webhook-whatsapp.js` | Phone ID Meta — futuro |
| `WHATSAPP_VERIFY_TOKEN` | `api/webhook-whatsapp.js` | Token de verificación Meta — futuro |

---

## Deployment

Cualquier push a `main` dispara un build y deploy automático en Vercel.

```
main → Vercel CI/CD → brygp-solutions.vercel.app
```

---

## Changelog

| Versión | Descripción |
|---|---|
| `2.0.0` | Arquitectura full-stack. API layer completa: chatbot IA, Pricing Engine, cotización automática, proxy Make.com, webhook WhatsApp. Guards deterministas. Automatización Make.com → Sheets → Gmail. |
| `1.2.0` | Contenido enfocado en ingeniería: servicios, tech stack, branding y logo integrados. |
| `1.1.0` | Seguridad: HTTP headers, CSP, rate limiting, enlaces LinkedIn/GitHub. |
| `1.0.0` | Release inicial: SPA estática con formulario de contacto vía EmailJS. |

---

© 2026 BryTech Solutions · Desarrollado por [Bryan Alejandro Gonzalez Peñaloza](https://github.com/BryGP)
