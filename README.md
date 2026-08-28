# 📒 Gestion asso — devis, factures, compta & notes de frais

Outil de gestion complet pour associations loi 1901, **gratuit et sans serveur** :
tout tourne dans un Google Sheet de l'association, l'interface est servie par Google Apps Script.

Créé par [S'Lac'K Est Beau](https://slackestbeau.org) (slackline, Annecy) pour ses propres besoins,
puis rendu générique et partagé sous licence libre (MIT).

## Fonctionnalités

- **Devis → factures** : lignes de prestation, remise, détails, conversion en un clic,
  numérotation automatique configurable, impression / PDF avec logo et couleurs de l'asso,
  TVA optionnelle (HT / TVA / TTC) pour les associations assujetties.
- **Notes de frais** : dépenses simples ou frais kilométriques (indemnité au km + péages),
  photo du justificatif stockée sur le Drive de l'asso, saisie pour soi ou pour un autre bénévole,
  validation par le trésorier, **remboursement mensuel groupé** par bénévole.
- **Livre de comptes** : recettes / dépenses catégorisées, plusieurs comptes (banque, espèces,
  HelloAsso…), modes de paiement, virements internes, report de solde, **pointage bancaire**,
  export CSV.
- **Imports** : paiements HelloAsso (une recette par adhésion / vente) et **rapprochement
  automatique du relevé bancaire** (pointage + création des écritures manquantes), anti-doublons.
- **Bilan** par catégorie et par mois, prêt pour l'AG.
- **Deux niveaux d'accès** par codes : bénévoles / trésorier. Chacun indique son prénom.
- **Tout se personnalise dans l'appli** : nom, logo, couleurs, catégories, comptes, mentions,
  conditions, formats de numéros, TVA, taux kilométrique, codes d'accès.

## Installer pour votre association

### Voie express — tout Google (recommandée, ~15 min, aucune compétence technique)

Téléchargez le kit (`gestion-asso-kit-<version>.zip`, voir la
[dernière version](https://github.com/letitsss/slackestbeaucompta/releases) ou demandez-le à
l'asso qui vous l'a recommandé), puis suivez **`GUIDE-INSTALLATION.html`** inclus dans le kit
(aussi lisible ici : [docs/GUIDE-INSTALLATION.html](docs/GUIDE-INSTALLATION.html)).

En résumé : un Google Sheet → coller `Code.gs` et `Index.html` dans Apps Script → exécuter
`initialiser` → déployer en application Web → ouvrir l'adresse, se connecter avec le code
provisoire et remplir l'assistant (nom, logo, couleurs, codes d'accès). C'est tout.

### Voie avancée — site sur GitHub Pages + API Apps Script

Pour une adresse propre (`monasso.github.io/…`) :

1. Créez le Google Sheet et collez **uniquement** `apps-script/Code.gs` (pas `Index.html`),
   exécutez `initialiser`, déployez en application Web (*Exécuter en tant que : Moi*,
   *Accès : Tout le monde*) et copiez l'URL `/exec`.
2. Dupliquez ce dépôt (bouton *Use this template* ou fork), mettez l'URL dans
   [`js/config.js`](js/config.js), activez GitHub Pages (Settings → Pages → branche `main`).

Le code du site est public mais ne contient aucune donnée : tout reste dans votre Sheet / Drive.

## Mettre à jour

Les nouveautés sont listées dans [CHANGELOG.md](CHANGELOG.md). Mettre à jour est **facultatif**
et ne touche ni aux données ni aux réglages : remplacer `Code.gs` (et `Index` en voie express),
exécuter `initialiser`, puis **Déployer → Gérer les déploiements → ✏️ → Nouvelle version**.
La version en place s'affiche dans Paramètres et sur l'écran de connexion.

## Pour ceux qui diffusent l'outil

- `node build.js` fabrique le kit dans `dist/` (Index.html avec CSS/JS intégrés, Code.gs, guide,
  licence, zip) — à envoyer par WeTransfer, mail, ou à joindre à une *release* GitHub.
- **Modèle « Faire une copie »** (encore plus simple pour les destinataires) : créez un Google Sheet
  avec le compte de votre choix, collez-y `Code.gs` et `Index.html` du kit, exécutez `initialiser`
  **sans rien personnaliser**, puis partagez le lien du tableur en remplaçant la fin de l'URL
  `/edit…` par `/copy`. Chaque asso qui clique obtient sa propre copie, script inclus, et reprend
  le guide à l'étape 4. Chaque copie est totalement indépendante.

## Structure du projet

```
apps-script/Code.gs     backend Apps Script : API JSON + interface intégrée + numérotation
index.html, css/, js/   interface (mode site séparé) — build.js les assemble en Index.html
docs/                   guide d'installation
build.js                fabrique le kit distribuable dans dist/
CHANGELOG.md, LICENSE   nouveautés, licence MIT
```

Contributions et retours bienvenus via les *issues* GitHub.
