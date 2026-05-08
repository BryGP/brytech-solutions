/* ============================================================
   main.js — BryTech Solutions
   ------------------------------------------------------------
   Application entry point. Initializes all interactive modules
   on DOMContentLoaded: navigation, scroll-driven animations,
   typing effect, stat counters, card glow/tilt effects,
   custom cursor, smooth scrolling, particle canvas, and the
   contact form handler.

   (c) 2026 BryTech Solutions — bryanalejandroprog17@gmail.com
   ============================================================ */

import './style.css';
import { initParticles } from './particles.js';
import { initContactForm } from './contact.js';


/* ============================================================
   INITIALIZATION
   ============================================================ */

// Bootstraps every UI module once the DOM is fully parsed.
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


/* ============================================================
   NAVBAR
   ------------------------------------------------------------
   Handles three concerns:
   1. Scroll effect   — adds the "scrolled" class when the user
      scrolls past 50 px to apply a blurred, compact header.
   2. Mobile toggle   — opens/closes the off-canvas nav menu
      and locks body scroll while the menu is open.
   3. Active section  — uses IntersectionObserver to highlight
      the nav link that matches the currently visible section.
   ============================================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // --- Scroll effect ---
  // Adds a compact, blurred background once the user scrolls past 50 px.
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

  // --- Mobile toggle ---
  // Toggles the off-canvas menu and locks body scroll when open.
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Closes the mobile menu when any nav link is clicked.
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // --- Active link on scroll ---
  // Observes each section and toggles the "active" class on the
  // corresponding nav link when it enters the viewport.
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


/* ============================================================
   SCROLL ANIMATIONS (Intersection Observer)
   ------------------------------------------------------------
   Watches every element with the class "animate-on-scroll".
   When an element becomes 10 % visible (with a -50 px bottom
   margin), the "visible" class is added to trigger the CSS
   entrance transition. Elements remain visible once revealed.
   ============================================================ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}


/* ============================================================
   TYPING EFFECT
   ------------------------------------------------------------
   Animates the hero slogan character by character with a slight
   randomized delay (60-100 ms per character) to mimic natural
   typing. A blinking cursor is appended at the end.
   Requires: an element with id "hero-slogan" in the DOM.
   ============================================================ */
function initTypingEffect() {
  const sloganEl = document.getElementById('hero-slogan');
  if (!sloganEl) return;

  const text = '\u00AB Tu tech, a tu manera \u00BB';
  let index = 0;

  // Create blinking cursor element.
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  sloganEl.appendChild(cursor);

  // Recursively types one character at a time.
  function type() {
    if (index < text.length) {
      sloganEl.insertBefore(
        document.createTextNode(text[index]),
        cursor
      );
      index++;
      setTimeout(type, 60 + Math.random() * 40);
    } else {
      // Switch cursor to steady blink after typing completes.
      setTimeout(() => {
        cursor.style.animation = 'blink 0.8s steps(2) infinite';
      }, 500);
    }
  }

  // Begin typing after a short delay so the page settles first.
  setTimeout(type, 800);
}


/* ============================================================
   COUNTER ANIMATION
   ------------------------------------------------------------
   Animates numeric stat elements from 0 to their data-target
   value over 2 seconds using an ease-out-circ curve. Each
   counter is triggered once when 50 % visible and then
   unobserved to prevent re-triggering.
   Requires: elements with class "stat-number" and a
   "data-target" attribute containing the final number.
   ============================================================ */
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

// Drives a single counter from 0 to `target` over 2 seconds
// using requestAnimationFrame and an ease-out-circ easing.
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


/* ============================================================
   CARD GLOW (mouse follow)
   ------------------------------------------------------------
   Tracks the mouse position over each service card and writes
   the relative coordinates as CSS custom properties
   (--mouse-x, --mouse-y). These properties drive a radial
   gradient glow effect defined in style.css.
   ============================================================ */
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


/* ============================================================
   3D TILT EFFECT
   ------------------------------------------------------------
   Applies a subtle 3D perspective tilt to elements with the
   "data-tilt" attribute based on the mouse position relative
   to the element center. Maximum rotation is +/- 5 degrees.
   Disabled on mobile (viewport <= 768 px) to avoid conflicts
   with touch scrolling.
   ============================================================ */
function initCardTilt() {
  const cards = document.querySelectorAll('[data-tilt]');
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (isMobile) return;

  cards.forEach(card => {
    // Calculates rotation angles based on cursor distance from center.
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

    // Resets transform when cursor leaves the card.
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}


/* ============================================================
   CURSOR GLOW (desktop only)
   ------------------------------------------------------------
   Renders a large, soft radial gradient that smoothly follows
   the mouse cursor using linear interpolation (lerp factor
   0.08). Hidden on mobile devices and when the mouse leaves
   the document.
   Requires: an element with id "cursor-glow" in the DOM.
   ============================================================ */
function initCursorGlow() {
  const cursorGlow = document.getElementById('cursor-glow');
  if (!cursorGlow) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) return;

  let mouseX = 0, mouseY = 0;
  let currentX = 0, currentY = 0;

  // Updates target coordinates on every mouse move.
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorGlow.classList.add('active');
  });

  // Hides the glow when the mouse exits the viewport.
  document.addEventListener('mouseleave', () => {
    cursorGlow.classList.remove('active');
  });

  // Animation loop: smoothly interpolates the glow position
  // toward the actual mouse coordinates each frame.
  function animate() {
    currentX += (mouseX - currentX) * 0.08;
    currentY += (mouseY - currentY) * 0.08;

    cursorGlow.style.left = currentX + 'px';
    cursorGlow.style.top = currentY + 'px';

    requestAnimationFrame(animate);
  }

  animate();
}


/* ============================================================
   SMOOTH SCROLL
   ------------------------------------------------------------
   Intercepts clicks on all anchor links (href="#...") and
   scrolls smoothly to the target section, offsetting by the
   navbar height so content is not hidden behind the fixed
   header.
   ============================================================ */
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
