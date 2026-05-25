/* ===========================================================================
   Outra marketing site — shared client-side behaviours
   Modules: mega-menu, audience switcher, reveal-on-scroll, insight tabs,
            mobile nav toggle, newsletter form stub.
   No build step; load with <script defer src="/assets/outra.js"></script>.
   =========================================================================== */
(function () {
  'use strict';

  // ── Audience switcher ──────────────────────────────────────────────────
  // Reads cookie on load to set <html data-audience="...">. Listens for
  // clicks on .audience-chip elements; persists choice for 90 days.
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function applyAudience(aud) {
    if (!aud) return;
    document.documentElement.setAttribute('data-audience', aud);
    document.querySelectorAll('.audience-chip').forEach(function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-aud') === aud);
    });
  }

  // Apply persisted audience as early as possible.
  var savedAud = getCookie('outra_aud');
  if (savedAud) applyAudience(savedAud);

  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.audience-chip');
    if (!chip) return;
    var aud = chip.getAttribute('data-aud');
    if (!aud) return;
    applyAudience(aud);
    setCookie('outra_aud', aud, 90);
  });

  // Default to brand if nothing selected yet so the audience panel still
  // shows something obvious on first visit.
  if (!savedAud) {
    document.addEventListener('DOMContentLoaded', function () {
      if (!document.documentElement.hasAttribute('data-audience')) {
        applyAudience('brand');
      }
    });
  }

  // ── Mega-menu ───────────────────────────────────────────────────────────
  function closeAllMenus(except) {
    document.querySelectorAll('.mega-menu.is-open').forEach(function (m) {
      if (m !== except) m.classList.remove('is-open');
    });
    document.querySelectorAll('.nav-trigger.is-open').forEach(function (t) {
      var menuId = t.getAttribute('aria-controls');
      var menu = menuId && document.getElementById(menuId);
      if (menu && menu === except) return;
      t.classList.remove('is-open');
      t.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.nav-trigger[data-menu]');
    if (trigger) {
      e.preventDefault();
      var menuId = trigger.getAttribute('data-menu');
      var menu = document.getElementById(menuId);
      if (!menu) return;
      var willOpen = !menu.classList.contains('is-open');
      closeAllMenus(willOpen ? menu : null);
      if (willOpen) {
        menu.classList.add('is-open');
        trigger.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    // Click outside any menu closes them all
    if (!e.target.closest('.mega-menu') && !e.target.closest('.nav-trigger')) {
      closeAllMenus();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllMenus();
  });

  // Hover open on desktop (delay close so users can move from trigger to menu)
  var hoverTimer;
  document.querySelectorAll('.nav-item').forEach(function (item) {
    var trigger = item.querySelector('.nav-trigger[data-menu]');
    if (!trigger) return;
    var menuId = trigger.getAttribute('data-menu');
    var menu = document.getElementById(menuId);
    if (!menu) return;
    function open() {
      if (window.innerWidth < 900) return;
      clearTimeout(hoverTimer);
      closeAllMenus(menu);
      menu.classList.add('is-open');
      trigger.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function scheduleClose() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        menu.classList.remove('is-open');
        trigger.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }, 180);
    }
    function cancelClose() { clearTimeout(hoverTimer); }
    item.addEventListener('mouseenter', open);
    item.addEventListener('mouseleave', scheduleClose);
    menu.addEventListener('mouseenter', cancelClose);
    menu.addEventListener('mouseleave', scheduleClose);
  });

  // ── Mobile nav toggle ──────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.nav-toggle');
    if (!toggle) return;
    var nav = document.querySelector('.nav-primary');
    if (nav) nav.classList.toggle('is-open');
  });

  // ── Reveal on scroll ───────────────────────────────────────────────────
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.05 });

    var initReveals = function () {
      document.querySelectorAll('.reveal').forEach(function (el) {
        observer.observe(el);
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initReveals);
    } else {
      initReveals();
    }
  }

  // ── Tabs (Insights strip on home + insights hub) ───────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.tab-btn[data-tab]');
    if (!btn) return;
    var tabId = btn.getAttribute('data-tab');
    var strip = btn.closest('.tab-strip');
    var container = strip ? strip.parentElement : btn.parentElement;
    if (!container) return;
    container.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('is-active', b === btn);
    });
    container.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-tab') === tabId);
    });
  });

  // ── Newsletter / forms stub ────────────────────────────────────────────
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('.footer-newsletter-form, .demo-form')) return;
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"], button:not([type])');
    if (btn) {
      var orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Thanks ✓';
      setTimeout(function () { btn.disabled = false; btn.textContent = orig; form.reset(); }, 2400);
    }
  });
})();
