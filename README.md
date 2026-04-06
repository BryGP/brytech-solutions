# BryTech Solutions 🚀

Sitio web profesional, de alto rendimiento y moderno para **BryTech Solutions**, un negocio local de soporte técnico y servicios IT ubicado en Santiago de Querétaro, México. 

El sitio está diseñado para servir como catálogo de servicios, tarjeta de presentación y punto de contacto directo para clientes.

## 🌟 Características

*   **Diseño Moderno "Cyber Tech":** Glassmorphism, paleta oscura con gradientes vivos (Cyan/Púrpura) e interacciones 3D (tilt en tarjetas de servicio).
*   **Animaciones Dinámicas:** 
    *   Partículas animadas en Canvas en la sección *Hero*.
    *   Efecto "Typing" para el eslogan principal.
    *   Animaciones suaves al hacer scroll (basadas en IntersectionObserver).
    *   *Cursor glow* para escritorio.
*   **Responsividad Total:** Adaptado perfectamente para móviles, tablets y escritorios.
*   **Integración de Formulario Seguro:** 
    *   Formulario de contacto real usando **EmailJS**.
    *   Doble plantilla: Notificación interna al dueño + Auto-respuesta de cortesía al cliente.
*   **Seguridad Avanzada Anti-Spam:**
    *   Campo **Honeypot** oculto para atrapar bots automatizados (fake success y drop).
    *   **Rate limiting** (máx. 3 envíos cada 10 mins).
    *   **Cooldown** de 60 segundos entre re-envíos sucesivos (evita el doble click accidental o spam intenso).
    *   Sanitización de inputs contra vectores XSS.
    *   Bloqueo activo de proveedores de "disposable emails".
    *   Validaciones extra de longitud de campo y contenido.

## 🛠️ Stack Tecnológico

*   **Core:** HTML5, CSS3 (Vanilla), JavaScript (ES6+).
*   **Build Tool:** Vite (Para un desarrollo ultrarrápido y bundling automático).
*   **Integraciones:** `@emailjs/browser` (No require servidor backend para enviar correos).
*   **Deploy:** Optimizado y preconfigurado para Vercel.

## 🚀 Instalación y Desarrollo (Local)

1.  **Clona el repositorio**
    ```bash
    git clone https://github.com/BryGP/brytech-solutions.git
    cd brytech-solutions
    ```

2.  **Instala las dependencias**
    ```bash
    npm install
    ```

3.  **Inicia el servidor de desarrollo**
    ```bash
    npm run dev
    ```
    El sitio estará disponible para desarrollo local en `http://localhost:3000`. Vite proporcionará recarga automática al guardar (HMR).

## 📦 Despliegue en Producción

Para desplegar a producción (Vercel):

1.  Asegúrate de que estás conectado a tu cuenta de Vercel (o regístrate gratis).
2.  Importa el repositorio desde tu cuenta de Github.
3.  Vercel automáticamente detectará que usas **Vite**. La configuración contenida en el archivo `vercel.json` y los scripts de package.json aseguran que el entorno funcione inmediatamente.
4.  Haz clic en *Deploy*. 

Tu sitio ahora reside en: [https://brygp-solutions.vercel.app](https://brygp-solutions.vercel.app)

## 🎨 Modificaciones y Personalización

*   **Variables de diseño:** Todos los colores primarios y dimensiones se controlan via CSS Variables (`:root` al principio de `style.css`).
*   **Servicios:** Se pueden agregar/quitar tarjetas en `<section id="services">` del `index.html`. 
*   **EmailJS:** Para cambiar el destino de correos o las plantillas, actualiza las constantes `EMAILJS_CONFIG` dentro de `src/contact.js`.

---

✒️ Hecho con dedicación profesional por [BryGP](https://github.com/BryGP)
