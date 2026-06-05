/* ══════════════════════════════════════════════════
   TAP IN — main.js
   Navbar · Tabs · FAQ · Form · Scroll animations
   ══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── PAGE LOAD ANIMATION ─────────────────────────────────
     .hero-loading dispara las entradas. La clase puede quedar
     permanente: los keyframes de entrada animan propiedades
     individuales (`translate`, `scale`) en vez del `transform`
     shorthand, así no bloquean los transforms del hover. */
  document.body.classList.add('hero-loading');

  /* ── PERF · PAUSE OFF-SCREEN ANIMATIONS ────────────────────────
     La landing tiene >100 animaciones CSS infinitas (blooms, particles,
     conic sweeps, marquees, drifts). Corriendo 24/7 en TODAS las
     secciones genera repaints/composites continuos y mata el FPS al
     scrollear. Solución: marcamos cada section como `.is-offscreen`
     cuando sale del viewport y CSS pausa todas las animaciones que
     contiene. La sección visible mantiene su animación intacta. */
  (function pauseOffscreenAnimations() {
    const sections = document.querySelectorAll('body > section, .bg-light-stack > section, .bg-dark-stack > section');
    if (!sections.length || !('IntersectionObserver' in window)) return;
    sections.forEach((s) => s.classList.add('is-offscreen'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    }, {
      rootMargin: '120px 0px 120px 0px',  // empieza un poco antes para evitar pop-in visible
      threshold: 0
    });
    sections.forEach((s) => io.observe(s));
  })();

  /* ── MOBILE NAV TOGGLE ───────────────────────── */
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.querySelector('.nav-links');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      if (navLinks) navLinks.classList.toggle('mobile-open');
    });

    // close mobile nav on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        if (navLinks) navLinks.classList.remove('mobile-open');
      });
    });
  }

  /* ── CÓMO FUNCIONA · PERSONA SWITCHER + STEP CYCLE ─
     - Persona buttons swap the visible panel
     - Within each panel, steps auto-advance every STEP_MS ms
     - Active step highlights mockup screen via [data-screen]
     - Steps fill a vertical rail and persona progress bar
     - Hover on the stage pauses; manual click jumps to step
     - When the section is offscreen, cycling stops to save battery
  ──────────────────────────────────────────────── */
  const stage = document.querySelector('.como-stage');

  if (stage) {
    const STEP_MS = 3800;
    const STEP_TICK = 50; // progress refresh interval
    const personaBtns = stage.querySelectorAll('.como-persona');
    const panels = stage.querySelectorAll('.como-panel');

    let currentPersona = stage.dataset.active || 'colegio';
    let currentStep = 1;
    let elapsed = 0;
    let tickerId = null;
    let isPaused = false;
    let inView = false;

    const getPanel = (name) => stage.querySelector(`.como-panel[data-panel="${name}"]`);
    const getPersonaBtn = (name) => stage.querySelector(`.como-persona[data-persona="${name}"]`);

    const totalSteps = (panel) => panel.querySelectorAll('.step').length;

    const setProgress = (pct) => {
      const btn = getPersonaBtn(currentPersona);
      if (!btn) return;
      const fill = btn.querySelector('.persona-progress-fill');
      if (fill) fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };

    const setRailFill = (panel, total, step) => {
      const fill = panel.querySelector('.steps-rail-fill');
      if (!fill) return;
      const stepsTotal = total || 1;
      const pct = ((step - 1) / Math.max(1, stepsTotal - 1)) * 100;
      fill.style.height = `${pct}%`;
    };

    const setStep = (panel, step, { animate = true } = {}) => {
      const steps = panel.querySelectorAll('.step');
      const screens = panel.querySelectorAll('.screen');
      steps.forEach((s) => {
        const n = parseInt(s.dataset.step, 10);
        s.classList.toggle('active', n === step);
        s.classList.toggle('done',   n  <  step);
      });
      screens.forEach((sc) => {
        const n = parseInt(sc.dataset.screen, 10);
        sc.classList.toggle('active', n === step);
      });
      setRailFill(panel, steps.length, step);
      currentStep = step;
      elapsed = 0;
      if (!animate) {
        // No-op for now: step transitions are CSS-driven
      }
    };

    const tick = () => {
      if (isPaused || !inView) return;
      elapsed += STEP_TICK;
      const panel = getPanel(currentPersona);
      if (!panel) return;
      const total = totalSteps(panel);
      const stepProgress = Math.min(1, elapsed / STEP_MS);
      const overallPct = (((currentStep - 1) + stepProgress) / total) * 100;
      setProgress(overallPct);

      if (elapsed >= STEP_MS) {
        const next = currentStep >= total ? 1 : currentStep + 1;
        setStep(panel, next);
      }
    };

    const startTicker = () => {
      stopTicker();
      tickerId = setInterval(tick, STEP_TICK);
    };

    const stopTicker = () => {
      if (tickerId) {
        clearInterval(tickerId);
        tickerId = null;
      }
    };

    const setPersona = (name) => {
      if (name === currentPersona) return;
      currentPersona = name;
      stage.dataset.active = name;

      personaBtns.forEach((b) => {
        const isActive = b.dataset.persona === name;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', String(isActive));
        // Reset progress fills on inactive personas
        if (!isActive) {
          const f = b.querySelector('.persona-progress-fill');
          if (f) f.style.width = '0%';
        }
      });

      panels.forEach((p) => {
        const isActive = p.dataset.panel === name;
        p.classList.toggle('active', isActive);
      });

      const panel = getPanel(name);
      if (panel) setStep(panel, 1, { animate: false });
      setProgress(0);
    };

    /* Persona click */
    personaBtns.forEach((btn) => {
      btn.addEventListener('click', () => setPersona(btn.dataset.persona));
    });

    /* Step click — jump to that step within the active panel */
    stage.addEventListener('click', (e) => {
      const stepEl = e.target.closest('.step');
      if (!stepEl) return;
      const panel = stepEl.closest('.como-panel');
      if (!panel || !panel.classList.contains('active')) return;
      const n = parseInt(stepEl.dataset.step, 10);
      if (Number.isFinite(n)) setStep(panel, n);
    });

    /* Pause only when the tab is hidden (saves cycles in the background) */
    document.addEventListener('visibilitychange', () => {
      isPaused = document.hidden;
    });

    /* Only run while in view */
    const stageObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting;
      });
    }, { threshold: 0.15 });
    stageObs.observe(stage);

    /* Initialize */
    const initialPanel = getPanel(currentPersona);
    if (initialPanel) setStep(initialPanel, 1, { animate: false });
    startTicker();
  }

  /* ── LO QUE GANAS · STAGE CON CASCADA + DETAIL PANEL ────────────
     Las ondas concéntricas del wordmark Tap In emiten en CSS loop;
     desde JS sincronizamos un pulso por orb según su anillo (ring 1
     más cercano, 3 más lejano). Hover/focus sobre una orb fija el
     panel de detalle abajo. Click en el wordmark dispara un burst. */
  const ganStage = document.getElementById('gananciasStage');

  if (ganStage) {
    const reduceMotionGan = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orbs = Array.from(ganStage.querySelectorAll('.gan-orb'));
    const core = ganStage.querySelector('.gan-core');
    const wordmark = document.getElementById('gananciasCore');
    const detailTag = document.getElementById('ganDetailTag');
    const detailBody = document.getElementById('ganDetailBody');

    /* Copy largo + tag para el panel — emparejado por data-orb */
    const detailMap = [
      { tag: 'pagos',       body: 'Todos los pagos viajan digitales: casino, transporte, eventos. Sin transferencias sueltas, sin sobres.' },
      { tag: 'backoffice',  body: 'Concesionarios y transportistas reciben su reporte armado. Adiós al cierre mensual con planillas.' },
      { tag: 'apoderados',  body: 'Cuando el hijo almuerza, sube al bus o entra a un evento, el apoderado lo sabe al instante.' },
      { tag: 'dirección',   body: 'Consumos, ingresos y proveedores en una sola pantalla, en tiempo real. Sin abrir tres sistemas.' },
      { tag: 'proveedores', body: 'Casino y transporte integrados al sistema. Para ellos no es más difícil — es más prolijo.' },
      { tag: 'contrato',    body: 'Un acuerdo cubre toda la plataforma. Sin negociar con tres proveedores tech distintos.' },
    ];
    const defaultDetail = detailMap[0];

    /* Pulso reactivo — clase .pulse durante ~600ms */
    const pulseOrb = (orb) => {
      orb.classList.add('pulse');
      window.setTimeout(() => orb.classList.remove('pulse'), 620);
    };

    /* Loop de cascada — sincronizado con la onda CSS (5.4s ciclo).
       ring 1 pulsa a t=1.0s, ring 2 a t=2.0s, ring 3 a t=3.0s.
       Se reinicia cada ciclo. */
    let cascadeInterval = null;
    let cascadeTimeouts = [];
    const startCascade = () => {
      if (reduceMotionGan) return;
      const fire = () => {
        cascadeTimeouts.forEach(clearTimeout);
        cascadeTimeouts = [];
        orbs.forEach((orb) => {
          const ring = parseInt(orb.dataset.ring || '1', 10);
          const delay = ring * 1000; // 1s / 2s / 3s
          cascadeTimeouts.push(window.setTimeout(() => pulseOrb(orb), delay));
        });
      };
      fire();
      cascadeInterval = window.setInterval(fire, 5400);
    };
    const stopCascade = () => {
      if (cascadeInterval) {
        clearInterval(cascadeInterval);
        cascadeInterval = null;
      }
      cascadeTimeouts.forEach(clearTimeout);
      cascadeTimeouts = [];
    };

    /* Detail panel update */
    const setDetail = (idx) => {
      const d = detailMap[idx] || defaultDetail;
      if (detailTag) detailTag.textContent = d.tag;
      if (detailBody) detailBody.textContent = d.body;
    };
    const setActive = (orb) => {
      orbs.forEach((o) => o.classList.toggle('is-active', o === orb));
      ganStage.classList.toggle('has-active', !!orb);
      const idx = orb ? parseInt(orb.dataset.orb || '0', 10) : 0;
      setDetail(idx);
    };

    /* Hover/focus interaction */
    orbs.forEach((orb) => {
      orb.addEventListener('mouseenter', () => setActive(orb));
      orb.addEventListener('focus', () => setActive(orb));
      orb.addEventListener('mouseleave', (e) => {
        // Si todavía hay un foco activo, no limpiar
        if (document.activeElement === orb) return;
        setActive(null);
      });
      orb.addEventListener('blur', () => {
        // limpiar solo si no hay hover activo
        if (!orb.matches(':hover')) setActive(null);
      });
    });

    /* Click en wordmark — burst + cascada inmediata */
    if (wordmark && core) {
      wordmark.addEventListener('click', () => {
        core.classList.add('is-bursting');
        window.setTimeout(() => core.classList.remove('is-bursting'), 1200);
        // Pulso inmediato encadenado de todas las orbs
        if (!reduceMotionGan) {
          orbs.forEach((orb, i) => {
            const ring = parseInt(orb.dataset.ring || '1', 10);
            const delay = ring * 220 + i * 30;
            window.setTimeout(() => pulseOrb(orb), delay);
          });
        }
      });
    }

    /* Entrance — IntersectionObserver con stagger; arranca la cascada */
    const orbObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        orbs.forEach((orb, i) => {
          const delay = reduceMotionGan ? 0 : i * 80;
          window.setTimeout(() => orb.classList.add('visible'), delay);
        });
        // Arrancar cascada un poco después de que entren
        window.setTimeout(startCascade, reduceMotionGan ? 0 : 700);
        orbObserver.unobserve(entry.target);
      });
    }, { threshold: 0.25 });

    orbObserver.observe(ganStage);

    /* Pausa la cascada cuando la stage no se ve (ahorra ciclos) */
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!cascadeInterval && !reduceMotionGan) startCascade();
        } else {
          stopCascade();
        }
      });
    }, { threshold: 0 });
    visibilityObserver.observe(ganStage);
  }

  /* ── VS TABLE TOGGLE ─────────────────────────── */
  const vsToggle = document.getElementById('vsToggle');
  const vsTable  = document.getElementById('vsTable');

  if (vsToggle && vsTable) {
    const vsLabel = vsToggle.querySelector('.vs-toggle-label');

    // Pointer-aware glow: track cursor for the radial sheen on hover
    vsToggle.addEventListener('pointermove', (e) => {
      const r = vsToggle.getBoundingClientRect();
      vsToggle.style.setProperty('--mx', `${e.clientX - r.left}px`);
      vsToggle.style.setProperty('--my', `${e.clientY - r.top}px`);
    });

    vsTable.addEventListener('animationend', (e) => {
      if (e.animationName === 'vsTableClose') {
        vsTable.classList.remove('closing');
      }
    });

    vsToggle.addEventListener('click', () => {
      const isOpen = vsTable.classList.contains('open');
      if (isOpen) {
        vsTable.classList.remove('open');
        vsTable.classList.add('closing');
      } else {
        vsTable.classList.remove('closing');
        vsTable.classList.add('open');
      }
      vsToggle.classList.toggle('open', !isOpen);
      vsToggle.setAttribute('aria-expanded', String(!isOpen));
      if (vsLabel) vsLabel.textContent = !isOpen ? 'Ocultar comparación' : 'Ver comparación';
    });
  }

  /* ── FAQ — two-column with morphing highlight ──
     UX corregido: el hover NO mueve la pill (antes movía el highlight pero
     el panel seguía mostrando la pregunta anterior, rompiendo la mental
     model). Ahora la pill marca SIEMPRE la pregunta cuyo panel está visible.
     Hover sólo cambia el color del texto y la flecha (state visual ligero).
     Click cambia tanto la pill como el panel. Navegación por teclado
     completa (↑↓ Home End) según patrón WAI-ARIA tabs. */
  const faqLayout = document.querySelector('.faq-layout');
  if (faqLayout) {
    const questions = Array.from(faqLayout.querySelectorAll('.faq-q'));
    const panels    = Array.from(faqLayout.querySelectorAll('.faq-panel'));
    const highlight = faqLayout.querySelector('.faq-highlight');
    const list      = faqLayout.querySelector('.faq-questions');
    let activeIdx   = questions.findIndex(q => q.classList.contains('is-active'));
    if (activeIdx < 0) activeIdx = 0;

    // Detecta si estamos en layout de columna apilada (mobile) — en ese caso
    // la pill se desactiva y cada question funciona como acordeón visual
    // por sí misma (CSS aplica el estilo activo directamente al .faq-q).
    const isStacked = () => window.matchMedia('(max-width: 900px)').matches;

    // Posiciona la pill bajo la pregunta activa. translate3d para promoción
    // a GPU — el deslizado se mantiene fluido incluso con el box-shadow
    // halo adjunto. En mobile la pill se oculta vía CSS.
    const moveHighlight = (target) => {
      if (!target || isStacked()) {
        highlight.style.opacity = '0';
        return;
      }
      const t = target.getBoundingClientRect();
      const p = list.getBoundingClientRect();
      highlight.style.transform = `translate3d(0, ${t.top - p.top}px, 0)`;
      highlight.style.height    = t.height + 'px';
      highlight.style.opacity   = '';
    };

    const setActive = (idx, { focus = false } = {}) => {
      if (idx === activeIdx) {
        if (focus) questions[idx].focus();
        return;
      }
      activeIdx = idx;
      questions.forEach((q, i) => {
        const active = i === idx;
        q.classList.toggle('is-active', active);
        q.setAttribute('aria-selected', active ? 'true' : 'false');
        // Roving tabindex — sólo el activo es alcanzable por Tab; el resto
        // se navega con flechas (patrón WAI-ARIA tabs).
        q.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      moveHighlight(questions[idx]);
      // Re-disparar la animación shine (sólo en click/keyboard, NO en hover).
      highlight.classList.remove('is-moving');
      void highlight.offsetWidth; // reflow — anima limpio
      highlight.classList.add('is-moving');
      if (focus) questions[idx].focus();
    };

    questions.forEach((q, idx) => {
      q.addEventListener('click', () => setActive(idx));
      // Navegación por teclado — patrón WAI-ARIA tabs vertical
      q.addEventListener('keydown', (e) => {
        let nextIdx = null;
        switch (e.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            nextIdx = (idx + 1) % questions.length;
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            nextIdx = (idx - 1 + questions.length) % questions.length;
            break;
          case 'Home':
            nextIdx = 0;
            break;
          case 'End':
            nextIdx = questions.length - 1;
            break;
          default:
            return;
        }
        e.preventDefault();
        setActive(nextIdx, { focus: true });
      });
    });

    // Posición inicial — esperá un frame a que termine el layout y luego
    // mostrá la pill (evita un salto desde 0,0).
    requestAnimationFrame(() => {
      moveHighlight(questions[activeIdx]);
      requestAnimationFrame(() => highlight.classList.add('is-ready'));
    });

    // Re-medir en resize. Si pasamos a stacked, la pill se oculta sola.
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => moveHighlight(questions[activeIdx]), 80);
    });
  }

  /* ── CUSTOM SELECT (Cargo dropdown) ──────────── */
  document.querySelectorAll('.custom-select').forEach(cs => {
    const trigger    = cs.querySelector('.custom-select-trigger');
    const valueEl    = cs.querySelector('.custom-select-value');
    const list       = cs.querySelector('.custom-select-options');
    const options    = Array.from(cs.querySelectorAll('.custom-select-option'));
    const hidden     = cs.querySelector('input[type="hidden"]');
    const placeholder = cs.dataset.placeholder || valueEl.textContent;
    let activeIndex  = -1;

    const setActive = (i) => {
      activeIndex = i;
      options.forEach((o, idx) => o.classList.toggle('is-active', idx === i));
      if (i >= 0) options[i].scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      cs.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      const sel = options.findIndex(o => o.classList.contains('is-selected'));
      setActive(sel >= 0 ? sel : 0);
    };

    const close = () => {
      cs.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      setActive(-1);
    };

    const select = (opt) => {
      const value = opt.dataset.value;
      hidden.value = value;
      valueEl.textContent = value;
      trigger.classList.add('has-value');
      cs.classList.remove('has-error');
      options.forEach(o => o.classList.remove('is-selected'));
      opt.classList.add('is-selected');
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
      close();
      trigger.focus();
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      cs.classList.contains('is-open') ? close() : open();
    });

    options.forEach((opt, idx) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        select(opt);
      });
      opt.addEventListener('mouseenter', () => setActive(idx));
    });

    trigger.addEventListener('keydown', (e) => {
      const isOpen = cs.classList.contains('is-open');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) { open(); return; }
        setActive((activeIndex + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) { open(); return; }
        setActive((activeIndex - 1 + options.length) % options.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (isOpen && activeIndex >= 0) {
          e.preventDefault();
          select(options[activeIndex]);
        } else if (!isOpen) {
          e.preventDefault();
          open();
        }
      } else if (e.key === 'Escape') {
        if (isOpen) { e.preventDefault(); close(); }
      } else if (e.key === 'Tab') {
        if (isOpen) close();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (cs.classList.contains('is-open') && !cs.contains(e.target)) close();
    });

    // Reset method exposed for the form-success → reset flow
    cs._reset = () => {
      hidden.value = '';
      valueEl.textContent = placeholder;
      trigger.classList.remove('has-value');
      cs.classList.remove('has-error', 'is-open');
      options.forEach(o => o.classList.remove('is-selected', 'is-active'));
    };
  });

  /* ── FORM SUBMIT (Formspree AJAX) ───────────── */
  const demoForm    = document.getElementById('demoForm');
  const formSuccess = document.getElementById('formSuccess');
  const formError   = document.getElementById('formError');
  const cargoSelect = document.getElementById('cargoSelect');

  if (demoForm && formSuccess) {
    demoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = demoForm.querySelector('.btn-submit');

      // Native validation for inputs (we declared novalidate on the form)
      let firstInvalid = null;
      demoForm.querySelectorAll('input[required]').forEach(input => {
        if (input.type === 'hidden') return;
        if (!input.checkValidity()) {
          if (!firstInvalid) firstInvalid = input;
        }
      });

      // Custom validation for the Cargo dropdown
      const cargoHidden = document.getElementById('cargo');
      if (!cargoHidden.value) {
        cargoSelect && cargoSelect.classList.add('has-error');
        if (!firstInvalid) firstInvalid = cargoSelect.querySelector('.custom-select-trigger');
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (formError) formError.classList.remove('visible');
      btn.classList.add('is-loading');
      btn.disabled = true;

      try {
        const response = await fetch(demoForm.action, {
          method: 'POST',
          body: new FormData(demoForm),
          headers: { 'Accept': 'application/json' }
        });

        // Formspree: HTTP 200 (+ body {ok:true}) cuando el envío fue aceptado.
        // En error devuelve 4xx (típico 422) con { errors: [{message,...}] } o
        // { error: "..." }. Nos basamos en response.ok; si falla, intentamos
        // extraer el mensaje de Formspree para el log.
        if (!response.ok) {
          let detail = 'Request failed: ' + response.status;
          try {
            const data = await response.json();
            if (data && Array.isArray(data.errors) && data.errors.length) {
              detail = data.errors.map(er => er.message).join(' · ');
            } else if (data && data.error) {
              detail = data.error;
            }
          } catch (_) { /* respuesta sin JSON */ }
          throw new Error('Formspree rejected: ' + detail);
        }

        demoForm.style.display = 'none';
        formSuccess.classList.add('visible');
      } catch (err) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        if (formError) formError.classList.add('visible');
        console.error('Form submission failed:', err);
      }
    });

    // Clear cargo error as soon as user picks a value
    const cargoHidden = document.getElementById('cargo');
    if (cargoHidden) {
      cargoHidden.addEventListener('change', () => {
        cargoSelect && cargoSelect.classList.remove('has-error');
      });
    }
  }

  /* ── PROBLEMA SECTION ANIMATIONS ─────────────── */
  const problemaSection = document.querySelector('.section-problema');
  if (problemaSection) {
    const problemaEls = problemaSection.querySelectorAll(
      '.section-kicker, .problema-title, .problema-sub, .problema-card'
    );

    let problemaFired = false;
    const fireProblema = () => {
      if (problemaFired) return;
      problemaFired = true;
      problemaEls.forEach(el => el.classList.add('anim-in'));
      setTimeout(() => {
        const card = problemaSection.querySelector('.problema-card');
        if (card) card.classList.add('anim-done');
      }, 1900);
    };

    const problemaObs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        fireProblema();
        problemaObs.disconnect();
      }
    }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
    problemaObs.observe(problemaSection);

    const checkProblemaVisible = () => {
      if (problemaFired) return;
      const r = problemaSection.getBoundingClientRect();
      if (r.top < innerHeight + 200 && r.bottom > -200) {
        fireProblema();
      }
    };
    window.addEventListener('scroll', checkProblemaVisible, { passive: true });
    window.addEventListener('hashchange', () => requestAnimationFrame(checkProblemaVisible));
    document.querySelectorAll('a[href^="#"]').forEach(a =>
      a.addEventListener('click', () => setTimeout(checkProblemaVisible, 400))
    );
    setTimeout(checkProblemaVisible, 200);
    setTimeout(checkProblemaVisible, 800);
    setTimeout(checkProblemaVisible, 1600);
    // Hard fallback — fire unconditionally after 3 seconds.
    setTimeout(fireProblema, 3000);
  }

  /* ── PRODUCTOS SECTION ANIMATIONS ────────────── */
  const productosSection = document.querySelector('.section-productos');
  if (productosSection) {
    const headerEls = productosSection.querySelectorAll('.section-kicker, .section-title');
    const pills     = productosSection.querySelectorAll('.pill');

    headerEls.forEach(el => el.classList.add('prod-hidden'));
    pills.forEach(el => el.classList.add('prod-hidden'));

    // Single source of truth for "fire entrance" — guarded so it can
    // never run twice no matter how many code paths trigger it. */
    let prodFired = false;
    const fireProd = () => {
      if (prodFired) return;
      prodFired = true;
      headerEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('prod-in'), i * 120);
      });
      const pillDelays = [300, 480, 640];
      pills.forEach((el, i) => {
        setTimeout(() => el.classList.add('prod-in'), pillDelays[i] || 300 + i * 180);
      });
    };

    const prodObs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        fireProd();
        prodObs.disconnect();
      }
    }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
    prodObs.observe(productosSection);

    const checkProdVisible = () => {
      if (prodFired) return;
      const r = productosSection.getBoundingClientRect();
      if (r.top < innerHeight + 200 && r.bottom > -200) {
        fireProd();
      }
    };
    window.addEventListener('scroll', checkProdVisible, { passive: true });
    window.addEventListener('hashchange', () => requestAnimationFrame(checkProdVisible));
    document.querySelectorAll('a[href^="#"]').forEach(a =>
      a.addEventListener('click', () => setTimeout(checkProdVisible, 400))
    );
    setTimeout(checkProdVisible, 200);
    setTimeout(checkProdVisible, 800);
    setTimeout(checkProdVisible, 1600);
    // Hard fallback — fire unconditionally after 3 seconds, no matter
    // what the user did with their navigation. The animation may not
    // play, but the content is GUARANTEED visible within 3s of load. */
    setTimeout(fireProd, 3000);
  }

  /* ── STATS LIVE BOARD — count-up + estaciones interactivas ───
     Anima los dígitos de cada estación al entrar en viewport. Auto-cycle
     entre estaciones cada 6s (pausable: el cycle se detiene al primer click
     manual del usuario, asumiendo que ya lo está manejando). */
  const statsBoard = document.querySelector('.stats-board');
  if (statsBoard) {
    const stations = Array.from(statsBoard.querySelectorAll('.sb-stat'));
    let activeIdx  = stations.findIndex(s => s.classList.contains('is-active'));
    if (activeIdx < 0) activeIdx = 0;
    let userInteracted = false;
    let cycleTimer;

    const setActiveStation = (idx) => {
      if (idx === activeIdx) return;
      activeIdx = idx;
      stations.forEach((s, i) => {
        const active = i === idx;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-selected', active ? 'true' : 'false');
        s.setAttribute('tabindex', active ? '0' : '-1');
      });
    };

    const startCycle = () => {
      if (userInteracted) return;
      clearInterval(cycleTimer);
      cycleTimer = setInterval(() => {
        if (userInteracted) { clearInterval(cycleTimer); return; }
        setActiveStation((activeIdx + 1) % stations.length);
      }, 6000);
    };

    stations.forEach((s, i) => {
      s.addEventListener('click', () => {
        userInteracted = true;
        clearInterval(cycleTimer);
        setActiveStation(i);
      });
      s.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % stations.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + stations.length) % stations.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End')  next = stations.length - 1;
        if (next === null) return;
        e.preventDefault();
        userInteracted = true;
        clearInterval(cycleTimer);
        setActiveStation(next);
        stations[next].focus();
      });
    });

    // Empezar el cycle cuando la board entra en viewport (no antes — para
    // que el usuario vea el efecto activo en la 1ra estación al llegar)
    const cycleObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          startCycle();
        } else {
          clearInterval(cycleTimer);
        }
      });
    }, { threshold: 0.4 });
    cycleObs.observe(statsBoard);
  }

  /* Count-up animation — apunta a [data-stat-order] dentro de stats-board
     (o cualquier ancestro). Anima .stat-num-value sin destruir el sufijo. */
  const colegiosStats = document.querySelectorAll('.stats-board [data-stat-order]');
  if (colegiosStats.length) {
    const reduceMotionStat = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animateStat = (numEl) => {
      const target   = parseFloat(numEl.dataset.countTo);
      if (!Number.isFinite(target)) return;
      const decimals = parseInt(numEl.dataset.countDecimals || '0', 10);
      // Animar sólo .stat-num-value para no destruir hermanos como
      // .sb-num-prefix ("≤") o .stat-num-suffix ("días").
      const valueEl  = numEl.querySelector('.stat-num-value') || numEl;
      const format   = (n) => n.toFixed(decimals);
      if (reduceMotionStat) { valueEl.textContent = format(target); return; }
      const duration = 1300;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        valueEl.textContent = format(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      valueEl.textContent = format(0);
      requestAnimationFrame(tick);
    };

    const statObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const order = parseInt(card.dataset.statOrder || '0', 10);
        const delay = reduceMotionStat ? 0 : order * 110;
        setTimeout(() => {
          card.classList.add('stat-revealed');
          const num = card.querySelector('[data-count-to]');
          if (num) animateStat(num);
        }, delay);
        statObs.unobserve(card);
      });
    }, { threshold: 0.3 });

    colegiosStats.forEach((s) => statObs.observe(s));
  }

  /* ── PARTNERS MARQUEE — RAF-driven loop con velocidad variable ──
     Reemplaza la animación CSS para evitar el "jump" que ocurría al
     cambiar `animation-duration` en hover (el browser reinterpreta el
     progreso de la animación basándose en la nueva duración, lo que
     causa un salto visual). Acá controlamos la posición manualmente y
     simplemente cambiamos la velocidad — sin reset de progreso. */
  const partnersMarquee = document.querySelector('.partners-marquee');
  const partnersTrack   = partnersMarquee && partnersMarquee.querySelector('.partners-track');
  if (partnersMarquee && partnersTrack) {
    const reduceMotionPM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotionPM) {
      // Velocidades en pixels por segundo. La transición entre normal y
      // slow se interpola suavemente con un easing exponencial.
      const SPEED_NORMAL = 60;
      const SPEED_SLOW   = 18;
      let speed       = SPEED_NORMAL;
      let targetSpeed = SPEED_NORMAL;
      let posX        = 0;
      let lastTime    = performance.now();
      let halfWidth   = 0;
      let paused      = false;

      const measure = () => {
        // El track contiene 2 copias seamless. Width total / 2 = ciclo.
        halfWidth = partnersTrack.scrollWidth / 2;
      };
      measure();
      // Re-medir si las imágenes cargan tarde (no afecta la posición)
      window.addEventListener('load', measure, { once: true });
      window.addEventListener('resize', measure);

      const tick = (now) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        // Easing suave hacia targetSpeed para evitar cambios bruscos.
        speed += (targetSpeed - speed) * Math.min(1, dt * 4);
        if (!paused) {
          posX -= speed * dt;
          // Loop: cuando recorrimos halfWidth, reseteamos a 0 manteniendo
          // continuidad visual (la 2da copia ocupa exactamente el lugar de
          // la 1ra al cerrar el ciclo).
          if (-posX >= halfWidth) posX += halfWidth;
          partnersTrack.style.transform = `translate3d(${posX}px, 0, 0)`;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      partnersMarquee.addEventListener('mouseenter', () => { targetSpeed = SPEED_SLOW; });
      partnersMarquee.addEventListener('mouseleave', () => { targetSpeed = SPEED_NORMAL; });

      // Pausar cuando la sección está fuera de viewport — ahorra CPU.
      // IMPORTANTE: paused arranca en false (definido arriba) — el IO sólo
      // PAUSA explícitamente cuando hay confirmación de off-screen, jamás
      // bloquea el inicio del loop si el observer tarda en disparar.
      if ('IntersectionObserver' in window) {
        const visObs = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            // Sólo pausar si el observer confirma off-screen con threshold
            // suficiente. Reset lastTime al despausar para evitar saltos
            // por delta-time acumulado.
            if (e.isIntersecting) {
              if (paused) { lastTime = performance.now(); }
              paused = false;
            } else {
              paused = true;
            }
          });
        }, { threshold: 0 });
        visObs.observe(partnersMarquee);
      }
    }
  }

  /* ── MOMENTS CARRUSEL DESLIZANTE · Bloque 2 (21/05/2026) ───────────
     Wrap-around real: clonamos las últimas 2 cards al inicio y las
     primeras 2 al final, así nunca hay "gap" cuando el carrusel está
     en un extremo. Cuando el centrado cae en un clon, snap sin
     transition al equivalente real.

     Comportamiento:
     - 3 cards visibles, la del centro destacada (opacity 1 / scale 1)
     - Auto-rotación 7s; pause-on-hover; userInterrupted persistente
     - Click en card lateral → SOLO la centra (NO abre "Ver más")
     - Click en card centrada o en su botón "Ver más" → toggle del panel
     - Flechas prev/next + contador "01 / 04" */
  const carousel = document.querySelector('.moments--carousel');
  const viewport = carousel ? carousel.querySelector('.moments-viewport') : null;
  const track    = carousel ? carousel.querySelector('.moments-track') : null;
  const realMoments = track ? Array.from(track.querySelectorAll('.moment[data-moment]')) : [];
  if (carousel && viewport && track && realMoments.length) {
    const N = realMoments.length;
    const isMobile = () => window.matchMedia('(max-width: 1279px)').matches;

    // Wrap-around: clonar 2 al inicio (las últimas reales) y 2 al final (las primeras reales)
    // Solo en desktop; en mobile el scroll-snap horizontal nativo cubre el caso.
    if (!isMobile() && N >= 2) {
      // Insertar al inicio en orden [N-2, N-1] (queremos que la card visible más a la izquierda sea N-1, la siguiente N-2 — pero el "natural" para sentir continuidad es que justo antes del idx 0 esté idx N-1, y antes idx N-2)
      // DOM final deseado: [clone(N-2), clone(N-1), real-0, real-1, ..., real-(N-1), clone(0), clone(1)]
      const prepClone = (m) => {
        const c = m.cloneNode(true);
        c.dataset.clone = 'true';
        c.removeAttribute('id');
        c.setAttribute('aria-hidden', 'true');
        c.tabIndex = -1;
        c.classList.remove('is-centered', 'is-open'); // no heredar estados del original
        return c;
      };
      const c1 = prepClone(realMoments[N - 2]);
      const c2 = prepClone(realMoments[N - 1]);
      track.insertBefore(c2, track.firstChild);
      track.insertBefore(c1, c2);
      const c3 = prepClone(realMoments[0]);
      const c4 = prepClone(realMoments[1]);
      track.appendChild(c3);
      track.appendChild(c4);
    }

    // Lista DOM completa (incluye clones). En mobile = solo reales.
    const allMoments = Array.from(track.querySelectorAll('.moment'));
    const REAL_START = isMobile() ? 0 : 2;                  // primer real en el DOM
    const REAL_END   = REAL_START + N - 1;                  // último real en el DOM
    const TRANSITION_MS = 600;                              // matchea CSS .moments-track transition

    // ─── GHOST SHADOW LAYER (Propuesta 3 · 25/05/2026 v8) ───────────────
    // Creamos una capa de "fantasmas" detrás del viewport con un ghost por
    // cada card real. Los ghosts dibujan la shadow afuera del overflow:clip
    // del viewport, así nunca se recortan en los costados. Las cards reales
    // siguen adentro del viewport con la imagen y el contenido (la shadow
    // se removió del .moment vía CSS).
    let ghosts = [];
    if (!isMobile()) {
      const shadowLayer = document.createElement('div');
      shadowLayer.className = 'moments-shadow-layer';
      shadowLayer.setAttribute('aria-hidden', 'true');
      const shadowTrack = document.createElement('div');
      shadowTrack.className = 'moments-shadow-track';
      shadowLayer.appendChild(shadowTrack);
      carousel.insertBefore(shadowLayer, viewport);

      ghosts = allMoments.map((realCard) => {
        const ghost = document.createElement('div');
        ghost.className = 'moment-ghost';
        if (realCard.dataset.clone === 'true') ghost.dataset.clone = 'true';
        shadowTrack.appendChild(ghost);
        return ghost;
      });

      // Hover sync: cuando el user hover sobre una card real, marcamos el
      // ghost correspondiente para que muestre la shadow de hover.
      allMoments.forEach((mom, i) => {
        if (mom.dataset.clone === 'true') return;
        const g = ghosts[i];
        if (!g) return;
        mom.addEventListener('mouseenter', () => g.classList.add('is-hovered'));
        mom.addEventListener('mouseleave', () => g.classList.remove('is-hovered'));
      });
    }

    let centeredIdx = REAL_START;
    let autoTimer = null;
    let hoverPaused = false;
    let snapping = false; // true mientras hacemos el salto sin transition
    // Snooze (22/05/2026): antes había un userInterrupted permanente que apagaba
    // la auto-rotación de por vida tras cualquier click. Eso dejaba el carrusel
    // "muerto" después de la primera interacción. Ahora, al interactuar pausamos
    // y reactivamos auto tras 10s de inactividad — el usuario controla el ritmo
    // pero el carrusel sigue siendo dinámico.
    let snoozeTimer = null;
    const SNOOZE_MS = 10000;
    // Snap timer (22/05/2026): handle del setTimeout pendiente del wrap-around.
    // Si el user interactúa durante el snap, lo cancelamos para no overscribir
    // su click con el snap atrasado (bug: card 4 → click card 1 → carrusel
    // quedaba colgado porque el snap reseteaba el state al clon equivalente).
    let snapTimerId = null;

    const setTrackTransition = (on) => {
      // Cuando off, congelamos transitions de ambos tracks + cards + ghosts
      // vía clase en el carrusel (.is-snapping). Cuando on, removemos clase
      // para que las transitions vuelvan a CSS.
      carousel.classList.toggle('is-snapping', !on);
    };

    const positionTrack = () => {
      const card = allMoments[centeredIdx];
      if (!card) return;
      const vw = viewport.offsetWidth;
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const targetX = (vw / 2) - (cardLeft + cardWidth / 2);
      // --track-x va en el CARRUSEL para que tanto .moments-track como
      // .moments-shadow-track lo hereden y se muevan al unísono.
      carousel.style.setProperty('--track-x', `${targetX}px`);
    };

    const logicalIdx = () => {
      const i = centeredIdx - REAL_START;
      return ((i % N) + N) % N;
    };

    const updateCounter = () => {
      const counterEl = carousel.querySelector('.moments-counter-num');
      if (counterEl) counterEl.textContent = String(logicalIdx() + 1).padStart(2, '0');
    };

    const closeAllExtras = () => {
      allMoments.forEach((m, i) => {
        if (!m.classList.contains('is-open')) return;
        m.classList.remove('is-open');
        if (ghosts[i]) ghosts[i].classList.remove('is-open');
        const t = m.querySelector('.moment-toggle');
        const l = m.querySelector('.moment-toggle-text');
        if (t) t.setAttribute('aria-expanded', 'false');
        if (l) l.textContent = l.dataset.textOpen || 'Ver más';
      });
    };

    const applyCenteredClass = () => {
      allMoments.forEach((m, i) => {
        const centered = i === centeredIdx;
        // is-visible: el ghost está dentro de los 3 cards visibles en el
        // viewport (centered ±1). Sólo estos muestran su shadow — evita que
        // los ghosts de cards off-screen bleedeen sombras hacia adentro. */
        const inViewport = Math.abs(i - centeredIdx) <= 1;
        m.classList.toggle('is-centered', centered);
        if (ghosts[i]) {
          ghosts[i].classList.toggle('is-centered', centered);
          ghosts[i].classList.toggle('is-visible', inViewport);
        }
      });
    };

    const centerCard = (idx, { openExtra = false, animate = true } = {}) => {
      // Cancelar snap pendiente: si veníamos de un wrap-around y el user
      // interactuó antes de que dispare, su click manda. (22/05/2026 bug fix)
      if (snapTimerId !== null) {
        clearTimeout(snapTimerId);
        snapTimerId = null;
        setTrackTransition(true);
        snapping = false;
      }

      centeredIdx = idx;
      closeAllExtras();
      applyCenteredClass();

      if (openExtra) {
        const center = allMoments[centeredIdx];
        center.classList.add('is-open');
        if (ghosts[centeredIdx]) ghosts[centeredIdx].classList.add('is-open');
        const btn = center.querySelector('.moment-toggle');
        const lab = center.querySelector('.moment-toggle-text');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        if (lab) lab.textContent = lab.dataset.textClose || 'Cerrar';
      }

      if (isMobile()) {
        updateCounter();
        return;
      }

      setTrackTransition(animate);
      positionTrack();
      updateCounter();

      // Wrap-around: si centramos un clon, programamos el salto al real.
      //
      // Fix pestañeo wrap-around v4 (31/05/2026):
      // 1. Usar transitionend del track en vez de setTimeout — sincroniza
      //    EXACTAMENTE con el fin real del slide CSS (evita race conditions
      //    donde snap dispara antes/después del paint final).
      // 2. Usar clase .is-snapping-deep que aplica transition:none !important
      //    + animation:none a todos los descendientes — más confiable que
      //    iterar y setear style.transition='none' en cada elemento.
      // 3. Fallback timeout en caso de que transitionend no dispare.
      if (animate && (centeredIdx > REAL_END || centeredIdx < REAL_START)) {
        snapping = true;
        let snapFired = false;

        const doSnap = () => {
          if (snapFired) return;
          snapFired = true;
          track.removeEventListener('transitionend', onTransitionEnd);
          if (snapTimerId !== null) { clearTimeout(snapTimerId); snapTimerId = null; }

          // Si el user ya movió a un real entre slide y snap, abortamos.
          if (centeredIdx >= REAL_START && centeredIdx <= REAL_END) {
            snapping = false;
            return;
          }

          const realIdx = centeredIdx > REAL_END
            ? centeredIdx - N   // clon final → real al inicio
            : centeredIdx + N;  // clon inicial → real al final

          // Silencio total: una sola clase mata transitions y animations
          // de todos los descendientes del carrusel durante el swap.
          carousel.classList.add('is-snapping-deep');
          setTrackTransition(false);

          centeredIdx = realIdx;
          applyCenteredClass();
          positionTrack();
          updateCounter();

          // Force reflow + computed style read → garantiza que el browser
          // commitee el nuevo estado SIN transición antes de continuar.
          void track.offsetWidth;
          // eslint-disable-next-line no-unused-expressions
          window.getComputedStyle(track).transform;

          // Doble rAF: el browser pinta el snap state (frame 1) y luego
          // restauramos transitions (frame 2). Sin transitions activas
          // durante el paint del snap, nada puede pestañear.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTrackTransition(true);
              carousel.classList.remove('is-snapping-deep');
              snapping = false;
            });
          });
        };

        const onTransitionEnd = (e) => {
          // Solo el transform del track (no otras props ni descendientes).
          if (e.target !== track || e.propertyName !== 'transform') return;
          doSnap();
        };

        track.addEventListener('transitionend', onTransitionEnd);
        // Fallback en caso de que transitionend no dispare (interrumpido, etc.)
        snapTimerId = setTimeout(doSnap, TRANSITION_MS + 80);
      }
    };

    const advance = () => { if (!snapping) centerCard(centeredIdx + 1); };
    const retreat = () => { if (!snapping) centerCard(centeredIdx - 1); };

    const startAuto = () => {
      if (hoverPaused) return;
      if (snoozeTimer) return; // respetar el snooze post-interacción
      // No reanudamos auto mientras el panel "Ver más" está abierto — el user
      // está leyendo y no queremos que se mueva la card debajo suyo.
      if (allMoments.some(m => m.classList.contains('is-open'))) return;
      stopAuto();
      autoTimer = setInterval(advance, 7000);
    };
    const stopAuto = () => {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    };
    // Snooze: pausa auto-rotación durante SNOOZE_MS, luego reanuda. Sustituye
    // al userInterrupted permanente. Cada interacción reinicia el snooze, así
    // que mientras el user explore activamente, no le movemos las cards.
    const snoozeAuto = () => {
      stopAuto();
      if (snoozeTimer) clearTimeout(snoozeTimer);
      snoozeTimer = setTimeout(() => {
        snoozeTimer = null;
        startAuto();
      }, SNOOZE_MS);
    };

    // Click en card:
    // - clone visible (ej. card 4 viéndose a la izquierda de card 1): centramos
    //   el clone para que el slide vaya por el camino corto, después el
    //   wrap-around lo snapea al real silenciosamente. ANTES los clones
    //   retornaban early → user no podía navegar 1↔4 con clicks. (25/05/2026)
    // - lateral real: SOLO centra, no abre extra
    // - centrada real: toggle del panel "Ver más"
    allMoments.forEach((mom, i) => {
      mom.addEventListener('click', (e) => {
        // R2.1 · En mobile el tap lo maneja la delegación del loop (centrar
        // card lateral / abrir "Ver más" sólo con su botón). Esta lógica de
        // desktop pelearía con el scroll nativo y causaba parpadeo.
        if (isMobile()) return;
        if (e.target.closest('.moment-toggle')) return;
        // Si un swipe acaba de pasar, no procesar como click (evita doble acción).
        if (swipeJustHappened) { swipeJustHappened = false; return; }
        snoozeAuto();

        // Clones: siempre navegación (la wrap-around hace el snap al real)
        if (mom.dataset.clone === 'true') {
          centerCard(i, { openExtra: false });
          return;
        }

        if (mom.classList.contains('is-centered')) {
          const wasOpen = mom.classList.contains('is-open');
          if (wasOpen) closeAllExtras();
          else centerCard(i, { openExtra: true });
        } else {
          centerCard(i, { openExtra: false });
        }
      });
      // Keyboard nav solo en reales (los clones no son focuseables)
      if (mom.dataset.clone !== 'true') {
        mom.setAttribute('tabindex', '0');
        mom.setAttribute('role', 'button');
        mom.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            snoozeAuto();
            if (mom.classList.contains('is-centered')) {
              const wasOpen = mom.classList.contains('is-open');
              if (wasOpen) closeAllExtras();
              else centerCard(i, { openExtra: true });
            } else {
              centerCard(i, { openExtra: false });
            }
          }
        });
      }
    });

    // ── SWIPE / TRACKPAD SUPPORT (25/05/2026) ──────────────────────────────
    // Pointer events cubren touch + mouse drag. wheel con deltaX cubre el
    // swipe horizontal del trackpad (gesto de dos dedos hacia los lados).
    let pointerStart = null;
    let swipeJustHappened = false;
    const SWIPE_DIST = 50;          // píxeles mínimos para considerar swipe
    const SWIPE_RATIO = 1.4;        // dx debe ser > dy * ratio (gesto claramente horizontal)

    viewport.addEventListener('pointerdown', (e) => {
      if (isMobile()) return; // mobile usa scroll nativo (evita pelea + parpadeo)
      // ignorar botones secundarios del mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerStart = { x: e.clientX, y: e.clientY };
    });
    const finishPointer = (e) => {
      if (isMobile()) return;
      if (!pointerStart) return;
      const dx = e.clientX - pointerStart.x;
      const dy = e.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) < SWIPE_DIST) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return; // gesto vertical o diagonal
      swipeJustHappened = true;
      // Reset del flag tras el próximo click (por si no llega click event)
      setTimeout(() => { swipeJustHappened = false; }, 350);
      snoozeAuto();
      if (dx > 0) retreat();   // swipe a la derecha → card anterior
      else advance();          // swipe a la izquierda → card siguiente
    };
    viewport.addEventListener('pointerup', finishPointer);
    viewport.addEventListener('pointercancel', () => { pointerStart = null; });

    // Trackpad horizontal scroll
    let wheelCooldown = false;
    viewport.addEventListener('wheel', (e) => {
      if (isMobile()) return; // mobile usa scroll nativo
      // Solo respondemos a scroll predominantemente HORIZONTAL — el scroll
      // vertical del trackpad sigue funcionando normal (scrollea la página).
      if (Math.abs(e.deltaX) < 30) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.4) return;
      e.preventDefault();
      if (wheelCooldown) return;
      wheelCooldown = true;
      snoozeAuto();
      if (e.deltaX > 0) advance();
      else retreat();
      // Cooldown evita disparar 10 cards de una sola pasada del dedo
      setTimeout(() => { wheelCooldown = false; }, 450);
    }, { passive: false });

    // Pause-on-hover
    carousel.addEventListener('mouseenter', () => { hoverPaused = true; stopAuto(); });
    carousel.addEventListener('mouseleave', () => { hoverPaused = false; startAuto(); });

    // "Ver más" toggle explícito (también lo dispara el click en la card centrada arriba)
    track.querySelectorAll('.moment-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (isMobile()) return; // mobile: lo maneja la delegación del loop
        e.stopPropagation();
        const mom = btn.closest('.moment');
        if (!mom || mom.dataset.clone === 'true') return;
        const i = allMoments.indexOf(mom);
        if (i < 0) return;
        snoozeAuto();
        const wasOpen = mom.classList.contains('is-open') && mom.classList.contains('is-centered');
        if (wasOpen) closeAllExtras();
        else centerCard(i, { openExtra: true });
      });
    });

    // Flechas prev/next
    const prevBtn = carousel.querySelector('.moments-arrow--prev');
    const nextBtn = carousel.querySelector('.moments-arrow--next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        snoozeAuto();
        retreat();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        snoozeAuto();
        advance();
      });
    }

    // Keyboard nav: ←/→ cuando el foco está dentro del carrusel
    carousel.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      snoozeAuto();
      if (e.key === 'ArrowLeft') retreat();
      else advance();
    });

    // Esc cierra cualquier panel abierto
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      closeAllExtras();
    });

    // IO: pausa fuera del viewport
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) startAuto();
          else stopAuto();
        });
      }, { threshold: 0.3 });
      io.observe(carousel);
    } else {
      startAuto();
    }

    // Recalcular centrado en resize (sin animar)
    window.addEventListener('resize', () => centerCard(centeredIdx, { animate: false }));

    // ── MOBILE · LOOP INFINITO sobre scroll-snap nativo (R2 · gate 900px) ──
    // Desktop usa su propio loop (clones 2+2 + transform). Acá, SOLO en mobile,
    // clonamos UNA vez el set completo de cards reales y reposicionamos
    // scrollLeft al acercarnos a un extremo (sin animación) para que el scroll
    // nativo se sienta infinito en ambas direcciones. El contador refleja la
    // card real centrada (vía data-loop-index, también en los clones).
    let mobileLoop = null;
    const setupMobileLoop = () => {
      if (mobileLoop) return;
      if (!('IntersectionObserver' in window)) return;
      // Reales = cards con data-moment que NO son clones (ni de desktop ni del loop).
      const reals = Array.from(
        track.querySelectorAll('.moment[data-moment]:not([data-clone]):not([data-loop-clone])')
      );
      if (reals.length < 2) return;
      reals.forEach((m, i) => { m.dataset.loopIndex = String(i); });

      // R2.3 · TRES sets: [clonesA][reales][clonesB]. Empezamos centrados en el
      // set del medio (reales) → hay un set COMPLETO de buffer a cada lado, así
      // las transiciones de borde (4→1 y 1→4) son scroll normal (sin salto) y
      // el reposicionamiento del loop ocurre en el medio del set, en reposo,
      // imperceptible. (Antes, con 2 sets, el salto caía justo en el 4→1.)
      const mkClone = (m, i) => {
        const c = m.cloneNode(true);
        c.dataset.loopClone = 'true';
        c.dataset.loopIndex = String(i);
        c.removeAttribute('id');
        c.setAttribute('aria-hidden', 'true');
        c.tabIndex = -1;
        c.classList.remove('is-centered', 'is-open', 'm-active');
        return c;
      };
      const clonesA = reals.map(mkClone);   // prepend
      const clonesB = reals.map(mkClone);   // append
      clonesA.forEach((c) => track.insertBefore(c, reals[0]));
      clonesB.forEach((c) => track.appendChild(c));
      const clones = clonesA.concat(clonesB);
      const allCards = clonesA.concat(reals, clonesB);
      const counterEl = carousel.querySelector('.moments-counter-num');

      let setWidth = 0;
      const measure = () => { setWidth = reals[0].offsetLeft - clonesA[0].offsetLeft; };
      const centerEl = (el) => {
        viewport.scrollLeft = el.offsetLeft + el.offsetWidth / 2 - viewport.clientWidth / 2;
      };

      // Card centrada = la más cercana al centro del viewport (geométrico, más
      // fiable que un IO con thresholds y consultable de forma síncrona).
      let centeredEl = null;
      const findCentered = () => {
        const vpC = viewport.scrollLeft + viewport.clientWidth / 2;
        let best = null, bestD = Infinity;
        allCards.forEach((c) => {
          const d = Math.abs((c.offsetLeft + c.offsetWidth / 2) - vpC);
          if (d < bestD) { bestD = d; best = c; }
        });
        return best;
      };
      const markActive = (el) => {
        if (!el || el === centeredEl) return;
        centeredEl = el;
        allCards.forEach((c) => c.classList.toggle('m-active', c === el));
        if (counterEl) {
          const li = parseInt(el.dataset.loopIndex, 10) || 0;
          counterEl.textContent = String(li + 1).padStart(2, '0');
        }
      };

      // Init: medir, centrar en el set del medio (real-0) y marcar activa.
      measure();
      centerEl(reals[0]);
      markActive(findCentered());

      // ── Loop infinito SIN PARPADEO ──────────────────────────────────────
      // El salto ±setWidth (clones idénticos) sólo se hace cuando el scroll
      // quedó QUIETO — nunca a mitad de gesto, que era lo que pestañeaba. Al
      // saltar, congelamos transitions un frame y fijamos la card activa al
      // instante → cero flash.
      const reposition = () => {
        if (setWidth <= 0) { measure(); if (setWidth <= 0) return; }
        const sl = viewport.scrollLeft;
        let delta = 0;
        // Banda segura [0.5, 2.5]·setWidth (set del medio + ½ set de holgura a
        // cada lado). Saltar ±setWidth mantiene la misma card centrada.
        if (sl < setWidth * 0.5) delta = setWidth;
        else if (sl > setWidth * 2.5) delta = -setWidth;
        if (!delta) return;
        carousel.classList.add('m-no-anim');     // transition:none en cards
        viewport.scrollLeft = sl + delta;
        markActive(findCentered());              // activa correcta al instante
        void viewport.offsetWidth;               // commit del salto sin animar
        requestAnimationFrame(() => carousel.classList.remove('m-no-anim'));
      };
      // Reposición del loop SÓLO al quedar quieto (debounce). Ya NO hacemos
      // findCentered por frame (leía layout en cada frame → thrashing/lag en
      // iPad y la card activa no alcanzaba a actualizarse).
      let idleTimer = null;
      const onScroll = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(reposition, 90);
      };
      viewport.addEventListener('scroll', onScroll, { passive: true });
      const hasScrollEnd = ('onscrollend' in viewport);
      if (hasScrollEnd) viewport.addEventListener('scrollend', reposition);

      // Card ACTIVA vía IntersectionObserver: el navegador calcula qué card
      // está más centrada sin que leamos layout por frame → eficiente (sin
      // lag) y confiable (la activa cambia bien al deslizar).
      const ioRatios = new Map();
      const activeIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => ioRatios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
        let best = null, bestR = 0;
        ioRatios.forEach((r, el) => { if (r > bestR) { bestR = r; best = el; } });
        if (best) markActive(best);
      }, { root: viewport, threshold: [0.25, 0.5, 0.75, 0.95] });
      allCards.forEach((c) => activeIO.observe(c));

      // Tap (delegación · cubre reales y clones):
      //  · botón "Ver más" → abre/cierra SOLO esa card (panel .moment-extra)
      //  · card lateral (no centrada) → la centra (no abre "Ver más")
      //  · card centrada, fuera del botón → no hace nada
      const syncLabel = (card, open) => {
        const b = card.querySelector('.moment-toggle');
        const l = card.querySelector('.moment-toggle-text');
        if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (l) l.textContent = open ? (l.dataset.textClose || 'Cerrar') : (l.dataset.textOpen || 'Ver más');
      };
      const onTap = (e) => {
        const toggleBtn = e.target.closest('.moment-toggle');
        if (toggleBtn) {
          e.preventDefault();
          const card = toggleBtn.closest('.moment');
          if (!card) return;
          const open = !card.classList.contains('is-open');
          track.querySelectorAll('.moment.is-open').forEach((m) => {
            if (m !== card) { m.classList.remove('is-open'); syncLabel(m, false); }
          });
          card.classList.toggle('is-open', open);
          syncLabel(card, open);
          return;
        }
        const card = e.target.closest('.moment');
        if (!card || card === centeredEl) return;   // centrada → no abre nada
        e.preventDefault();                          // lateral → centrar
        card.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      };
      track.addEventListener('click', onTap);

      mobileLoop = {
        remeasure: measure,
        teardown() {
          viewport.removeEventListener('scroll', onScroll);
          if (hasScrollEnd) viewport.removeEventListener('scrollend', reposition);
          track.removeEventListener('click', onTap);
          activeIO.disconnect();
          clearTimeout(idleTimer);
          carousel.classList.remove('m-no-anim');
          clones.forEach((c) => c.remove());
          reals.forEach((m) => { delete m.dataset.loopIndex; });
          allCards.forEach((c) => c.classList.remove('m-active'));
          mobileLoop = null;
        },
      };
    };

    // Resize: si cruzamos el breakpoint, limpiamos el loop mobile para no
    // contaminar desktop (y lo re-armamos si volvemos a mobile).
    window.addEventListener('resize', () => {
      if (isMobile()) {
        if (!mobileLoop) requestAnimationFrame(setupMobileLoop);
        else mobileLoop.remeasure();
      } else if (mobileLoop) {
        mobileLoop.teardown();
      }
    });

    // Estado inicial: la primera card REAL (idx REAL_START), sin abrir extra, sin animar
    requestAnimationFrame(() => {
      centerCard(REAL_START, { openExtra: false, animate: false });
      // Loop mobile: tras el layout inicial (dos frames para medir bien).
      if (isMobile()) requestAnimationFrame(setupMobileLoop);
    });
  }

  /* ── TESTIMONIO CARRUSEL — flechas + dots ─────────
     Track horizontal con N tarjetas, 2 visibles por viewport en desktop.
     Las flechas avanzan/retroceden por 1 tarjeta; los dots saltan a un
     índice específico. Disabled state en flechas cuando se llega al borde.
     No hay auto-rotate — el usuario controla el ritmo. */
  const testiCarousel = document.querySelector('.testi-carousel');
  if (testiCarousel) {
    const track  = testiCarousel.querySelector('.testi-track');
    const cards  = testiCarousel.querySelectorAll('.testi-card');
    const dots   = testiCarousel.querySelectorAll('.testi-dot');
    const prevBtn = testiCarousel.querySelector('.testi-arrow--prev');
    const nextBtn = testiCarousel.querySelector('.testi-arrow--next');

    // visibleCount depende del breakpoint — recomputado en resize
    const getVisibleCount = () => (window.innerWidth <= 900 ? 1 : 2);

    let activeIdx = 0;

    const maxIdx = () => Math.max(0, cards.length - getVisibleCount());

    const update = () => {
      activeIdx = Math.min(activeIdx, maxIdx());
      const visible = getVisibleCount();
      const cardWidth = cards[0].getBoundingClientRect().width;
      // Lee el gap del CSS para mantener JS y CSS sincronizados — antes
      // estaba hardcoded en 22px y rompía cuando lo bumpeamos a 50px.
      const gap = parseFloat(getComputedStyle(track).gap) || 22;
      const offset = activeIdx * (cardWidth + gap);
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;

      dots.forEach((d, i) => {
        const isActive = i === activeIdx;
        d.classList.toggle('is-active', isActive);
        d.setAttribute('aria-selected', String(isActive));
      });

      // Marca cards visibles vs off-screen para que CSS pueda ocultar las
      // pills de módulo de las que NO se ven. Las cards en el rango
      // [activeIdx, activeIdx + visible) son las visibles.
      cards.forEach((c, i) => {
        const isVisible = i >= activeIdx && i < activeIdx + visible;
        c.classList.toggle('is-card-visible', isVisible);
      });

      if (prevBtn) prevBtn.classList.toggle('is-disabled', activeIdx === 0);
      if (nextBtn) nextBtn.classList.toggle('is-disabled', activeIdx >= maxIdx());
    };

    // Auto-rotación: cada ~8s avanza un slot. Si el usuario interactúa
    // (hover sobre el carrusel o click en flechas/dots), se pausa para no
    // pelearse con la lectura. Volver a salir del hover reactiva.
    const AUTO_MS = 8000;
    let autoTimer = null;
    let userInteracted = false;
    const stopAuto = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };
    const startAuto = () => {
      if (userInteracted || autoTimer) return;
      autoTimer = setInterval(() => {
        // Loop: al llegar al último, vuelve al inicio.
        activeIdx = (activeIdx + 1 > maxIdx()) ? 0 : activeIdx + 1;
        update();
      }, AUTO_MS);
    };

    if (prevBtn) prevBtn.addEventListener('click', () => {
      userInteracted = true; stopAuto();
      if (activeIdx > 0) { activeIdx -= 1; update(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      userInteracted = true; stopAuto();
      if (activeIdx < maxIdx()) { activeIdx += 1; update(); }
    });
    dots.forEach((d, i) => {
      d.addEventListener('click', () => {
        userInteracted = true; stopAuto();
        activeIdx = i; update();
      });
    });

    // Pausar al hover (entry intent de lectura) y reanudar al salir, solo
    // si el usuario no había interactuado manualmente todavía.
    testiCarousel.addEventListener('mouseenter', stopAuto);
    testiCarousel.addEventListener('mouseleave', () => {
      if (!userInteracted) startAuto();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(update, 80);
    });

    update();
    startAuto();
  }

  /* ── SCROLL ANIMATIONS (IntersectionObserver) ──
     Reveal `.fade-up` elements as they enter the viewport. Uses an
     IO + scroll-listener fallback so rapid anchor-link navigation
     (which can outrun the IO threshold check) never leaves an
     element stuck in its hidden state. */
  /* Entrance reveal — selectores universales. Cualquier .section-header,
     .pill, .como-stage, .ganancias-scene/.gan-detail, .moment, .stats-board,
     .testi-carousel, .faq-layout, .contacto-inner, .vs-table-wrap entrará
     con un fade-up al aparecer en viewport. Compositor-only (transform +
     opacity) — sin layout thrashing. */
  const fadeEls = document.querySelectorAll([
    '.section-header',
    '.pill',
    '.como-stage',
    '.ganancias-scene',
    '.gan-detail',
    '.moment',
    '.stats-board',
    '.testi-carousel',
    '.faq-layout',
    '.contacto-inner',
    '.vs-toggle-row',
    '.partners'
  ].join(','));

  // Excluye las .moment dentro del carrusel — el carrusel deslizante usa
  // su propia transición opacity/transform y .fade-up.visible la sobrescribe.
  fadeEls.forEach(el => {
    if (el.classList.contains('moment') && el.closest('.moments-track')) return;
    el.classList.add('fade-up');
  });

  const reveal = (el) => {
    if (el.classList.contains('visible')) return;
    el.classList.add('visible');
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });

  fadeEls.forEach(el => observer.observe(el));

  /* Fallback estricto — solo revela elementos que YA están dentro del
     viewport real (no buffer artificial). Evita revelar de golpe todo
     el contenido off-screen al cargar. Corre después de 600ms y luego
     en hashchange / nav-click para cubrir casos de hash navigation. */
  const checkFadeVisible = () => {
    fadeEls.forEach(el => {
      if (el.classList.contains('visible')) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        reveal(el);
        observer.unobserve(el);
      }
    });
  };
  window.addEventListener('hashchange', () => requestAnimationFrame(checkFadeVisible));
  document.querySelectorAll('a[href^="#"]').forEach(a =>
    a.addEventListener('click', () => setTimeout(checkFadeVisible, 600))
  );
  setTimeout(checkFadeVisible, 600);

  /* ── SMOOTH SCROLL FOR ANCHOR LINKS ───────────
     Sections can tune landing via `scroll-margin-top` in CSS.
     Sections marked with `data-scroll="center"` are centered
     vertically in the viewport instead. */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      // Bare "#" or empty hash → no scroll target; let browser handle (or no-op)
      if (!href || href === '#') return;
      let target = null;
      try { target = document.querySelector(href); } catch (_) { /* invalid selector */ }
      if (!target) return;
      e.preventDefault();

      // Use getBoundingClientRect (visual position) instead of offsetTop chains:
      // some layout configurations (overflow:hidden wrappers, animated pseudos,
      // browser layout quirks) cause offsetTop to disagree with the rendered
      // position, which lands the scroll wrong. Visual-rect math always matches
      // what the user actually sees.
      const visualTop = (el) => el.getBoundingClientRect().top + window.scrollY;
      const visualBottom = (el) => el.getBoundingClientRect().bottom + window.scrollY;

      const navEl = document.querySelector('.navbar');
      const navBottom = navEl ? navEl.getBoundingClientRect().bottom : 80;
      const vh = window.innerHeight;

      let desiredTop;

      if (target.dataset.scroll === 'center') {
        // Center the section's *content* (header → final element) inside the
        // visible area below the fixed navbar.
        const first = target.querySelector('.section-header') || target;
        // querySelector returns first match in DOM order, so list selectors
        // separately to honour priority (.vs-note sits *after* the pills).
        /* Helper: ignora elementos display:none / sin tamaño (testi-carousel
           hoy está oculto y arruinaba el centrado de Comunidad — devolvía
           rect 0,0,0,0 y el cálculo de contentMid quedaba bogus). */
        const pickVisible = (...sels) => {
          for (const s of sels) {
            const el = target.querySelector(s);
            if (el && el.getBoundingClientRect().height > 0) return el;
          }
          return null;
        };
        const last = pickVisible(
          '.vs-table.open',
          '.vs-note',
          '.product-pills',
          '.como-nota',
          '.diferenciador',
          /* Colegios: usamos .moments-viewport (las cards) como cierre del
             contenido a centrar — el .moments-counter queda intencionalmente
             excluido, así al click en "Comunidad" cae fuera del fold y
             aparece sólo cuando el user scrollea. */
          '.moments-viewport',
          '.testi-carousel'
        ) || first;
        const contentTop    = visualTop(first);
        const contentBottom = visualBottom(last);
        const contentMid    = (contentTop + contentBottom) / 2;

        const visibleMid = navBottom + (vh - navBottom) / 2;
        desiredTop = contentMid - visibleMid;

        // Safety clamps so kicker AND last element stay visible even if the
        // section is taller than the visible area.
        const safeTopGap = 24;
        const safeBottomGap = 24;
        const maxTop = contentTop - navBottom - safeTopGap;        // largest scroll that still shows kicker
        const minTop = contentBottom - vh + safeBottomGap;          // smallest scroll that still shows last element

        if (maxTop >= minTop) {
          desiredTop = Math.min(maxTop, Math.max(minTop, desiredTop));
        } else {
          // Content taller than viewport — prioritise top so kicker is visible
          desiredTop = maxTop;
        }
      } else {
        // Simple branch — align section top with bottom of fixed navbar,
        // honouring the section's CSS scroll-margin-top if larger.
        const cs = getComputedStyle(target);
        const scrollMarginTop = parseFloat(cs.scrollMarginTop) || 0;
        const offset = Math.max(navBottom, scrollMarginTop);
        desiredTop = visualTop(target) - offset;
      }

      desiredTop = Math.max(0, desiredTop);

      /* Pausa todas las animaciones CSS durante el scroll para mantener
         60fps. Re-activa cuando el scroll termina (detectado por
         scrollend o un timeout de seguridad). */
      document.body.classList.add('is-scrolling');
      clearTimeout(window.__navScrollEndTimer);
      const distance = Math.abs(window.scrollY - desiredTop);
      // Estimación: ~600ms para distancias chicas, hasta ~1200ms para grandes
      const fallbackMs = Math.min(1300, 500 + distance * 0.35);
      window.__navScrollEndTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
      }, fallbackMs);

      window.scrollTo({ top: desiredTop, behavior: 'smooth' });
    });
  });

  /* Native scrollend (Chromium 114+, Safari 17+) — limpia el flag antes
     que el timeout fallback si está soportado. */
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', () => {
      if (document.body.classList.contains('is-scrolling')) {
        document.body.classList.remove('is-scrolling');
        clearTimeout(window.__navScrollEndTimer);
      }
    }, { passive: true });
  }

  /* ── HERO STACK ENTRY ANIMATION ──────────────── */
  const heroStack = document.querySelector('.hero-stack');

  if (heroStack) {
    // Delay the stack animation to sync with the page load sequence
    const triggerStack = () => {
      setTimeout(() => {
        heroStack.classList.add('animate-in');
      }, 1000); // synced with slower hero content stagger
    };

    const stackObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          triggerStack();
          stackObserver.unobserve(entry.target);

          // Start subtle float animations after entry completes
          setTimeout(() => {
            const layerMid   = heroStack.querySelector('.stack-layer--mid');
            const layerFront = heroStack.querySelector('.stack-layer--front');
            let tick = 0;

            const float = () => {
              tick += 0.008;
              if (layerMid)   layerMid.style.transform   = `translateY(${Math.sin(tick) * 5}px)`;
              if (layerFront) layerFront.style.transform  = `translateY(${Math.sin(tick + 1.2) * 7}px)`;
              requestAnimationFrame(float);
            };
            float();
          }, 2000);
        }
      });
    }, { threshold: 0.15 });

    stackObserver.observe(heroStack);
  }

  /* ── ACTIVE NAV LINK ON SCROLL ───────────────── */
  const navLinksAll = document.querySelectorAll('.nav-links a');

  // mapa de secciones → id del nav link que les corresponde
  // secciones sin link propio heredan del grupo más cercano
  const sectionNavMap = {
    'inicio':      null,
    'problema':    null,
    'productos':   'productos',
    'como-funciona': 'como-funciona',
    'beneficios':  'como-funciona',
    'colegios':    'colegios',
    'objeciones':  null,
    'contacto':    null,
  };

  // Secciones cacheadas una sola vez (son estáticas) y ya en orden inverso.
  // Antes se re-consultaba el DOM en cada evento de scroll.
  const sectionsReversed = Array.from(document.querySelectorAll('section[id]')).reverse();

  const setActiveLink = () => {
    const navbarOffset = window.innerHeight / 2;
    let activeNavId = null;

    // recorre de abajo hacia arriba y encuentra la primera sección
    // cuyo top ya pasó el navbar
    for (const section of sectionsReversed) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= navbarOffset) {
        const id = section.getAttribute('id');
        activeNavId = sectionNavMap[id] ?? null;
        break;
      }
    }

    navLinksAll.forEach(a => {
      const href = a.getAttribute('href').replace('#', '');
      if (href === activeNavId) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  };

  // rAF-throttle: agrupa múltiples eventos de scroll en un único cómputo por
  // frame (resultado visual idéntico, menos reflows forzados).
  let activeLinkTicking = false;
  const onActiveLinkScroll = () => {
    if (activeLinkTicking) return;
    activeLinkTicking = true;
    requestAnimationFrame(() => {
      setActiveLink();
      activeLinkTicking = false;
    });
  };

  window.addEventListener('scroll', onActiveLinkScroll, { passive: true });
  setActiveLink();

  // ─────────────────────────────────────────────────
  // ARQUITECTURA V2 · navbar dropdown + productos tabs + FAQ
  // ─────────────────────────────────────────────────

  // ── Navbar adaptive theme: cuando la navbar está sobre una sección
  //    marcada con data-nav-theme="dark", añade .is-dark al navbar para
  //    invertir colores (mismo funcionamiento, paleta oscura).
  (function navbarAdaptiveTheme() {
    const navbar = document.getElementById('navbar');
    if (!navbar || !('IntersectionObserver' in window)) return;
    const darkSections = document.querySelectorAll('[data-nav-theme="dark"]');
    if (!darkSections.length) return;

    // Navbar está a top:20 + height 52 = ocupa ~72px superiores.
    // Detectamos qué dark-section está "tocando" esa franja.
    const navOccupiedTop = 0;
    const navOccupiedBottom = 90;
    const darkSet = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) darkSet.add(entry.target);
        else darkSet.delete(entry.target);
      });
      navbar.classList.toggle('is-dark', darkSet.size > 0);
    }, {
      // rootMargin: cropea el viewport para que sólo la franja del navbar
      // se considere "en intersección". Top:0 / bottom:-(vh-90) deja
      // visible sólo los primeros 90px del viewport.
      rootMargin: `0px 0px -${Math.max(0, window.innerHeight - navOccupiedBottom)}px 0px`,
      threshold: 0,
    });
    darkSections.forEach((s) => io.observe(s));

    // Recalcular si cambia el viewport (responsive)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        io.disconnect();
        const io2 = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) darkSet.add(entry.target);
            else darkSet.delete(entry.target);
          });
          navbar.classList.toggle('is-dark', darkSet.size > 0);
        }, {
          rootMargin: `0px 0px -${Math.max(0, window.innerHeight - navOccupiedBottom)}px 0px`,
          threshold: 0,
        });
        darkSections.forEach((s) => io2.observe(s));
      }, 200);
    });
  })();

  // ── Navbar Soluciones dropdown — sólo abre por CLICK.
  // En hover sólo se anima la flecha del chevron (vía CSS) para indicar
  // que hay que clickear para desplegar.
  const ddTrigger = document.getElementById('navSolucionesTrigger');
  const ddParent = ddTrigger ? ddTrigger.closest('.nav-li--has-dd') : null;
  if (ddTrigger && ddParent) {
    ddTrigger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = ddParent.classList.toggle('is-open');
      ddTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // Cierra al tocar/clickear en cualquier parte que NO sea el botón trigger.
    // Antes era `!ddParent.contains(...)`: al estar desplegado el acordeón
    // ocupa casi toda la pantalla y es parte del <li>, así que el tap casi
    // siempre caía "dentro" y no cerraba. Ahora cierra salvo sobre el trigger
    // (que tiene su propio handler con stopPropagation). Tocar un sub-ítem
    // cierra y navega. En desktop sigue abriendo/cerrando por click igual.
    const closeDd = e => {
      if (!ddTrigger.contains(e.target)) {
        ddParent.classList.remove('is-open');
        ddTrigger.setAttribute('aria-expanded', 'false');
      }
    };
    document.addEventListener('click', closeDd);
    // iOS Safari: el `click` sobre zonas no interactivas a veces no dispara;
    // `touchstart` (passive) garantiza el cierre. Solo cierra, nunca abre.
    document.addEventListener('touchstart', closeDd, { passive: true });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        ddParent.classList.remove('is-open');
        ddTrigger.setAttribute('aria-expanded', 'false');
        ddTrigger.focus();
      }
    });
  }

  // ── Navbar "Ingresar" dropdown · idéntico a Soluciones (20/05/2026 3ra pasada)
  //    Usa las mismas clases que Soluciones (.nav-li--has-dd + .nav-link--toggle
  //    + .nav-dropdown + .nav-dd-item) y la misma mecánica de click toggle.
  const ingTrigger = document.getElementById('navIngresarTrigger');
  const ingParent = ingTrigger ? ingTrigger.closest('.nav-li--has-dd') : null;
  if (ingTrigger && ingParent) {
    ingTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = ingParent.classList.toggle('is-open');
      ingTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!ingParent.contains(e.target)) {
        ingParent.classList.remove('is-open');
        ingTrigger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ingParent.classList.contains('is-open')) {
        ingParent.classList.remove('is-open');
        ingTrigger.setAttribute('aria-expanded', 'false');
        ingTrigger.focus();
      }
    });
  }

  // ── Productos V3 — tabs (4 módulos sin scroll)
  const prodv3Tabs = document.querySelectorAll('.prodv3-tab');
  const prodv3Panes = document.querySelectorAll('.prodv3-pane');
  const prodv3Cta = document.getElementById('prodv3CtaLink');
  const prodv3Map = {
    casino: { href: 'comedor-escolar.html',         label: 'Conocer Casino en detalle' },
    cpa:    { href: 'centro-de-padres.html',        label: 'Conocer Centro de Padres en detalle' },
    ligas:  { href: 'ligas-y-talleres.html',        label: 'Conocer Ligas y Talleres en detalle' },
    prov:   { href: 'gestion-de-proveedores.html',  label: 'Conocer Gestión de Proveedores en detalle' }
  };
  prodv3Tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const k = tab.dataset.prod;
      prodv3Tabs.forEach(t => {
        const isActive = t === tab;
        t.classList.toggle('is-active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      prodv3Panes.forEach(p => {
        const isActive = p.dataset.prodPane === k;
        p.classList.toggle('is-active', isActive);
        if (isActive) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      if (prodv3Cta && prodv3Map[k]) {
        prodv3Cta.href = prodv3Map[k].href;
        const span = prodv3Cta.querySelector('span');
        if (span) span.textContent = prodv3Map[k].label;
      }
    });
  });

  // ── Subpage FAQ — accordion para páginas de detalle
  document.querySelectorAll('.subpage-faq-q').forEach(q => {
    q.addEventListener('click', () => {
      q.parentElement.classList.toggle('is-open');
    });
  });

  /* ── HERO MOCKUPS · PERIODIC DATA UPDATES ────────────
     Después de las animaciones iniciales (~5s), cada
     ~13-18s actualiza un mockup con datos nuevos como si
     llegara info en vivo. NO repite las mismas animaciones
     de carga — cada update es una "nueva entrada" distinta. */
  (function startMockupUpdates() {
    // Respetar reduced-motion y viewports donde mockups están ocultos
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia && window.matchMedia('(max-width: 980px)').matches) return;

    const formatCL = (n) => '$' + Math.round(n).toLocaleString('es-CL');
    const flash = (el) => {
      if (!el) return;
      el.classList.remove('mock-tick');
      void el.offsetWidth;
      el.classList.add('mock-tick');
    };
    const replay = (el, anim) => {
      if (!el) return;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = anim;
    };

    // ─── CASINO · feed rotativo: pedido normal / validación / precio nivel /
    //     funcionario / saldo bajo. Cada escenario comunica una feature distinta
    //     del módulo (PDF problemas 2/3/5/6). El contador "lunes" sube cuando
    //     entran nuevas compras anticipadas — visualiza la proyección. ───
    const casLast    = document.querySelector('.mock-cas-last');
    const casPrev    = document.querySelector('.mock-cas-last--prev');
    const casCounter = document.getElementById('mockCasCounter');
    const casFeed = [
      // Pedido normal con precio por nivel aplicado (PDF p.5).
      { name: 'Sofía Martínez',  course: '5°B · Menú del día · $2.500',         time: '12:38', avatar: 'mock-avatar--c' },
      // Compra anticipada de tickets — Problema 4: demanda confirmada (PDF p.3).
      { name: 'Familia Vergara', course: '10 tickets · semana próxima',         time: '12:39', avatar: 'mock-avatar--d' },
      // Bloqueo automático + apoderado notificado (PDF p.2 Problema 2).
      { name: 'Juan Pérez',      course: 'sin saldo · apoderado notificado',    time: '12:40', avatar: 'mock-avatar--a' },
      // Precio media diferenciado (PDF p.5 Problema 6).
      { name: 'Diego Riquelme',  course: '7° media · $3.200 descontado',        time: '12:41', avatar: 'mock-avatar--b' },
      // Funcionario docente · descuento por planilla (PDF p.4 Problema 5).
      { name: 'Patricia Méndez', course: 'docente · descuento por planilla',    time: '12:42', avatar: 'mock-avatar--d' },
      // Alerta saldo bajo (PDF p.3 Problema 3).
      { name: 'Martina Soto',    course: 'saldo bajo · recarga sugerida',       time: '12:43', avatar: 'mock-avatar--e' },
      // Funcionario administrativo — otro tipo de trabajador.
      { name: 'Rodrigo Cáceres', course: 'administrativo · 18° del mes',        time: '12:44', avatar: 'mock-avatar--a' },
      // Compra paquete de tickets — apoderado planifica el mes.
      { name: 'Familia Rivas',   course: '20 tickets · mes completo',           time: '12:45', avatar: 'mock-avatar--b' },
      // Visita externa con pase diario — tipo de usuario "visita" (PDF p.2).
      { name: 'Visita externa',  course: 'pase diario · $4.500',                time: '12:46', avatar: 'mock-avatar--e' },
      // Funcionario aseo — otro perfil trabajador.
      { name: 'Carmen Aravena',  course: 'asistente · descuento por planilla',  time: '12:47', avatar: 'mock-avatar--c' },
      // Recarga automática completada — Problema 3 ciclo cerrado.
      { name: 'Martina Soto',    course: 'recarga $20.000 · apoderado',         time: '12:48', avatar: 'mock-avatar--e' },
      // Alumno básica precio diferenciado.
      { name: 'Tomás Riveros',   course: '3° básico · $2.500 descontado',       time: '12:49', avatar: 'mock-avatar--a' },
    ];
    // Inicia en 184 (Diego 19/05/2026): consumos del día en lugar de proyección lunes
    let casCount = 184;
    let casIdx = 0;
    function applyCasItem(row, item) {
      if (!row || !item) return;
      const initials = item.name.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
      const avatar = row.querySelector('.mock-avatar');
      const name   = row.querySelector('strong');
      const sub    = row.querySelector('.mock-feed-text span');
      const time   = row.querySelector('.mock-feed-time');
      if (avatar) { avatar.className = 'mock-avatar ' + item.avatar; avatar.textContent = initials; }
      if (name)   name.textContent = item.name;
      if (sub)    sub.textContent  = item.course;
      if (time)   time.textContent = item.time;
    }
    function updateCasino() {
      if (!casLast) return;
      const len = casFeed.length;
      const newItem  = casFeed[casIdx % len];
      const prevItem = casFeed[(casIdx - 1 + len) % len];
      applyCasItem(casLast, newItem);
      applyCasItem(casPrev, prevItem);
      // Proyección lunes: nuevas compras anticipadas entran al sistema.
      if (casCounter) {
        casCount += Math.floor(Math.random() * 2) + 1;
        casCounter.textContent = casCount;
        flash(casCounter);
      }
      replay(casLast, 'lastInOnce 1.6s cubic-bezier(.22,.61,.36,1) forwards');
      casIdx++;
    }

    // ─── CPA · flujo de aprobación 3 pasos rotando + colecta avanzando.
    //     PDF p.6 Problema 2: delegado → tesorero → secretaria. Cada gasto
    //     necesita 3 firmas digitales con timestamp, no se puede saltar.
    //     También avanzamos la colecta del bingo (familias que pagan) — PDF p.7. ───
    const cpaTop      = document.querySelector('.mock-cpa-mvt--in');
    const cpaApproved = document.querySelector('.mock-cpa-mvt--approved');
    const cpaAmt      = document.querySelector('.mock-cpa-hero-amt');
    const cpaProg     = document.querySelector('.mock-cpa-progress-fill');
    const cpaGoal     = document.querySelector('.mock-cpa-hero-goal');
    let cpaTotal = 1840000;
    let cpaPaidFams = 42;
    const cpaGoalTotal = 2500000;
    const cpaTotalFams = 56;
    // Card 1 (arriba) rota entre: nueva solicitud / pago de familia / recordatorio
    // enviado / aviso oficial publicado. Cada tipo comunica un beneficio distinto
    // del módulo CPA (PDF p.6-9).
    // Labels acortados: sub-línea ≤ ~22 caracteres para no saturar.
    const cpaRequests = [
      { title: 'Materiales 4° básico',  who: 'Delegada Sofía · pendiente',   amount: 80000,  amtClass: '' },
      { title: 'Familia Martínez',      who: 'Bingo · pago confirmado',      amount: 25000,  amtClass: 'mock-cpa-mvt-amt--ok' },
      { title: 'Uniformes coro',        who: 'Delegado Rodrigo · pendiente', amount: 120000, amtClass: '' },
      { title: 'Familia Vergara',       who: 'Bingo · pago confirmado',      amount: 30000,  amtClass: 'mock-cpa-mvt-amt--ok' },
      { title: 'Recordatorio enviado',  who: '14 familias · cuota',          amount: null,   amtClass: '' },
      { title: 'Bus salida 6° básico',  who: 'Delegada Carmen · pendiente',  amount: 240000, amtClass: '' },
      { title: 'Familia Soto',          who: 'Bingo · pago confirmado',      amount: 45000,  amtClass: 'mock-cpa-mvt-amt--ok' },
      { title: 'Bingo solidario',       who: 'Aviso · 56 familias',          amount: null,   amtClass: '' },
      { title: 'Premios kermesse',      who: 'Delegado Andrés · pendiente',  amount: 55000,  amtClass: '' },
      { title: 'Familia Reyes',         who: 'Bingo · pago confirmado',      amount: 50000,  amtClass: 'mock-cpa-mvt-amt--ok' },
      { title: 'Rendición lista',       who: 'PDF · asamblea',               amount: null,   amtClass: '' },
      { title: 'Tarjetas día del padre',who: 'Delegada Paula · pendiente',   amount: 38000,  amtClass: '' },
    ];
    // Card 2 (abajo) — sub-línea acortada también.
    const cpaApprovals = [
      { title: 'Aprobado por Daniela',  who: 'Tesorera · 2 min' },
      { title: 'Aprobado por Daniela',  who: 'Tesorera · 5 min' },
      { title: 'Pagado · boleta',       who: 'Secretaria · 1 min' },
      { title: 'Aprobado por Daniela',  who: 'Tesorera · 3 min' },
      { title: 'Recordatorio enviado',  who: '8 de 14 pagaron' },
      { title: 'Aprobado por Daniela',  who: 'Tesorera · 4 min' },
      { title: 'Pagado · boleta',       who: 'Secretaria · 2 min' },
      { title: 'Aviso entregado',       who: 'Lectura 89% · 1h' },
      { title: 'Aprobado por Daniela',  who: 'Tesorera · 6 min' },
      { title: 'Pagado · boleta',       who: 'Secretaria · 3 min' },
      { title: 'Reporte descargado',    who: 'Pamela · 1 min' },
      { title: 'Aprobado por Daniela',  who: 'Tesorera · 2 min' },
    ];
    let cpaIdx = 0;
    function updateCpa() {
      if (!cpaTop || !cpaApproved) return;
      // Card 1: rota entre solicitudes / pagos / recordatorios / avisos.
      const req = cpaRequests[cpaIdx % cpaRequests.length];
      const reqTitle = cpaTop.querySelector('.mock-cpa-mvt-meta strong');
      const reqWho   = cpaTop.querySelector('.mock-cpa-mvt-meta span');
      const reqAmt   = cpaTop.querySelector('.mock-cpa-mvt-amt');
      if (reqTitle) reqTitle.textContent = req.title;
      if (reqWho)   reqWho.textContent   = req.who;
      if (reqAmt) {
        // Algunos eventos no tienen monto (recordatorio, aviso, reporte).
        if (req.amount === null) {
          reqAmt.textContent = '·';
        } else {
          reqAmt.textContent = (req.amtClass ? '+' : '') + formatCL(req.amount);
        }
        reqAmt.className = 'mock-cpa-mvt-amt' + (req.amtClass ? ' ' + req.amtClass : '');
      }
      // Card 2: último evento aprobado/pagado/firmado.
      const apr = cpaApprovals[cpaIdx % cpaApprovals.length];
      const aprTitle = cpaApproved.querySelector('.mock-cpa-mvt-meta strong');
      const aprWho   = cpaApproved.querySelector('.mock-cpa-mvt-meta span');
      if (aprTitle) aprTitle.textContent = apr.title;
      if (aprWho)   aprWho.textContent   = apr.who;
      // Colecta avanza: cuando la card de arriba muestra un pago, la colecta
      // crece. Cuando muestra solicitud/aviso, queda estable (visualmente más coherente).
      if (req.amtClass === 'mock-cpa-mvt-amt--ok' && req.amount) {
        cpaTotal = Math.min(cpaGoalTotal, cpaTotal + req.amount);
        cpaPaidFams = Math.min(cpaTotalFams, cpaPaidFams + 1);
        if (cpaAmt) { cpaAmt.textContent = formatCL(cpaTotal); flash(cpaAmt); }
        const pct = Math.min(100, Math.round((cpaTotal / cpaGoalTotal) * 100));
        if (cpaProg) cpaProg.style.width = pct + '%';
        if (cpaGoal) cpaGoal.innerHTML = 'de <em>' + formatCL(cpaGoalTotal) + '</em> · ' + cpaPaidFams + ' de ' + cpaTotalFams + ' familias';
      }
      replay(cpaTop, 'lastInOnce 1.6s cubic-bezier(.22,.61,.36,1) forwards');
      cpaIdx++;
    }

    // ─── GESTIÓN · operaciones en terreno: sectores se completan + KPIs
    //     viven. Cuando un sector pasa a "completado" sube el contador
    //     "7/9 → 8/9", y eventualmente entra un nuevo reporte de
    //     infraestructura (ventana aula 12 — PDF p.10). ───
    const gestStats   = document.querySelectorAll('.hero-mock--br .mock-gest-stat-val');
    const gestSectors = document.querySelectorAll('.hero-mock--br .mock-gest-contract');
    const gestTrend   = document.querySelector('.hero-mock--br .mock-trend');
    // Estado vivo: sectores completados, reportes abiertos, resueltos. El %
    // del pill superior se recalcula desde sectoresDone/total — siempre coherente.
    let gestState = { sectorsDone: 7, sectorsTotal: 9, reportsOpen: 1, reportsDone: 3 };
    function syncGestPct() {
      const pct = Math.round((gestState.sectorsDone / gestState.sectorsTotal) * 100);
      if (gestTrend) {
        // mantener el dot inicial + número actualizado
        gestTrend.innerHTML = '<span class="mock-gest-pill-dot" aria-hidden="true"></span>' + pct + '% al día';
      }
      // KPI sectoresDone/total
      if (gestStats[0]) gestStats[0].innerHTML = gestState.sectorsDone + '<i>/' + gestState.sectorsTotal + '</i>';
      if (gestStats[1]) gestStats[1].innerHTML = gestState.reportsOpen;
      if (gestStats[2]) gestStats[2].innerHTML = gestState.reportsDone;
    }
    syncGestPct(); // init
    // Cola de cambios narrativos en terreno (ciclo).
    const gestQueue = [
      // Laboratorio termina → 7/9 → 8/9.
      { kind: 'sectorDone', idx: 1, time: '10:14', label: 'Laboratorio' },
      // Nuevo reporte entra: ventana aula 12.
      { kind: 'reportIn',   idx: 2, state: 'warn', label: 'Ventana aula 12 · asignada', time: 'nuevo' },
      // Reporte se resuelve.
      { kind: 'reportDone', idx: 2, time: '10:42', label: 'Ventana aula 12 · resuelta' },
      // Patio principal re-revisa (cycle visual) — ocasional re-trigger.
      { kind: 'sectorPing', idx: 2, time: '10:55', label: 'Patio principal' },
      // Otro sector completa para llegar a 9/9.
      { kind: 'sectorDone', idx: 0, time: '11:08', label: 'Sala de profesores' },
      // Otro reporte entra: silla aula 8.
      { kind: 'reportIn',   idx: 1, state: 'warn', label: 'Silla aula 8 · asignada', time: 'nuevo' },
      // Se resuelve.
      { kind: 'reportDone', idx: 1, time: '11:21', label: 'Silla aula 8 · resuelta' },
      // Reset visual (siguiente turno) — vuelve a 7/9.
      { kind: 'reset' },
    ];
    let gestIdx = 0;
    function updateGestion() {
      const item = gestQueue[gestIdx % gestQueue.length];
      if (!item) { gestIdx++; return; }
      if (item.kind === 'sectorDone') {
        const row = gestSectors[item.idx];
        if (row) {
          row.className = 'mock-gest-contract mock-gest-contract--ok';
          const n = row.querySelector('.mock-gest-contract-name');
          const s = row.querySelector('.mock-gest-contract-state');
          if (n && item.label) n.textContent = item.label;
          if (s && item.time) s.textContent = item.time;
          flash(row);
        }
        gestState.sectorsDone = Math.min(gestState.sectorsTotal, gestState.sectorsDone + 1);
      } else if (item.kind === 'reportIn') {
        const row = gestSectors[item.idx];
        if (row) {
          row.className = 'mock-gest-contract mock-gest-contract--warn';
          const n = row.querySelector('.mock-gest-contract-name');
          const s = row.querySelector('.mock-gest-contract-state');
          if (n) n.textContent = item.label;
          if (s) s.textContent = item.time;
          flash(row);
        }
        gestState.reportsOpen = Math.min(9, gestState.reportsOpen + 1);
      } else if (item.kind === 'reportDone') {
        const row = gestSectors[item.idx];
        if (row) {
          row.className = 'mock-gest-contract mock-gest-contract--ok';
          const n = row.querySelector('.mock-gest-contract-name');
          const s = row.querySelector('.mock-gest-contract-state');
          if (n) n.textContent = item.label;
          if (s) s.textContent = item.time;
          flash(row);
        }
        gestState.reportsOpen = Math.max(0, gestState.reportsOpen - 1);
        gestState.reportsDone += 1;
      } else if (item.kind === 'sectorPing') {
        const row = gestSectors[item.idx];
        if (row) {
          row.className = 'mock-gest-contract mock-gest-contract--ok';
          const n = row.querySelector('.mock-gest-contract-name');
          const s = row.querySelector('.mock-gest-contract-state');
          if (n) n.textContent = item.label;
          if (s) s.textContent = item.time;
          flash(row);
        }
      } else if (item.kind === 'reset') {
        gestState = { sectorsDone: 7, sectorsTotal: 9, reportsOpen: 1, reportsDone: 3 };
        // Reset filas a su estado inicial
        if (gestSectors[0]) { gestSectors[0].className = 'mock-gest-contract mock-gest-contract--ok'; const n=gestSectors[0].querySelector('.mock-gest-contract-name'); const s=gestSectors[0].querySelector('.mock-gest-contract-state'); if(n)n.textContent='Sala de profesores'; if(s)s.textContent='09:15'; }
        if (gestSectors[1]) { gestSectors[1].className = 'mock-gest-contract mock-gest-contract--warn'; const n=gestSectors[1].querySelector('.mock-gest-contract-name'); const s=gestSectors[1].querySelector('.mock-gest-contract-state'); if(n)n.textContent='Laboratorio'; if(s)s.textContent='en curso'; }
        if (gestSectors[2]) { gestSectors[2].className = 'mock-gest-contract mock-gest-contract--ok'; const n=gestSectors[2].querySelector('.mock-gest-contract-name'); const s=gestSectors[2].querySelector('.mock-gest-contract-state'); if(n)n.textContent='Patio principal'; if(s)s.textContent='09:42'; }
      }
      syncGestPct();
      // Flash el KPI que cambió (visual reinforcement).
      const flashTarget = item.kind === 'sectorDone' ? gestStats[0]
                       : item.kind === 'reportIn'   ? gestStats[1]
                       : item.kind === 'reportDone' ? gestStats[2]
                       : null;
      if (flashTarget) flash(flashTarget);
      gestIdx++;
    }

    // ─── LIGAS · planilla en vivo: nuevos eventos del partido entran al
    //     feed, el marcador sube y el minuto avanza. PDF p.12 (Liga sub-12
    //     intercursos · planillero registra desde celular). ───
    const ligasRows    = document.querySelectorAll('.hero-mock--tr .mock-ligas-row');
    const ligasTitle   = document.querySelector('.hero-mock--tr .mock-app-titles strong');
    const ligasSubt    = document.querySelector('.hero-mock--tr .mock-app-titles span');
    const ligasRingVal = document.querySelector('.mock-ligas-ring-val');
    const ligasMeta    = document.querySelector('.mock-ligas-stat-meta strong');
    const ligasMetaSub = document.querySelector('.mock-ligas-stat-meta span');
    // Estado del partido. Cada paso registra un evento desde el celular.
    // SVG glyphs para gol y tarjeta — brand-aligned (PDF p.14 paleta).
    const GOAL_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 4l2 4-2 2.5L10 8l2-4z"/><path d="M19 9l-3 1-1 3 2.5 2 2.5-2"/><path d="M5 9l3 1 1 3-2.5 2L4 13"/><path d="M9 18l1.5-2.5h3L15 18"/></svg>';
    const YELLOW_CARD = '<span class="mock-event-card mock-event-card--yellow"></span>';
    const RED_CARD    = '<span class="mock-event-card mock-event-card--red"></span>';
    let ligasState = { home: 2, away: 1, min: 23, events: 3 };
    const ligasEvents = [
      { type: 'goal',   label: 'Gol · Martina G.',  min: '32', tag: 'ok',      side: 'home' },
      { type: 'yellow', label: 'Sofía M.',          min: '38', tag: 'pending' },
      { type: 'goal',   label: 'Gol · Carlos R.',   min: '44', tag: 'ok',      side: 'away' },
      { type: 'red',    label: 'Andrés M.',         min: '58', tag: 'out' },
      { type: 'goal',   label: 'Gol · Pedro S.',    min: '67', tag: 'ok',      side: 'home' },
      { type: 'yellow', label: 'Diego M.',          min: '71', tag: 'pending' },
      { type: 'goal',   label: 'Gol · Matías H.',   min: '78', tag: 'ok',      side: 'home' },
      { type: 'yellow', label: 'Carmen V.',         min: '83', tag: 'pending' },
    ];
    function renderEventIcon(host, type) {
      // host = .mock-event-icon
      host.className = 'mock-event-icon mock-event-icon--' + type;
      if (type === 'goal')      host.innerHTML = GOAL_SVG;
      else if (type === 'yellow') host.innerHTML = YELLOW_CARD;
      else if (type === 'red')    host.innerHTML = RED_CARD;
    }
    let ligasIdx = 0;
    // Tipo del evento en cada fila (para shift sin perder semántica).
    const ligasRowTypes = ['goal','yellow','goal']; // estado inicial DOM
    function rowCopy(src, dst) {
      const sIcon = src.querySelector('.mock-event-icon');
      const dIcon = dst.querySelector('.mock-event-icon');
      if (sIcon && dIcon) { dIcon.className = sIcon.className; dIcon.innerHTML = sIcon.innerHTML; }
      const sName = src.querySelector('.mock-ligas-name');
      const dName = dst.querySelector('.mock-ligas-name');
      if (sName && dName) dName.textContent = sName.textContent;
      const sTag = src.querySelector('[class^=mock-tag-]');
      const dTag = dst.querySelector('[class^=mock-tag-]');
      if (sTag && dTag) { dTag.className = sTag.className; dTag.textContent = sTag.textContent; }
    }
    function updateLigas() {
      if (!ligasRows.length) return;
      const ev = ligasEvents[ligasIdx % ligasEvents.length];
      const row0 = ligasRows[0];
      const row1 = ligasRows[1];
      const row2 = ligasRows[2];
      // Shift hacia abajo: row1 → row2, row0 → row1.
      if (row1 && row2) rowCopy(row1, row2);
      if (row0 && row1) rowCopy(row0, row1);
      // Nuevo evento entra arriba (row0).
      if (row0) {
        const iconHost = row0.querySelector('.mock-event-icon');
        if (iconHost) renderEventIcon(iconHost, ev.type);
        const nm = row0.querySelector('.mock-ligas-name');
        if (nm) nm.textContent = ev.label;
        const tg = row0.querySelector('[class^=mock-tag-]');
        if (tg) { tg.className = 'mock-tag-' + ev.tag; tg.textContent = ev.min + "'"; }
        flash(row0);
      }
      // Marcador / minuto / contador eventos.
      if (ev.side === 'home') ligasState.home += 1;
      if (ev.side === 'away') ligasState.away += 1;
      ligasState.min = parseInt(ev.min, 10);
      ligasState.events += 1;
      if (ligasTitle) ligasTitle.textContent = '5°B vs 6°A · ' + ligasState.home + '–' + ligasState.away;
      if (ligasSubt)  ligasSubt.textContent  = "Intercursos · min " + ligasState.min + "'";
      if (ligasRingVal) ligasRingVal.innerHTML = ligasState.min + "<i>'</i>";
      if (ligasMeta) ligasMeta.textContent = 'Planilla en vivo';
      if (ligasMetaSub) ligasMetaSub.textContent = ligasState.events + ' eventos · tabla al día';
      ligasIdx++;
    }

    // ─── Sequencer · 4 timers independientes, ritmos distintos y arranques
    //     desincronizados. Intervalos más amplios (6-13s) para que el ojo
    //     respire entre updates y nunca coincidan los 4 mockups a la vez. ───
    function loop(fn, baseMs, jitterMs) {
      function step() {
        try { fn(); } catch (e) { /* silencioso */ }
        setTimeout(step, baseMs + Math.random() * jitterMs);
      }
      step();
    }
    setTimeout(() => loop(updateCasino,  6500, 2500), 5500);   // ~6.5-9s
    setTimeout(() => loop(updateCpa,    10000, 3000), 8800);   // ~10-13s
    setTimeout(() => loop(updateLigas,   8000, 2500), 12200);  // ~8-10.5s
    setTimeout(() => loop(updateGestion,11500, 3000), 15700);  // ~11.5-14.5s
  })();

  /* ══════════════════════════════════════════════════════
     PRODUCTOS V6 · snap-scroll secuencial + indicador lateral
     ────────────────────────────────────────────────────
     1. Toggle scroll-snap del html SOLO mientras user está dentro
        de la sección (IO del section como entry/exit).
     2. IO por card: activa .is-active cuando la card está centrada
        en el viewport. Las otras quedan dimmed (opacity .35 via CSS).
     3. Indicador lateral: número + dots + barra de progreso.
     4. Mockups internos: counters/cycles continuos.
     ═════════════════════════════════════════════════════ */
  (function prodv6Animations() {
    const root = document.querySelector('.section-productos.prodv6');
    if (!root) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = root.querySelectorAll('.prodv6-card[data-idx]');
    const stackEl = root.querySelector('.prodv6-stack');
    const progress = root.querySelector('.prodv6-progress');
    const progNum = progress?.querySelector('.prodv6-progress-num');
    const progFill = progress?.querySelector('.prodv6-progress-fill');
    const progDots = progress?.querySelectorAll('.prodv6-progress-dot');

    // ─── Helper · scrollTo a una card específica ─────────
    // Calcula el scroll para que la card llegue a su sticky-engage point.
    // Usa `window.scrollTo({behavior:'smooth'})` NATIVO — el mismo método
    // que se usa para anchor links en este codebase (línea ~1269) y
    // funciona reliable en ambas direcciones. Mi custom rAF tenía algún
    // bug intermitente que nunca pude reproducir consistentemente.
    function scrollToCard(idx) {
      const card = cards[idx];
      if (!card || !stackEl) return;
      const stackDocTop = stackEl.getBoundingClientRect().top + window.scrollY;
      const cardDocTop = stackDocTop + card.offsetTop;
      const stickyTop = parseInt(getComputedStyle(card).top, 10) || 156;
      const target = Math.max(0, cardDocTop - stickyTop);
      window.scrollTo({
        left: 0,
        top: target,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    }

    // ─── Section IO · toggle data-attr + show progress ───
    const sectionIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          document.documentElement.setAttribute('data-prodv6-active', 'true');
          progress?.classList.add('is-visible');
        } else {
          document.documentElement.removeAttribute('data-prodv6-active');
          progress?.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
    sectionIO.observe(root);

    // ─── FIX #1 · Active detection scroll-position-based ─
    // El IO por card fallaba al scrollear hacia ARRIBA porque las
    // cards sticky mantenían ratio 1.0 indefinidamente (IO no
    // conoce z-stacking). Ahora calculamos engagement scroll-Y de
    // cada card y elegimos como activa la última cuyo engagement
    // ya fue cruzado. Funciona en ambas direcciones.
    let engagements = [];
    function recomputeEngagements() {
      if (!stackEl) return;
      const stackDocTop = stackEl.getBoundingClientRect().top + window.scrollY;
      engagements = [...cards].map(card => {
        const cardDocTop = stackDocTop + card.offsetTop;
        const stickyTop = parseInt(getComputedStyle(card).top, 10) || 156;
        return cardDocTop - stickyTop;
      });
    }

    let currentActiveIdx = -1;
    function setActiveIdx(idx) {
      if (idx === currentActiveIdx) return;
      currentActiveIdx = idx;
      cards.forEach(c => c.classList.remove('is-active'));
      cards[idx].classList.add('is-active');
      updateProgress(idx);
    }

    function updateActiveFromScroll() {
      if (!engagements.length) return;
      const y = window.scrollY;
      // Anticipa la activación ~35% del viewport ANTES del sticky-engage.
      // Resultado: cuando la card está aún subiendo (top a ~35vh sobre
      // su sticky-top), ya empieza el fade-in. En scroll rápido se ve
      // la card "activada" un rato más antes de que la siguiente la
      // reemplace · sensación de tiempo de lectura más generoso.
      const earlyOffset = window.innerHeight * 0.35;
      let idx = 0;
      for (let i = 0; i < engagements.length; i++) {
        if (y >= engagements[i] - earlyOffset) idx = i;
      }
      setActiveIdx(idx);
    }

    // Tracking de dirección de scroll para "juego de opacidad" solo
    // visible al bajar · al subir las cards se muestran full opacity.
    let lastScrollY = window.scrollY;
    let scrollTicking = false;
    function onScroll() {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dir = y > lastScrollY ? 'down' : (y < lastScrollY ? 'up' : null);
        if (dir) document.documentElement.setAttribute('data-prodv6-dir', dir);
        lastScrollY = y;
        updateActiveFromScroll();
        scrollTicking = false;
      });
    }

    recomputeEngagements();
    setActiveIdx(0); // estado inicial · card 0 marca como entered
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      recomputeEngagements();
      updateActiveFromScroll();
    }, { passive: true });
    window.addEventListener('load', () => {
      recomputeEngagements();
      updateActiveFromScroll();
    });

    // ─── Progress update · swap directo · sin flash ──────
    function updateProgress(idx) {
      if (progNum) progNum.textContent = String(idx + 1).padStart(2, '0');
      if (progFill) progFill.style.height = ((idx + 1) / cards.length * 100) + '%';
      progDots?.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    }

    // ─── Click handlers de los dots ──────────────────────
    progDots?.forEach((dot, idx) => {
      dot.addEventListener('click', () => scrollToCard(idx));
    });

    // ─── FIX #4 · Click peek-bar SOLO si card está sticky ─
    // Antes: clickear el "01" de Casino antes que stickee disparaba
    // un scroll random. Ahora chequeamos que rect.top coincida con
    // el sticky-top configurado (= card actualmente pinned).
    cards.forEach((card, idx) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) return;
        if (card.classList.contains('is-active')) return;
        const stickyTop = parseInt(getComputedStyle(card).top, 10) || 156;
        const rect = card.getBoundingClientRect();
        // Solo cuando la card está realmente pinned en su sticky-top
        if (Math.abs(rect.top - stickyTop) > 2) return;
        const yInCard = e.clientY - rect.top;
        if (yInCard > 32) return; // solo zone peek (top 32px)
        scrollToCard(idx);
      });
    });

    // ─── FIX #5 · Arrow keys SOLO cuando foco está en un dot ─
    // Antes: estando en el CTA y pulsando ↓ se robaba el foco al
    // dot y scrolleaba. Confuso. Ahora arrows solo navegan cuando
    // el usuario explícitamente tabuló a un dot.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (!progress?.contains(document.activeElement)) return;
      const targetIdx = e.key === 'ArrowDown'
        ? Math.min(currentActiveIdx + 1, cards.length - 1)
        : Math.max(currentActiveIdx - 1, 0);
      if (targetIdx !== currentActiveIdx) {
        e.preventDefault();
        scrollToCard(targetIdx);
        progDots?.[targetIdx]?.focus();
      }
    });

    // Animaciones viejas de mockups reemplazadas por bloques IIFE
    // independientes al final del archivo (3ra pasada 21/05/2026).
  })();

  /* ═══════════════════════════════════════════════════
     PRODUCT PAGES — accordion + reveal + counter-up
     No-op si los elementos no existen (no afecta al Home)
     ═══════════════════════════════════════════════════ */

  /* ── Accordion ─────────────────────────────────── */
  const accItems = document.querySelectorAll('.pp-acc-item');
  if (accItems.length) {
    accItems.forEach((item) => {
      const trigger = item.querySelector('.pp-acc-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        // Cerrar otros (opcional — comportamiento "single open")
        accItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('is-open');
            const t = other.querySelector('.pp-acc-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('is-open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  }

  /* ── Reveal on scroll ──────────────────────────── */
  const revealEls = document.querySelectorAll('.pp-reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => revealObs.observe(el));
  } else {
    // Fallback: revelar todo si no hay IntersectionObserver
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ── Counter-up animation ──────────────────────── */
  const counters = document.querySelectorAll('.pp-counter[data-counter-to]');
  if (counters.length && 'IntersectionObserver' in window) {
    const animateCounter = (el) => {
      const target = parseInt(el.dataset.counterTo, 10);
      if (isNaN(target)) return;
      const duration = parseInt(el.dataset.counterDuration || '1200', 10);
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic
      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.round(target * ease(progress));
        el.textContent = String(value);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      requestAnimationFrame(step);
    };
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    counters.forEach(el => {
      el.textContent = '0';
      counterObs.observe(el);
    });
  }

  /* ── Comedor · feed de conciliación EN VIVO (hero del módulo) ──────
     Réplica del patrón de feed del home (startMockupUpdates): cada pago
     entra arriba con slide-in + chips de match, los anteriores bajan, y
     los KPIs laten (consumos +1-3, recaudado += monto, conciliados +1).
     Da vida a la promesa "se concilian solos". Pausa fuera de viewport
     y respeta prefers-reduced-motion. */
  (function comedorHeroFeed() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = document.querySelector('.pp-cas-hero-v2');
    const body = hero && hero.querySelector('.pp-cas-panel-v2-body');
    if (!body) return;
    const rows = Array.from(body.querySelectorAll('.pp-cas-tx'));
    if (rows.length < 3) return;

    const consumosEl  = document.getElementById('ppCasConsumos');
    const recaudadoEl = document.getElementById('ppCasRecaudado');
    const concEl      = document.getElementById('ppCasConc');

    const fmtCL  = (n) => '$' + Math.round(n).toLocaleString('es-CL');
    const parseCL = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
    const clock  = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const flash  = (el) => { if (!el) return; el.classList.remove('pp-tick'); void el.offsetWidth; el.classList.add('pp-tick'); };

    // Estado inicial = las 3 filas que ya están en el DOM.
    let shown = [
      { bank: 'BCh',    wp: false, amt: 25000, detail: 'Transferencia · Glosa <strong>"Comedor Sofía 5°B"</strong>', who: 'Sofía Martínez · 5°B',  chips: ['Glosa', 'RUT vinculado', 'Histórico match'], _clock: '12:38' },
      { bank: 'Webpay', wp: true,  amt: 50000, detail: 'Recarga app · Familia <strong>Rojas</strong>',              who: 'Joaquín Rojas · 7°A',   chips: ['Pago app', 'RUT vinculado'],                _clock: '12:24' },
      { bank: 'BCi',    wp: false, amt: 25000, detail: 'Transferencia · <strong>Familia González</strong>',         who: 'Mateo González · 4°A',  chips: ['RUT vinculado', 'Histórico match'],         _clock: '11:42' },
    ];
    // Cola de pagos entrantes (transferencia bancaria / Webpay → familia + curso).
    const EVENTS = [
      { bank: 'BEst',   wp: false, amt: 30000, detail: 'Transferencia · Glosa <strong>"Almuerzo Benja 3°B"</strong>', who: 'Benjamín Soto · 3°B',   chips: ['Glosa', 'RUT vinculado', 'Monto exacto'] },
      { bank: 'Webpay', wp: true,  amt: 20000, detail: 'Recarga app · Familia <strong>Vergara</strong>',             who: 'Isidora Vergara · 6°A', chips: ['Pago app', 'RUT vinculado'] },
      { bank: 'BCh',    wp: false, amt: 45000, detail: 'Transferencia · Glosa <strong>"Tickets Maite 2°A"</strong>',  who: 'Maite Fuentes · 2°A',   chips: ['Glosa', 'RUT vinculado', 'Histórico match'] },
      { bank: 'BCi',    wp: false, amt: 25000, detail: 'Transferencia · <strong>Familia Rivas</strong>',             who: 'Tomás Rivas · 8°B',     chips: ['RUT vinculado', 'Histórico match'] },
      { bank: 'Webpay', wp: true,  amt: 60000, detail: 'Recarga app · Familia <strong>Méndez</strong>',              who: 'Antonia Méndez · 1°B',  chips: ['Pago app', 'RUT vinculado'] },
      { bank: 'BEst',   wp: false, amt: 25000, detail: 'Transferencia · Glosa <strong>"Comedor Lucas 5°A"</strong>',  who: 'Lucas Herrera · 5°A',   chips: ['Glosa', 'RUT vinculado', 'Monto exacto'] },
      { bank: 'BCh',    wp: false, amt: 50000, detail: 'Transferencia · <strong>Familia Castro</strong>',            who: 'Emilia Castro · 7°B',   chips: ['RUT vinculado', 'Histórico match'] },
      { bank: 'Webpay', wp: true,  amt: 35000, detail: 'Recarga app · Familia <strong>Pizarro</strong>',             who: 'Agustín Pizarro · 2°B', chips: ['Pago app', 'RUT vinculado'] },
    ];

    const CHIP_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 5"/></svg>';
    function renderRow(row, ev, isNew) {
      const icon = row.querySelector('.pp-cas-tx-icon');
      if (icon) { icon.className = 'pp-cas-tx-icon' + (ev.wp ? ' pp-cas-tx-icon--wp' : ''); icon.textContent = ev.bank; }
      const amt = row.querySelector('.pp-cas-tx-amt'); if (amt) amt.textContent = fmtCL(ev.amt);
      const time = row.querySelector('.pp-cas-tx-time'); if (time) time.textContent = isNew ? (ev._clock + ' · ahora') : ev._clock;
      const detail = row.querySelector('.pp-cas-tx-detail'); if (detail) detail.innerHTML = ev.detail;
      const who = row.querySelector('.pp-cas-tx-status strong'); if (who) who.textContent = ev.who;
      // Sólo la fila nueva (row0) tiene contenedor de chips en el DOM.
      const chipsWrap = row.querySelector('.pp-cas-match-chips');
      if (chipsWrap) chipsWrap.innerHTML = (ev.chips || []).map(c => '<span class="pp-cas-match-chip">' + CHIP_SVG + c + '</span>').join('');
    }

    let idx = 0;
    let consumos = null;
    let recaudado = recaudadoEl ? parseCL(recaudadoEl.textContent) : 4280000;
    let conc = concEl ? (parseInt(concEl.textContent, 10) || 4) : 4;
    let mins = 12 * 60 + 38;

    function tick() {
      if (consumos === null) consumos = consumosEl ? (parseInt(consumosEl.textContent, 10) || 184) : 184;
      const ev = EVENTS[idx % EVENTS.length];
      mins += 1;
      ev._clock = clock(mins);
      shown.unshift(ev);
      shown = shown.slice(0, 3);
      renderRow(rows[0], shown[0], true);
      renderRow(rows[1], shown[1], false);
      renderRow(rows[2], shown[2], false);
      // Slide-in de la fila nueva (replay reiniciando la animación).
      rows[0].style.animation = 'none';
      void rows[0].offsetWidth;
      rows[0].style.animation = 'pp-cas-tx-in .6s cubic-bezier(.22,.61,.36,1)';
      // KPIs laten.
      consumos += 1 + Math.floor(Math.random() * 2);
      if (consumosEl) { consumosEl.textContent = consumos; flash(consumosEl.parentElement); }
      recaudado += ev.amt;
      if (recaudadoEl) { recaudadoEl.textContent = fmtCL(recaudado); flash(recaudadoEl); }
      conc += 1;
      if (concEl) concEl.textContent = conc;
      idx++;
    }

    let inView = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.15 }).observe(hero);
    }
    function step() {
      if (inView && !document.hidden) tick();
      setTimeout(step, 5200 + Math.random() * 1800);
    }
    setTimeout(step, 4200);
  })();

  /* ── Beneficios · 4 mockups vivos en loop continuo ──────────────────
     Cada card corre un mini-sistema (matching / validación / wallet /
     cobranza) con datos que rotan. Pausa fuera de viewport y con la
     pestaña oculta; respeta prefers-reduced-motion (estado estático). */
  (function benefitZooms() {
    const cards = Array.from(document.querySelectorAll('.pp-zoom[data-zoom] .pp-zoom-card[data-kind]'));
    if (!cards.length) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fmtCL = (n) => '$' + Math.round(n).toLocaleString('es-CL');
    const n3 = (n) => Math.round(n).toLocaleString('es-CL');

    function makeClock() {
      let timers = new Set(), raf = 0, alive = false;
      return {
        get alive() { return alive; },
        after(ms, fn) { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); },
        tween(ms, onUpdate, onDone) {
          const start = performance.now(), ease = (t) => 1 - Math.pow(1 - t, 3);
          const tick = (now) => {
            if (!alive) return;
            const p = Math.min((now - start) / ms, 1);
            onUpdate(ease(p));
            if (p < 1) raf = requestAnimationFrame(tick); else if (onDone) onDone();
          };
          raf = requestAnimationFrame(tick);
        },
        start(fn) { if (alive) return; alive = true; fn(); },
        stop() { alive = false; timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(raf); }
      };
    }

    /* 1 · Conciliación — motor de matching en vivo */
    function driverConcilia(card, clock) {
      const q = (s) => card.querySelector(s);
      const bank = q('#pzcBank'), amt = q('#pzcAmt'), glosa = q('#pzcGlosa'), state = q('#pzcState'),
            fam = q('#pzcFam'), count = q('#pzcCount'), rows = Array.from(card.querySelectorAll('.pzc-recent-row')),
            sigs = Array.from(card.querySelectorAll('.pzc-sig'));
      const EV = [
        { bank: 'BEst', amt: 30000, glosa: 'Glosa “Almuerzo Benja 3°B”', fam: 'Familia Soto · 3°B' },
        { bank: 'Webpay', amt: 20000, glosa: 'Recarga app · Familia Vergara', fam: 'Familia Vergara · 6°A' },
        { bank: 'BCh', amt: 45000, glosa: 'Glosa “Tickets Maite 2°A”', fam: 'Familia Fuentes · 2°A' },
        { bank: 'BCi', amt: 25000, glosa: 'Transferencia · Familia Rivas', fam: 'Familia Rivas · 8°B' },
        { bank: 'BEst', amt: 25000, glosa: 'Glosa “Comedor Lucas 5°A”', fam: 'Familia Herrera · 5°A' },
        { bank: 'Webpay', amt: 60000, glosa: 'Recarga app · Familia Méndez', fam: 'Familia Méndez · 1°B' }
      ];
      let i = 0, c = 142;
      function setRow(row, bk, fm, am) {
        row.querySelector('.pzc-recent-bank').textContent = bk;
        row.querySelector('.pzc-recent-fam').textContent = fm;
        row.querySelector('.pzc-recent-amt').textContent = am;
      }
      function run() {
        const ev = EV[i % EV.length]; i++;
        card.classList.remove('is-resolved'); card.classList.add('is-matching');
        sigs.forEach((s) => s.classList.remove('on'));
        state.textContent = 'Analizando…';
        bank.textContent = ev.bank; bank.className = 'pzc-bank' + (ev.bank === 'Webpay' ? ' pzc-bank--wp' : '');
        amt.textContent = fmtCL(ev.amt); glosa.textContent = ev.glosa; fam.textContent = ev.fam;
        clock.after(500, () => sigs[0] && sigs[0].classList.add('on'));
        clock.after(950, () => sigs[1] && sigs[1].classList.add('on'));
        clock.after(1400, () => sigs[2] && sigs[2].classList.add('on'));
        clock.after(1850, () => {
          card.classList.remove('is-matching'); card.classList.add('is-resolved');
          state.textContent = 'Conciliado'; c++; count.textContent = n3(c);
        });
        clock.after(4400, () => {
          if (rows[1] && rows[0]) setRow(rows[1], rows[0].querySelector('.pzc-recent-bank').textContent, rows[0].querySelector('.pzc-recent-fam').textContent, rows[0].querySelector('.pzc-recent-amt').textContent);
          if (rows[0]) { setRow(rows[0], ev.bank, ev.fam, fmtCL(ev.amt)); rows[0].classList.remove('pzc-in'); void rows[0].offsetWidth; rows[0].classList.add('pzc-in'); }
          run();
        });
      }
      return { start: run, reduceState() { card.classList.remove('is-matching'); card.classList.add('is-resolved'); sigs.forEach((s) => s.classList.add('on')); state.textContent = 'Conciliado'; } };
    }

    /* 2 · Validaciones — terminal de validación (con caso bloqueado) */
    function driverValida(card, clock) {
      const q = (s) => card.querySelector(s);
      const avatar = q('#pzvAvatar'), name = q('#pzvName'), sub = q('#pzvSub'), tag = q('#pzvTag'),
            rtxt = q('#pzvResultTxt'), rsub = q('#pzvResultSub'), count = q('#pzvCount'), clk = q('#pzvClock');
      const ST = [
        { ini: 'SM', name: 'Sofía Martínez', sub: '5°B · Menú del día', ok: true, sub2: 'Ticket descontado · le quedan 4' },
        { ini: 'JR', name: 'Joaquín Rojas', sub: '7°A · Suscripción', ok: true, sub2: 'Suscripción activa' },
        { ini: 'MG', name: 'Mateo González', sub: '4°A · Menú del día', ok: true, sub2: 'Ticket descontado · le quedan 8' },
        { ini: 'BP', name: 'Benjamín Pérez', sub: '3°B · Menú del día', ok: false, sub2: 'No autorizado · recarga pendiente' },
        { ini: 'IV', name: 'Isidora Vergara', sub: '6°A · Menú del día', ok: true, sub2: 'Ticket descontado · le quedan 6' },
        { ini: 'LT', name: 'Lucas Torres', sub: '2°A · Menú del día', ok: true, sub2: 'Ticket descontado · le quedan 3' }
      ];
      let i = 0, c = 184, t = 12 * 3600 + 38 * 60 + 4;
      function paintClock() { const h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = t % 60; clk.textContent = [h, m, s].map((x) => String(x).padStart(2, '0')).join(':'); }
      function tickClock() { t++; paintClock(); clock.after(1000, tickClock); }
      function run() {
        const st = ST[i % ST.length]; i++;
        card.classList.remove('is-denied'); card.classList.add('is-scanning');
        avatar.textContent = st.ini; name.textContent = st.name; sub.textContent = st.sub;
        tag.textContent = st.ok ? 'Ticket digital' : 'Saldo $0';
        clock.after(1200, () => {
          card.classList.remove('is-scanning');
          if (st.ok) { rtxt.textContent = 'Validado'; rsub.textContent = st.sub2; c++; count.textContent = n3(c); }
          else { card.classList.add('is-denied'); rtxt.textContent = 'Sin saldo'; rsub.textContent = st.sub2; }
        });
        clock.after(4200, run);
      }
      return { start() { run(); tickClock(); }, reduceState() { card.classList.remove('is-scanning', 'is-denied'); rtxt.textContent = 'Validado'; paintClock(); } };
    }

    /* 3 · Wallet — saldo vivo con barra de nivel + ledger */
    function driverWallet(card, clock) {
      const q = (s) => card.querySelector(s);
      const num = q('#pzwNum'), bar = q('#pzwBarFill'), flag = q('#pzwFlag'), amtEl = q('.pzw-amt'),
            rows = Array.from(card.querySelectorAll('.pzw-row'));
      const MAX = 25000, COST = 2500, RECHARGE = 20000;
      let bal = 12500;
      function paint() {
        num.textContent = n3(bal);
        const pct = Math.max(6, Math.min(100, Math.round(bal / MAX * 100)));
        bar.style.width = pct + '%';
        const low = bal <= 5000;
        bar.classList.toggle('is-low', low); flag.classList.toggle('is-low', low);
        flag.textContent = low ? 'Saldo bajo' : 'Activo';
      }
      function pushRow(delta) {
        const r0 = rows[0], r1 = rows[1], recharge = delta > 0;
        if (r1 && r0) {
          r1.className = 'pzw-row' + (r0.classList.contains('is-recharge') ? ' is-recharge' : '');
          r1.querySelector('.pzw-row-ic').textContent = r0.querySelector('.pzw-row-ic').textContent;
          r1.querySelector('.pzw-row-lab').textContent = r0.querySelector('.pzw-row-lab').textContent;
          r1.querySelector('.pzw-row-amt').textContent = r0.querySelector('.pzw-row-amt').textContent;
        }
        r0.className = 'pzw-row' + (recharge ? ' is-recharge' : '');
        r0.querySelector('.pzw-row-ic').textContent = recharge ? '+' : '−';
        r0.querySelector('.pzw-row-lab').textContent = recharge ? 'Recarga · Webpay' : 'Menú del día';
        r0.querySelector('.pzw-row-amt').textContent = (recharge ? '+' : '−') + fmtCL(Math.abs(delta));
        void r0.offsetWidth; r0.classList.add('pzw-in');
      }
      function run() {
        // Validación de saldo: sólo se descuenta el menú si, tras el descuento,
        // el saldo no queda por debajo del costo del próximo consumo; si ya no
        // alcanza, en vez de descontar se recarga. Así el saldo nunca queda
        // negativo ni por debajo del costo, y oscila acotado (gasta → recarga).
        const delta = bal > COST ? -COST : RECHARGE;
        const from = bal, to = bal + delta;
        pushRow(delta);
        amtEl.classList.remove('bump'); void amtEl.offsetWidth; amtEl.classList.add('bump');
        clock.tween(700, (e) => { bal = Math.round(from + (to - from) * e); paint(); }, () => { bal = to; paint(); });
        clock.after(2600, run);
      }
      return { start: run, reduceState() { paint(); } };
    }

    /* 4 · Cobranza — depleción → aviso → recarga + demanda semanal */
    function driverCobranza(card, clock) {
      const q = (s) => card.querySelector(s);
      const tickEl = q('#pzoTickets'), wrap = q('#pzoTicketsWrap'), alertText = q('#pzoAlertText'),
            demandTot = q('#pzoDemandTot'), bars = Array.from(card.querySelectorAll('#pzoBars span'));
      let tot = 128, barH = [52, 34, 72, 58, 44], k = 0;
      function setTickets(n, bump) {
        tickEl.textContent = n;
        wrap.classList.toggle('is-low', n <= 2);
        if (bump) { wrap.classList.remove('bump'); void wrap.offsetWidth; wrap.classList.add('bump'); }
      }
      function run() {
        card.classList.remove('is-alert');
        setTickets(5, false);
        clock.after(850, () => setTickets(4, false));
        clock.after(1700, () => setTickets(3, false));
        clock.after(2550, () => { setTickets(2, true); alertText.innerHTML = 'Quedan <strong>2 almuerzos</strong> de Sofía.'; card.classList.add('is-alert'); });
        clock.after(4600, () => setTickets(10, true));
        clock.after(5200, () => {
          const idx = k % 5; k++;
          barH[idx] = Math.min(78, barH[idx] + 8); bars[idx].style.setProperty('--h', barH[idx] + '%');
          tot += 6; demandTot.textContent = n3(tot);
        });
        clock.after(7000, run);
      }
      return { start: run, reduceState() { setTickets(2, false); card.classList.add('is-alert'); } };
    }

    const DRIVERS = { concilia: driverConcilia, valida: driverValida, wallet: driverWallet, cobranza: driverCobranza };
    const ctrls = cards.map((card) => {
      const make = DRIVERS[card.dataset.kind];
      if (!make) return null;
      const clock = makeClock();
      return { zoom: card.closest('.pp-zoom'), clock, d: make(card, clock) };
    }).filter(Boolean);

    if (reduce) { ctrls.forEach((c) => c.d.reduceState && c.d.reduceState()); return; }

    // Loops mínimos y siempre vivos (el usuario los quiere "constantes"):
    // arrancan en load tras el primer paint y sólo se pausan/reanudan con la
    // pestaña oculta/visible (ahorro real). Sin gating por viewport (frágil).
    const startAll = () => ctrls.forEach((c) => c.clock.start(c.d.start));
    setTimeout(startAll, 400);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctrls.forEach((c) => c.clock.stop());
      else startAll();
    });
  })();

  /* ══════════════════════════════════════════════════════════════════
     REFACTOR 2026-05-20 · PRODV7 TABS · ECOSISTEMA SOFÍA · FEED BINGO
     Lógica nueva para tres bloques introducidos en el refactor del home:
     1. Tabs de productos con auto-rotación de 6s (cancela al click manual)
     2. Eco-moments + pills con auto-rotación de 4s (cancela en click)
     3. Feed de pagos del bingo en el mockup BL del hero (entrada continua)
     ══════════════════════════════════════════════════════════════════ */

  /* ── 1. Tabs de productos · prodv7 ───────────────────────────────── */
  (function prodv7Tabs() {
    const section = document.querySelector('.section-productos.prodv7');
    if (!section) return;
    const tabs = Array.from(section.querySelectorAll('.prodv7-tab'));
    const cards = Array.from(section.querySelectorAll('.prodv6-card[data-prod]'));
    const indicator = section.querySelector('.prodv7-tab-indicator');
    const stack = section.querySelector('.prodv7-stack');
    if (!tabs.length || !cards.length) return;

    // ── MOBILE (≤720px · R2.1) ──────────────────────────────────────────
    // En mobile los módulos son un CARRUSEL deslizable (CSS, cards en fila) y
    // los mockups van OCULTOS (CSS). Así que acá NO hay nada que orquestar:
    // no corremos tabs/auto-rotación/indicador (pelearían con el scroll) y no
    // marcamos card "activa" (todas quedan a opacidad plena → ninguna apagada).
    // Los iframes de mockup quedan detenidos solos (su handler de load sólo
    // hace 'start' si la card es activa Y la sección fue vista, lo cual no
    // ocurre acá). Early-return → el camino desktop queda intacto.
    const moduleMobile = () => window.matchMedia('(max-width: 720px)').matches;
    if (moduleMobile()) {
      // R2.3 · Pill de producto arriba de cada panel (en mobile las tabs están
      // ocultas, así que el panel no decía de qué módulo es). Tomamos ícono +
      // nombre de la tab correspondiente (data-tab === card.data-prod).
      cards.forEach((card) => {
        if (card.querySelector('.prodv7-mobile-pill')) return;
        const tab = tabs.find((t) => t.dataset.tab === card.dataset.prod);
        const textBlock = card.querySelector('.prodv6-card-text');
        if (!tab || !textBlock) return;
        const icon = tab.querySelector('.prodv7-tab-icon');
        const label = tab.querySelector('span:not(.prodv7-tab-icon)');
        const pill = document.createElement('span');
        pill.className = 'prodv7-mobile-pill';
        pill.setAttribute('aria-hidden', 'true');
        if (icon) pill.innerHTML = icon.outerHTML;
        const txt = document.createElement('span');
        txt.className = 'prodv7-mobile-pill-text';
        txt.textContent = label ? label.textContent.trim() : '';
        pill.appendChild(txt);
        textBlock.insertBefore(pill, textBlock.firstChild);
      });

      // Marcamos is-active en la card más centrada del scroller para que su
      // contenido quede a opacidad plena (.prodv6-card-inner pasa de .42 → 1).
      // IO sobre el stack → la activa SIEMPRE sigue a la que se está viendo,
      // nunca queda "pegada" inactiva. Los mockups van ocultos (CSS) y quietos.
      if ('IntersectionObserver' in window) {
        const ratios = new Map();
        let activeCard = cards.find((c) => c.classList.contains('is-active')) || cards[0];
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
          let best = null, bestR = 0;
          ratios.forEach((r, el) => { if (r > bestR) { bestR = r; best = el; } });
          if (best && best !== activeCard) {
            activeCard = best;
            cards.forEach((c) => c.classList.toggle('is-active', c === best));
          }
        }, { root: stack, threshold: [0.4, 0.6, 0.85] });
        cards.forEach((c) => io.observe(c));
      }
      return; // no ejecutamos la lógica de tabs en mobile
    }

    /* Tab cambia JUSTO ANTES de que cada mockup reinicie su 2do ciclo.
       Cada mockup tiene su propia duración → AUTO_MS per-product:
       - casino (Comedor): cycle 18.3s → tab a 18.2s
       - cpa: cycle 18.3s → tab a 18.2s
       - gestion: cycle 18.3s → tab a 18.2s
       - ligas (Talleres): cycle 19.2s → tab a 19.1s (popup descargado completo)
       getCycleMs() lee la duración del producto activo en cada tick. */
    const PRODUCT_CYCLES = {
      casino: 17900,   // Comedor · -300ms para que el primer cambio se sienta a tiempo
      cpa: 18200,
      gestion: 18200,
      ligas: 19100,
    };
    const DEFAULT_CYCLE = 18200;
    const TICK_MS = 50;
    const getCycleMs = () => {
      const tab = tabs[activeIdx];
      const prod = tab && tab.dataset.tab;
      return PRODUCT_CYCLES[prod] || DEFAULT_CYCLE;
    };
    let activeIdx = 0;
    let elapsed = 0;
    let autoTimer = null;
    let isHovered = false;
    let inView = false;
    let hasBeenVisible = false;  // first scroll into section gates mockup-start
    let progressBar = null;

    /* Inject progress bar element into the tabs container */
    progressBar = document.createElement('span');
    progressBar.className = 'prodv7-tab-progress';
    progressBar.setAttribute('aria-hidden', 'true');
    const tabsEl = section.querySelector('.prodv7-tabs');
    if (tabsEl) tabsEl.appendChild(progressBar);

    const moveIndicator = (instant = false) => {
      if (!indicator) return;
      const tab = tabs[activeIdx];
      if (!tab) return;
      const rect = tab.getBoundingClientRect();
      const parentRect = tab.parentElement.getBoundingClientRect();
      const x = rect.left - parentRect.left;
      if (instant) {
        indicator.style.transition = 'none';
        indicator.style.width = rect.width + 'px';
        indicator.style.transform = `translateX(${x}px)`;
        indicator.getBoundingClientRect(); /* force reflow */
        indicator.style.transition = '';
      } else {
        indicator.style.width = rect.width + 'px';
        indicator.style.transform = `translateX(${x}px)`;
      }
      if (progressBar) {
        progressBar.style.left = x + 'px';
        progressBar.style.width = rect.width + 'px';
      }
    };

    const updateProgressBar = (pct) => {
      if (!progressBar) return;
      /* scaleX from left edge of active tab */
      progressBar.style.transform = `scaleX(${pct})`;
      progressBar.style.transformOrigin = 'left center';
      progressBar.style.transition = pct === 0 ? 'none' : `transform ${TICK_MS}ms linear`;
    };

    /* Sync stack height to the tallest card (all cards are position:absolute
       so the stack doesn't get height from its children automatically). */
    const syncStackHeight = () => {
      if (!stack) return;
      let max = 0;
      cards.forEach((c) => { max = Math.max(max, c.scrollHeight); });
      if (max > 0) stack.style.minHeight = max + 'px';
    };

    const setActive = (idx, { manual = false } = {}) => {
      activeIdx = (idx + tabs.length) % tabs.length;
      elapsed = 0;
      updateProgressBar(0);
      tabs.forEach((t, i) => {
        const active = i === activeIdx;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      const target = tabs[activeIdx].dataset.tab;
      cards.forEach((c) => c.classList.toggle('is-active', c.dataset.prod === target));
      moveIndicator();

      /* PostMessage a los iframes de mockup: el panel activo recibe 'start'
         SÓLO si la sección ya fue scrolleada · evita que la animación corra
         mientras el usuario está en el hero. Los inactivos siempre 'stop'. */
      cards.forEach((c) => {
        const ifr = c.querySelector('.cmodulo-iframe');
        if (!ifr || !ifr.contentWindow) return;
        const isActive = c.classList.contains('is-active');
        const shouldStart = isActive && hasBeenVisible;
        try {
          ifr.contentWindow.postMessage(
            { type: shouldStart ? 'mockup-start' : 'mockup-stop' },
            '*'
          );
        } catch (e) { /* iframe puede no estar listo en el primer tick */ }
      });
    };

    /* Auto-rotation tick · usa cycle del producto activo */
    const tick = () => {
      if (isHovered || !inView) return;
      elapsed += TICK_MS;
      const cycleMs = getCycleMs();
      updateProgressBar(elapsed / cycleMs);
      if (elapsed >= cycleMs) {
        setActive(activeIdx + 1);
      }
    };

    const startAuto = () => {
      if (autoTimer) return;
      autoTimer = setInterval(tick, TICK_MS);
    };
    const stopAuto = () => {
      clearInterval(autoTimer);
      autoTimer = null;
    };

    /* Pause on hover over tabs or panel */
    const pauseZone = [section.querySelector('.prodv7-tabs-wrap'), stack].filter(Boolean);
    pauseZone.forEach((el) => {
      el.addEventListener('mouseenter', () => { isHovered = true; });
      el.addEventListener('mouseleave', () => { isHovered = false; });
    });

    /* Tab clicks */
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => setActive(i, { manual: true }));
    });

    /* Cross-sell chips */
    section.querySelectorAll('.prodv7-others-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const target = chip.dataset.jumpTab;
        const idx = tabs.findIndex((t) => t.dataset.tab === target);
        if (idx >= 0) setActive(idx, { manual: true });
      });
    });

    /* IntersectionObserver — controla mockup-start/stop + rotación según viewport.
       - Scroll a la sección: arranca mockup activo desde cycle 1 + auto-rotación
       - Scroll fuera: pausa mockup activo + auto-rotación (no corre mientras
         user está en hero/footer/otra sección)
       hasBeenVisible se queda true tras primera entrada para que setActive()
       (tab clicks/auto-rotation) sí envíe start. */
    const syncActiveMockup = (start) => {
      cards.forEach((c) => {
        const ifr = c.querySelector('.cmodulo-iframe');
        if (!ifr || !ifr.contentWindow) return;
        if (!c.classList.contains('is-active')) return;
        try {
          ifr.contentWindow.postMessage({ type: start ? 'mockup-start' : 'mockup-stop' }, '*');
        } catch (e) { /* iframe puede no estar listo */ }
      });
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const wasInView = inView;
          inView = e.isIntersecting;
          if (inView && !wasInView) {
            hasBeenVisible = true;
            // Reset rotation timer para que esté en sync con cycle 1 del mockup ·
            // activeIdx se preserva (user sigue en el mismo producto donde estaba)
            elapsed = 0;
            updateProgressBar(0);
            syncActiveMockup(true);  // mockup activo arranca desde cycle 1
            startAuto();
          } else if (!inView && wasInView) {
            syncActiveMockup(false);  // pausa el mockup activo
            stopAuto();
          }
        });
      }, { threshold: 0.25 });
      io.observe(section);
    } else {
      inView = true;
      hasBeenVisible = true;
      startAuto();
    }

    window.addEventListener('resize', () => { moveIndicator(true); syncStackHeight(); });

    /* Cuando cada iframe de mockup termine de cargar, sincronizamos su
       estado vía postMessage. Start solo si es activo Y la sección ya fue
       scrolleada · sino stop (mockup queda en idle hasta scroll). */
    cards.forEach((c) => {
      const ifr = c.querySelector('.cmodulo-iframe');
      if (!ifr) return;
      ifr.addEventListener('load', () => {
        if (!ifr.contentWindow) return;
        const shouldStart = c.classList.contains('is-active') && hasBeenVisible;
        try {
          ifr.contentWindow.postMessage(
            { type: shouldStart ? 'mockup-start' : 'mockup-stop' },
            '*'
          );
        } catch (e) { /* iframe puede no estar listo */ }
      });
    });

    setActive(0);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      moveIndicator(true);
      syncStackHeight();
    }));
  })();

  /* ── 2. Eco-moments · auto-expand del panel extra (2da pasada 20/05/2026) ──
     Cambios respecto a 1ra pasada:
     - Intervalo 4s → 5s (para alcanzar a leer el panel extra que se abre solo)
     - El panel .eco-moment-extra se abre/cierra vía CSS según .is-active.
       El JS solo alterna .is-active entre las 4 cards.
     - Click en una card o en su "Ver más" hacen lo mismo: activan esa card
       y detienen la auto-rotación.
     - Texto del botón cambia: si la card es activa → "Activo"; si no → "Ver más". */
  (function ecosistemaSofia() {
    const section = document.querySelector('.section-ecosistema');
    if (!section) return;
    const moments = Array.from(section.querySelectorAll('.eco-moment'));
    const pills = Array.from(section.querySelectorAll('.eco-pill'));
    if (!moments.length || !pills.length) return;

    let activeIdx = 0;
    let autoTimer = null;
    let userInterrupted = false;

    const refreshToggleTexts = () => {
      moments.forEach((m) => {
        const btn = m.querySelector('.eco-moment-toggle');
        if (!btn) return;
        const label = btn.querySelector('.eco-moment-toggle-text');
        const isActive = m.classList.contains('is-active');
        if (label) {
          label.textContent = isActive
            ? (label.dataset.textActive || 'Activo')
            : (label.dataset.textOpen || 'Ver más');
        }
        btn.setAttribute('aria-expanded', String(isActive));
        btn.classList.toggle('is-active', isActive);
      });
    };

    const setActive = (idx) => {
      activeIdx = (idx + moments.length) % moments.length;
      moments.forEach((m, i) => m.classList.toggle('is-active', i === activeIdx));
      const mod = moments[activeIdx].dataset.module;
      pills.forEach((p) => {
        const active = p.dataset.modulePill === mod;
        p.classList.toggle('is-active', active);
        p.setAttribute('aria-selected', String(active));
      });
      // Scroll-into-view en mobile cuando el flow es horizontal
      const flow = section.querySelector('.ecosistema-flow');
      if (flow && window.matchMedia('(max-width: 900px)').matches) {
        const m = moments[activeIdx];
        if (m) flow.scrollTo({ left: m.offsetLeft - 24, behavior: 'smooth' });
      }
      refreshToggleTexts();
    };
    const startAuto = () => {
      if (userInterrupted) return;
      stopAuto();
      autoTimer = setInterval(() => setActive(activeIdx + 1), 5000);
    };
    const stopAuto = () => {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    };

    // Click en pill salta al momento correspondiente y detiene la rotación
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        userInterrupted = true;
        stopAuto();
        const mod = pill.dataset.modulePill;
        const idx = moments.findIndex((m) => m.dataset.module === mod);
        if (idx >= 0) setActive(idx);
      });
    });
    // Click en cualquier momento o en su botón "Ver más" → activa la card
    // y detiene la rotación. El "Ver más" ya no maneja estado propio.
    moments.forEach((m, i) => {
      m.addEventListener('click', () => {
        userInterrupted = true;
        stopAuto();
        setActive(i);
      });
    });
    // Garantizamos que el click en el botón no se propague raro (igual sube
    // al handler de la card, pero stopPropagation evita doble disparo)
    section.querySelectorAll('.eco-moment-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        userInterrupted = true;
        stopAuto();
        const mom = btn.closest('.eco-moment');
        if (mom) {
          const idx = moments.indexOf(mom);
          if (idx >= 0) setActive(idx);
        }
      });
    });

    setActive(0);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) startAuto();
          else stopAuto();
        });
      }, { threshold: 0.2 });
      io.observe(section);
    } else {
      startAuto();
    }
  })();

  /* ── 3. Feed de pagos del bingo · 2 items (2da pasada 20/05/2026) ────
     El celular del mockup BL mide 200x356, solo entran 2 items con aire.
     Cada ~4s: el item --new pierde la clase y se desplaza al lugar del
     segundo; el segundo desaparece con fade; aparece un nuevo --new arriba.
     Pool fijo de 6 familias para no repetir inmediatamente. */
  (function bingoFeed() {
    const feed = document.getElementById('mockCpaFeed');
    if (!feed) return;
    const familias = [
      { name: 'Familia García', amt: '$15.000' },
      { name: 'Familia Pérez',  amt: '$12.000' },
      { name: 'Familia Soto',   amt: '$20.000' },
      { name: 'Familia López',  amt: '$10.000' },
      { name: 'Familia Rojas',  amt: '$18.000' },
      { name: 'Familia Muñoz',  amt: '$14.500' },
    ];
    // El idx arranca después de los 2 items ya pintados (García + Pérez)
    let idx = 2;

    const buildItem = (fam) => {
      const initials = fam.name.replace('Familia ', '').slice(0, 1).toUpperCase();
      const el = document.createElement('div');
      el.className = 'mock-cpa-feed-item mock-cpa-feed-item--new';
      el.innerHTML = `
        <div class="mock-cpa-feed-avatar">${initials}</div>
        <div class="mock-cpa-feed-meta">
          <strong>${fam.name}</strong>
          <span>Bingo solidario</span>
        </div>
        <span class="mock-cpa-feed-amt">${fam.amt}</span>
        <span class="mock-cpa-feed-time">hace 2s</span>
      `;
      return el;
    };

    const tick = () => {
      const items = feed.querySelectorAll('.mock-cpa-feed-item');
      if (items.length < 2) return;
      const oldNew = items[0];
      const second = items[1];

      // Paso 1: el segundo item se desvanece
      second.classList.add('mock-cpa-feed-item--leaving');

      // Paso 2 (350ms después): el viejo --new se desplaza al lugar 2 con
      // time actualizado; el saliente se elimina; entra el nuevo arriba.
      setTimeout(() => {
        if (second && second.parentNode) second.remove();
        oldNew.classList.remove('mock-cpa-feed-item--new');
        const oldNewTime = oldNew.querySelector('.mock-cpa-feed-time');
        if (oldNewTime) oldNewTime.textContent = 'hace 18s';
        const fam = familias[idx % familias.length];
        const fresh = buildItem(fam);
        feed.insertBefore(fresh, feed.firstChild);
        idx++;
      }, 350);
    };

    let feedTimer = null;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !feedTimer) {
            feedTimer = setInterval(tick, 4000);
          } else if (!e.isIntersecting && feedTimer) {
            clearInterval(feedTimer);
            feedTimer = null;
          }
        });
      }, { threshold: 0.25 });
      io.observe(feed);
    } else {
      feedTimer = setInterval(tick, 4000);
    }
  })();

  /* ══════════════════════════════════════════════════════════════════
     3RA PASADA · 21/05/2026 · MOCKUPS ANIMADOS NUEVOS
     Cada mockup arranca cuando su panel .prodv6-card es .is-active Y
     la sección está en viewport. IntersectionObserver pasivo.
     ══════════════════════════════════════════════════════════════════ */

  /* ── COMEDOR · Mockup 1 (cas-1) — flujo compra de tickets ── */
  (function casinoFlowMockup() {
    const mock = document.querySelector('[data-mock="cas-1"]');
    if (!mock) return;

    const screens = Array.from(mock.querySelectorAll('.mock-screen'));
    if (screens.length < 3) return;

    const ANIM_MS = 380;
    const DURATIONS = [3500, 3800, 2500];
    let cur = 0;
    let calDays = 3;
    let pending = [];

    const clr = (id) => { clearTimeout(id); };

    const go = (next) => {
      const curEl = screens[cur];
      const nextEl = screens[next];

      curEl.classList.remove('is-idle');
      curEl.classList.add('is-exit');
      const t1 = setTimeout(() => curEl.classList.remove('is-exit'), ANIM_MS);
      pending.push(t1);

      nextEl.classList.add('is-enter');
      const t2 = setTimeout(() => {
        nextEl.classList.remove('is-enter');
        nextEl.classList.add('is-idle');
        onEnter(next);
      }, ANIM_MS);
      pending.push(t2);

      cur = next;
    };

    const onEnter = (idx) => {
      if (idx === 1) {
        const jue   = mock.querySelector('#casDayJue');
        const total = mock.querySelector('#casCalTotal');
        const cta   = mock.querySelector('#casCalCta');
        if (jue)   jue.classList.remove('is-checked');
        if (total) total.innerHTML = '3 días · <strong>$7.500</strong>';
        if (cta)   cta.classList.remove('is-ready');
        calDays = 3;
        pending.push(setTimeout(() => {
          if (jue) jue.classList.add('is-checked');
          calDays = 4;
          if (total) total.innerHTML = '4 días · <strong>$10.000</strong>';
        }, 1000));
        pending.push(setTimeout(() => { if (cta) cta.classList.add('is-ready'); }, 2200));
      } else if (idx === 2) {
        const amt = mock.querySelector('#casConfirmAmt');
        const sub = mock.querySelector('#casConfirmSub');
        const fmt = n => '$' + n.toLocaleString('es-CL');
        if (amt) amt.textContent = fmt(calDays * 2500);
        if (sub) sub.textContent = calDays + ' tickets · Sofía Martínez · 5°B';
      }
    };

    const loop = () => {
      pending.push(setTimeout(() => {
        go((cur + 1) % screens.length);
        loop();
      }, DURATIONS[cur]));
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      let started = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && !started) {
            started = true;
            loop();
          }
        });
      }, { threshold: 0.25 });
      io.observe(card);
    }
  })();

  /* ── COMEDOR · Mockup 2 (cas-2) — validaciones + push ── */
  (function prodv6CasinoValidMockup() {
    const mock = document.querySelector('[data-mock="cas-2"]');
    if (!mock) return;

    const loop = () => {
      const rows = mock.querySelectorAll('.prodv6-cas-valid-row, .prodv6-cas-valid-push');
      rows.forEach(r => {
        r.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        r.offsetHeight;
        r.style.animation = '';
      });
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && card.classList.contains('is-active')) {
            loop();
            setInterval(loop, 9000);
          }
        });
      }, { threshold: 0.3 });
      io.observe(card);
    }
  })();

  /* ── CPA · Mockup 1 (cpa-1) — reveal secuencial de steps ── */
  (function prodv6CpaFlowMockup() {
    const mock = document.querySelector('[data-mock="cpa-1"]');
    if (!mock) return;

    const steps = mock.querySelectorAll('.prodv6-cpa-step');
    if (!steps.length) return;

    const reset = () => {
      steps.forEach(s => s.classList.remove('is-revealed'));
    };

    const reveal = (idx) => {
      if (idx >= steps.length) return;
      steps[idx].classList.add('is-revealed');
      setTimeout(() => reveal(idx + 1), 1200);
    };

    const loop = () => {
      reset();
      setTimeout(() => reveal(0), 400);
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && card.classList.contains('is-active')) {
            loop();
            setInterval(loop, 6500);
          }
        });
      }, { threshold: 0.3 });
      io.observe(card);
    }
  })();

  /* ── CPA · Desktop (cpa-desk) — flujo tesorería: dashboard → nueva colecta → confirmación ── */
  (function cpaFlowMockup() {
    const mock = document.querySelector('[data-mock="cpa-desk"]');
    if (!mock) return;

    const screens = Array.from(mock.querySelectorAll('.mock-screen'));
    if (screens.length < 3) return;

    const ANIM_MS = 380;
    const DURATIONS = [4000, 3000, 2500];
    let cur = 0;
    let pending = [];

    /* Feed animation while dashboard (screen 0) is visible */
    const pool = [
      { nombre: 'Familia Vargas',   monto: 25000 },
      { nombre: 'Familia Castillo', monto: 20000 },
      { nombre: 'Familia Espinoza', monto: 25000 },
      { nombre: 'Familia Riveros',  monto: 20000 },
    ];
    let feedIdx = 0;
    let feedTotal = 1840000;
    let feedFam = 42;

    const fmt = n => '$' + n.toLocaleString('es-CL');

    const pushFeedItem = () => {
      const feed = mock.querySelector('#cpaDesFeed');
      if (!feed) return;
      const p = pool[feedIdx % pool.length];
      feedIdx++;
      feedTotal += p.monto;
      feedFam = Math.min(feedFam + 1, 56);

      const amt = mock.querySelector('#cpaDesKRecaudado');
      const fam = mock.querySelector('#cpaDesKFamilias');
      const pctEl = mock.querySelector('#cpaDesKPct');
      const bar = mock.querySelector('#cpaDesBar');
      if (amt) amt.textContent = fmt(feedTotal);
      if (fam) fam.innerHTML = feedFam + '<i>/56</i>';
      const pct = Math.min((feedTotal / 2500000) * 100, 100);
      if (bar) bar.style.setProperty('--w', `${pct.toFixed(1)}%`);
      if (pctEl) pctEl.textContent = Math.round(pct) + '%';

      const item = document.createElement('div');
      item.className = 'prodv6-cpa-desk-feed-item';
      item.innerHTML = `
        <span class="prodv6-cpa-desk-feed-dot"></span>
        <span class="prodv6-cpa-desk-feed-name">${p.nombre}</span>
        <span class="prodv6-cpa-desk-feed-amt">${fmt(p.monto)}</span>
      `;
      feed.insertBefore(item, feed.firstChild);
      while (feed.children.length > 3) feed.removeChild(feed.lastChild);
    };

    let feedTimer = null;

    const go = (next) => {
      const curEl = screens[cur];
      const nextEl = screens[next];

      curEl.classList.remove('is-idle');
      curEl.classList.add('is-exit');
      pending.push(setTimeout(() => curEl.classList.remove('is-exit'), ANIM_MS));

      nextEl.classList.add('is-enter');
      pending.push(setTimeout(() => {
        nextEl.classList.remove('is-enter');
        nextEl.classList.add('is-idle');
        onEnter(next);
      }, ANIM_MS));

      cur = next;
    };

    const onEnter = (idx) => {
      if (idx === 0) {
        /* Reset dashboard to initial state for next cycle */
        feedTotal = 1840000; feedFam = 42; feedIdx = 0;
        const feed = mock.querySelector('#cpaDesFeed');
        if (feed) feed.innerHTML = '';
        const amt = mock.querySelector('#cpaDesKRecaudado');
        const fam = mock.querySelector('#cpaDesKFamilias');
        const pctEl = mock.querySelector('#cpaDesKPct');
        const bar = mock.querySelector('#cpaDesBar');
        if (amt) amt.textContent = fmt(feedTotal);
        if (fam) fam.innerHTML = '42<i>/56</i>';
        if (pctEl) pctEl.textContent = '67%';
        if (bar) bar.style.setProperty('--w', '67%');
        feedTimer = setInterval(pushFeedItem, 1200);
        pending.push(setTimeout(() => { clearInterval(feedTimer); }, DURATIONS[0] - 500));
      } else if (idx === 1) {
        const cta = mock.querySelector('#cpaNewCta');
        if (cta) cta.classList.remove('is-ready');
        pending.push(setTimeout(() => { if (cta) cta.classList.add('is-ready'); }, 1200));
      } else if (idx === 2) {
        const pay = mock.querySelector('#cpaSentFirstPay');
        if (pay) pay.classList.remove('is-visible');
        pending.push(setTimeout(() => { if (pay) pay.classList.add('is-visible'); }, 800));
      }
    };

    const loop = () => {
      pending.push(setTimeout(() => {
        go((cur + 1) % screens.length);
        loop();
      }, DURATIONS[cur]));
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      let started = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && !started) {
            started = true;
            onEnter(0);
            loop();
          }
        });
      }, { threshold: 0.25 });
      io.observe(card);
    }
  })();

  /* ── GESTIÓN · Mockup 1 (gest-1) — sectores que se completan ── */
  (function prodv6GestSectorsMockup() {
    const mock = document.querySelector('[data-mock="gest-1"]');
    if (!mock) return;

    const sectors = Array.from(mock.querySelectorAll('.prodv6-gest-sector'));
    const pct = mock.querySelector('.prodv6-gest-pct');
    if (!sectors.length) return;

    let step = 0;

    const reset = () => {
      sectors.forEach((s, i) => {
        s.classList.remove('prodv6-gest-sector--ok', 'prodv6-gest-sector--active');
        if (i < 3) s.classList.add('prodv6-gest-sector--ok');
        else if (i === 3) s.classList.add('prodv6-gest-sector--active');
      });
      if (pct) pct.textContent = '3 de 9 sectores';
      step = 0;
    };

    const advance = () => {
      step++;
      if (step > sectors.length) {
        setTimeout(reset, 3000);
        return;
      }
      sectors.forEach((s, i) => {
        s.classList.remove('prodv6-gest-sector--ok', 'prodv6-gest-sector--active');
        if (i < 3 + step) s.classList.add('prodv6-gest-sector--ok');
        else if (i === 3 + step) s.classList.add('prodv6-gest-sector--active');
      });
      if (pct) {
        const done = 3 + step;
        pct.textContent = done >= sectors.length ? `9 de 9 sectores ✓` : `${done} de 9 sectores`;
      }
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      let started = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && card.classList.contains('is-active') && !started) {
            started = true;
            reset();
            setInterval(advance, 2500);
          }
        });
      }, { threshold: 0.3 });
      io.observe(card);
    }
  })();

  /* ── GESTIÓN · Mockup 2 (gest-2) — reclamo con 3 estados cíclicos ── */
  (function prodv6GestClaimMockup() {
    const mock = document.querySelector('[data-mock="gest-2"]');
    if (!mock) return;

    const tag = mock.querySelector('#gestClaimTag');
    const time = mock.querySelector('#gestClaimTime');
    const status = mock.querySelector('#gestClaimStatus');
    if (!tag || !time || !status) return;

    const states = [
      { tag: 'Reclamo · Pendiente',    time: 'Esperando asignación',  dotClass: 'prodv6-claim-status-dot--pending',  text: 'Pendiente' },
      { tag: 'Reclamo · En revisión',  time: 'Asignado a mantención · 09:55', dotClass: 'prodv6-claim-status-dot--review',   text: 'En revisión' },
      { tag: 'Reclamo · Resuelto',     time: 'Resuelto en 18 hrs · foto adjunta', dotClass: 'prodv6-claim-status-dot--done',  text: 'Resuelto ✓' }
    ];

    let idx = 0;

    const apply = () => {
      const s = states[idx];
      tag.textContent = s.tag;
      time.textContent = s.time;
      const dot = status.querySelector('.prodv6-claim-status-dot');
      const text = status.querySelector('.prodv6-claim-status-text');
      if (dot) dot.className = 'prodv6-claim-status-dot ' + s.dotClass;
      if (text) text.textContent = s.text;
      idx = (idx + 1) % states.length;
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      let started = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && card.classList.contains('is-active') && !started) {
            started = true;
            apply();
            setInterval(apply, 2200);
          }
        });
      }, { threshold: 0.3 });
      io.observe(card);
    }
  })();

  /* ── TALLERES · Mockup 1 (lig-1) — cupos llenándose ── */
  (function prodv6LigInscMockup() {
    const mock = document.querySelector('[data-mock="lig-1"]');
    if (!mock) return;

    const num = mock.querySelector('#ligCuposNum');
    const fill = mock.querySelector('#ligCuposFill');
    const overlay = mock.querySelector('#ligCuposOverlay');
    const cta = mock.querySelector('#ligCuposCta');
    if (!num || !fill || !overlay || !cta) return;

    const states = [
      { num: '18 de 20', pct: 90,  overlay: false, cta: 'Inscribir · $45.000' },
      { num: '19 de 20', pct: 95,  overlay: false, cta: 'Inscribir · $45.000' },
      { num: '20 de 20', pct: 100, overlay: true,  cta: 'Lista de espera' }
    ];

    let idx = 0;

    const apply = () => {
      const s = states[idx];
      num.textContent = s.num;
      fill.style.setProperty('--w', `${s.pct}%`);
      overlay.classList.toggle('is-visible', s.overlay);
      cta.textContent = s.cta;
      cta.classList.toggle('is-full', s.overlay);
      idx = (idx + 1) % states.length;
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      let started = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && card.classList.contains('is-active') && !started) {
            started = true;
            apply();
            setInterval(apply, 2200);
          }
        });
      }, { threshold: 0.3 });
      io.observe(card);
    }
  })();

  /* ── TALLERES · Mockup 2 (lig-2) — planilla del partido ── */
  (function prodv6LigMatchMockup() {
    const mock = document.querySelector('[data-mock="lig-2"]');
    if (!mock) return;

    const score = mock.querySelector('#ligMatchScore');
    const min = mock.querySelector('#ligMatchMin');
    const events = mock.querySelector('#ligMatchEvents');
    if (!score || !min || !events) return;

    const eventList = [
      { min: 8,  type: 'goal',   text: 'Gol · Pedro S.',  scoreA: 1, scoreB: 0 },
      { min: 12, type: 'yellow', text: 'Diego M.',         scoreA: 1, scoreB: 0 },
      { min: 17, type: 'goal',   text: 'Gol · Sofía M.',   scoreA: 1, scoreB: 1 },
      { min: 23, type: 'goal',   text: 'Gol · Pedro S.',   scoreA: 2, scoreB: 1 }
    ];

    let idx = 0;

    const reset = () => {
      idx = 0;
      events.innerHTML = '';
      score.textContent = '5°B vs 6°A · 0 – 0';
      min.textContent = `min 0'`;
    };

    const tick = () => {
      if (idx >= eventList.length) {
        setTimeout(reset, 3000);
        idx++;
        return;
      }
      if (idx > eventList.length) return;
      const e = eventList[idx];
      const icon = e.type === 'goal'
        ? `<span class="prodv6-lig-event-ic prodv6-lig-event-ic--goal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="11" height="11"><circle cx="12" cy="12" r="8"/></svg></span>`
        : `<span class="prodv6-lig-event-ic prodv6-lig-event-ic--yellow"></span>`;
      const row = document.createElement('div');
      row.className = 'prodv6-lig-event prodv6-lig-event--new';
      row.innerHTML = `${icon}<span>${e.text}</span><span>${e.min}'</span>`;
      events.insertBefore(row, events.firstChild);
      while (events.children.length > 3) events.removeChild(events.lastChild);
      score.textContent = `5°B vs 6°A · ${e.scoreA} – ${e.scoreB}`;
      min.textContent = `min ${e.min}'`;
      idx++;
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      let started = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && card.classList.contains('is-active') && !started) {
            started = true;
            reset();
            setInterval(tick, 2000);
          }
        });
      }, { threshold: 0.3 });
      io.observe(card);
    }
  })();

  /* ── TALLERES · Desktop (lig-desk) — taller Fútbol llenándose ── */
  (function prodv6LigDeskMockup() {
    const mock = document.querySelector('[data-mock="lig-desk"]');
    if (!mock) return;

    const cuposEl = mock.querySelector('#ligDeskFutCupos');
    const fillEl  = mock.querySelector('#ligDeskFutFill');
    if (!cuposEl || !fillEl) return;

    let cupos = 18;
    const MAX = 20;

    const tick = () => {
      if (cupos >= MAX) {
        /* reset after a pause */
        setTimeout(() => {
          cupos = 15;
          cuposEl.textContent = cupos + '/' + MAX;
          fillEl.style.setProperty('--w', (cupos / MAX * 100) + '%');
        }, 3000);
        return;
      }
      cupos++;
      cuposEl.textContent = cupos + '/' + MAX;
      fillEl.style.setProperty('--w', (cupos / MAX * 100) + '%');
    };

    if ('IntersectionObserver' in window) {
      const card = mock.closest('.prodv6-card');
      if (!card) return;
      let started = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && card.classList.contains('is-active') && !started) {
            started = true;
            setInterval(tick, 2500);
          }
        });
      }, { threshold: 0.3 });
      io.observe(card);
    }
  })();

  /* ── ECOSISTEMA · live tiles + micro-animaciones cíclicas ── */
  (function ecosistemaLiveTiles() {
    const wrap = document.querySelector('.prodv6-closing-wrap');
    if (!wrap) return;

    // 1. Comedor: contador sube de a 1 cada 2.5s · feed rota con nombres reales
    const comedorNum = wrap.querySelector('[data-eco-counter]');
    const feedItem   = wrap.querySelector('.prodv6-closing-live-feed-item');
    if (comedorNum) {
      const target = parseInt(comedorNum.dataset.ecoCounter, 10);
      let current  = target - 5;
      comedorNum.textContent = current;
      const feedNames = [
        'Sofía M. · 12:38', 'Carlos R. · 12:40', 'Laura P. · 12:41',
        'Tomás G. · 12:43', 'Valentina S. · 12:44', 'Diego F. · 12:46',
      ];
      let feedIdx = 0;
      const tick = () => {
        current++;
        if (current > target + 6) current = target - 5;
        comedorNum.textContent = current;
        comedorNum.classList.remove('is-updated');
        void comedorNum.offsetWidth;
        comedorNum.classList.add('is-updated');
        if (feedItem) {
          feedItem.textContent = feedNames[feedIdx % feedNames.length];
          feedIdx++;
          feedItem.classList.remove('is-entering');
          void feedItem.offsetWidth;
          feedItem.classList.add('is-entering');
        }
      };
      setInterval(tick, 2500);
    }

    // 2. CPA: bingo sube 2% cada 3s · muestra monto · celebra al 100% y resetea
    const bingoPct    = wrap.querySelector('[data-eco-bingo]');
    const bingoFill   = wrap.querySelector('.prodv6-closing-live-bingo-fill');
    const bingoRaised = wrap.querySelector('.prodv6-closing-live-bingo-raised');
    if (bingoPct && bingoFill) {
      let pct = 74;
      const meta = 1500000;
      const fmt  = n => '$' + n.toLocaleString('es-CL');
      const updateBingo = () => {
        bingoPct.textContent = pct + '%';
        bingoFill.style.setProperty('--w', pct + '%');
        bingoFill.style.width = pct + '%';
        if (bingoRaised) bingoRaised.textContent = fmt(Math.round(meta * pct / 100)) + ' recaudados';
      };
      updateBingo();
      setInterval(() => {
        pct = pct >= 100 ? 65 : pct + 2;
        updateBingo();
      }, 3000);
    }

    // 3. Gestión: sectores se aprueban de a uno cada 2.5s · pausa 3s al completar · reset
    const sectors   = wrap.querySelectorAll('[data-eco-sector]');
    const checkList = wrap.querySelector('.prodv6-closing-live-check');
    if (sectors.length) {
      let step   = 0;
      let paused = false;
      setInterval(() => {
        if (paused) return;
        if (step < sectors.length) {
          sectors[step].classList.add('is-done');
          step++;
          if (step === sectors.length) {
            paused = true;
            if (checkList) checkList.classList.add('is-all-done');
            setTimeout(() => {
              sectors.forEach(s => s.classList.remove('is-done'));
              if (checkList) checkList.classList.remove('is-all-done');
              step   = 0;
              paused = false;
            }, 3000);
          }
        }
      }, 2500);
    }

    // 4. Talleres: cupos suben de 14 a 20 · urgencia al acercarse · "¡Cupo completo!" al final
    const cuposEl     = wrap.querySelector('[data-eco-cupos]');
    const cuposStatus = wrap.querySelector('.prodv6-closing-live-cupos-status');
    const cuposNum    = wrap.querySelector('.prodv6-closing-live-cupos-num');
    if (cuposEl) {
      let cupos  = 14;
      let locked = false;
      const updateCupos = () => {
        cuposEl.textContent = `${cupos} / 20`;
        const rem = 20 - cupos;
        if (cuposStatus) cuposStatus.classList.remove('is-urgent', 'is-full');
        if (cuposNum)    cuposNum.classList.remove('is-full');
        if (cupos >= 20) {
          if (cuposStatus) { cuposStatus.textContent = '¡Cupo completo!'; cuposStatus.classList.add('is-full'); }
          if (cuposNum)    cuposNum.classList.add('is-full');
        } else if (rem <= 2) {
          if (cuposStatus) { cuposStatus.textContent = `¡${rem} cupo${rem > 1 ? 's' : ''} disponible${rem > 1 ? 's' : ''}!`; cuposStatus.classList.add('is-urgent'); }
        } else {
          if (cuposStatus) cuposStatus.textContent = 'inscripciones abiertas';
        }
      };
      updateCupos();
      setInterval(() => {
        if (locked) return;
        cupos++;
        if (cupos > 20) cupos = 20;
        updateCupos();
        if (cupos >= 20) {
          locked = true;
          setTimeout(() => { cupos = 14; updateCupos(); locked = false; }, 3500);
        }
      }, 2200);
    }
  })();

});