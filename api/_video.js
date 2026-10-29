/**
 * Fabrique le lecteur video a partir d'une entree de content.json -> "videos".
 *
 * Deux sources possibles, au choix de l'administrateur :
 *   - "file" : un fichier televerse (Vercel Blob) ou un chemin du depot
 *   - "link" : un lien YouTube ou Vimeo, transforme en lecteur integre
 *
 * Jumeau cote navigateur : videoMarkup() dans cms/site-cms.js. Toute
 * modification ici doit etre reportee la-bas, sinon l'apercu de /admin ne
 * correspondra plus au site publie.
 */

const YOUTUBE = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;

const MIME = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
};

/** Echappe une valeur destinee a un attribut HTML entre guillemets doubles. */
function attr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Accepte l'ancien format (une simple chaine) comme le nouveau (un objet). */
export function normalizeVideo(entry) {
  if (typeof entry === 'string') {
    const isEmbed = YOUTUBE.test(entry) || VIMEO.test(entry);
    return {
      mode: isEmbed ? 'link' : 'file',
      file: isEmbed ? '' : entry,
      link: isEmbed ? entry : '',
      poster: '',
    };
  }
  if (!entry || typeof entry !== 'object') {
    return { mode: 'file', file: '', link: '', poster: '' };
  }
  return {
    mode: entry.mode === 'link' ? 'link' : 'file',
    file: typeof entry.file === 'string' ? entry.file.trim() : '',
    link: typeof entry.link === 'string' ? entry.link.trim() : '',
    poster: typeof entry.poster === 'string' ? entry.poster.trim() : '',
  };
}

/**
 * La source reellement diffusee. Si le mode choisi est vide, on retombe sur
 * l'autre : une configuration a moitie remplie affiche quand meme la video.
 */
export function videoSource(entry) {
  const v = normalizeVideo(entry);
  const preferred = v.mode === 'link' ? v.link : v.file;
  return preferred || (v.mode === 'link' ? v.file : v.link) || '';
}

/** Transforme un lien de partage YouTube / Vimeo en URL de lecteur integre. */
export function embedUrl(url) {
  const yt = YOUTUBE.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1`;
  const vm = VIMEO.exec(url);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return null;
}

/** Le HTML a placer dans l'element porteur de data-cms-video. */
export function videoMarkup(entry, fallbackPoster) {
  const v = normalizeVideo(entry);
  const src = videoSource(entry);
  if (!src) return '';

  const embed = embedUrl(src);
  if (embed) {
    return (
      `<iframe src="${attr(embed)}" title="Video de presentation" loading="lazy" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
      `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
    );
  }

  const clean = src.split(/[?#]/)[0];
  const ext = clean.slice(clean.lastIndexOf('.') + 1).toLowerCase();
  const type = MIME[ext] || 'video/mp4';
  const poster = v.poster || fallbackPoster || '';

  return (
    `<video id="business-video-local" controls preload="metadata"` +
    (poster ? ` poster="${attr(poster)}"` : '') +
    `>\n` +
    `                        <source src="${attr(src)}" type="${attr(type)}">\n` +
    `                        Votre navigateur ne supporte pas la lecture vidéo.\n` +
    `                    </video>`
  );
}
