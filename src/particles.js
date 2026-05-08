/* ============================================================
   particles.js -- BryTech Solutions
   ------------------------------------------------------------
   Canvas-based animated particle network for the hero section.
   Renders floating particles that drift, pulse in opacity, and
   repel away from the mouse cursor. Nearby particles are
   connected with translucent lines to create a network effect.

   Performance considerations:
     - Particle count adapts to viewport width (30-80).
     - Animation pauses when the browser tab is hidden.
     - Canvas resizes with debounced window resize events.
     - Touch events are supported for mobile interaction.

   Requires: a <canvas> element with id "particles-canvas"
   inside the hero section.

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */


/* ============================================================
   INITIALIZATION AND CONFIGURATION
   ============================================================ */
export function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let mouse = { x: null, y: null, radius: 150 };
  let animationId;

  // Visual and behavioral settings for the particle system.
  const CONFIG = {
    particleCount: getParticleCount(),
    maxDistance: 120,
    particleMinSize: 1,
    particleMaxSize: 2.5,
    speed: 0.3,
    colors: [
      'rgba(0, 212, 255, ',   // cyan
      'rgba(139, 92, 246, ',  // purple
      'rgba(88, 166, 255, ',  // blue
      'rgba(224, 64, 251, ',  // pink
    ]
  };


  /* ============================================================
     RESPONSIVE PARTICLE COUNT
     ------------------------------------------------------------
     Returns a particle count proportional to the viewport width
     to keep performance consistent across devices.
     ============================================================ */
  function getParticleCount() {
    const w = window.innerWidth;
    if (w < 480) return 30;
    if (w < 768) return 45;
    if (w < 1024) return 60;
    return 80;
  }


  /* ============================================================
     PARTICLE CLASS
     ------------------------------------------------------------
     Each particle has a position, size, velocity, color, and a
     pulsing opacity. On each frame it moves, pulses, reacts to
     mouse proximity, and wraps around the canvas edges.
     ============================================================ */
  class Particle {
    constructor() {
      this.reset();
    }

    // Assigns random initial values for position, size, speed,
    // color, and opacity pulse parameters.
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = CONFIG.particleMinSize + Math.random() * (CONFIG.particleMaxSize - CONFIG.particleMinSize);
      this.speedX = (Math.random() - 0.5) * CONFIG.speed;
      this.speedY = (Math.random() - 0.5) * CONFIG.speed;
      this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      this.opacity = 0.3 + Math.random() * 0.5;
      this.pulseSpeed = 0.005 + Math.random() * 0.01;
      this.pulsePhase = Math.random() * Math.PI * 2;
    }

    // Advances position, applies opacity pulse, applies mouse
    // repulsion force, and wraps around canvas boundaries.
    update(time) {
      this.x += this.speedX;
      this.y += this.speedY;

      // Sinusoidal opacity pulse for a subtle breathing effect.
      this.currentOpacity = this.opacity + Math.sin(time * this.pulseSpeed + this.pulsePhase) * 0.15;

      // Mouse repulsion: pushes particles away from the cursor
      // with a force inversely proportional to distance.
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          this.x += Math.cos(angle) * force * 2;
          this.y += Math.sin(angle) * force * 2;
        }
      }

      // Wrap around edges with a 10 px buffer to avoid popping.
      if (this.x < -10) this.x = width + 10;
      if (this.x > width + 10) this.x = -10;
      if (this.y < -10) this.y = height + 10;
      if (this.y > height + 10) this.y = -10;
    }

    // Renders the particle as a filled circle on the canvas.
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.currentOpacity + ')';
      ctx.fill();
    }
  }


  /* ============================================================
     CANVAS RESIZE HANDLER
     ------------------------------------------------------------
     Matches the canvas dimensions to its parent container. If
     the particle count has shifted significantly (>10), the
     particle array is rebuilt to match the new target count.
     ============================================================ */
  function resize() {
    const section = canvas.parentElement;
    width = canvas.width = section.offsetWidth;
    height = canvas.height = section.offsetHeight;

    const newCount = getParticleCount();
    if (Math.abs(particles.length - newCount) > 10) {
      particles = [];
      for (let i = 0; i < newCount; i++) {
        particles.push(new Particle());
      }
    }
  }


  /* ============================================================
     NETWORK LINES
     ------------------------------------------------------------
     Draws translucent cyan lines between particles that are
     within CONFIG.maxDistance of each other. Line opacity fades
     as distance increases toward the threshold.
     ============================================================ */
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.maxDistance) {
          const opacity = (1 - dist / CONFIG.maxDistance) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }


  /* ============================================================
     ANIMATION LOOP
     ------------------------------------------------------------
     Clears the canvas, updates and draws every particle, then
     renders the connecting lines. Runs via requestAnimationFrame.
     ============================================================ */
  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.update(time);
      p.draw();
    });

    drawLines();
    animationId = requestAnimationFrame(animate);
  }


  /* ============================================================
     EVENT LISTENERS
     ============================================================ */

  // Updates mouse coordinates relative to the canvas on move.
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  // Clears mouse position when the cursor leaves the canvas.
  canvas.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Touch support: tracks the first touch point for mobile
  // interaction with the particle repulsion effect.
  canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
  }, { passive: true });

  // Clears touch position when the finger is lifted.
  canvas.addEventListener('touchend', () => {
    mouse.x = null;
    mouse.y = null;
  });


  /* ============================================================
     BOOTSTRAP
     ============================================================ */

  // Set initial canvas size and create the particle array.
  resize();
  for (let i = 0; i < CONFIG.particleCount; i++) {
    particles.push(new Particle());
  }

  // Start the animation loop.
  animate(0);

  // Debounced resize handler (250 ms delay).
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 250);
  });

  // Pauses the animation when the tab loses focus to save CPU,
  // and resumes when the tab becomes visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animate(0);
    }
  });
}
