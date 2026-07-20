/* ================================================================
   S'Lac'K Est Beau — application devis / factures / compta
   ================================================================ */

var etat = {
  role: null,
  prenom: '',
  config: {},
  devis: [],
  factures: [],
  notes: [],
  compta: [],
  vue: 'accueil'
};

var CATEGORIES_RECETTES = ['Prestations', 'Adhésions', 'Subventions', 'Dons', 'Buvette / événements', 'Autre recette'];
var CATEGORIES_DEPENSES = ['Matériel', 'Déplacements', 'Notes de frais', 'Assurance', 'Communication', 'Frais bancaires', 'Location / salle', 'Autre dépense'];
var CATEGORIES_NOTES = ['Déplacement', 'Repas', 'Matériel', 'Hébergement', 'Autre'];

/* ---------------------------------------------------------------
   Utilitaires
   --------------------------------------------------------------- */

function $(sel) { return document.querySelector(sel); }

function echap(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function euros(n) {
  var v = Number(n) || 0;
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function nombre(s) {
  if (typeof s === 'number') return s;
  var v = parseFloat(String(s || '0').replace(',', '.').replace(/\s/g, ''));
  return isNaN(v) ? 0 : v;
}

function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('fr-FR');
}

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

function badgeStatut(statut) {
  var cls = 'statut-' + String(statut || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
  return '<span class="statut ' + cls + '">' + echap(statut) + '</span>';
}

function lignesDe(doc) {
  if (Array.isArray(doc.lignes)) return doc.lignes;
  try { return JSON.parse(doc.lignes || '[]'); } catch (e) { return []; }
}

function toast(message, estErreur) {
  var t = $('#toast');
  t.textContent = message;
  t.className = 'toast no-print' + (estErreur ? ' toast-erreur' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.add('cache'); }, 3500);
}

function chargement(actif) {
  $('#chargement').classList.toggle('cache', !actif);
}

async function action(fn, messageOk) {
  chargement(true);
  try {
    var res = await fn();
    if (messageOk) toast(messageOk);
    return res;
  } catch (e) {
    toast(e.message, true);
    throw e;
  } finally {
    chargement(false);
  }
}

/* ---------------------------------------------------------------
   Modale
   --------------------------------------------------------------- */

function ouvrirModale(html) {
  $('#modale').innerHTML = html;
  $('#modale-fond').classList.remove('cache');
}

function fermerModale() {
  $('#modale-fond').classList.add('cache');
  $('#modale').innerHTML = '';
}

$('#modale-fond') && $('#modale-fond').addEventListener('click', function (e) {
  if (e.target === this) fermerModale();
});

/* ---------------------------------------------------------------
   Connexion / initialisation
   --------------------------------------------------------------- */

async function demarrer() {
  var s = Api.session();
  if (!s) {
    $('#ecran-login').classList.remove('cache');
    return;
  }
  etat.prenom = s.prenom;
  try {
    await rechargerDonnees();
    afficherApp();
  } catch (e) {
    Api.effacerSession();
    $('#ecran-login').classList.remove('cache');
    var err = $('#login-erreur');
    err.textContent = e.message;
    err.classList.remove('cache');
  }
}

async function rechargerDonnees() {
  chargement(true);
  try {
    var data = await Api.getData();
    etat.role = data.role;
    etat.config = data.config || {};
    etat.devis = data.devis || [];
    etat.factures = data.factures || [];
    etat.notes = data.notes || [];
    etat.compta = data.compta || [];
  } finally {
    chargement(false);
  }
}

function afficherApp() {
  $('#ecran-login').classList.add('cache');
  $('#app').classList.remove('cache');
  $('#badge-user').textContent = etat.prenom + ' · ' + (etat.role === 'tresorier' ? 'Trésorier' : 'Bénévole');
  construireNav();
  naviguer(etat.vue);
}

$('#form-login').addEventListener('submit', async function (e) {
  e.preventDefault();
  var prenom = $('#login-prenom').value.trim();
  var code = $('#login-code').value.trim();
  var err = $('#login-erreur');
  err.classList.add('cache');
  $('#btn-login').disabled = true;
  try {
    Api.sauverSession({ code: code, prenom: prenom });
    var res = await Api.login(code, prenom);
    etat.role = res.role;
    etat.prenom = prenom;
    await rechargerDonnees();
    afficherApp();
  } catch (ex) {
    Api.effacerSession();
    err.textContent = ex.message;
    err.classList.remove('cache');
  } finally {
    $('#btn-login').disabled = false;
  }
});

$('#btn-logout').addEventListener('click', function () {
  Api.effacerSession();
  location.reload();
});

/* ---------------------------------------------------------------
   Navigation
   --------------------------------------------------------------- */

function construireNav() {
  var onglets = [
    ['accueil', 'Accueil'],
    ['devis', 'Devis'],
    ['factures', 'Factures'],
    ['notes', 'Notes de frais']
  ];
  if (etat.role === 'tresorier') {
    onglets.push(['compta', 'Compta'], ['bilan', 'Bilan'], ['parametres', 'Paramètres']);
  }
  $('#nav').innerHTML = onglets.map(function (o) {
    return '<a href="#" data-vue="' + o[0] + '">' + o[1] + '</a>';
  }).join('');
  $('#nav').querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      naviguer(a.dataset.vue);
    });
  });
}

