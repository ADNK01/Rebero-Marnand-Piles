/*!
 * site-cms.js — pont d'apercu entre le site public et l'administration (/admin).
 *
 * Sur le site public ce fichier ne fait strictement rien : le contenu et le
 * design sont deja ecrits « en dur » dans index.html au moment de
 * l'enregistrement (voir api/_render.js). Aucune requete, aucun clignotement.
 *
 * Charge dans l'iframe de /admin avec ?cms-preview=1, il ecoute les messages
 * postMessage envoyes par l'administration et applique les modifications en
 * direct, sans rien enregistrer.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  if (params.get('cms-preview') !== '1') return;
  if (window.parent === window) return;

  document.body.classList.add('cms-preview');

  var LANGS = ['fr', 'en', 'rw'];
  var currentLang = 'fr';

  /* ---------------- design ---------------- */

  function applyTheme(theme) {
    if (!theme) return;
    var rootStyle = document.documentElement.style;
    Object.keys(theme).forEach(function (key) {
      if (key.charAt(0) === '_') return;
      rootStyle.setProperty('--' + key, String(theme[key]));
    });

    var meta = theme._meta || {};
    var link = document.getElementById('cms-font-link');
    if (link && meta.googleFontUrl && link.getAttribute('href') !== meta.googleFontUrl) {
      link.setAttribute('href', meta.googleFontUrl);
    }
  }

  /* ---------------- contenu ---------------- */

  function applyTexts(texts) {
    if (!texts) return;
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var entry = texts[el.getAttribute('data-cms')];
      if (!entry) return;
      LANGS.forEach(function (lang) {
        if (typeof entry[lang] === 'string') el.setAttribute('data-' + lang, entry[lang]);
      });
      var value = entry[currentLang];
      if (typeof value !== 'string' || value === '') value = entry.fr || '';
      el.textContent = value;
    });
  }

  function applyImages(images) {
    if (!images) return;
    document.querySelectorAll('[data-cms-img]').forEach(function (el) {
      var src = images[el.getAttribute('data-cms-img')];
      if (typeof src === 'string' && src && el.getAttribute('src') !== src) {
        el.setAttribute('src', src);
      }
    });
  }

  function applyLinks(links) {
    if (!links) return;
    document.querySelectorAll('[data-cms-link]').forEach(function (el) {
      var href = links[el.getAttribute('data-cms-link')];
      if (typeof href === 'string' && href) el.setAttribute('href', href);
    });
  }

  function applyEmbeds(embeds) {
    if (!embeds) return;
    document.querySelectorAll('[data-cms-embed]').forEach(function (el) {
      var src = embeds[el.getAttribute('data-cms-embed')];
      if (typeof src === 'string' && src && el.getAttribute('src') !== src) {
        el.setAttribute('src', src);
      }
    });
  }

  /* ---------------- navigation ---------------- */

  function showSection(pageId) {
    var target = document.getElementById(pageId);
    if (!target) return;
    document.querySelectorAll('.page-section').forEach(function (s) {
      s.classList.remove('active');
    });
    target.classList.add('active');
    document.querySelectorAll('nav .nav-item').forEach(function (item) {
      var onclick = item.getAttribute('onclick') || '';
      item.classList.toggle('active', onclick.indexOf("'" + pageId + "'") !== -1);
    });
    window.scrollTo(0, 0);
  }

  /* ---------------- messages ---------------- */

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || msg.type !== 'cms:apply') return;

    if (msg.lang && LANGS.indexOf(msg.lang) !== -1) {
      currentLang = msg.lang;
      var selector = document.getElementById('language-selector');
      if (selector) selector.value = currentLang;
    }
    applyTheme(msg.theme);
    var content = msg.content || {};
    applyTexts(content.texts);
    applyImages(content.images);
    applyLinks(content.links);
    applyEmbeds(content.embeds);
    if (msg.page) showSection(msg.page);
    if (msg.focusKey) {
      var el = document.querySelector('[data-cms="' + msg.focusKey + '"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'outline-color .4s ease';
        el.style.outline = '3px solid var(--color-accent)';
        el.style.outlineOffset = '3px';
        setTimeout(function () {
          el.style.outline = '';
        }, 1600);
      }
    }
  });

  /* clic sur un texte -> l'admin ouvre le champ correspondant */
  document.addEventListener(
    'click',
    function (event) {
      var el = event.target.closest('[data-cms]');
      if (!el) return;
      event.preventDefault();
      window.parent.postMessage({ type: 'cms:select', key: el.getAttribute('data-cms') }, '*');
    },
    true
  );

  /* neutralise la navigation interne pour rester dans l'apercu */
  document.addEventListener(
    'click',
    function (event) {
      var link = event.target.closest('a[href]');
      if (link && !link.getAttribute('href').startsWith('#')) event.preventDefault();
    },
    true
  );

  window.parent.postMessage({ type: 'cms:ready' }, '*');
})();
