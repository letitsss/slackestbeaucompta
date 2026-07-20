/**
 * S'Lac'K Est Beau — Backend Apps Script (API JSON)
 *
 * À coller dans un projet Apps Script LIÉ au Google Sheet de l'asso
 * (Extensions > Apps Script depuis le tableur).
 *
 * 1. Exécuter une fois la fonction `initialiser` (menu Exécuter) pour créer
 *    les onglets et la configuration par défaut.
 * 2. Déployer > Nouveau déploiement > Application Web :
 *    - Exécuter en tant que : Moi
 *    - Accès : Tout le monde
 * 3. Copier l'URL du déploiement dans js/config.js du site.
 */

var ONGLETS = {
  CONFIG: 'Config',
  DEVIS: 'Devis',
  FACTURES: 'Factures',
  NOTES: 'NotesFrais',
  COMPTA: 'Compta',
  BENEVOLES: 'Benevoles'
};

var COLONNES = {
  Devis: ['id', 'numero', 'date', 'auteur', 'clientNom', 'clientTel', 'clientAdresse', 'clientEmail', 'objet', 'lignes', 'details', 'remise', 'total', 'statut', 'conditions', 'factureNumero'],
  Factures: ['id', 'numero', 'date', 'auteur', 'clientNom', 'clientTel', 'clientAdresse', 'clientEmail', 'objet', 'lignes', 'details', 'remise', 'total', 'statut', 'devisNumero', 'datePaiement'],
  NotesFrais: ['id', 'date', 'benevole', 'saisiePar', 'type', 'description', 'categorie', 'depart', 'arrivee', 'km', 'essence', 'peages', 'indemniteKm', 'montant', 'justificatifUrl', 'statut', 'commentaire'],
  Compta: ['id', 'date', 'type', 'categorie', 'libelle', 'montant', 'reference', 'auteur'],
  Benevoles: ['nom']
};

var CONFIG_DEFAUT = {
  nomAsso: "S'LAC'K EST BEAU",
  adresse: '17 Rue Thomas Ruphy\n74000 Annecy',
  email: 'Slackestbeau@gmail.com',
  telephone: '',
  siren: '941836520',
  rna: 'W741011378',
  iban: 'FR76 1027 8024 2300 0209 1850 394',
  bic: '',
  mentionTva: 'Association exonérée des impôts commerciaux',
  mentionsPied: 'Merci de votre confiance',
  logoUrl: 'assets/logo.png',
  validiteDevis: '2 mois',
  tauxKm: '0.35',
  conditionsPaiement: '40% à la validation du devis\nLe solde tout compte avant la prestation',
  codeTresorier: 'CHANGEMOI-TRESO',
  codeBenevole: 'CHANGEMOI-BENEVOLE',
  dossierJustificatifs: 'Justificatifs SlackEstBeau'
};

/** À exécuter à l'installation, puis à re-exécuter après chaque mise à jour
 *  du script : ajoute les onglets, colonnes et clés de config manquants
 *  sans jamais toucher aux données existantes. */
function initialiser() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var cfg = ss.getSheetByName(ONGLETS.CONFIG) || ss.insertSheet(ONGLETS.CONFIG);
  if (cfg.getLastRow() < 1) {
    cfg.getRange(1, 1, 1, 2).setValues([['cle', 'valeur']]);
    cfg.setFrozenRows(1);
  }
  var clesExistantes = {};
  if (cfg.getLastRow() > 1) {
    cfg.getRange(2, 1, cfg.getLastRow() - 1, 1).getValues().forEach(function (l) {
      clesExistantes[String(l[0])] = true;
    });
  }
  Object.keys(CONFIG_DEFAUT).forEach(function (k) {
    if (!clesExistantes[k]) cfg.appendRow([k, CONFIG_DEFAUT[k]]);
  });

  Object.keys(COLONNES).forEach(function (nom) {
    var sh = ss.getSheetByName(nom) || ss.insertSheet(nom);
    if (sh.getLastRow() < 1) {
      sh.getRange(1, 1, 1, COLONNES[nom].length).setValues([COLONNES[nom]]);
      sh.setFrozenRows(1);
    } else {
      // Mise à jour : ajoute les colonnes manquantes à la fin
      var entetes = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      COLONNES[nom].forEach(function (col) {
        if (entetes.indexOf(col) === -1) {
          sh.getRange(1, entetes.length + 1).setValue(col);
          entetes.push(col);
        }
      });
    }
  });

  // Supprime la feuille vide par défaut si elle existe encore
  var defaut = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (defaut && ss.getSheets().length > 5) ss.deleteSheet(defaut);
}

