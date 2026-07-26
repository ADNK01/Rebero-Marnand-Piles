import { checkPassword, readJsonBody } from './_auth.js';
import { readFile, commitFiles } from './_github.js';
import { render } from './_render.js';

const MAX_PAYLOAD = 2_000_000; // garde-fou : content.json fait ~60 Ko

/**
 * POST /api/save
 * Corps : { content, theme, message? }
 * Enregistre content.json + theme.json, regenere index.html, et pousse le tout
 * en un seul commit (donc un seul redeploiement Vercel).
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

  const { content, theme, message } = body;
  if (!content || typeof content !== 'object' || !content.texts) {
    return res.status(400).json({ ok: false, error: 'Contenu invalide : "texts" est requis.' });
  }
  if (!theme || typeof theme !== 'object') {
    return res.status(400).json({ ok: false, error: 'Theme invalide.' });
  }

  const contentJson = JSON.stringify(content, null, 2);
  const themeJson = JSON.stringify(theme, null, 2);
  if (contentJson.length + themeJson.length > MAX_PAYLOAD) {
    return res.status(413).json({ ok: false, error: 'Modifications trop volumineuses.' });
  }

  try {
    const currentHtml = await readFile('index.html');
    const nextHtml = render(currentHtml, content, theme);

    const sha = await commitFiles(
      [
        { path: 'index.html', content: nextHtml },
        { path: 'content.json', content: contentJson + '\n' },
        { path: 'theme.json', content: themeJson + '\n' },
      ],
      message && String(message).trim()
        ? `CMS : ${String(message).trim().slice(0, 120)}`
        : 'CMS : mise a jour du contenu et du design'
    );

    return res.status(200).json({
      ok: true,
      commit: sha.slice(0, 7),
      note: 'Enregistre. Vercel redeploie le site : les changements sont visibles en 30 a 60 secondes.',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