function naviguer(vue) {
  etat.vue = vue;
  $('#nav').querySelectorAll('a').forEach(function (a) {
    a.classList.toggle('actif', a.dataset.vue === vue);
  });
  var vues = {
    accueil: vueAccueil,
    devis: vueDevis,
    factures: vueFactures,
    notes: vueNotes,
    compta: vueCompta,
    bilan: vueBilan,
    parametres: vueParametres
  };
  (vues[vue] || vueAccueil)();
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------
   Vue : accueil
   --------------------------------------------------------------- */

function vueAccueil() {
  var enCours = etat.devis.filter(function (d) { return d.statut !== 'facturé' && d.statut !== 'refusé'; });
  var impayees = etat.factures.filter(function (f) { return f.statut !== 'payée'; });
  var montantImpaye = impayees.reduce(function (s, f) { return s + nombre(f.total); }, 0);
  var notesAttente = etat.notes.filter(function (n) { return n.statut === 'soumise'; });

  var html =
    '<div class="entete-vue"><h2>Bonjour ' + echap(etat.prenom) + ' 👋</h2></div>' +
    '<div class="cartes-stats">' +
    '<div class="carte-stat"><div class="valeur">' + enCours.length + '</div><div class="libelle">Devis en cours</div></div>' +
    '<div class="carte-stat accent"><div class="valeur">' + euros(montantImpaye) + '</div><div class="libelle">' + impayees.length + ' facture(s) en attente de paiement</div></div>' +
    '<div class="carte-stat attention"><div class="valeur">' + notesAttente.length + '</div><div class="libelle">Note(s) de frais en attente</div></div>' +
    '</div>' +
    '<div class="carte"><h3>Actions rapides</h3><div class="barre-actions">' +
    '<button class="btn btn-primaire" onclick="editerDevis()">➕ Nouveau devis</button>' +
    '<button class="btn btn-accent" onclick="editerNote()">🧾 Nouvelle note de frais</button>' +
    (etat.role === 'tresorier' ? '<button class="btn" onclick="editerCompta()">💶 Écriture compta</button>' : '') +
    '</div></div>' +
    '<div class="carte"><h3>Derniers devis</h3>' + tableauDevis(etat.devis.slice().reverse().slice(0, 5)) + '</div>' +
    '<div class="carte"><h3>Dernières factures</h3>' + tableauFactures(etat.factures.slice().reverse().slice(0, 5)) + '</div>';

  $('#vue').innerHTML = html;
}

/* ---------------------------------------------------------------
   Vue : devis
   --------------------------------------------------------------- */

function tableauDevis(liste) {
  if (!liste.length) return '<p class="vide">Aucun devis pour le moment.</p>';
  return '<div class="conteneur-tableau"><table><thead><tr>' +
    '<th>N°</th><th>Date</th><th>Client</th><th>Objet</th><th class="num">Total</th><th>Statut</th>' +
    '</tr></thead><tbody>' +
    liste.map(function (d) {
      return '<tr class="cliquable" onclick="detailDevis(\'' + d.id + '\')">' +
        '<td><strong>' + echap(d.numero) + '</strong></td>' +
        '<td>' + fmtDate(d.date) + '</td>' +
        '<td>' + echap(d.clientNom) + '</td>' +
        '<td>' + echap(d.objet) + '</td>' +
        '<td class="num">' + euros(d.total) + '</td>' +
        '<td>' + badgeStatut(d.statut) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function vueDevis() {
  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Devis</h2>' +
    '<button class="btn btn-primaire" onclick="editerDevis()">➕ Nouveau devis</button></div>' +
    '<div class="carte">' + tableauDevis(etat.devis.slice().reverse()) + '</div>';
}

function editerDevis(id) {
  var d = id ? etat.devis.find(function (x) { return x.id === id; }) : null;
  var lignes = d ? lignesDe(d) : [{ desc: '', qte: 1, pu: '' }];

  ouvrirModale(
    '<h3>' + (d ? 'Modifier le devis ' + echap(d.numero) : 'Nouveau devis') + '</h3>' +
    '<form id="form-devis">' +
    '<div class="grille-form">' +
    champ('Client / structure *', '<input id="dv-clientNom" required value="' + echap(d ? d.clientNom : '') + '" placeholder="ex : Mairie d\'Annecy">') +
    champ('Email client', '<input id="dv-clientEmail" type="email" value="' + echap(d ? d.clientEmail : '') + '">') +
    champ('Adresse client', '<textarea id="dv-clientAdresse" rows="2">' + echap(d ? d.clientAdresse : '') + '</textarea>', true) +
    champ('Objet de la prestation *', '<input id="dv-objet" required value="' + echap(d ? d.objet : '') + '" placeholder="ex : Initiation slackline — fête du sport">', true) +
    champ('Date', '<input id="dv-date" type="date" value="' + echap(d ? d.date : aujourdhui()) + '">') +
    champ('Statut', selectStatutDevis(d ? d.statut : 'brouillon')) +
    '</div>' +
    '<label class="champ-label">Lignes de prestation</label>' +
    '<div id="dv-lignes"></div>' +
    '<button type="button" class="btn btn-petit" onclick="ajouterLigneDevis()">➕ Ajouter une ligne</button>' +
    '<div class="total-general">Total : <span id="dv-total">0,00 €</span></div>' +
    '<div class="barre-actions">' +
    '<button type="submit" class="btn btn-primaire">💾 Enregistrer</button>' +
    '<button type="button" class="btn" onclick="fermerModale()">Annuler</button>' +
    '</div></form>'
  );

  var conteneur = $('#dv-lignes');
  conteneur.innerHTML = '';
  lignes.forEach(function (l) { ajouterLigneDevis(l); });
  recalculerTotalDevis();

  $('#form-devis').addEventListener('submit', async function (e) {
    e.preventDefault();
    var devis = {
      id: d ? d.id : '',
      numero: d ? d.numero : '',
      date: $('#dv-date').value || aujourdhui(),
      auteur: d ? d.auteur : etat.prenom,
      clientNom: $('#dv-clientNom').value.trim(),
      clientAdresse: $('#dv-clientAdresse').value.trim(),
      clientEmail: $('#dv-clientEmail').value.trim(),
      objet: $('#dv-objet').value.trim(),
      lignes: JSON.stringify(lireLignesDevis()),
      total: totalLignes(lireLignesDevis()),
      statut: $('#dv-statut').value,
      factureNumero: d ? d.factureNumero : ''
    };
    await action(function () { return Api.saveDevis(devis); }, 'Devis enregistré ✔');
    fermerModale();
    await rechargerDonnees();
    naviguer('devis');
  });
}

function selectStatutDevis(actuel) {
  var statuts = ['brouillon', 'envoyé', 'accepté', 'refusé'];
  return '<select id="dv-statut">' + statuts.map(function (s) {
    return '<option' + (s === actuel ? ' selected' : '') + '>' + s + '</option>';
  }).join('') + '</select>';
}

function champ(label, inputHtml, pleineLargeur) {
  return '<div class="champ' + (pleineLargeur ? ' champ-pleine-largeur' : '') + '">' +
    '<label>' + label + '</label>' + inputHtml + '</div>';
}

function ajouterLigneDevis(ligne) {
  ligne = ligne || { desc: '', qte: 1, pu: '' };
  var div = document.createElement('div');
  div.className = 'ligne-devis';
  div.innerHTML =
    '<input class="ld-desc" placeholder="Description (ex : ½ journée initiation, 2 encadrants)" value="' + echap(ligne.desc) + '">' +
    '<input class="ld-qte" type="number" step="0.5" min="0" placeholder="Qté" value="' + echap(ligne.qte) + '">' +
    '<input class="ld-pu" inputmode="decimal" placeholder="Prix unit. €" value="' + echap(ligne.pu) + '">' +
    '<span class="total-ligne">0,00 €</span>' +
    '<button type="button" class="btn btn-danger btn-petit" title="Supprimer">✕</button>';
  div.querySelector('button').addEventListener('click', function () {
    div.remove();
    recalculerTotalDevis();
  });
  div.querySelectorAll('input').forEach(function (inp) {
    inp.addEventListener('input', recalculerTotalDevis);
  });
  $('#dv-lignes').appendChild(div);
}

function lireLignesDevis() {
  return Array.from(document.querySelectorAll('#dv-lignes .ligne-devis')).map(function (div) {
    return {
      desc: div.querySelector('.ld-desc').value.trim(),
      qte: nombre(div.querySelector('.ld-qte').value),
      pu: nombre(div.querySelector('.ld-pu').value)
    };
  }).filter(function (l) { return l.desc || l.pu; });
}

function totalLignes(lignes) {
  return lignes.reduce(function (s, l) { return s + nombre(l.qte) * nombre(l.pu); }, 0);
}

function recalculerTotalDevis() {
  document.querySelectorAll('#dv-lignes .ligne-devis').forEach(function (div) {
    var t = nombre(div.querySelector('.ld-qte').value) * nombre(div.querySelector('.ld-pu').value);
    div.querySelector('.total-ligne').textContent = euros(t);
  });
  var total = totalLignes(lireLignesDevis());
  var el = $('#dv-total');
  if (el) el.textContent = euros(total);
}

function detailDevis(id) {
  var d = etat.devis.find(function (x) { return x.id === id; });
  if (!d) return;
  var lignes = lignesDe(d);

  ouvrirModale(
    '<h3>Devis ' + echap(d.numero) + ' — ' + echap(d.clientNom) + ' ' + badgeStatut(d.statut) + '</h3>' +
    '<p class="texte-doux">' + echap(d.objet) + ' · ' + fmtDate(d.date) + ' · créé par ' + echap(d.auteur) + '</p>' +
    '<div class="conteneur-tableau" style="margin-top:12px"><table><thead><tr><th>Description</th><th class="num">Qté</th><th class="num">PU</th><th class="num">Total</th></tr></thead><tbody>' +
    lignes.map(function (l) {
      return '<tr><td>' + echap(l.desc) + '</td><td class="num">' + echap(l.qte) + '</td><td class="num">' + euros(l.pu) + '</td><td class="num">' + euros(nombre(l.qte) * nombre(l.pu)) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    '<div class="total-general">Total : ' + euros(d.total) + '</div>' +
    (d.factureNumero ? '<p class="texte-doux">✅ Facturé — facture ' + echap(d.factureNumero) + '</p>' : '') +
    '<div class="barre-actions">' +
    '<button class="btn btn-primaire" onclick="imprimerDocument(\'devis\', \'' + d.id + '\')">🖨️ Imprimer / PDF</button>' +
    (!d.factureNumero ? '<button class="btn btn-accent" onclick="convertirDevis(\'' + d.id + '\')">🧾 Convertir en facture</button>' : '') +
    (!d.factureNumero ? '<button class="btn" onclick="editerDevis(\'' + d.id + '\')">✏️ Modifier</button>' : '') +
    ((d.statut === 'brouillon' || etat.role === 'tresorier') ? '<button class="btn btn-danger" onclick="supprimerDevis(\'' + d.id + '\')">🗑 Supprimer</button>' : '') +
    '<button class="btn" onclick="fermerModale()">Fermer</button>' +
    '</div>'
  );
}

async function convertirDevis(id) {
  if (!confirm('Convertir ce devis en facture ? La numérotation de facture sera attribuée.')) return;
  await action(function () { return Api.convertirDevis(id); }, 'Facture créée ✔');
  fermerModale();
  await rechargerDonnees();
  naviguer('factures');
}

async function supprimerDevis(id) {
  if (!confirm('Supprimer ce devis ?')) return;
  await action(function () { return Api.deleteDevis(id); }, 'Devis supprimé');
  fermerModale();
  await rechargerDonnees();
  naviguer('devis');
}

/* ---------------------------------------------------------------
   Vue : factures
   --------------------------------------------------------------- */

function tableauFactures(liste) {
  if (!liste.length) return '<p class="vide">Aucune facture pour le moment.</p>';
  return '<div class="conteneur-tableau"><table><thead><tr>' +
    '<th>N°</th><th>Date</th><th>Client</th><th class="num">Total</th><th>Statut</th>' +
    '</tr></thead><tbody>' +
    liste.map(function (f) {
      return '<tr class="cliquable" onclick="detailFacture(\'' + f.id + '\')">' +
        '<td><strong>' + echap(f.numero) + '</strong></td>' +
        '<td>' + fmtDate(f.date) + '</td>' +
        '<td>' + echap(f.clientNom) + '</td>' +
        '<td class="num">' + euros(f.total) + '</td>' +
        '<td>' + badgeStatut(f.statut) + (f.datePaiement ? ' <span class="texte-doux">le ' + fmtDate(f.datePaiement) + '</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function vueFactures() {
  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Factures</h2></div>' +
    '<p class="texte-doux" style="margin-bottom:14px">Les factures sont créées depuis un devis (bouton « Convertir en facture »).</p>' +
    '<div class="carte">' + tableauFactures(etat.factures.slice().reverse()) + '</div>';
}

function detailFacture(id) {
  var f = etat.factures.find(function (x) { return x.id === id; });
  if (!f) return;
  var lignes = lignesDe(f);

  ouvrirModale(
    '<h3>Facture ' + echap(f.numero) + ' — ' + echap(f.clientNom) + ' ' + badgeStatut(f.statut) + '</h3>' +
    '<p class="texte-doux">' + echap(f.objet) + ' · émise le ' + fmtDate(f.date) +
    (f.devisNumero ? ' · issue du devis ' + echap(f.devisNumero) : '') + '</p>' +
    '<div class="conteneur-tableau" style="margin-top:12px"><table><thead><tr><th>Description</th><th class="num">Qté</th><th class="num">PU</th><th class="num">Total</th></tr></thead><tbody>' +
    lignes.map(function (l) {
      return '<tr><td>' + echap(l.desc) + '</td><td class="num">' + echap(l.qte) + '</td><td class="num">' + euros(l.pu) + '</td><td class="num">' + euros(nombre(l.qte) * nombre(l.pu)) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    '<div class="total-general">Total : ' + euros(f.total) + '</div>' +
    '<div class="barre-actions">' +
    '<button class="btn btn-primaire" onclick="imprimerDocument(\'facture\', \'' + f.id + '\')">🖨️ Imprimer / PDF</button>' +
    (etat.role === 'tresorier' && f.statut !== 'payée'
      ? '<button class="btn btn-accent" onclick="marquerPayee(\'' + f.id + '\')">✅ Marquer payée</button>' : '') +
    (etat.role === 'tresorier'
      ? '<button class="btn btn-danger" onclick="supprimerFacture(\'' + f.id + '\')">🗑 Supprimer</button>' : '') +
    '<button class="btn" onclick="fermerModale()">Fermer</button>' +
    '</div>'
  );
}

async function marquerPayee(id) {
  if (!confirm('Marquer cette facture comme payée ? Une recette sera ajoutée automatiquement à la compta.')) return;
  await action(function () { return Api.marquerPayee(id, aujourdhui()); }, 'Facture payée — recette enregistrée ✔');
  fermerModale();
  await rechargerDonnees();
  naviguer('factures');
}

async function supprimerFacture(id) {
  if (!confirm('Supprimer cette facture ? Attention : cela crée un trou dans la numérotation.')) return;
  await action(function () { return Api.deleteFacture(id); }, 'Facture supprimée');
  fermerModale();
  await rechargerDonnees();
  naviguer('factures');
}

/* ---------------------------------------------------------------
   Impression devis / facture
   --------------------------------------------------------------- */

function imprimerDocument(type, id) {
  var doc = (type === 'devis' ? etat.devis : etat.factures).find(function (x) { return x.id === id; });
  if (!doc) return;
  var cfg = etat.config;
  var lignes = lignesDe(doc);
  var estFacture = type === 'facture';
  var delai = nombre(cfg.delaiPaiementJours) || 30;
  var echeance = new Date(doc.date || aujourdhui());
  echeance.setDate(echeance.getDate() + delai);

  var html =
    '<div class="document">' +
    '<div class="doc-entete">' +
    '<div class="doc-asso">' +
    (cfg.logoUrl ? '<img class="logo" src="' + echap(cfg.logoUrl) + '" alt="logo"><br>' : '') +
    '<h1>' + echap(cfg.nomAsso) + '</h1>' +
    '<p>' + echap(cfg.adresse).replace(/\n/g, '<br>') + '<br>' +
    echap(cfg.email) + (cfg.telephone ? ' · ' + echap(cfg.telephone) : '') + '</p>' +
    '</div>' +
    '<div class="doc-type">' +
    '<div class="type">' + (estFacture ? 'FACTURE' : 'DEVIS') + '</div>' +
    '<p><strong>' + echap(doc.numero) + '</strong><br>' +
    'Date : ' + fmtDate(doc.date) + '<br>' +
    (estFacture
      ? (doc.devisNumero ? 'Réf. devis : ' + echap(doc.devisNumero) + '<br>' : '') + 'Échéance : ' + echeance.toLocaleDateString('fr-FR')
      : 'Validité : 30 jours') +
    '</p></div></div>' +
    '<div class="doc-client"><p><strong>' + echap(doc.clientNom) + '</strong><br>' +
    echap(doc.clientAdresse).replace(/\n/g, '<br>') +
    (doc.clientEmail ? '<br>' + echap(doc.clientEmail) : '') + '</p></div>' +
    '<p class="doc-objet"><strong>Objet :</strong> ' + echap(doc.objet) + '</p>' +
    '<table><thead><tr><th>Description</th><th class="num">Qté</th><th class="num">Prix unitaire</th><th class="num">Montant</th></tr></thead><tbody>' +
    lignes.map(function (l) {
      return '<tr><td>' + echap(l.desc) + '</td><td class="num">' + echap(l.qte) + '</td>' +
        '<td class="num">' + euros(l.pu) + '</td><td class="num">' + euros(nombre(l.qte) * nombre(l.pu)) + '</td></tr>';
    }).join('') +
    '</tbody></table>' +
    '<div class="doc-total">Total : ' + euros(doc.total) + '</div>' +
    '<p style="text-align:right;font-size:12px">' + echap(cfg.mentionTva) + '</p>' +
    (estFacture && cfg.iban
      ? '<div class="doc-rib"><strong>Règlement par virement :</strong><br>IBAN : ' + echap(cfg.iban) +
        (cfg.bic ? ' · BIC : ' + echap(cfg.bic) : '') + '</div>'
      : '') +
    (!estFacture
      ? '<div class="doc-rib">Bon pour accord (date + signature) :<br><br><br></div>'
      : '') +
    '<div class="doc-mentions">' +
    echap(cfg.mentionsPied) + '<br>' +
    (cfg.rna ? 'RNA : ' + echap(cfg.rna) + ' · ' : '') +
    (cfg.siret ? 'SIRET : ' + echap(cfg.siret) : '') +
    (estFacture ? '<br>En cas de retard de paiement, indemnité forfaitaire de recouvrement de 40 € (art. L441-10 du Code de commerce).' : '') +
    '</div></div>';

  $('#zone-impression').innerHTML = html;
  window.print();
}

/* ---------------------------------------------------------------
   Vue : notes de frais
   --------------------------------------------------------------- */

function vueNotes() {
  var liste = etat.notes.slice().reverse();
  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Notes de frais</h2>' +
    '<button class="btn btn-primaire" onclick="editerNote()">➕ Nouvelle note</button></div>' +
    (etat.role === 'tresorier'
      ? '<p class="texte-doux" style="margin-bottom:14px">Vue trésorier : toutes les notes. « Rembourser » ajoute automatiquement la dépense en compta.</p>'
      : '<p class="texte-doux" style="margin-bottom:14px">Tes notes de frais. Ajoute une photo du justificatif, le trésorier valide puis rembourse.</p>') +
    '<div class="carte">' +
    (!liste.length ? '<p class="vide">Aucune note de frais.</p>' :
      '<div class="conteneur-tableau"><table><thead><tr>' +
      '<th>Date</th><th>Bénévole</th><th>Description</th><th>Catégorie</th><th class="num">Montant</th><th>Justif.</th><th>Statut</th>' +
      (etat.role === 'tresorier' ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      liste.map(function (n) {
        return '<tr>' +
          '<td>' + fmtDate(n.date) + '</td>' +
          '<td>' + echap(n.benevole) + '</td>' +
          '<td>' + echap(n.description) + (n.commentaire ? '<br><span class="texte-doux">💬 ' + echap(n.commentaire) + '</span>' : '') + '</td>' +
          '<td>' + echap(n.categorie) + '</td>' +
          '<td class="num">' + euros(n.montant) + '</td>' +
          '<td>' + (n.justificatifUrl ? '<a href="' + echap(n.justificatifUrl) + '" target="_blank" rel="noopener">📎 voir</a>' : '—') + '</td>' +
          '<td>' + badgeStatut(n.statut) + '</td>' +
          (etat.role === 'tresorier' ? '<td>' + actionsNote(n) + '</td>' : '') +
          '</tr>';
      }).join('') + '</tbody></table></div>') +
    '</div>';
}

function actionsNote(n) {
  if (n.statut === 'soumise') {
    return '<button class="btn btn-petit btn-primaire" onclick="traiterNote(\'' + n.id + '\', \'validée\')">Valider</button> ' +
      '<button class="btn btn-petit btn-danger" onclick="traiterNote(\'' + n.id + '\', \'refusée\')">Refuser</button>';
  }
  if (n.statut === 'validée') {
    return '<button class="btn btn-petit btn-accent" onclick="traiterNote(\'' + n.id + '\', \'remboursée\')">💶 Rembourser</button>';
  }
  return '';
}

async function traiterNote(id, statut) {
  var commentaire;
  if (statut === 'refusée') {
    commentaire = prompt('Motif du refus (visible par le bénévole) :') || '';
  }
  if (statut === 'remboursée' && !confirm('Confirmer le remboursement ? La dépense sera ajoutée à la compta.')) return;
  await action(function () { return Api.traiterNote(id, statut, commentaire); }, 'Note ' + statut + ' ✔');
  await rechargerDonnees();
  naviguer('notes');
}

function editerNote() {
  ouvrirModale(
    '<h3>Nouvelle note de frais</h3>' +
    '<form id="form-note">' +
    '<div class="grille-form">' +
    champ('Date de la dépense *', '<input id="nf-date" type="date" required value="' + aujourdhui() + '">') +
    champ('Catégorie', '<select id="nf-categorie">' + CATEGORIES_NOTES.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select>') +
    champ('Description *', '<input id="nf-description" required placeholder="ex : Essence aller-retour Passy, animation highline">', true) +
    champ('Montant (€) *', '<input id="nf-montant" required inputmode="decimal" placeholder="ex : 34,50">') +
    champ('Justificatif (photo ou PDF)', '<input id="nf-fichier" type="file" accept="image/*,.pdf" capture="environment">') +
    '</div>' +
    '<p class="texte-doux" style="font-size:12.5px">📷 Les photos sont compressées automatiquement avant envoi.</p>' +
    '<div class="barre-actions">' +
    '<button type="submit" class="btn btn-primaire">📤 Soumettre</button>' +
    '<button type="button" class="btn" onclick="fermerModale()">Annuler</button>' +
    '</div></form>'
  );

  $('#form-note').addEventListener('submit', async function (e) {
    e.preventDefault();
    var fichier = $('#nf-fichier').files[0] || null;
    var base64 = null, nomFichier = null;
    if (fichier) {
      chargement(true);
      try {
        base64 = await fichierVersBase64(fichier);
        nomFichier = fichier.name;
      } finally {
        chargement(false);
      }
    }
    var note = {
      id: '',
      date: $('#nf-date').value,
      benevole: etat.prenom,
      description: $('#nf-description').value.trim(),
      categorie: $('#nf-categorie').value,
      montant: nombre($('#nf-montant').value),
      justificatifUrl: '',
      statut: 'soumise',
      commentaire: ''
    };
    await action(function () { return Api.saveNote(note, base64, nomFichier); }, 'Note de frais soumise ✔');
    fermerModale();
    await rechargerDonnees();
    naviguer('notes');
  });
}

/** Convertit un fichier en base64 ; les images sont réduites (max 1400 px). */
function fichierVersBase64(fichier) {
  return new Promise(function (resoudre, rejeter) {
    if (fichier.type.indexOf('image/') !== 0) {
      var lecteur = new FileReader();
      lecteur.onload = function () { resoudre(lecteur.result); };
      lecteur.onerror = rejeter;
      lecteur.readAsDataURL(fichier);
      return;
    }
    var img = new Image();
    var url = URL.createObjectURL(fichier);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var max = 1400;
      var ratio = Math.min(1, max / Math.max(img.width, img.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resoudre(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = rejeter;
    img.src = url;
  });
}

/* ---------------------------------------------------------------
   Vue : compta (trésorier)
   --------------------------------------------------------------- */

function anneesDisponibles() {
  var annees = {};
  etat.compta.forEach(function (l) {
    var a = String(l.date || '').slice(0, 4);
    if (a) annees[a] = true;
  });
  annees[String(new Date().getFullYear())] = true;
  return Object.keys(annees).sort().reverse();
}

function vueCompta(anneeChoisie) {
  var annee = anneeChoisie || String(new Date().getFullYear());
  var lignes = etat.compta
    .filter(function (l) { return String(l.date || '').slice(0, 4) === annee; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

  var recettes = lignes.filter(function (l) { return l.type === 'recette'; })
    .reduce(function (s, l) { return s + nombre(l.montant); }, 0);
  var depenses = lignes.filter(function (l) { return l.type === 'dépense'; })
    .reduce(function (s, l) { return s + nombre(l.montant); }, 0);

  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Compta ' + annee + '</h2>' +
    '<button class="btn btn-primaire" onclick="editerCompta()">➕ Nouvelle écriture</button></div>' +
    '<div class="filtres"><select id="cp-annee">' +
    anneesDisponibles().map(function (a) {
      return '<option' + (a === annee ? ' selected' : '') + '>' + a + '</option>';
    }).join('') + '</select>' +
    '<button class="btn btn-petit" onclick="exporterComptaCSV(\'' + annee + '\')">⬇️ Export CSV</button></div>' +
    '<div class="cartes-stats">' +
    '<div class="carte-stat"><div class="valeur">' + euros(recettes) + '</div><div class="libelle">Recettes</div></div>' +
    '<div class="carte-stat attention"><div class="valeur">' + euros(depenses) + '</div><div class="libelle">Dépenses</div></div>' +
    '<div class="carte-stat accent"><div class="valeur">' + euros(recettes - depenses) + '</div><div class="libelle">Solde de l\'exercice</div></div>' +
    '</div>' +
    '<div class="carte">' +
    (!lignes.length ? '<p class="vide">Aucune écriture pour ' + annee + '.</p>' :
      '<div class="conteneur-tableau"><table><thead><tr>' +
      '<th>Date</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th class="num">Montant</th><th></th>' +
      '</tr></thead><tbody>' +
      lignes.map(function (l) {
        var signe = l.type === 'recette' ? '+' : '−';
        var couleur = l.type === 'recette' ? 'var(--succes)' : 'var(--danger)';
        return '<tr>' +
          '<td>' + fmtDate(l.date) + '</td>' +
          '<td>' + echap(l.type) + '</td>' +
          '<td>' + echap(l.categorie) + '</td>' +
          '<td>' + echap(l.libelle) + (l.reference ? ' <span class="texte-doux">(' + echap(l.reference) + ')</span>' : '') + '</td>' +
          '<td class="num" style="color:' + couleur + ';font-weight:700">' + signe + ' ' + euros(l.montant) + '</td>' +
          '<td><button class="btn btn-petit btn-danger" onclick="supprimerCompta(\'' + l.id + '\', \'' + annee + '\')">✕</button></td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>') +
    '</div>';

  $('#cp-annee').addEventListener('change', function () { vueCompta(this.value); });
}

function editerCompta() {
  ouvrirModale(
    '<h3>Nouvelle écriture comptable</h3>' +
    '<form id="form-compta">' +
    '<div class="grille-form">' +
    champ('Date *', '<input id="cp-date" type="date" required value="' + aujourdhui() + '">') +
    champ('Type *', '<select id="cp-type"><option value="recette">Recette</option><option value="dépense">Dépense</option></select>') +
    champ('Catégorie', '<select id="cp-categorie"></select>') +
    champ('Montant (€) *', '<input id="cp-montant" required inputmode="decimal" placeholder="ex : 150">') +
    champ('Libellé *', '<input id="cp-libelle" required placeholder="ex : Subvention mairie, achat sangle 25 m...">', true) +
    '</div>' +
    '<div class="barre-actions">' +
    '<button type="submit" class="btn btn-primaire">💾 Enregistrer</button>' +
    '<button type="button" class="btn" onclick="fermerModale()">Annuler</button>' +
    '</div></form>'
  );

  function majCategories() {
    var cats = $('#cp-type').value === 'recette' ? CATEGORIES_RECETTES : CATEGORIES_DEPENSES;
    $('#cp-categorie').innerHTML = cats.map(function (c) { return '<option>' + c + '</option>'; }).join('');
  }
  majCategories();
  $('#cp-type').addEventListener('change', majCategories);

  $('#form-compta').addEventListener('submit', async function (e) {
    e.preventDefault();
    var ligne = {
      id: '',
      date: $('#cp-date').value,
      type: $('#cp-type').value,
      categorie: $('#cp-categorie').value,
      libelle: $('#cp-libelle').value.trim(),
      montant: nombre($('#cp-montant').value),
      reference: '',
      auteur: etat.prenom
    };
    await action(function () { return Api.saveCompta(ligne); }, 'Écriture enregistrée ✔');
    fermerModale();
    await rechargerDonnees();
    naviguer('compta');
  });
}

async function supprimerCompta(id, annee) {
  if (!confirm('Supprimer cette écriture ?')) return;
  await action(function () { return Api.deleteCompta(id); }, 'Écriture supprimée');
  await rechargerDonnees();
  vueCompta(annee);
}

function exporterComptaCSV(annee) {
  var lignes = etat.compta.filter(function (l) { return String(l.date || '').slice(0, 4) === annee; });
  var csv = 'Date;Type;Catégorie;Libellé;Montant;Référence;Auteur\n' +
    lignes.map(function (l) {
      return [l.date, l.type, l.categorie, l.libelle, String(nombre(l.montant)).replace('.', ','), l.reference, l.auteur]
        .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(';');
    }).join('\n');
  var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'compta-slackestbeau-' + annee + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------------------------------------------------------
   Vue : bilan (trésorier)
   --------------------------------------------------------------- */

function vueBilan(anneeChoisie) {
  var annee = anneeChoisie || String(new Date().getFullYear());
  var lignes = etat.compta.filter(function (l) { return String(l.date || '').slice(0, 4) === annee; });

  function totauxParCategorie(type) {
    var totaux = {};
    lignes.filter(function (l) { return l.type === type; }).forEach(function (l) {
      totaux[l.categorie || 'Sans catégorie'] = (totaux[l.categorie || 'Sans catégorie'] || 0) + nombre(l.montant);
    });
    return Object.keys(totaux).sort(function (a, b) { return totaux[b] - totaux[a]; })
      .map(function (c) { return { categorie: c, total: totaux[c] }; });
  }

  var recettes = totauxParCategorie('recette');
  var depenses = totauxParCategorie('dépense');
  var totalR = recettes.reduce(function (s, r) { return s + r.total; }, 0);
  var totalD = depenses.reduce(function (s, r) { return s + r.total; }, 0);

  function tableBilan(titre, items, total) {
    return '<div class="carte"><h3>' + titre + '</h3>' +
      (!items.length ? '<p class="vide">Rien pour ' + annee + '.</p>' :
        '<table><tbody>' +
        items.map(function (i) {
          return '<tr><td>' + echap(i.categorie) + '</td><td class="num">' + euros(i.total) + '</td></tr>';
        }).join('') +
        '<tr><td><strong>Total</strong></td><td class="num"><strong>' + euros(total) + '</strong></td></tr>' +
        '</tbody></table>') +
      '</div>';
  }

  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Bilan ' + annee + '</h2>' +
    '<select id="bl-annee" style="width:auto">' +
    anneesDisponibles().map(function (a) {
      return '<option' + (a === annee ? ' selected' : '') + '>' + a + '</option>';
    }).join('') + '</select></div>' +
    '<div class="cartes-stats">' +
    '<div class="carte-stat"><div class="valeur">' + euros(totalR) + '</div><div class="libelle">Total recettes</div></div>' +
    '<div class="carte-stat attention"><div class="valeur">' + euros(totalD) + '</div><div class="libelle">Total dépenses</div></div>' +
    '<div class="carte-stat accent"><div class="valeur">' + euros(totalR - totalD) + '</div><div class="libelle">Résultat de l\'exercice</div></div>' +
    '</div>' +
    tableBilan('📈 Recettes par catégorie', recettes, totalR) +
    tableBilan('📉 Dépenses par catégorie', depenses, totalD) +
    '<p class="texte-doux">Astuce : utilise l\'export CSV de l\'onglet Compta pour joindre le détail au rapport d\'AG.</p>';

  $('#bl-annee').addEventListener('change', function () { vueBilan(this.value); });
}

/* ---------------------------------------------------------------
   Vue : paramètres (trésorier)
   --------------------------------------------------------------- */

function vueParametres() {
  var c = etat.config;
  function inp(cle, label, placeholder, type) {
    return champ(label,
      '<input id="pr-' + cle + '" type="' + (type || 'text') + '" value="' + echap(c[cle] || '') + '" placeholder="' + echap(placeholder || '') + '">');
  }

  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Paramètres de l\'asso</h2></div>' +
    '<form id="form-parametres">' +
    '<div class="carte"><h3>Identité</h3><div class="grille-form">' +
    inp('nomAsso', 'Nom de l\'association') +
    inp('email', 'Email') +
    champ('Adresse', '<textarea id="pr-adresse" rows="2">' + echap(c.adresse || '') + '</textarea>') +
    inp('telephone', 'Téléphone') +
    inp('rna', 'N° RNA', 'W...') +
    inp('siret', 'SIRET (si vous en avez un)') +
    inp('logoUrl', 'URL du logo (image en ligne)', 'https://...') +
    '</div></div>' +
    '<div class="carte"><h3>Facturation</h3><div class="grille-form">' +
    inp('iban', 'IBAN', 'FR76...') +
    inp('bic', 'BIC') +
    inp('delaiPaiementJours', 'Délai de paiement (jours)', '30') +
    champ('Mention TVA', '<input id="pr-mentionTva" value="' + echap(c.mentionTva || '') + '">') +
    champ('Pied de page des documents', '<input id="pr-mentionsPied" value="' + echap(c.mentionsPied || '') + '">') +
    '</div></div>' +
    '<div class="carte"><h3>Codes d\'accès</h3><div class="grille-form">' +
    inp('codeTresorier', 'Code trésorier') +
    inp('codeBenevole', 'Code bénévoles') +
    '</div><p class="texte-doux" style="font-size:12.5px">⚠️ Si tu changes le code trésorier, reconnecte-toi avec le nouveau code.</p></div>' +
    '<button type="submit" class="btn btn-primaire">💾 Enregistrer les paramètres</button>' +
    '</form>';

  $('#form-parametres').addEventListener('submit', async function (e) {
    e.preventDefault();
    var cles = ['nomAsso', 'email', 'adresse', 'telephone', 'rna', 'siret', 'logoUrl',
      'iban', 'bic', 'delaiPaiementJours', 'mentionTva', 'mentionsPied',
      'codeTresorier', 'codeBenevole'];
    var config = {};
    cles.forEach(function (k) { config[k] = $('#pr-' + k).value.trim(); });
    await action(function () { return Api.saveConfig(config); }, 'Paramètres enregistrés ✔');
    etat.config = Object.assign({}, etat.config, config);
  });
}

/* ---------------------------------------------------------------
   Lancement
   --------------------------------------------------------------- */

demarrer();
