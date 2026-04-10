/* ============================================================
   QUANTUM TECH HEALING CENTRE — SHARED JAVASCRIPT
   Scroll animations, navigation, FAQ accordion
   ============================================================ */

/* ── Scroll Animation (IntersectionObserver) ──────────────── */
(function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Once revealed, stop observing
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px'
    }
  );

  // Observe all animate-in and fade-up elements
  document.querySelectorAll('.animate-in, .fade-up, .title-mask').forEach((el) => {
    observer.observe(el);
  });
})();


/* ── Navigation: scroll shadow + active link ─────────────── */
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Add scrolled class
  const onScroll = () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Highlight active nav link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();


/* ── Mobile Menu ──────────────────────────────────────────── */
(function initMobileMenu() {
  const hamburger = document.querySelector('.nav-hamburger');
  const overlay   = document.querySelector('.nav-overlay');
  const body      = document.body;
  if (!hamburger || !overlay) return;

  const open = () => {
    hamburger.classList.add('open');
    overlay.style.display = 'flex';
    // Force reflow then add open class for transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('open');
      });
    });
    body.style.overflow = 'hidden';
  };

  const close = () => {
    hamburger.classList.remove('open');
    overlay.classList.remove('open');
    body.style.overflow = '';
    overlay.addEventListener('transitionend', () => {
      if (!overlay.classList.contains('open')) {
        overlay.style.display = '';
      }
    }, { once: true });
  };

  hamburger.addEventListener('click', () => {
    if (hamburger.classList.contains('open')) {
      close();
    } else {
      open();
    }
  });

  // Close on overlay link click
  overlay.querySelectorAll('.overlay-link').forEach((link) => {
    link.addEventListener('click', close);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger.classList.contains('open')) {
      close();
    }
  });
})();


/* ── FAQ Accordion ────────────────────────────────────────── */
(function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer   = item.querySelector('.faq-answer');
    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all others
      items.forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          const otherAnswer = other.querySelector('.faq-answer');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = null;
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });

    // Handle resize — update open item max-height
    const ro = new ResizeObserver(() => {
      if (item.classList.contains('open')) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
    ro.observe(answer);
  });
})();


/* ── Smooth hover: numbered list arrows ───────────────────── */
(function initNumberedList() {
  document.querySelectorAll('.numbered-item').forEach((item) => {
    const arrow = item.querySelector('.item-arrow');
    if (!arrow) return;
    item.addEventListener('mouseenter', () => { arrow.textContent = '→'; });
    item.addEventListener('mouseleave', () => { arrow.textContent = '↗'; });
  });
})();


/* ── Contact form basic validation ───────────────────────── */
(function initContactForm() {
  const forms = document.querySelectorAll('form[data-validate]');
  forms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      let valid = true;
      form.querySelectorAll('[required]').forEach((field) => {
        if (!field.value.trim()) {
          field.style.borderColor = '#c0392b';
          valid = false;
        } else {
          field.style.borderColor = '';
        }
      });
      if (!valid) {
        e.preventDefault();
        const firstInvalid = form.querySelector('[required]:invalid, [required][style*="c0392b"]');
        if (firstInvalid) firstInvalid.focus();
      }
    });
  });
})();


/* ── Stagger children with data-stagger attribute ─────────── */
(function initStagger() {
  document.querySelectorAll('[data-stagger]').forEach((parent) => {
    const delay = parseFloat(parent.dataset.stagger) || 0.1;
    Array.from(parent.children).forEach((child, i) => {
      child.style.transitionDelay = `${i * delay}s`;
    });
  });
})();


/* ── Randomise intro images on each page load ────────────── */
(function randomiseIntroImages() {
  const cols = document.querySelectorAll('#intro-scroll .intro-col');
  if (!cols.length) return;
  cols.forEach(col => {
    const imgs = Array.from(col.querySelectorAll('.intro-img'));
    const half = Math.floor(imgs.length / 2);
    const set  = imgs.slice(0, half);
    // Fisher-Yates shuffle
    for (let i = set.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [set[i], set[j]] = [set[j], set[i]];
    }
    col.innerHTML = '';
    set.forEach(img => col.appendChild(img));
    set.forEach(img => col.appendChild(img.cloneNode(true)));
  });
})();

/* ── Intro: auto-scroll columns, click/key to exit ──────── */
(function initIntroScroll() {
  const intro = document.getElementById('intro-scroll');
  if (!intro) return;

  document.body.style.overflow = 'hidden';

  function exit() {
    if (intro.classList.contains('is-exiting')) return;
    intro.classList.add('is-exiting');
    intro.addEventListener('transitionend', () => {
      intro.remove();
      document.body.style.overflow = '';
      document.querySelectorAll('.animate-in, .fade-up, .title-mask').forEach((el) => {
        if (!el.classList.contains('is-visible')) el.getBoundingClientRect();
      });
    }, { once: true });
  }

  intro.addEventListener('click', exit);
  intro.addEventListener('wheel',     (e) => { e.preventDefault(); exit(); }, { passive: false });
  intro.addEventListener('touchmove', (e) => { e.preventDefault(); exit(); }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'Space', 'PageDown', 'Enter'].includes(e.code)) {
      e.preventDefault(); exit();
    }
  });
})();
