/**
 * Petit client GitHub : lecture de fichiers et commit atomique multi-fichiers.
 * Toutes les ecritures du CMS passent par ici.
 */

const API = 'https://api.github.com';

function config() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'ADNK01/Rebero-Marnand-Piles';
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw new Error("La variable d'environnement GITHUB_TOKEN est absente.");
  if (!repo.includes('/')) throw new Error('GITHUB_REPO doit avoir la forme "utilisateur/depot".');
  return { token, repo, branch };
}

async function gh(path, { method = 'GET', body } = {}) {
  const { token } = config();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'rebero-marnand-cms',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub ${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

/** Contenu texte d'un fichier du depot (branche courante). */
export async function readFile(filePath) {
  const { repo, branch } = config();
  const data = await gh(
    `/repos/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`
  );
  return Buffer.from(data.content, 'base64').toString('utf8');
}

/**
 * Commit atomique de plusieurs fichiers (un seul deploiement Vercel declenche).
 * files : [{ path, content, encoding }] — encoding 'utf-8' (defaut) ou 'base64'.
 */
export async function commitFiles(files, message) {
  const { repo, branch } = config();

  const ref = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
  const baseSha = ref.object.sha;
  const baseCommit = await gh(`/repos/${repo}/git/commits/${baseSha}`);

  const tree = [];
  for (const file of files) {
    const blob = await gh(`/repos/${repo}/git/blobs`, {
      method: 'POST',
      body: { content: file.content, encoding: file.encoding || 'utf-8' },
    });
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await gh(`/repos/${repo}/git/trees`, {
    method: 'POST',
    body: { base_tree: baseCommit.tree.sha, tree },
  });

  const commit = await gh(`/repos/${repo}/git/commits`, {
    method: 'POST',
    body: { message, tree: newTree.sha, parents: [baseSha] },
  });

  await gh(`/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: { sha: commit.sha, force: false },
  });

  return commit.sha;
}
