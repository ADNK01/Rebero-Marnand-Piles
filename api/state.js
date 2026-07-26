import { checkPassword } from './_auth.js';
import { readFile } from './_github.js';

/**
 * GET /api/state — renvoie la derniere version enregistree de content.json,
 * theme.json et cms/schema.json, lue directement dans le depot GitHub.
 * On evite ainsi d'editer une version perimee mise en cache par le CDN juste
 * apres un enregistrement.
 */
export default async function handler(req, res) {
  const authError = checkPassword(req);
  if (authError) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return res.status(401).json({ ok: false, error: authError });
  }

  try {
    const [content, theme, schema] = await Promise.all([
      readFile('content.json'),
      readFile('theme.json'),
      readFile('cms/schema.json'),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      content: JSON.parse(content),
      theme: JSON.parse(theme),
      schema: JSON.parse(schema),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
