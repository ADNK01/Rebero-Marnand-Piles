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

  /* ---- videos ----
     Jumeau de api/_video.js : toute modification la-bas doit etre reportee ici,
     sinon l'apercu de /admin ne correspondra plus au site publie. */

  var YOUTUBE = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
  var VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;
  var MIME = {
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    ogg: 'video/ogg',
    mov: 'video/quicktime'
  };

  function normalizeVideo(entry) {
    if (typeof entry === 'string') {
      var isEmbed = YOUTUBE.test(entry) || VIMEO.test(entry);
      return {
        mode: isEmbed ? 'link' : 'file',
        file: isEmbed ? '' : entry,
        link: isEmbed ? entry : '',
        poster: ''
      };
    }
    if (!entry || typeof entry !== 'object') return { mode: 'file', file: '', link: '', poster: '' };
    return {
      mode: entry.mode === 'link' ? 'link' : 'file',
      file: typeof entry.file === 'string' ? entry.file.trim() : '',
      link: typeof entry.link === 'string' ? entry.link.trim() : '',
      poster: typeof entry.poster === 'string' ? entry.poster.trim() : ''
    };
  }

  function videoSource(entry) {
    var v = normalizeVideo(entry);
    var preferred = v.mode === 'link' ? v.link : v.file;
    return preferred || (v.mode === 'link' ? v.file : v.link) || '';
  }

  function embedUrl(url) {
    var yt = YOUTUBE.exec(url);
    if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0&modestbranding=1&playsinline=1';
    var vm = VIMEO.exec(url);
    if (vm) return 'https://player.vimeo.com/video/' + vm[1] + '?dnt=1';
    return null;
  }

  function attr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function videoMarkup(entry, fallbackPoster) {
    var v = normalizeVideo(entry);
    var src = videoSource(entry);
    if (!src) return '';

    var embed = embedUrl(src);
    if (embed) {
      return '<iframe src="' + attr(embed) + '" title="Video de presentation" loading="lazy" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    }

    var clean = src.split(/[?#]/)[0];
    var ext = clean.slice(clean.lastIndexOf('.') + 1).toLowerCase();
    var type = MIME[ext] || 'video/mp4';
    var poster = v.poster || fallbackPoster || '';

    return '<video id="business-video-local" controls preload="metadata"' +
      (poster ? ' poster="' + attr(poster) + '"' : '') + '>' +
      '<source src="' + attr(src) + '" type="' + attr(type) + '">' +
      'Votre navigateur ne supporte pas la lecture vidéo.' +
      '</video>';
  }

  function applyVideos(videos) {
    if (!videos) return;
    document.querySelectorAll('[data-cms-video]').forEach(function (el) {
      var key = el.getAttribute('data-cms-video');
      if (!Object.prototype.hasOwnProperty.call(videos, key)) return;

      if (!el.hasAttribute('data-cms-poster-initial')) {
        var first = el.querySelector('video');
        el.setAttribute('data-cms-poster-initial', (first && first.getAttribute('poster')) || '');
      }

      var html = videoMarkup(videos[key], el.getAttribute('data-cms-poster-initial'));

      // On ne reecrit le lecteur que s'il a reellement change : sinon chaque
      // frappe au clavier relancerait le chargement de la video dans l'apercu.
      if (el.getAttribute('data-cms-rendered') === html) return;
      el.setAttribute('data-cms-rendered', html);
      el.innerHTML = html;
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
    applyVideos(content.videos);
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