/* ------------------------------------------------------------------ */
/* Points d'entrée HTTP                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  return reponse({ ok: true, message: 'API SlackEstBeau opérationnelle' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var req = JSON.parse(e.postData.contents);
    return reponse(traiter(req));
  } catch (err) {
    return reponse({ ok: false, erreur: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function reponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Routage                                                             */
/* ------------------------------------------------------------------ */

function traiter(req) {
  var config = lireConfig();
  var role = roleDepuisCode(req.code, config);

  if (req.action === 'login') {
    if (!role) return { ok: false, erreur: 'Code invalide' };
    ajouterBenevole(req.prenom);
    return { ok: true, role: role };
  }

  if (!role) return { ok: false, erreur: 'Non autorisé' };

  var actionsTresorier = ['saveCompta', 'deleteCompta', 'traiterNote', 'marquerPayee', 'saveConfig', 'deleteFacture'];
  if (actionsTresorier.indexOf(req.action) !== -1 && role !== 'tresorier') {
    return { ok: false, erreur: 'Réservé au trésorier' };
  }

  switch (req.action) {
    case 'getData':       return getData(role, req.prenom, config);
    case 'saveDevis':     return saveDevis(req.devis, req.prenom);
    case 'deleteDevis':   return deleteDevis(req.id, role);
    case 'convertirDevis':return convertirDevis(req.id, req.prenom);
    case 'saveFacture':   return saveFacture(req.facture, req.prenom);
    case 'deleteFacture': return supprimerLigne(ONGLETS.FACTURES, req.id);
    case 'marquerPayee':  return marquerPayee(req.id, req.datePaiement);
    case 'saveNote':      return saveNote(req.note, req.justificatifBase64, req.justificatifNom, config);
    case 'traiterNote':   return traiterNote(req.id, req.statut, req.commentaire);
    case 'saveCompta':    return saveCompta(req.ligne, req.prenom);
    case 'deleteCompta':  return supprimerLigne(ONGLETS.COMPTA, req.id);
    case 'saveConfig':    return saveConfig(req.config);
    default:              return { ok: false, erreur: 'Action inconnue : ' + req.action };
  }
}

/* ------------------------------------------------------------------ */
/* Auth & config                                                       */
/* ------------------------------------------------------------------ */

function lireConfig() {
  var sh = feuille(ONGLETS.CONFIG);
  var valeurs = sh.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < valeurs.length; i++) {
    if (valeurs[i][0]) config[String(valeurs[i][0])] = String(valeurs[i][1]);
  }
  return config;
}

function roleDepuisCode(code, config) {
  if (!code) return null;
  if (code === config.codeTresorier) return 'tresorier';
  if (code === config.codeBenevole) return 'benevole';
  return null;
}

function configPublique(config, role) {
  var copie = {};
  Object.keys(config).forEach(function (k) { copie[k] = config[k]; });
  if (role !== 'tresorier') {
    delete copie.codeTresorier;
    delete copie.codeBenevole;
  }
  return copie;
}

