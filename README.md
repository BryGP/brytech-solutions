# BryTech Solutions

Official website for BryTech Solutions — professional IT Engineering and technology services based in Querétaro, Mexico.

## Overview

Full-stack web application serving as the main digital presence for BryTech Solutions: a service catalog, contact portal, and backend API infrastructure for automated quoting, AI-assisted chat, and future WhatsApp Business integration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Build Tool | Vite 6 |
| Backend | Vercel Serverless Functions (Node.js 18+) |
| AI | OpenAI GPT-4o-mini |
| Email | EmailJS |
| Deployment | Vercel |

---

## Development

**Requirements:** Node.js 18+ and Vercel CLI (for full-stack dev)

```bash
# Clone the repository
git clone https://github.com/BryGP/brytech-solutions.git
cd brytech-solutions

# Install dependencies
npm install

# Install Vercel CLI globally (once)
npm i -g vercel

# --- Development modes ---

# Frontend only (no API functions)
npm run dev

# Full-stack: frontend + Serverless Functions
npm run dev:full

# Build for production
npm run build
```

---

## Project Structure

```
brytech-solutions/
│
├── api/                          # BACKEND — Vercel Serverless Functions
│   ├── chat.js                   # AI chatbot endpoint (OpenAI GPT)
│   ├── quote.js                  # Auto-quote generator by service type
│   ├── send-email.js             # Contact form server-side handler (scaffold)
│   └── webhook/
│       └── whatsapp.js           # WhatsApp Business API webhook (scaffold)
│
├── src/                          # FRONTEND
│   ├── style.css                 # Global styles and design system
│   ├── main.js                   # UI interactions and animations
│   ├── contact.js                # Contact form logic (EmailJS)
│   └── particles.js              # Hero particle canvas
│
├── public/
│   └── branding/                 # Logo, cover, and profile image assets
│
├── index.html                    # Main page (single-page layout)
├── package.json
├── vite.config.js
├── vercel.json                   # Headers, rewrites, security config
└── .gitignore
```

---

## Environment Variables

Set these in the Vercel dashboard under **Project Settings > Environment Variables**:

| Variable | Used In | Description |
|---|---|---|
| `OPENAI_API_KEY` | `api/chat.js` | OpenAI secret key for GPT responses |
| `EMAILJS_SERVICE_ID` | `api/send-email.js` | EmailJS service identifier |
| `EMAILJS_TEMPLATE_ID` | `api/send-email.js` | EmailJS template identifier |
| `EMAILJS_PRIVATE_KEY` | `api/send-email.js` | EmailJS private key |
| `WHATSAPP_VERIFY_TOKEN` | `api/webhook/whatsapp.js` | Custom token for Meta webhook verification |
| `WHATSAPP_API_TOKEN` | `api/webhook/whatsapp.js` | Bearer token from Meta for sending messages |
| `WHATSAPP_PHONE_ID` | `api/webhook/whatsapp.js` | Phone Number ID from Meta Business dashboard |

---

## API Endpoints

| Method | Route | Status | Description |
|---|---|---|---|
| `POST` | `/api/chat` | Active | AI chatbot — send a message, get a GPT reply |
| `POST` | `/api/quote` | Active | Auto-quote — get price range for a service |
| `POST` | `/api/send-email` | Scaffold | Contact form server-side (not yet wired to frontend) |
| `GET/POST` | `/api/webhook/whatsapp` | Scaffold | WhatsApp webhook (pending Meta access) |

---

## Deployment

Any push to `main` triggers an automatic production build and deployment on Vercel.

Live site: [brygp-solutions.vercel.app](https://brygp-solutions.vercel.app)

---

## Changelog

| Version | Description |
|---|---|
| `2.0.0` | Full-stack architecture: Vercel Serverless Functions layer added (`api/`). AI chat, auto-quote, email, and WhatsApp webhook scaffolded. |
| `1.2.0` | Engineering-focused content: services reordered, tech stack upgraded, logo and branding assets integrated. |
| `1.1.0` | Security hardening: HTTP headers, CSP, rate limiting, LinkedIn/GitHub links. |
| `1.0.0` | Initial release: static SPA with EmailJS contact form. |

---

Developed by [Bryan Alejandro Gonzalez Peñaloza](https://github.com/BryGP)
