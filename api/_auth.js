import crypto from 'node:crypto';

/**
 * Verifie le mot de passe d'administration en temps constant.
 * Renvoie null si tout va bien, sinon un message d'erreur.
 */
export function checkPassword(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return "Le mot de passe d'administration n'est pas configure sur Vercel (variable ADMIN_PASSWORD).";
  }
  const provided = req.headers['x-cms-password'];
  if (typeof provided !== 'string' || provided.length === 0) {
    return 'Mot de passe manquant.';
  }
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) return 'Mot de passe incorrect.';
  return null;
}

/** Lit le corps JSON de la requete, que Vercel l'ait deja analyse ou non. */
export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
