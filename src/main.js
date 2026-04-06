/* ============================================================
   BryTech Solutions — Main JavaScript
   Animations, scroll effects, navigation, and interactions
   ============================================================ */

import './style.css';
import { initParticles } from './particles.js';
import { initContactForm } from './contact.js';

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollAnimations();
  initTypingEffect();
  initCounterAnimation();
  initCardGlow();
  initCardTilt();
  initCursorGlow();
  initSmoothScroll();
  initParticles();
  initContactForm();
});

// ============================================================
// NAVBAR
// ============================================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Scroll effect
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }, { passive: true });

  // Mobile toggle
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Active link on scroll
  const sections = document.querySelectorAll('section[id]');
  const observerOptions = { rootMargin: '-20% 0px -70% 0px' };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, observerOptions);

  sections.forEach(section => sectionObserver.observe(section));
}

// ============================================================
// SCROLL ANIMATIONS (Intersection Observer)
// ============================================================
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Don't unobserve — keep observing for re-entry if desired
        // observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// ============================================================
// TYPING EFFECT
// ============================================================
function initTypingEffect() {
  const sloganEl = document.getElementById('hero-slogan');
  if (!sloganEl) return;

  const text = '« Tu tech, a tu manera »';
  let index = 0;

  // Create cursor
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  sloganEl.appendChild(cursor);

  function type() {
    if (index < text.length) {
      sloganEl.insertBefore(
        document.createTextNode(text[index]),
        cursor
      );
      index++;
      setTimeout(type, 60 + Math.random() * 40);
    } else {
      // Remove cursor after a delay
      setTimeout(() => {
        cursor.style.animation = 'blink 0.8s steps(2) infinite';
      }, 500);
    }
  }

  // Start typing after a short delay
  setTimeout(type, 800);
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function initCounterAnimation() {
  const counters = document.querySelectorAll('.stat-number[data-target]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-target'));
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el, target) {
  const duration = 2000;
  const start = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out circ
    const eased = Math.sqrt(1 - Math.pow(progress - 1, 2));
    const current = Math.round(eased * target);

    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ============================================================
// CARD GLOW (mouse follow)
// ============================================================
function initCardGlow() {
  const cards = document.querySelectorAll('.service-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', x + '%');
      card.style.setProperty('--mouse-y', y + '%');
    });
  });
}

// ============================================================
// 3D TILT EFFECT
// ============================================================
function initCardTilt() {
  const cards = document.querySelectorAll('[data-tilt]');
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (isMobile) return; // Skip tilt on mobile

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const rotateX = (mouseY / (rect.height / 2)) * -5;
      const rotateY = (mouseX / (rect.width / 2)) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ============================================================
// CURSOR GLOW (desktop only)
// ============================================================
function initCursorGlow() {
  const cursorGlow = document.getElementById('cursor-glow');
  if (!cursorGlow) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) return;

  let mouseX = 0, mouseY = 0;
  let currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorGlow.classList.add('active');
  });

  document.addEventListener('mouseleave', () => {
    cursorGlow.classList.remove('active');
  });

  function animate() {
    // Smooth follow
    currentX += (mouseX - currentX) * 0.08;
    currentY += (mouseY - currentY) * 0.08;

    cursorGlow.style.left = currentX + 'px';
    cursorGlow.style.top = currentY + 'px';

    requestAnimationFrame(animate);
  }

  animate();
}

// ============================================================
// SMOOTH SCROLL
// ============================================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        const navHeight = document.getElementById('navbar').offsetHeight;
        const targetPos = targetEl.offsetTop - navHeight;
        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  });
}
