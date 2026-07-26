# CMS — Rebero Marnand Piles

Interface d'administration accessible sur **`https://rebero-marnand-piles.vercel.app/admin`**.
Elle permet de modifier les textes (français, anglais, kinyarwanda), les images, les
liens et l'apparence du site, sans toucher au code.

---

## 1. Configuration

**Déjà en place.** Le projet Vercel `rebero-marnand-piles` porte ces quatre variables
sur les environnements *Production*, *Preview* et *Development* :

| Nom              | Rôle                                                       |
| ---------------- | ---------------------------------------------------------- |
| `ADMIN_PASSWORD` | mot de passe de l'écran de connexion `/admin`              |
| `GITHUB_TOKEN`   | jeton restreint au dépôt, permission *Contents: write*     |
| `GITHUB_REPO`    | `ADNK01/Rebero-Marnand-Piles`                              |
| `GITHUB_BRANCH`  | `main`                                                     |

### Changer le mot de passe

Vercel → **Settings → Environment Variables** → modifier `ADMIN_PASSWORD`, puis
**Deployments → … → Redeploy**. Aucune modification de code n'est nécessaire.

### Renouveler le jeton GitHub

Le jeton a une date d'expiration. Passée celle-ci, le site public continue de
fonctionner normalement, mais la publication échoue avec un message explicite. Pour
en poser un nouveau :

1. <https://github.com/settings/personal-access-tokens/new>
2. **Repository access** : *Only select repositories* → `Rebero-Marnand-Piles`
3. **Permissions** → *Repository permissions* → **Contents** : **Read and write**
4. Remplacer `GITHUB_TOKEN` dans Vercel, puis redéployer.

---

## 2. Utilisation

1. Aller sur `/admin` et saisir le mot de passe.
2. Choisir une page dans la colonne de gauche, ou l'onglet **Design du site**.
3. Modifier : l'aperçu de droite se met à jour immédiatement.
4. Cliquer sur **Publier**. Le site en ligne est à jour au bout de 30 à 60 secondes
   (le temps que Vercel redéploie).

Quelques repères :

- **FR / EN / RW** en haut à droite : la langue en cours d'édition. Chaque texte a
  ses trois versions ; si une traduction est vide, le français est affiché.
- **Localiser** à côté d'un champ : fait défiler l'aperçu jusqu'à l'élément concerné
  et l'entoure. Inversement, cliquer un texte dans l'aperçu ouvre son champ.
- **Téléverser une image** : le fichier est déposé dans `/images` du dépôt (3 Mo max,
  JPG / PNG / WEBP). Le chemin est renseigné automatiquement.
- **Annuler** : abandonne les modifications non publiées.
- **Recharger** (icône circulaire) : récupère la dernière version enregistrée.

---

## 3. Fonctionnement interne

```
content.json      tous les textes, images, liens et la carte — source de vérité
theme.json        les jetons de design (couleurs, polices, arrondis, bannière)
cms/schema.json   la liste des champs et leurs libellés, utilisée par /admin
cms/site-cms.js   pont d'aperçu ; inerte sur le site public
admin/index.html  l'interface d'administration (un seul fichier)
api/save.js       vérifie le mot de passe, réécrit index.html, pousse un commit
api/upload.js     dépôt d'images
api/state.js      relit content/theme/schema depuis GitHub
api/_render.js    applique content.json + theme.json dans index.html
```

Point important : **le contenu n'est pas chargé en JavaScript côté visiteur**. À
chaque publication, `api/save.js` réécrit directement `index.html` (textes, attributs
`data-fr` / `data-en` / `data-rw`, sources d'images, bloc `:root` des couleurs) puis
pousse un commit unique. Le site public reste donc un fichier statique : aucun
clignotement, aucun appel réseau supplémentaire, et le contenu reste lisible par
Google.

Les éléments modifiables portent un attribut `data-cms="page.tN"`,
`data-cms-img`, `data-cms-link` ou `data-cms-embed`. Pour rendre un nouvel élément
éditable, il suffit de lui ajouter un `data-cms` avec une clé inédite et d'ajouter
l'entrée correspondante dans `content.json` et `cms/schema.json`.

Le bloc de couleurs est délimité dans `index.html` par les marqueurs
`/* CMS-THEME-START */` et `/* CMS-THEME-END */` : **ne pas les supprimer**, sans quoi
l'enregistrement échouera avec un message explicite.

---

## 4. Sécurité

- L'accès repose sur `ADMIN_PASSWORD`, comparé côté serveur en temps constant.
  Choisir un mot de passe long ; le changer se fait dans Vercel, sans redéploiement
  de code.
- Le jeton GitHub n'est jamais transmis au navigateur : seules les fonctions
  serverless y ont accès.
- `/admin` et `/api` sont exclus de l'indexation (`robots.txt` + en-tête
  `X-Robots-Tag`).
- Chaque publication est un commit Git : l'historique complet est consultable sur
  GitHub, et n'importe quelle version peut être restaurée.

---

## 5. Développement local

```bash
npm install
```

Les fonctions `api/` nécessitent l'environnement Vercel :

```bash
npx vercel dev
```

en ayant renseigné `ADMIN_PASSWORD`, `GITHUB_TOKEN` et `GITHUB_REPO` dans un fichier
`.env.local` (déjà ignoré par Git).
