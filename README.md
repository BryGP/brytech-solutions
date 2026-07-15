# BryTech Solutions

Official website for BryTech Solutions — professional IT support and technology services based in Querétaro, Mexico.

## Overview

This project serves as the main digital presence for BryTech Solutions: a service catalog, digital business card, and primary point of contact for local clients seeking reliable technology solutions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core | HTML5, CSS3, JavaScript (ES6+) |
| Build | Vite |
| Email | EmailJS |
| Deployment | Vercel |

## Development

**Requirements:** Node.js 18+

```bash
# Clone the repository
git clone https://github.com/BryGP/brytech-solutions.git
cd brytech-solutions

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
brytech-solutions/
├── index.html        # Main page (single-page layout)
├── src/
│   ├── style.css     # Global styles and design system
│   ├── main.js       # UI interactions and animations
│   ├── contact.js    # Contact form logic (EmailJS)
│   └── particles.js  # Hero particle canvas
└── public/           # Static assets
```

## Deployment

The project is configured for automatic deployment on Vercel. Any push to `main` triggers a production build.

---

Developed by [Bryan Alejandro Gonzalez Peñaloza](https://github.com/BryGP)
