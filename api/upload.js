import { checkPassword, readJsonBody } from './_auth.js';
import { commitFiles } from './_github.js';

const MAX_BYTES = 3 * 1024 * 1024; // 3 Mo : au-dela, Vercel refuse la requete
const ALLOWED = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

function slugify(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  const clean = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return `${clean || 'image'}-${Date.now().toString(36)}${ext}`;
}

/**
 * POST /api/upload
 * Corps : { filename, data } — "data" est le fichier encode en base64.
 * Depose l'image dans /images et renvoie son chemin public.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee.' });
  }

  const authError = checkPassword(req);
  if (authError) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return res.status(401).json({ ok: false, error: authError });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'Corps de requete illisible.' });
  }

  const { filename, data } = body;
  if (typeof filename !== 'string' || !ALLOWED.test(filename)) {
    return res.status(400).json({ ok: false, error: 'Format accepte : jpg, png, webp, gif, avif ou svg.' });
  }
  if (typeof data !== 'string' || data.length === 0) {
    return res.status(400).json({ ok: false, error: 'Fichier manquant.' });
  }

  const base64 = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: 'Image trop lourde (3 Mo maximum).' });
  }

  const path = `images/${slugify(filename)}`;
  try {
    await commitFiles([{ path, content: base64, encoding: 'base64' }], `CMS : ajout de l'image ${path}`);
    return res.status(200).json({ ok: true, path });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
