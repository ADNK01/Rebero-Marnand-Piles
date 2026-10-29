import { handleUpload } from '@vercel/blob/client';
import { checkPasswordValue, readJsonBody } from './_auth.js';

/**
 * POST /api/video-token
 *
 * Le navigateur n'envoie pas la video a cette fonction : Vercel refuse les
 * requetes de plus de 4,5 Mo. Le SDK Vercel Blob demande ici un jeton de
 * courte duree, puis televerse le fichier directement du navigateur vers le
 * stockage (en plusieurs parties pour les gros fichiers). Cette fonction ne
 * fait donc que deux choses : verifier le mot de passe d'administration et
 * borner ce que le jeton autorise.
 *
 * Variable d'environnement requise : BLOB_READ_WRITE_TOKEN — ajoutee
 * automatiquement par Vercel quand un store Blob est relie au projet.
 */

const MAX_BYTES = 500 * 1024 * 1024; // 500 Mo : au-dela, Vercel Blob ne met plus en cache
const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-m4v',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee.' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      ok: false,
      error:
        "Le stockage video n'est pas configure : creez un store Blob dans Vercel (Storage > Create Database > Blob) et reliez-le au projet, puis redeployez.",
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'Corps de requete illisible.' });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const authError = checkPasswordValue(clientPayload);
        if (authError) throw new Error(authError);
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 2 * 60 * 60 * 1000, // 2 h : le temps d'un gros televersement
        };
      },
      // Vercel Blob appelle cette fonction quand le televersement est fini.
      // Rien a enregistrer ici : c'est /admin qui place l'URL dans content.json
      // au moment de la publication.
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(result);
  } catch (err) {
    const message = String((err && err.message) || err);
    const status = /mot de passe/i.test(message) ? 401 : 400;
    if (status === 401) await new Promise((resolve) => setTimeout(resolve, 600));
    return res.status(status).json({ ok: false, error: message });
  }
}
