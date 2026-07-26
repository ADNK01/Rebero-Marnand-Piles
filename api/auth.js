import { checkPassword } from './_auth.js';

/** POST /api/auth — verifie le mot de passe saisi sur l'ecran de connexion. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee.' });
  }

  const error = checkPassword(req);
  if (error) {
    await new Promise((resolve) => setTimeout(resolve, 600)); // ralentit les essais repetes
    return res.status(401).json({ ok: false, error });
  }

  return res.status(200).json({
    ok: true,
    repo: process.env.GITHUB_REPO || 'ADNK01/Rebero-Marnand-Piles',
    branch: process.env.GITHUB_BRANCH || 'main',
    githubConfigured: Boolean(process.env.GITHUB_TOKEN),
  });
}