function saveConfig(nouvelle) {
  var sh = feuille(ONGLETS.CONFIG);
  var valeurs = sh.getDataRange().getValues();
  var existantes = {};
  for (var i = 1; i < valeurs.length; i++) existantes[valeurs[i][0]] = i + 1;

  Object.keys(nouvelle).forEach(function (cle) {
    if (existantes[cle]) {
      sh.getRange(existantes[cle], 2).setValue(nouvelle[cle]);
    } else {
      sh.appendRow([cle, nouvelle[cle]]);
    }
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Lecture globale                                                     */
/* ------------------------------------------------------------------ */

function getData(role, prenom, config) {
  var notes = lireObjets(ONGLETS.NOTES);
  if (role !== 'tresorier') {
    var moi = String(prenom || '').toLowerCase();
    notes = notes.filter(function (n) {
      return String(n.benevole).toLowerCase() === moi ||
             String(n.saisiePar).toLowerCase() === moi;
    });
  }
  return {
    ok: true,
    role: role,
    config: configPublique(config, role),
    devis: lireObjets(ONGLETS.DEVIS),
    factures: lireObjets(ONGLETS.FACTURES),
    notes: notes,
    compta: role === 'tresorier' ? lireObjets(ONGLETS.COMPTA) : [],
    benevoles: lireBenevoles()
  };
}

/* ------------------------------------------------------------------ */
/* Bénévoles (liste auto-alimentée)                                    */
/* ------------------------------------------------------------------ */

function lireBenevoles() {
  var sh = feuille(ONGLETS.BENEVOLES);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(function (l) { return String(l[0]).trim(); })
    .filter(function (n) { return n; })
    .sort(function (a, b) { return a.localeCompare(b, 'fr'); });
}

function ajouterBenevole(nom) {
  nom = String(nom || '').trim();
  if (!nom) return;
  var existants = lireBenevoles().map(function (n) { return n.toLowerCase(); });
  if (existants.indexOf(nom.toLowerCase()) === -1) {
    feuille(ONGLETS.BENEVOLES).appendRow([nom]);
  }
}

/* ------------------------------------------------------------------ */
/* Devis                                                               */
/* ------------------------------------------------------------------ */

function saveDevis(devis, prenom) {
  if (!devis.id) devis.id = Utilities.getUuid();
  if (!devis.numero) devis.numero = prochainNumero(ONGLETS.DEVIS);
  if (!devis.auteur) devis.auteur = prenom || '';
  upsert(ONGLETS.DEVIS, devis);
  return { ok: true, devis: devis };
}

function deleteDevis(id, role) {
  var devis = trouver(ONGLETS.DEVIS, id);
  if (!devis) return { ok: false, erreur: 'Devis introuvable' };
  if (role !== 'tresorier' && devis.statut !== 'brouillon') {
    return { ok: false, erreur: 'Seul un brouillon peut être supprimé (ou demander au trésorier)' };
  }
  return supprimerLigne(ONGLETS.DEVIS, id);
}

function convertirDevis(id, prenom) {
  var devis = trouver(ONGLETS.DEVIS, id);
  if (!devis) return { ok: false, erreur: 'Devis introuvable' };
  if (devis.factureNumero) return { ok: false, erreur: 'Devis déjà facturé (' + devis.factureNumero + ')' };

  var facture = {
    id: Utilities.getUuid(),
    numero: prochainNumero(ONGLETS.FACTURES),
    date: dateISO(new Date()),
    auteur: prenom || devis.auteur,
    clientNom: devis.clientNom,
    clientTel: devis.clientTel,
    clientAdresse: devis.clientAdresse,
    clientEmail: devis.clientEmail,
    objet: devis.objet,
    lignes: devis.lignes,
    details: devis.details,
    remise: devis.remise,
    total: devis.total,
    statut: 'envoyée',
    devisNumero: devis.numero,
    datePaiement: ''
  };
  upsert(ONGLETS.FACTURES, facture);

  devis.statut = 'facturé';
  devis.factureNumero = facture.numero;
  upsert(ONGLETS.DEVIS, devis);

  return { ok: true, facture: facture, devis: devis };
}

/* ------------------------------------------------------------------ */
/* Factures                                                            */
/* ------------------------------------------------------------------ */

function saveFacture(facture, prenom) {
  if (!facture.id) facture.id = Utilities.getUuid();
  if (!facture.numero) facture.numero = prochainNumero(ONGLETS.FACTURES);
  if (!facture.auteur) facture.auteur = prenom || '';
  upsert(ONGLETS.FACTURES, facture);
  return { ok: true, facture: facture };
}

function marquerPayee(id, datePaiement) {
  var facture = trouver(ONGLETS.FACTURES, id);
  if (!facture) return { ok: false, erreur: 'Facture introuvable' };
  if (facture.statut === 'payée') return { ok: false, erreur: 'Facture déjà payée' };

  facture.statut = 'payée';
  facture.datePaiement = datePaiement || dateISO(new Date());
  upsert(ONGLETS.FACTURES, facture);

  upsert(ONGLETS.COMPTA, {
    id: Utilities.getUuid(),
    date: facture.datePaiement,
    type: 'recette',
    categorie: 'Prestations',
    libelle: 'Facture ' + facture.numero + ' — ' + facture.clientNom,
    montant: facture.total,
    reference: facture.numero,
    auteur: 'auto'
  });

  return { ok: true, facture: facture };
}

/* ------------------------------------------------------------------ */
/* Notes de frais                                                      */
/* ------------------------------------------------------------------ */

function saveNote(note, justificatifBase64, justificatifNom, config) {
  if (!note.id) note.id = Utilities.getUuid();
  if (!note.statut) note.statut = 'soumise';
  ajouterBenevole(note.benevole);

  if (justificatifBase64) {
    var dossier = dossierJustificatifs(config);
    var contentType = 'image/jpeg';
    var match = justificatifBase64.match(/^data:(.+?);base64,(.*)$/);
    var donnees = justificatifBase64;
    if (match) { contentType = match[1]; donnees = match[2]; }
    var blob = Utilities.newBlob(Utilities.base64Decode(donnees), contentType,
      justificatifNom || ('justificatif-' + note.id + '.jpg'));
    var fichier = dossier.createFile(blob);
    fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    note.justificatifUrl = fichier.getUrl();
  }

  upsert(ONGLETS.NOTES, note);
  return { ok: true, note: note };
}

function dossierJustificatifs(config) {
  var nom = config.dossierJustificatifs || 'Justificatifs SlackEstBeau';
  var it = DriveApp.getFoldersByName(nom);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nom);
}

function traiterNote(id, statut, commentaire) {
  var note = trouver(ONGLETS.NOTES, id);
  if (!note) return { ok: false, erreur: 'Note introuvable' };

  var dejaRemboursee = note.statut === 'remboursée';
  note.statut = statut;
  if (commentaire !== undefined) note.commentaire = commentaire;
  upsert(ONGLETS.NOTES, note);

  if (statut === 'remboursée' && !dejaRemboursee) {
    upsert(ONGLETS.COMPTA, {
      id: Utilities.getUuid(),
      date: dateISO(new Date()),
      type: 'dépense',
      categorie: 'Notes de frais',
      libelle: 'Note de frais ' + note.benevole + ' — ' + note.description,
      montant: note.montant,
      reference: note.id,
      auteur: 'auto'
    });
  }
  return { ok: true, note: note };
}

/* ------------------------------------------------------------------ */
/* Compta                                                              */
/* ------------------------------------------------------------------ */

function saveCompta(ligne, prenom) {
  if (!ligne.id) ligne.id = Utilities.getUuid();
  if (!ligne.auteur) ligne.auteur = prenom || '';
  upsert(ONGLETS.COMPTA, ligne);
  return { ok: true, ligne: ligne };
}

/* ------------------------------------------------------------------ */
/* Utilitaires feuilles                                                */
/* ------------------------------------------------------------------ */

function feuille(nom) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!sh) throw new Error('Onglet manquant : ' + nom + ' — exécutez la fonction initialiser().');
  return sh;
}

