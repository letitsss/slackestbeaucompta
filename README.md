# 🎪 S'Lac'K Est Beau — Devis, factures, compta & notes de frais

Outil de gestion pour l'association [S'Lac'K Est Beau](https://slackestbeau.org/) :

- **Devis** avec numérotation automatique (`202601` = année + n°, comme vos documents actuels), conversion en facture en un clic
- **Factures** sans TVA (0 %, association exonérée des impôts commerciaux), impression / PDF reprenant la mise en page Canva de l'asso (logo, IBAN, conditions de paiement, « bon pour accord »)
- **Notes de frais** des bénévoles avec photo du justificatif (stockée sur le Drive de l'asso)
- **Compta** simple recettes/dépenses avec export CSV
- **Bilan annuel** par catégorie, prêt pour l'AG

**100 % gratuit, sans abonnement** : interface hébergée sur GitHub Pages, données dans un
Google Sheet de l'asso via Google Apps Script.

## Architecture

```
Navigateur (GitHub Pages, site statique)
        │  fetch JSON
        ▼
Google Apps Script (API, gratuit)
        │
        ▼
Google Sheet (données) + Google Drive (justificatifs)
```

Deux niveaux d'accès, définis par deux codes :

| Rôle | Accès |
|---|---|
| **Bénévole** | devis, factures, ses notes de frais |
| **Trésorier** | tout + compta, bilan, validation des notes, paramètres |

Chaque personne saisit son prénom à la connexion (traçabilité de qui a créé quoi).

---

## Installation (≈ 20 minutes, une seule fois)

### Étape 1 — Le Google Sheet (les données)

1. Avec le compte Google de l'asso, créer un nouveau tableur sur [sheets.new](https://sheets.new).
   Le nommer par exemple `SlackEstBeau — Gestion`.
2. Menu **Extensions → Apps Script**.
3. Supprimer le contenu de `Code.gs` et coller à la place le contenu du fichier
   [`apps-script/Code.gs`](apps-script/Code.gs) de ce dépôt. Enregistrer (💾).
4. Dans la barre du haut, sélectionner la fonction **`initialiser`** puis cliquer **Exécuter**.
   Autoriser l'accès quand Google le demande (⚠️ écran « application non validée » :
   cliquer *Paramètres avancés → Accéder au projet* — c'est votre propre script, c'est normal).
   → Les onglets `Config`, `Devis`, `Factures`, `NotesFrais`, `Compta` sont créés.
5. Dans l'onglet **Config** du tableur, personnaliser tout de suite :
   - `codeTresorier` et `codeBenevole` → **choisir vos propres codes** (ce sont les mots de passe) ;
   - adresse, email, IBAN, RNA/SIRET, URL du logo… (modifiable plus tard depuis l'appli, onglet Paramètres).

### Étape 2 — Déployer l'API

1. Toujours dans Apps Script : **Déployer → Nouveau déploiement**.
2. Type : **Application Web** (icône engrenage si besoin).
3. Réglages :
   - *Exécuter en tant que* : **Moi**
   - *Qui a accès* : **Tout le monde** (l'accès aux données reste protégé par vos codes)
4. **Déployer**, puis copier l'**URL de l'application Web** (elle se termine par `/exec`).

> ℹ️ Si vous modifiez `Code.gs` plus tard : **Déployer → Gérer les déploiements → ✏️ →
> Version : Nouvelle version → Déployer** (sinon les changements ne sont pas pris en compte).

### Étape 3 — Configurer le site

Dans le fichier [`js/config.js`](js/config.js), remplacer la valeur par votre URL :

```js
var API_URL = 'https://script.google.com/macros/s/XXXXX/exec';
```

### Étape 3 bis — Le logo

Exporter le logo depuis Canva en **PNG (fond transparent)** et l'enregistrer dans le projet
sous **`assets/logo.png`** — il apparaîtra en haut à droite des devis et factures.
(Un autre chemin ou une URL se règle dans l'appli, onglet Paramètres.)

### Étape 4 — Publier sur GitHub Pages

1. Créer un dépôt sur GitHub (par ex. `slackestbeau-gestion`, public) et pousser ce dossier :
   ```bash
   git remote add origin https://github.com/VOTRE-COMPTE/slackestbeau-gestion.git
   git push -u origin main
   ```
2. Sur GitHub : **Settings → Pages → Branch : `main` / dossier `/ (root)` → Save**.
3. Deux minutes plus tard, le site est en ligne sur
   `https://VOTRE-COMPTE.github.io/slackestbeau-gestion/`.

Partager ce lien + le code bénévole aux membres concernés. C'est tout. 🎉

> Le code du site est public sur GitHub, mais il ne contient **aucune donnée** :
> devis, factures, compta et justificatifs restent dans le Google Sheet / Drive de l'asso.

---

## Utilisation au quotidien

- **Bénévole** : se connecte avec son prénom + code bénévole → crée un devis →
  l'imprime en PDF (bouton 🖨️, puis « Enregistrer en PDF ») → le client accepte →
  « Convertir en facture ». Pour ses frais : nouvelle note + photo du ticket.
- **Trésorier** : marque les factures payées (la recette part automatiquement en compta),
  valide puis rembourse les notes de frais (la dépense part automatiquement en compta),
  saisit les autres écritures (subventions, adhésions, achats…), consulte le bilan,
  exporte le CSV pour l'AG.
- Le trésorier peut aussi corriger n'importe quoi **directement dans le Google Sheet** —
  l'appli relit les données à chaque chargement.

## Dépannage

| Problème | Solution |
|---|---|
| « L'URL de l'API n'est pas configurée » | Éditer `js/config.js` (étape 3) |
| « Code invalide » | Vérifier les codes dans l'onglet `Config` du Sheet |
| Modif du script sans effet | Redéployer une **nouvelle version** (voir étape 2) |
| « Onglet manquant » | Exécuter la fonction `initialiser` dans Apps Script |
| Le justificatif ne s'envoie pas | Fichier trop lourd → réessayer avec une photo (compressée auto) |
