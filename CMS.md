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

Une cinquième variable est nécessaire pour le téléversement des vidéos :

| Nom                     | Rôle                                                     |
| ----------------------- | -------------------------------------------------------- |
| `BLOB_READ_WRITE_TOKEN` | accès au stockage Vercel Blob où atterrissent les vidéos |

Elle n'est pas à saisir à la main, mais la création du store comporte **deux
pièges**, tous deux irrattrapables ou invisibles :

1. Dans Vercel, **Storage → Create Storage → Blob**. À l'écran *Create Blob
   Store*, l'accès est sur **Private** par défaut : il faut choisir
   **Public**. Un store privé exige un jeton pour lire chaque fichier, donc la
   vidéo ne serait pas lisible par les visiteurs — et Vercel l'écrit
   lui-même : *« le mode d'accès ne peut pas être changé après création »*. Un
   store privé est donc à refaire de zéro.
2. Une fois le store créé, **Connect to Project** → choisir
   `rebero-marnand-piles` → **cocher « Add a read-write token env var to this
   connection »**, décochée par défaut. Sans elle, Vercel ne pose que
   `BLOB_STORE_ID` et `BLOB_WEBHOOK_PUBLIC_KEY`, et le téléversement échoue.
   La liste affichée dans la fenêtre doit montrer les trois variables, dont
   `BLOB_READ_WRITE_TOKEN`.

Puis **redéployer** : les variables d'environnement ne sont lues qu'au moment
du build, donc le déploiement en cours ne les voit pas.

Tant que ce store n'existe pas, le reste du CMS fonctionne normalement et seul
le bouton « Téléverser une vidéo » répond par un message d'erreur explicite.
Le store en place s'appelle `medias-public`.

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
- **Vidéo** : voir la section 3 ci-dessous.
- **Annuler** : abandonne les modifications non publiées.
- **Recharger** (icône circulaire) : récupère la dernière version enregistrée.

---

## 3. La vidéo

Le bloc **Vidéo** de la page *Accueil* propose deux sources. Les deux champs
restent remplis en permanence ; le bouton radio décide seulement de celle qui
part en ligne, ce qui permet de basculer de l'une à l'autre sans rien ressaisir.

### Fichier téléversé

**Téléverser une vidéo** envoie le fichier directement du navigateur vers
Vercel Blob — il ne transite pas par le dépôt GitHub, qui n'est pas fait pour
ça. Une barre de progression suit l'envoi ; ne fermez pas l'onglet avant la
fin. Formats acceptés : MP4, WebM, MOV. Limite technique : 500 Mo.

Limite réelle, en revanche : le plan gratuit de Vercel inclut **10 Go de
transfert par mois**, et au-delà l'accès au stockage est suspendu pendant
30 jours — la vidéo disparaît alors du site, sans facture mais sans vidéo.
Ce qui donne, par mois :

| Poids de la vidéo | Visionnages complets avant suspension |
| ----------------- | ------------------------------------- |
| 10 Mo             | ~1 000                                |
| 25 Mo             | ~400                                  |
| 100 Mo            | ~100                                  |
| 200 Mo            | ~50                                   |

**Visez 25 Mo maximum.** Une vidéo de 200 Mo se compresse à 15-20 Mo en 1080p
sans perte visible, avec [HandBrake](https://handbrake.fr) (gratuit, preset
*Web → Gmail Large 3 Minutes 720p30*) ou, en ligne de commande :

```bash
ffmpeg -i source.mp4 -vcodec libx264 -crf 26 -preset slow -vf scale=-2:1080 \
       -acodec aac -b:a 128k sortie.mp4
```

### Lien YouTube / Vimeo

Collez le lien de partage tel quel (`youtube.com/watch?v=…`, `youtu.be/…`,
`vimeo.com/…`) : il est converti en lecteur intégré. Aucune limite de taille ni
de trafic, et la qualité s'adapte à la connexion du visiteur — c'est la bonne
option pour une vidéo lourde. YouTube est intégré via `youtube-nocookie.com`,
sans vidéos suggérées à la fin.

### Image affichée avant lecture

Le poster, visible tant que le visiteur n'a pas lancé la vidéo. Ne s'applique
qu'au mode *fichier* : YouTube et Vimeo affichent leur propre vignette.

Si les deux champs sont vides, le bloc vidéo est simplement masqué sur le site.

---

## 4. Fonctionnement interne

```
content.json      tous les textes, images, liens et la carte — source de vérité
theme.json        les jetons de design (couleurs, polices, arrondis, bannière)
cms/schema.json   la liste des champs et leurs libellés, utilisée par /admin
cms/site-cms.js   pont d'aperçu ; inerte sur le site public
admin/index.html  l'interface d'administration (un seul fichier)
api/save.js       vérifie le mot de passe, réécrit index.html, pousse un commit
api/upload.js     dépôt d'images
api/video-token.js  jeton de téléversement vidéo vers Vercel Blob
api/_video.js     fabrique le lecteur (balise video ou iframe YouTube/Vimeo)
cms/blob-client.js  SDK Vercel Blob compilé pour le navigateur (fichier généré)
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
`data-cms-img`, `data-cms-video`, `data-cms-link` ou `data-cms-embed`.
Pour `data-cms-video`, c'est le contenu entier de l'élément qui est remplacé
par le lecteur reconstruit à chaque enregistrement. Pour rendre un nouvel élément
éditable, il suffit de lui ajouter un `data-cms` avec une clé inédite et d'ajouter
l'entrée correspondante dans `content.json` et `cms/schema.json`.

Le bloc de couleurs est délimité dans `index.html` par les marqueurs
`/* CMS-THEME-START */` et `/* CMS-THEME-END */` : **ne pas les supprimer**, sans quoi
l'enregistrement échouera avec un message explicite.

---

## 5. Sécurité

- L'accès repose sur `ADMIN_PASSWORD`, comparé côté serveur en temps constant.
  Choisir un mot de passe long ; le changer se fait dans Vercel, sans redéploiement
  de code.
- Le jeton GitHub n'est jamais transmis au navigateur : seules les fonctions
  serverless y ont accès. Idem pour `BLOB_READ_WRITE_TOKEN` : `/api/video-token`
  ne délivre au navigateur qu'un jeton temporaire (2 h), limité aux formats
  vidéo et à 500 Mo, et uniquement après vérification du mot de passe.
- `/admin` et `/api` sont exclus de l'indexation (`robots.txt` + en-tête
  `X-Robots-Tag`).
- Chaque publication est un commit Git : l'historique complet est consultable sur
  GitHub, et n'importe quelle version peut être restaurée.

---

## 6. Développement local

```bash
npm install
```

Les fonctions `api/` nécessitent l'environnement Vercel :

```bash
npx vercel dev
```

en ayant renseigné `ADMIN_PASSWORD`, `GITHUB_TOKEN` et `GITHUB_REPO` dans un fichier
`.env.local` (déjà ignoré par Git).