function lireObjets(nomOnglet) {
  var sh = feuille(nomOnglet);
  var valeurs = sh.getDataRange().getValues();
  if (valeurs.length < 2) return [];
  var entetes = valeurs[0];
  var objets = [];
  for (var i = 1; i < valeurs.length; i++) {
    var obj = {};
    for (var j = 0; j < entetes.length; j++) {
      var v = valeurs[i][j];
      if (v instanceof Date) v = dateISO(v);
      obj[entetes[j]] = v;
    }
    if (obj.id) objets.push(obj);
  }
  return objets;
}

function trouver(nomOnglet, id) {
  var objets = lireObjets(nomOnglet);
  for (var i = 0; i < objets.length; i++) {
    if (objets[i].id === id) return objets[i];
  }
  return null;
}

function upsert(nomOnglet, obj) {
  var sh = feuille(nomOnglet);
  var entetes = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var ligne = entetes.map(function (col) {
    var v = obj[col];
    return v === undefined || v === null ? '' : v;
  });

  var ids = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    : [];
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === obj.id) {
      sh.getRange(i + 2, 1, 1, entetes.length).setValues([ligne]);
      return;
    }
  }
  sh.appendRow(ligne);
}

function supprimerLigne(nomOnglet, id) {
  var sh = feuille(nomOnglet);
  var ids = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    : [];
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sh.deleteRow(i + 2);
      return { ok: true };
    }
  }
  return { ok: false, erreur: 'Élément introuvable' };
}

/** Numérotation façon asso : année + n° de séquence (202601, 202602...),
 *  remise à zéro chaque année. Devis et factures ont chacun leur suite. */
function prochainNumero(nomOnglet) {
  var annee = String(new Date().getFullYear());
  var max = 0;
  lireObjets(nomOnglet).forEach(function (obj) {
    var num = String(obj.numero || '');
    if (num.indexOf(annee) === 0) {
      var seq = parseInt(num.substring(annee.length), 10);
      if (!isNaN(seq) && seq > max) max = seq;
    }
  });
  var suivant = String(max + 1);
  while (suivant.length < 2) suivant = '0' + suivant;
  return annee + suivant;
}

function dateISO(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
