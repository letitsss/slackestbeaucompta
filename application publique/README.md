# 📒 Gestion asso — installer l'outil pour votre association

Devis · Factures · Comptabilité · Notes de frais, pour associations loi 1901.
**Gratuit, sans abonnement, sans serveur à payer** : tout tourne dans un Google Sheet qui
appartient à votre association. Logiciel libre (licence MIT), créé par
[S'Lac'K Est Beau](https://slackestbeau.org), association de slackline à Annecy.

> **Il vous faut** : un compte Google (idéalement celui de l'association) et 15 minutes.
> **Vous obtenez** : une adresse web à partager aux bénévoles, protégée par deux codes d'accès
> (trésorier / bénévoles), entièrement à vos couleurs.

---

## 1. Récupérer le kit

Téléchargez `gestion-asso-kit-<version>.zip` depuis la page des
[versions](https://github.com/letitsss/slackestbeaucompta/releases) (ou utilisez celui qu'on vous a
envoyé), puis décompressez-le. Il contient :

| Fichier | À quoi il sert |
|---|---|
| `GUIDE-INSTALLATION.html` | Le guide pas à pas, à ouvrir dans votre navigateur (double-clic) |
| `Code.gs` | Le « moteur » à coller dans Google Apps Script |
| `Index.html` | L'interface, à coller aussi dans Apps Script |
| `LICENSE.txt`, `LISEZ-MOI.txt` | Licence et rappel |

**Si on vous a envoyé un lien « Faire une copie » d'un Google Sheet**, tout est déjà dedans :
cliquez sur *Faire une copie* et passez directement à l'étape 4.

## 2. Créer le Google Sheet et coller le moteur

1. Connecté au compte Google de l'asso, ouvrez [sheets.new](https://sheets.new) et nommez le tableur
   (ex. « Gestion — Mon Asso »).
2. Menu **Extensions → Apps Script**.
3. Ouvrez `Code.gs` du kit avec le Bloc-notes, copiez tout (Ctrl+A, Ctrl+C), puis dans l'éditeur
   Apps Script remplacez tout le contenu de `Code.gs` (Ctrl+A, Ctrl+V). Enregistrez (💾).

## 3. Ajouter l'interface

1. Dans Apps Script, à gauche : **+ → HTML**, nommez le fichier exactement `Index`.
2. Ouvrez `Index.html` du kit avec le Bloc-notes, copiez tout, collez dans ce nouveau fichier
   (en remplaçant son contenu). Enregistrez. Le fichier est gros, c'est normal.

## 4. Préparer le tableur

1. Revenez sur `Code.gs`, choisissez la fonction **`initialiser`** dans la liste du haut, cliquez
   **▶ Exécuter**.
2. Autorisez le script : *Examiner les autorisations* → votre compte → « Google n'a pas validé
   cette application » → **Paramètres avancés** → **Accéder à … (non sécurisé)** → **Autoriser**.
   C'est normal : c'est *votre* script, sur *votre* compte, personne d'autre n'y a accès.
3. Les onglets `Config`, `Devis`, `Factures`, `NotesFrais`, `Compta`, `Benevoles` apparaissent.

## 5. Mettre en ligne

1. **Déployer → Nouveau déploiement** → engrenage ⚙️ → **Application Web**.
2. *Exécuter en tant que* : **Moi** · *Qui a accès* : **Tout le monde** (l'accès reste protégé par
   vos codes).
3. **Déployer**, puis **copiez l'URL de l'application Web** (finit par `/exec`) : c'est l'adresse de
   votre application.

## 6. Personnaliser

1. Ouvrez l'adresse, connectez-vous avec votre prénom et le code provisoire `CHANGEMOI-TRESO`.
2. L'assistant vous amène aux **Paramètres** : nom de l'asso, coordonnées, IBAN, **logo**,
   **couleurs**, catégories, TVA si vous y êtes assujettis, et surtout **vos deux codes d'accès**.
   Enregistrez, reconnectez-vous avec le nouveau code trésorier. C'est prêt. 🎉
3. Partagez l'adresse + le **code bénévoles** à vos membres.

---

## Mettre à jour (facultatif)

Les nouveautés sont dans [CHANGELOG.md](../CHANGELOG.md). Pour passer à une nouvelle version :
remplacez `Code.gs` et `Index` par ceux du nouveau kit, exécutez `initialiser`, puis
**Déployer → Gérer les déploiements → ✏️ → Nouvelle version → Déployer**. Vos données et vos réglages
sont conservés, l'adresse ne change pas. Vous pouvez aussi ne jamais mettre à jour : votre
installation vous appartient.

## Dépannage express

| Problème | Solution |
|---|---|
| « Code invalide » | Vérifiez `codeTresorier` / `codeBenevole` dans l'onglet `Config` du tableur |
| Page d'erreur Google au lieu de l'appli | Mauvais fichier collé (Index dans Code.gs ou l'inverse) : refaites les étapes 2-3 puis une nouvelle version |
| Une modification n'a aucun effet | Il manque la **nouvelle version** du déploiement |
| Lenteur ou erreur passagère | Google met 2-3 s par action et a parfois un hoquet après un déploiement : réessayez dans une minute |

Questions, idées, bugs : ouvrez une *issue* sur
[github.com/letitsss/slackestbeaucompta](https://github.com/letitsss/slackestbeaucompta).
