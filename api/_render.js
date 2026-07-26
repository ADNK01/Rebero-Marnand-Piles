/**
 * Applique content.json + theme.json dans index.html.
 *
 * C'est le coeur du CMS : plutot que de charger le contenu en JavaScript cote
 * visiteur (ce qui provoque un clignotement et penalise le referencement), on
 * reecrit le HTML une fois, au moment de l'enregistrement. Le site public reste
 * un pur fichier statique.
 */
import { parse } from 'node-html-parser';

const LANGS = ['fr', 'en', 'rw'];
const THEME_START = '/* CMS-THEME-START */';
const THEME_END = '/* CMS-THEME-END */';

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Reconstruit le bloc :root a partir de theme.json. */
function themeBlock(theme) {
  const lines = Object.keys(theme)
    .filter((key) => key.charAt(0) !== '_')
    .map((key) => `            --${key}: ${String(theme[key]).replace(/[\r\n]+/g, ' ')};`);
  return `${THEME_START}\n        :root {\n${lines.join('\n')}\n        }\n        ${THEME_END}`;
}

export function render(html, content, theme) {
  const settings = content.settings || {};
  const defaultLang = LANGS.includes(settings.defaultLang) ? settings.defaultLang : 'fr';

  /* ---------- design ---------- */
  const start = html.indexOf(THEME_START);
  const end = html.indexOf(THEME_END);
  if (start === -1 || end === -1) {
    throw new Error("Marqueurs CMS-THEME introuvables dans index.html : le fichier a ete modifie a la main.");
  }
  html = html.slice(0, start) + themeBlock(theme) + html.slice(end + THEME_END.length);

  /* ---------- contenu ---------- */
  const root = parse(html, { comment: true, blockTextElements: { script: true, style: true } });

  const texts = content.texts || {};
  root.querySelectorAll('[data-cms]').forEach((el) => {
    const entry = texts[el.getAttribute('data-cms')];
    if (!entry) return;
    LANGS.forEach((lang) => {
      if (typeof entry[lang] === 'string') el.setAttribute(`data-${lang}`, escapeHtml(entry[lang]));
    });
    // Le texte visible est ecrit dans la langue par defaut : le visiteur ne voit
    // jamais une autre langue clignoter avant que le JavaScript ne s'execute,
    // et c'est cette langue-la que Google indexe.
    let value = entry[defaultLang];
    if (typeof value !== 'string' || value === '') value = entry.fr || entry.en || '';
    el.set_content(escapeHtml(value));
  });

  const images = content.images || {};
  root.querySelectorAll('[data-cms-img]').forEach((el) => {
    const src = images[el.getAttribute('data-cms-img')];
    if (typeof src === 'string' && src) el.setAttribute('src', src);
  });

  const links = content.links || {};
  root.querySelectorAll('[data-cms-link]').forEach((el) => {
    const href = links[el.getAttribute('data-cms-link')];
    if (typeof href === 'string' && href) el.setAttribute('href', href);
  });

  const embeds = content.embeds || {};
  root.querySelectorAll('[data-cms-embed]').forEach((el) => {
    const src = embeds[el.getAttribute('data-cms-embed')];
    if (typeof src === 'string' && src) el.setAttribute('src', src);
  });

  /* ---------- langue par defaut ---------- */
  const htmlEl = root.querySelector('html');
  if (htmlEl) htmlEl.setAttribute('lang', defaultLang);

  const selector = root.querySelector('#language-selector');
  if (selector) {
    selector.querySelectorAll('option').forEach((opt) => {
      opt.removeAttribute('selected');
      if (opt.getAttribute('value') === defaultLang) opt.setAttribute('selected', 'selected');
    });
  }

  /* ---------- reglages generaux ---------- */
  if (settings.title) {
    const title = root.querySelector('title');
    if (title) title.set_content(escapeHtml(settings.title));
  }
  if (typeof settings.description === 'string') {
    const head = root.querySelector('head');
    let meta = root.querySelector('meta[name="description"]');
    if (!meta && head) {
      head.insertAdjacentHTML('beforeend', '\n    <meta name="description" content="">');
      meta = root.querySelector('meta[name="description"]');
    }
    if (meta) meta.setAttribute('content', escapeHtml(settings.description));
  }
  if (theme._meta && theme._meta.googleFontUrl) {
    const link = root.querySelector('#cms-font-link');
    if (link) link.setAttribute('href', theme._meta.googleFontUrl);
  }

  return root.toString();
}
