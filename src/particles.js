/* ============================================================
   BryTech Solutions — Particle System
   Canvas-based animated particle network
   ============================================================ */

export function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let mouse = { x: null, y: null, radius: 150 };
  let animationId;

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

  function getParticleCount() {
    const w = window.innerWidth;
    if (w < 480) return 30;
    if (w < 768) return 45;
    if (w < 1024) return 60;
    return 80;
  }

  class Particle {
    constructor() {
      this.reset();
    }

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

    update(time) {
      this.x += this.speedX;
      this.y += this.speedY;

      // Pulse opacity
      this.currentOpacity = this.opacity + Math.sin(time * this.pulseSpeed + this.pulsePhase) * 0.15;

      // Mouse repulsion
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

      // Wrap around edges
      if (this.x < -10) this.x = width + 10;
      if (this.x > width + 10) this.x = -10;
      if (this.y < -10) this.y = height + 10;
      if (this.y > height + 10) this.y = -10;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.currentOpacity + ')';
      ctx.fill();
    }
  }

  function resize() {
    const section = canvas.parentElement;
    width = canvas.width = section.offsetWidth;
    height = canvas.height = section.offsetHeight;

    // Reinit particles on resize
    const newCount = getParticleCount();
    if (Math.abs(particles.length - newCount) > 10) {
      particles = [];
      for (let i = 0; i < newCount; i++) {
        particles.push(new Particle());
      }
    }
  }

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

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.update(time);
      p.draw();
    });

    drawLines();
    animationId = requestAnimationFrame(animate);
  }

  // Mouse tracking
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Touch support
  canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Initialize
  resize();
  for (let i = 0; i < CONFIG.particleCount; i++) {
    particles.push(new Particle());
  }

  // Start animation
  animate(0);

  // Handle resize with debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 250);
  });

  // Reduce animation when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animate(0);
    }
  });
}
