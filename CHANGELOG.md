# Nouveautés et mises à jour

Pour mettre à jour votre installation : téléchargez le dernier kit, remplacez
`Code.gs` et `Index` dans votre projet Apps Script, exécutez `initialiser`,
puis **Déployer → Gérer les déploiements → ✏️ → Nouvelle version → Déployer**.
Vos données et vos réglages sont conservés.

## 2.1.0 — 2 septembre 2026 · remises d'imprévu et impression soignée

- **Facture modifiable tant qu'elle n'est pas payée** (bouton ✏️ Modifier) :
  lignes, coordonnées, détails, remises — pour gérer les imprévus (météo,
  annulation partielle...) sans refaire le document.
- **Deux remises avec motif** sur devis et factures : « Remise exceptionnelle »
  et « Autre remise », chacune avec son motif (obligatoire dès qu'un montant
  est saisi sur une facture) affiché sur le document imprimé.
- **Impression des totaux refaite** : libellés et montants alignés en colonnes,
  motifs en italique sous chaque remise, blocs jamais coupés entre deux pages.

## 2.0.0 — 26 août 2026 · version distribuable

- **Installation « tout Google »** : l'interface est servie directement par Apps
  Script (fichier `Index.html`), plus besoin d'hébergement séparé. Le mode
  « site séparé » (GitHub Pages) reste possible.
- **Assistant de première installation** : le trésorier est guidé vers les
  Paramètres pour renseigner le nom, le logo, les couleurs et les codes d'accès.
- **Personnalisation complète depuis l'appli** : logo téléversé, couleurs de
  l'interface et des documents, catégories de recettes/dépenses/notes de frais,
  comptes, modes de paiement, conditions de paiement, mentions.
- **TVA optionnelle** pour les associations assujetties : taux par ligne,
  totaux HT / TVA / TTC sur les devis et factures.
- **Numérotation configurable** (`{AAAA}{NN}`, `F{AAAA}-{NNN}`…), rang remis à 1
  chaque année.
- Numéro de version affiché dans Paramètres et sur l'écran de connexion,
  avec lien vers ces notes.
- Réponses plus rapides : mise à jour immédiate de l'écran, resynchronisation
  en arrière-plan, nouvelles tentatives automatiques si Google ne répond pas.
- Licence MIT, valeurs par défaut neutres (aucune donnée d'une asso dans le code).

## 1.x — juillet / août 2026 · usage interne S'Lac'K Est Beau

- Devis → factures avec mise en page personnalisée, impression / PDF.
- Notes de frais simples et kilométriques, pour soi ou un autre bénévole,
  modification/suppression tant qu'elles ne sont pas traitées, filtres et tri,
  remboursement mensuel groupé par bénévole.
- Livre de comptes : comptes multiples, modes de paiement, pointage bancaire,
  virements internes, report de solde, bilan par catégorie et par mois, export CSV.
- Import des paiements HelloAsso et rapprochement automatique du relevé
  bancaire (Caisse d'Épargne et formats similaires), anti-doublons.
- Correction du numéro / de la date d'un devis ou d'une facture.
