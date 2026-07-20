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
  benevoles: [],
  vue: 'accueil'
};

var CATEGORIES_RECETTES = ['Prestations', 'Adhésions', 'Goodies', 'Subventions', 'Dons', 'Buvette / événements', 'Autre recette'];
var MODES_PAIEMENT = ['Virement', 'CB', 'Espèces', 'Chèque', 'HelloAsso', 'Prélèvement'];
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
    etat.benevoles = data.benevoles || [];
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
  var conditionsDefaut = etat.config.conditionsPaiement || '';

  ouvrirModale(
    '<h3>' + (d ? 'Modifier le devis n°' + echap(d.numero) : 'Nouveau devis') + '</h3>' +
    '<form id="form-devis">' +
    '<div class="grille-form">' +
    champ('Contact client *', '<input id="dv-clientNom" required value="' + echap(d ? d.clientNom : '') + '" placeholder="ex : Marine HOLT">') +
    champ('Téléphone', '<input id="dv-clientTel" value="' + echap(d ? d.clientTel : '') + '" placeholder="ex : 06 62 04 46 53">') +
    champ('Email client', '<input id="dv-clientEmail" type="email" value="' + echap(d ? d.clientEmail : '') + '">') +
    champ('Structure et adresse', '<textarea id="dv-clientAdresse" rows="3" placeholder="ex :\nPRINGY FOLIES\n4890 route de Ferrières\n74370 Annecy">' + echap(d ? d.clientAdresse : '') + '</textarea>') +
    champ('Objet de la prestation *', '<input id="dv-objet" required value="' + echap(d ? d.objet : '') + '" placeholder="ex : Initiation slackline — fête du sport">', true) +
    champ('Date', '<input id="dv-date" type="date" value="' + echap(d ? d.date : aujourdhui()) + '">') +
    champ('Statut', selectStatutDevis(d ? d.statut : 'brouillon')) +
    '</div>' +
    '<label class="champ-label">Lignes de prestation</label>' +
    '<div id="dv-lignes"></div>' +
    '<button type="button" class="btn btn-petit" onclick="ajouterLigneDevis()">➕ Ajouter une ligne</button>' +
    '<div class="grille-form" style="margin-top:14px">' +
    champ('Détails de la prestation (encadré sur le document)', '<textarea id="dv-details" rows="2" placeholder="ex : 2 bénévoles de l\'association installeront 3 racks de slackline et assureront l\'encadrement des initiations de 10h à 18h">' + echap(d ? d.details : '') + '</textarea>', true) +
    champ('Remise exceptionnelle (€)', '<input id="dv-remise" inputmode="decimal" value="' + echap(d && nombre(d.remise) ? d.remise : '') + '" placeholder="ex : 250">') +
    champ('Conditions de paiement (sur le devis)', '<textarea id="dv-conditions" rows="2">' + echap(d ? d.conditions : conditionsDefaut) + '</textarea>') +
    '</div>' +
    '<div class="total-general"><span class="texte-doux" style="font-size:14px">Sous-total : <span id="dv-soustotal">0,00 €</span> · </span>Total : <span id="dv-total">0,00 €</span> TTC</div>' +
    '<div class="barre-actions">' +
    '<button type="submit" class="btn btn-primaire">💾 Enregistrer</button>' +
    '<button type="button" class="btn" onclick="fermerModale()">Annuler</button>' +
    '</div></form>'
  );

  var conteneur = $('#dv-lignes');
  conteneur.innerHTML = '';
  lignes.forEach(function (l) { ajouterLigneDevis(l); });
  $('#dv-remise').addEventListener('input', recalculerTotalDevis);
  recalculerTotalDevis();

  $('#form-devis').addEventListener('submit', async function (e) {
    e.preventDefault();
    var lignesSaisies = lireLignesDevis();
    var remise = nombre($('#dv-remise').value);
    var devis = {
      id: d ? d.id : '',
      numero: d ? d.numero : '',
      date: $('#dv-date').value || aujourdhui(),
      auteur: d ? d.auteur : etat.prenom,
      clientNom: $('#dv-clientNom').value.trim(),
      clientTel: $('#dv-clientTel').value.trim(),
      clientAdresse: $('#dv-clientAdresse').value.trim(),
      clientEmail: $('#dv-clientEmail').value.trim(),
      objet: $('#dv-objet').value.trim(),
      lignes: JSON.stringify(lignesSaisies),
      details: $('#dv-details').value.trim(),
      remise: remise,
      total: totalLignes(lignesSaisies) - remise,
      statut: $('#dv-statut').value,
      conditions: $('#dv-conditions').value.trim(),
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
  var sousTotal = totalLignes(lireLignesDevis());
  var remise = $('#dv-remise') ? nombre($('#dv-remise').value) : 0;
  if ($('#dv-soustotal')) $('#dv-soustotal').textContent = euros(sousTotal);
  if ($('#dv-total')) $('#dv-total').textContent = euros(sousTotal - remise);
}

function detailDevis(id) {
  var d = etat.devis.find(function (x) { return x.id === id; });
  if (!d) return;
  var lignes = lignesDe(d);

  ouvrirModale(
    '<h3>Devis n°' + echap(d.numero) + ' — ' + echap(d.clientNom) + ' ' + badgeStatut(d.statut) + '</h3>' +
    '<p class="texte-doux">' + echap(d.objet) + ' · ' + fmtDate(d.date) + ' · créé par ' + echap(d.auteur) + '</p>' +
    '<div class="conteneur-tableau" style="margin-top:12px"><table><thead><tr><th>Description</th><th class="num">Prix</th><th class="num">Quantité</th><th class="num">Total</th></tr></thead><tbody>' +
    lignes.map(function (l) {
      return '<tr><td>' + echap(l.desc) + '</td><td class="num">' + euros(l.pu) + '</td><td class="num">' + echap(l.qte) + '</td><td class="num">' + euros(nombre(l.qte) * nombre(l.pu)) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    (d.details ? '<p class="texte-doux" style="margin-top:8px">📋 ' + echap(d.details) + '</p>' : '') +
    (nombre(d.remise) ? '<p style="text-align:right;margin-top:8px">Remise exceptionnelle : −' + euros(d.remise) + '</p>' : '') +
    '<div class="total-general">Total : ' + euros(d.total) + ' TTC</div>' +
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
    '<h3>Facture n°' + echap(f.numero) + ' — ' + echap(f.clientNom) + ' ' + badgeStatut(f.statut) + '</h3>' +
    '<p class="texte-doux">' + echap(f.objet) + ' · émise le ' + fmtDate(f.date) +
    (f.devisNumero ? ' · issue du devis n°' + echap(f.devisNumero) : '') + '</p>' +
    '<div class="conteneur-tableau" style="margin-top:12px"><table><thead><tr><th>Description</th><th class="num">Prix</th><th class="num">Quantité</th><th class="num">Total</th></tr></thead><tbody>' +
    lignes.map(function (l) {
      return '<tr><td>' + echap(l.desc) + '</td><td class="num">' + euros(l.pu) + '</td><td class="num">' + echap(l.qte) + '</td><td class="num">' + euros(nombre(l.qte) * nombre(l.pu)) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    (f.details ? '<p class="texte-doux" style="margin-top:8px">📋 ' + echap(f.details) + '</p>' : '') +
    (nombre(f.remise) ? '<p style="text-align:right;margin-top:8px">Remise exceptionnelle : −' + euros(f.remise) + '</p>' : '') +
    '<div class="total-general">Total : ' + euros(f.total) + ' TTC</div>' +
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

/** Résout un chemin relatif (ex : assets/logo.png) en URL absolue,
 *  nécessaire car le document s'ouvre dans son propre onglet. */
function resoudreUrl(u) {
  try { return new URL(u, window.location.href).href; } catch (e) { return u; }
}

var STYLE_DOCUMENT = [
  '* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
  'body { font-family:"Segoe UI",system-ui,-apple-system,sans-serif; color:#1c2733; font-size:13px;',
  '  max-width:190mm; margin:0 auto; padding:10mm 6mm; background:#fff; }',
  '@page { size:A4; margin:10mm 12mm; }',
  'p { line-height:1.5; }',
  '.doc-entete { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:12px; }',
  '.doc-titre { font-size:46px; font-weight:800; color:#85aec9; line-height:1; margin-bottom:8px; }',
  '.doc-badge { display:inline-block; border:1.5px solid #5c82a3; color:#3f5a70; border-radius:999px;',
  '  padding:4px 14px; font-size:13px; font-weight:600; }',
  '.logo { max-height:90px; max-width:150px; object-fit:contain; }',
  '.doc-dates { border-top:1.5px solid #3d4a55; border-bottom:1.5px solid #3d4a55;',
  '  padding:8px 2px; margin-bottom:16px; font-size:12.5px; }',
  '.doc-blocs { display:flex; justify-content:space-between; gap:24px; margin-bottom:20px; font-size:12.5px; }',
  '.doc-client { text-align:right; }',
  '.doc-attention { font-weight:800; letter-spacing:0.03em; margin-bottom:2px; }',
  'table { width:100%; border-collapse:collapse; font-size:12.5px; margin-bottom:18px; table-layout:fixed; }',
  'th { background:#5c82a3; color:#fff; text-align:center; padding:9px 10px; font-size:12px;',
  '  letter-spacing:0.05em; border:1px solid #5c82a3; }',
  'th:first-child { width:46%; }',
  'td { border:1px solid #9fb2c0; text-align:center; padding:12px 10px; vertical-align:middle; word-wrap:break-word; }',
  '.doc-details { border:1px solid #9fb2c0; margin-bottom:18px; }',
  '.doc-details-titre { background:#5c82a3; color:#fff; text-align:center; padding:7px 10px;',
  '  font-size:12px; font-weight:700; letter-spacing:0.05em; }',
  '.doc-details-corps { padding:12px 16px; text-align:center; font-size:12.5px; font-weight:600; }',
  '.doc-totaux { margin-left:auto; width:62%; text-align:right; font-size:13.5px; }',
  '.doc-totaux p { padding:3px 6px; }',
  '.doc-totaux p span { display:inline-block; min-width:90px; }',
  '.doc-total-bande { background:#48657e; color:#fff; display:flex; justify-content:flex-end; gap:26px;',
  '  padding:9px 14px; font-size:15px; font-weight:800; margin-top:6px; }',
  '.doc-exoneration { font-style:italic; font-size:11px; margin-top:4px; }',
  '.doc-pied { display:flex; justify-content:space-between; align-items:flex-start; gap:30px; margin-top:26px; font-size:12px; }',
  '.doc-signature { text-align:center; min-width:220px; }',
  '.doc-ligne-signature { border-bottom:1.5px solid #3d4a55; margin-top:52px; }',
  '.doc-merci { text-align:center; border-top:1.5px solid #3d4a55; margin-top:26px; padding-top:10px;',
  '  font-size:12.5px; font-weight:700; letter-spacing:0.08em; }',
  '.barre-impression { position:fixed; top:12px; right:12px; }',
  '.barre-impression button { font:inherit; font-weight:700; border:none; border-radius:8px;',
  '  padding:10px 18px; cursor:pointer; background:#5c82a3; color:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.25); }',
  '@media print { .barre-impression { display:none; } body { padding:0; max-width:none; } }'
].join('\n');

function imprimerDocument(type, id) {
  var doc = (type === 'devis' ? etat.devis : etat.factures).find(function (x) { return x.id === id; });
  if (!doc) return;
  var cfg = etat.config;
  var lignes = lignesDe(doc);
  var estFacture = type === 'facture';
  var sousTotal = totalLignes(lignes);
  var remise = nombre(doc.remise);
  var total = nombre(doc.total) || sousTotal - remise;

  var html =
    // En-tête : grand titre + badge n° à gauche, logo à droite
    '<div class="doc-entete">' +
    '<div>' +
    '<div class="doc-titre">' + (estFacture ? 'FACTURE' : 'DEVIS') + '</div>' +
    '<span class="doc-badge">' + (estFacture ? 'Facture' : 'Devis') + ' n°' + echap(doc.numero) + '</span>' +
    '</div>' +
    (cfg.logoUrl ? '<img class="logo" src="' + echap(resoudreUrl(cfg.logoUrl)) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
    '</div>' +

    // Dates
    '<div class="doc-dates">' +
    '<p><strong>Date' + (estFacture ? '' : ' du devis') + '</strong> : ' + fmtDate(doc.date) + '</p>' +
    (!estFacture && cfg.validiteDevis ? '<p><strong>Validité du devis</strong> : ' + echap(cfg.validiteDevis) + '</p>' : '') +
    (estFacture && doc.devisNumero ? '<p><strong>Réf. devis</strong> : n°' + echap(doc.devisNumero) + '</p>' : '') +
    '</div>' +

    // Asso à gauche / client à droite
    '<div class="doc-blocs">' +
    '<div class="doc-asso">' +
    '<p><strong>' + echap(cfg.nomAsso) + '</strong></p>' +
    (cfg.rna ? '<p>N° RNA : ' + echap(cfg.rna) + '</p>' : '') +
    (cfg.siren ? '<p>SIREN : ' + echap(cfg.siren) + '</p>' : '') +
    (cfg.email ? '<p>' + echap(cfg.email) + '</p>' : '') +
    (cfg.telephone ? '<p>' + echap(cfg.telephone) + '</p>' : '') +
    '<p>' + echap(cfg.adresse).replace(/\n/g, '</p><p>') + '</p>' +
    '</div>' +
    '<div class="doc-client">' +
    '<p class="doc-attention">À L\'ATTENTION DE</p>' +
    '<p><strong>' + echap(doc.clientNom) + '</strong></p>' +
    (doc.clientTel ? '<p>' + echap(doc.clientTel) + '</p>' : '') +
    (doc.clientEmail ? '<p>' + echap(doc.clientEmail) + '</p>' : '') +
    (doc.clientAdresse ? '<p style="margin-top:8px">' + echap(doc.clientAdresse).replace(/\n/g, '</p><p>') + '</p>' : '') +
    '</div></div>' +

    // Tableau des prestations
    '<table><thead><tr>' +
    '<th>DESCRIPTION</th><th>PRIX</th><th>QUANTITÉ</th><th>TOTAL</th>' +
    '</tr></thead><tbody>' +
    lignes.map(function (l) {
      return '<tr><td><strong>' + echap(l.desc) + '</strong></td>' +
        '<td>' + euros(l.pu) + '</td>' +
        '<td>' + String(Math.round(nombre(l.qte)) === nombre(l.qte) && nombre(l.qte) < 10 ? '0' + nombre(l.qte) : l.qte) + '</td>' +
        '<td>' + euros(nombre(l.qte) * nombre(l.pu)) + '</td></tr>';
    }).join('') +
    '</tbody></table>' +

    // Encadré détails de la prestation
    (doc.details
      ? '<div class="doc-details"><div class="doc-details-titre">DÉTAILS DE LA PRESTATION</div>' +
        '<div class="doc-details-corps">' + echap(doc.details).replace(/\n/g, '<br>') + '</div></div>'
      : '') +

    // Totaux
    '<div class="doc-totaux">' +
    '<p><strong>Sous total :</strong> <span>' + euros(sousTotal) + '</span></p>' +
    (remise ? '<p><strong>Remise exceptionnelle :</strong> <span>−' + euros(remise) + '</span></p>' : '') +
    '<p><strong>TVA (0%) :</strong> <span>0 €</span></p>' +
    '<div class="doc-total-bande"><span>TOTAL :</span> <span>' + euros(total) + ' TTC</span></div>' +
    '<p class="doc-exoneration">(' + echap(cfg.mentionTva) + ')</p>' +
    '</div>' +

    // Pied : conditions + signature (devis) / paiement
    '<div class="doc-pied">' +
    '<div>' +
    (!estFacture && doc.conditions
      ? '<p><strong>Conditions de paiement</strong></p><p>' + echap(doc.conditions).replace(/\n/g, '</p><p>') + '</p>'
      : '') +
    '<p style="margin-top:10px"><strong>Paiement à l\'ordre de l\'association</strong></p>' +
    '<p><strong>' + echap(cfg.nomAsso) + '</strong></p>' +
    (cfg.iban ? '<p><strong>IBAN :</strong> ' + echap(cfg.iban) + (cfg.bic ? ' · BIC : ' + echap(cfg.bic) : '') + '</p>' : '') +
    '</div>' +
    (!estFacture
      ? '<div class="doc-signature"><p><strong>Signature suivie de la mention<br>« bon pour accord »</strong></p>' +
        '<div class="doc-ligne-signature"></div></div>'
      : '') +
    '</div>' +

    '<div class="doc-merci">' + echap(cfg.mentionsPied || 'Merci de votre confiance').toUpperCase() + '</div>';

  var titre = (estFacture ? 'Facture' : 'Devis') + ' n°' + doc.numero + ' — ' + (cfg.nomAsso || '');
  var fenetre = window.open('', '_blank');
  if (!fenetre) {
    toast('Autorise les fenêtres pop-up pour ce site afin d\'imprimer', true);
    return;
  }
  fenetre.document.write(
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
    '<title>' + echap(titre) + '</title>' +
    '<style>' + STYLE_DOCUMENT + '</style></head><body>' +
    '<div class="barre-impression"><button onclick="window.print()">🖨️ Imprimer / enregistrer en PDF</button></div>' +
    html +
    '</body></html>'
  );
  fenetre.document.close();
  // Laisse le temps au logo de charger avant d'ouvrir le dialogue d'impression
  setTimeout(function () { fenetre.focus(); fenetre.print(); }, 500);
}

/* ---------------------------------------------------------------
   Vue : notes de frais
   --------------------------------------------------------------- */

function vueNotes() {
  var liste = etat.notes.slice().reverse();

  // Trésorier : remboursements groupés par bénévole (un virement par mois)
  var carteRemboursements = '';
  if (etat.role === 'tresorier') {
    var parBenevole = {};
    etat.notes.filter(function (n) { return n.statut === 'validée'; }).forEach(function (n) {
      (parBenevole[n.benevole] = parBenevole[n.benevole] || []).push(n);
    });
    var noms = Object.keys(parBenevole).sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    if (noms.length) {
      carteRemboursements =
        '<div class="carte"><h3>💶 Remboursements à faire (un virement par bénévole)</h3>' +
        '<div class="conteneur-tableau"><table><tbody>' +
        noms.map(function (nom) {
          var notes = parBenevole[nom];
          var total = Math.round(notes.reduce(function (s, n) { return s + nombre(n.montant); }, 0) * 100) / 100;
          return '<tr><td><strong>' + echap(nom) + '</strong></td>' +
            '<td>' + notes.length + ' note(s) validée(s)</td>' +
            '<td class="num"><strong>' + euros(total) + '</strong></td>' +
            '<td><button class="btn btn-petit btn-accent" onclick="rembourserGroupe(\'' + echap(nom).replace(/'/g, "\\'") + '\')">Rembourser ' + euros(total) + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="texte-doux" style="font-size:12.5px;margin-top:8px">Fais le virement bancaire du montant exact, puis clique « Rembourser » : toutes les notes du bénévole passent « remboursées » et <strong>une seule dépense</strong> du même montant est créée en compta — le rapprochement bancaire la pointera automatiquement.</p>' +
        '</div>';
    }
  }

  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Notes de frais</h2>' +
    '<button class="btn btn-primaire" onclick="editerNote()">➕ Nouvelle note</button></div>' +
    (etat.role === 'tresorier'
      ? '<p class="texte-doux" style="margin-bottom:14px">Vue trésorier : valide les notes au fil de l\'eau, puis rembourse en un virement mensuel par bénévole (encadré ci-dessous).</p>'
      : '<p class="texte-doux" style="margin-bottom:14px">Tes notes de frais. Ajoute une photo du justificatif, le trésorier valide puis rembourse.</p>') +
    carteRemboursements +
    '<div class="carte">' +
    (!liste.length ? '<p class="vide">Aucune note de frais.</p>' :
      '<div class="conteneur-tableau"><table><thead><tr>' +
      '<th>Date</th><th>Bénévole</th><th>Description</th><th>Catégorie</th><th class="num">Montant</th><th>Justif.</th><th>Statut</th>' +
      (etat.role === 'tresorier' ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      liste.map(function (n) {
        return '<tr>' +
          '<td>' + fmtDate(n.date) + '</td>' +
          '<td>' + echap(n.benevole) +
          (n.saisiePar && n.saisiePar !== n.benevole
            ? '<br><span class="texte-doux">saisie par ' + echap(n.saisiePar) + '</span>' : '') + '</td>' +
          '<td>' + echap(n.description) +
          (n.type === 'km'
            ? '<br><span class="texte-doux">🚗 ' + echap(n.depart) + ' → ' + echap(n.arrivee) + ' · ' + echap(n.km) + ' km' +
              ' (usure ' + euros(n.indemniteKm) +
              (nombre(n.essence) ? ' · essence ' + euros(n.essence) : '') +
              (nombre(n.peages) ? ' · péages ' + euros(n.peages) : '') + ')</span>'
            : '') +
          (n.commentaire ? '<br><span class="texte-doux">💬 ' + echap(n.commentaire) + '</span>' : '') + '</td>' +
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
    return '<span class="texte-doux" style="font-size:12px">à rembourser ⤴</span>';
  }
  return '';
}

/** Rembourse d'un coup toutes les notes validées d'un bénévole :
 *  une seule dépense en compta = le montant du virement bancaire. */
async function rembourserGroupe(benevole) {
  var notes = etat.notes.filter(function (n) {
    return n.statut === 'validée' && n.benevole === benevole;
  });
  if (!notes.length) return;
  var total = Math.round(notes.reduce(function (s, n) { return s + nombre(n.montant); }, 0) * 100) / 100;

  if (!confirm('Rembourser ' + benevole + ' : ' + notes.length + ' note(s), total ' + euros(total) +
    '.\n\nFais (ou vérifie) le virement bancaire de ce montant exact, puis confirme : une dépense unique de ' +
    euros(total) + ' sera créée en compta.')) return;

  chargement(true);
  try {
    for (var i = 0; i < notes.length; i++) {
      notes[i].statut = 'remboursée';
      await Api.saveNote(notes[i]);
    }
    await Api.saveCompta({
      id: '',
      date: aujourdhui(),
      type: 'dépense',
      categorie: 'Notes de frais',
      libelle: 'Remboursement notes de frais ' + benevole + ' (' + notes.length + ' note' + (notes.length > 1 ? 's' : '') + ')',
      montant: total,
      compte: 'Banque',
      compteDest: '',
      mode: 'Virement',
      reference: 'RBT-' + aujourdhui() + '-' + hashCourt(benevole + total + notes.map(function (n) { return n.id; }).join()),
      pointee: '',
      auteur: etat.prenom
    });
    toast(benevole + ' remboursé(e) : ' + euros(total) + ' — dépense créée en compta ✔');
  } catch (e) {
    toast(e.message, true);
  } finally {
    chargement(false);
  }
  await rechargerDonnees();
  naviguer('notes');
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
  var taux = nombre(etat.config.tauxKm) || 0.35;

  var benevoles = (etat.benevoles || []).slice();
  if (!benevoles.some(function (n) { return n.toLowerCase() === etat.prenom.toLowerCase(); })) {
    benevoles.unshift(etat.prenom);
  }
  var optionsBenevoles = benevoles.map(function (n) {
    var moi = n.toLowerCase() === etat.prenom.toLowerCase();
    return '<option' + (moi ? ' selected' : '') + '>' + echap(n) + '</option>';
  }).join('') + '<option value="__nouveau__">➕ Nouveau bénévole...</option>';

  ouvrirModale(
    '<h3>Nouvelle note de frais</h3>' +
    '<form id="form-note">' +
    '<div class="grille-form">' +
    champ('Type de note *', '<select id="nf-type">' +
      '<option value="simple">Dépense simple (achat, repas...)</option>' +
      '<option value="km">Frais kilométriques (véhicule)</option></select>') +
    champ('Date de la dépense *', '<input id="nf-date" type="date" required value="' + aujourdhui() + '">') +
    champ('Bénévole concerné *', '<select id="nf-benevole">' + optionsBenevoles + '</select>') +
    '<div class="champ cache" id="nf-nouveau-champ"><label>Nom du nouveau bénévole *</label>' +
    '<input id="nf-nouveau" placeholder="ex : Camille"></div>' +
    '</div>' +

    // — Dépense simple —
    '<div id="nf-section-simple"><div class="grille-form">' +
    champ('Catégorie', '<select id="nf-categorie">' + CATEGORIES_NOTES.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select>') +
    champ('Montant (€) *', '<input id="nf-montant" inputmode="decimal" placeholder="ex : 34,50">') +
    '</div></div>' +

    // — Frais kilométriques —
    '<div id="nf-section-km" class="cache">' +
    '<div class="grille-form">' +
    champ('Départ *', '<input id="nf-depart" placeholder="ex : Annecy">') +
    champ('Arrivée *', '<input id="nf-arrivee" placeholder="ex : Passy">') +
    champ('Nombre de kilomètres *', '<input id="nf-nbkm" inputmode="decimal" placeholder="ex : 120 (aller-retour compris)">') +
    champ('Essence (€)', '<input id="nf-essence" inputmode="decimal" placeholder="0">') +
    champ('Péages (€)', '<input id="nf-peages" inputmode="decimal" placeholder="0">') +
    champ('Usure du véhicule (' + taux.toLocaleString('fr-FR') + ' €/km)', '<input id="nf-usure" disabled value="0,00 €">') +
    '</div>' +
    '<div class="total-general" style="font-size:16px">Total à rembourser : <span id="nf-total-km">0,00 €</span></div>' +
    '</div>' +

    '<div class="grille-form">' +
    champ('Description', '<input id="nf-description" placeholder="ex : animation highline fête du sport">', true) +
    champ('Justificatif (photo ou PDF)', '<input id="nf-fichier" type="file" accept="image/*,.pdf" capture="environment">') +
    '</div>' +
    '<p class="texte-doux" style="font-size:12.5px">📷 Les photos sont compressées automatiquement avant envoi. Pour un trajet, joins si possible le ticket d\'essence ou de péage.</p>' +
    '<div class="barre-actions">' +
    '<button type="submit" class="btn btn-primaire">📤 Soumettre</button>' +
    '<button type="button" class="btn" onclick="fermerModale()">Annuler</button>' +
    '</div></form>'
  );

  function recalculerKm() {
    var km = nombre($('#nf-nbkm').value);
    var usure = Math.round(km * taux * 100) / 100;
    var total = usure + nombre($('#nf-essence').value) + nombre($('#nf-peages').value);
    $('#nf-usure').value = euros(usure);
    $('#nf-total-km').textContent = euros(total);
    return { usure: usure, total: Math.round(total * 100) / 100 };
  }

  $('#nf-type').addEventListener('change', function () {
    var estKm = this.value === 'km';
    $('#nf-section-simple').classList.toggle('cache', estKm);
    $('#nf-section-km').classList.toggle('cache', !estKm);
  });
  $('#nf-benevole').addEventListener('change', function () {
    $('#nf-nouveau-champ').classList.toggle('cache', this.value !== '__nouveau__');
  });
  ['nf-nbkm', 'nf-essence', 'nf-peages'].forEach(function (idInput) {
    $('#' + idInput).addEventListener('input', recalculerKm);
  });

  $('#form-note').addEventListener('submit', async function (e) {
    e.preventDefault();
    var estKm = $('#nf-type').value === 'km';

    var benevole = $('#nf-benevole').value;
    if (benevole === '__nouveau__') {
      benevole = $('#nf-nouveau').value.trim();
      if (!benevole) { toast('Indique le nom du nouveau bénévole', true); return; }
    }

    var note = {
      id: '',
      date: $('#nf-date').value,
      benevole: benevole,
      saisiePar: etat.prenom,
      type: estKm ? 'km' : 'simple',
      description: $('#nf-description').value.trim(),
      categorie: '',
      depart: '', arrivee: '', km: '', essence: '', peages: '', indemniteKm: '',
      montant: 0,
      justificatifUrl: '',
      statut: 'soumise',
      commentaire: ''
    };

    if (estKm) {
      var depart = $('#nf-depart').value.trim();
      var arrivee = $('#nf-arrivee').value.trim();
      var km = nombre($('#nf-nbkm').value);
      if (!depart || !arrivee || !km) {
        toast('Renseigne le départ, l\'arrivée et le nombre de kilomètres', true);
        return;
      }
      var calc = recalculerKm();
      note.categorie = 'Déplacement';
      note.depart = depart;
      note.arrivee = arrivee;
      note.km = km;
      note.essence = nombre($('#nf-essence').value);
      note.peages = nombre($('#nf-peages').value);
      note.indemniteKm = calc.usure;
      note.montant = calc.total;
      if (!note.description) note.description = 'Trajet ' + depart + ' → ' + arrivee;
    } else {
      var montant = nombre($('#nf-montant').value);
      if (!montant) { toast('Indique le montant de la dépense', true); return; }
      if (!note.description) { toast('Ajoute une description', true); return; }
      note.categorie = $('#nf-categorie').value;
      note.montant = montant;
    }

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

function listeComptes() {
  return String(etat.config.comptes || 'Banque,Espèces,HelloAsso')
    .split(',').map(function (c) { return c.trim(); }).filter(Boolean);
}

/** Solde par compte sur un jeu d'écritures (recettes/dépenses/virements/reports). */
function soldesParCompte(lignes) {
  var soldes = {};
  listeComptes().forEach(function (c) { soldes[c] = 0; });
  lignes.forEach(function (l) {
    var m = nombre(l.montant);
    var c = l.compte || 'Banque';
    if (soldes[c] === undefined) soldes[c] = 0;
    if (l.type === 'recette' || l.type === 'report') soldes[c] += m;
    else if (l.type === 'dépense') soldes[c] -= m;
    else if (l.type === 'virement') {
      var dest = l.compteDest || 'Banque';
      if (soldes[dest] === undefined) soldes[dest] = 0;
      soldes[c] -= m;
      soldes[dest] += m;
    }
  });
  return soldes;
}

function anneesDisponibles() {
  var annees = {};
  etat.compta.forEach(function (l) {
    var a = String(l.date || '').slice(0, 4);
    if (a) annees[a] = true;
  });
  annees[String(new Date().getFullYear())] = true;
  return Object.keys(annees).sort().reverse();
}

function vueCompta(anneeChoisie, compteChoisi) {
  var annee = anneeChoisie || String(new Date().getFullYear());
  var lignesAnnee = etat.compta
    .filter(function (l) { return String(l.date || '').slice(0, 4) === annee; });
  var lignes = lignesAnnee
    .filter(function (l) { return !compteChoisi || l.compte === compteChoisi || l.compteDest === compteChoisi; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

  var recettes = lignesAnnee.filter(function (l) { return l.type === 'recette'; })
    .reduce(function (s, l) { return s + nombre(l.montant); }, 0);
  var depenses = lignesAnnee.filter(function (l) { return l.type === 'dépense'; })
    .reduce(function (s, l) { return s + nombre(l.montant); }, 0);
  var soldes = soldesParCompte(lignesAnnee);

  function ligneHtml(l) {
    var montantHtml, typeHtml;
    if (l.type === 'virement') {
      typeHtml = '↔ virement';
      montantHtml = '<span class="texte-doux">' + echap(l.compte || 'Banque') + ' → ' + echap(l.compteDest || 'Banque') + '</span> ' + euros(l.montant);
    } else if (l.type === 'report') {
      typeHtml = '📥 report';
      montantHtml = '<span style="color:#1565c0;font-weight:700">+ ' + euros(l.montant) + '</span>';
    } else {
      var recette = l.type === 'recette';
      typeHtml = echap(l.type);
      montantHtml = '<span style="color:' + (recette ? 'var(--succes)' : 'var(--danger)') + ';font-weight:700">' +
        (recette ? '+' : '−') + ' ' + euros(l.montant) + '</span>';
    }
    return '<tr>' +
      '<td>' + fmtDate(l.date) + '</td>' +
      '<td>' + typeHtml + '</td>' +
      '<td>' + echap(l.categorie) + '</td>' +
      '<td>' + echap(l.libelle) + (l.reference ? ' <span class="texte-doux">(' + echap(l.reference) + ')</span>' : '') + '</td>' +
      '<td>' + echap(l.compte || '') + (l.mode ? ' <span class="texte-doux">· ' + echap(l.mode) + '</span>' : '') + '</td>' +
      '<td class="num">' + montantHtml + '</td>' +
      '<td style="text-align:center"><input type="checkbox" title="Pointée sur le relevé bancaire"' +
      (l.pointee ? ' checked' : '') + ' onchange="basculerPointage(\'' + l.id + '\', \'' + annee + '\', \'' + (compteChoisi || '') + '\')"></td>' +
      '<td><button class="btn btn-petit btn-danger" onclick="supprimerCompta(\'' + l.id + '\', \'' + annee + '\')">✕</button></td>' +
      '</tr>';
  }

  $('#vue').innerHTML =
    '<div class="entete-vue"><h2>Compta ' + annee + '</h2>' +
    '<div class="barre-actions" style="margin:0">' +
    '<button class="btn" onclick="importerHelloAsso()">📥 Import HelloAsso</button>' +
    '<button class="btn" onclick="importerReleveBanque()">🏦 Relevé banque</button>' +
    '<button class="btn btn-primaire" onclick="editerCompta()">➕ Nouvelle écriture</button></div></div>' +
    '<div class="filtres"><select id="cp-annee">' +
    anneesDisponibles().map(function (a) {
      return '<option' + (a === annee ? ' selected' : '') + '>' + a + '</option>';
    }).join('') + '</select>' +
    '<select id="cp-compte"><option value="">Tous les comptes</option>' +
    listeComptes().map(function (c) {
      return '<option' + (c === compteChoisi ? ' selected' : '') + '>' + echap(c) + '</option>';
    }).join('') + '</select>' +
    '<button class="btn btn-petit" onclick="exporterComptaCSV(\'' + annee + '\')">⬇️ Export CSV</button></div>' +
    '<div class="cartes-stats">' +
    Object.keys(soldes).map(function (c) {
      return '<div class="carte-stat"><div class="valeur">' + euros(soldes[c]) + '</div><div class="libelle">Solde ' + echap(c) + '</div></div>';
    }).join('') +
    '<div class="carte-stat accent"><div class="valeur">' + euros(recettes - depenses) + '</div><div class="libelle">Résultat ' + annee + ' (' + euros(recettes) + ' − ' + euros(depenses) + ')</div></div>' +
    '</div>' +
    '<div class="carte">' +
    (!lignes.length ? '<p class="vide">Aucune écriture pour ' + annee + '.</p>' :
      '<div class="conteneur-tableau"><table><thead><tr>' +
      '<th>Date</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th>Compte</th><th class="num">Montant</th><th title="Pointée sur le relevé bancaire">✓ banque</th><th></th>' +
      '</tr></thead><tbody>' +
      lignes.map(ligneHtml).join('') + '</tbody></table></div>') +
    '<p class="texte-doux" style="margin-top:10px;font-size:12.5px">💡 La colonne « ✓ banque » sert au pointage : coche chaque écriture que tu retrouves sur le relevé de la Caisse d\'Épargne. Le versement mensuel HelloAsso se saisit comme <strong>virement interne HelloAsso → Banque</strong> (il ne compte pas deux fois).</p>' +
    '</div>';

  $('#cp-annee').addEventListener('change', function () { vueCompta(this.value, compteChoisi); });
  $('#cp-compte').addEventListener('change', function () { vueCompta(annee, this.value); });
}

async function basculerPointage(id, annee, compte) {
  var ligne = etat.compta.find(function (l) { return l.id === id; });
  if (!ligne) return;
  ligne.pointee = ligne.pointee ? '' : 'oui';
  try {
    await Api.saveCompta(ligne);
  } catch (e) {
    ligne.pointee = ligne.pointee ? '' : 'oui';
    toast(e.message, true);
  }
  vueCompta(annee, compte || undefined);
}

function editerCompta() {
  var optionsComptes = listeComptes().map(function (c) { return '<option>' + echap(c) + '</option>'; }).join('');

  ouvrirModale(
    '<h3>Nouvelle écriture comptable</h3>' +
    '<form id="form-compta">' +
    '<div class="grille-form">' +
    champ('Date *', '<input id="cp-date" type="date" required value="' + aujourdhui() + '">') +
    champ('Type *', '<select id="cp-type">' +
      '<option value="recette">Recette</option>' +
      '<option value="dépense">Dépense</option>' +
      '<option value="virement">Virement interne (ex : HelloAsso → Banque)</option>' +
      '<option value="report">Report de solde (début d\'exercice)</option></select>') +
    '<div class="champ" id="cp-champ-categorie"><label>Catégorie</label><select id="cp-categorie"></select></div>' +
    champ('Montant (€) *', '<input id="cp-montant" required inputmode="decimal" placeholder="ex : 150">') +
    '<div class="champ"><label id="cp-label-compte">Compte</label><select id="cp-compte-src">' + optionsComptes + '</select></div>' +
    '<div class="champ cache" id="cp-champ-dest"><label>Vers le compte</label><select id="cp-compte-dest">' + optionsComptes + '</select></div>' +
    '<div class="champ" id="cp-champ-mode"><label>Mode de paiement</label><select id="cp-mode">' +
    MODES_PAIEMENT.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></div>' +
    champ('Libellé *', '<input id="cp-libelle" required placeholder="ex : Subvention mairie, versement HelloAsso juin...">', true) +
    '</div>' +
    '<div class="barre-actions">' +
    '<button type="submit" class="btn btn-primaire">💾 Enregistrer</button>' +
    '<button type="button" class="btn" onclick="fermerModale()">Annuler</button>' +
    '</div></form>'
  );

  function majFormulaire() {
    var type = $('#cp-type').value;
    var cats = type === 'recette' ? CATEGORIES_RECETTES : CATEGORIES_DEPENSES;
    $('#cp-categorie').innerHTML = cats.map(function (c) { return '<option>' + c + '</option>'; }).join('');
    $('#cp-champ-categorie').classList.toggle('cache', type === 'virement' || type === 'report');
    $('#cp-champ-dest').classList.toggle('cache', type !== 'virement');
    $('#cp-champ-mode').classList.toggle('cache', type === 'virement' || type === 'report');
    $('#cp-label-compte').textContent = type === 'virement' ? 'Depuis le compte' : 'Compte';
    if (type === 'virement' && !$('#cp-libelle').value) {
      $('#cp-libelle').value = 'Versement HelloAsso';
      $('#cp-compte-src').value = 'HelloAsso';
      $('#cp-compte-dest').value = 'Banque';
    }
    if (type === 'report' && !$('#cp-libelle').value) {
      $('#cp-libelle').value = 'Report de solde exercice précédent';
    }
  }
  majFormulaire();
  $('#cp-type').addEventListener('change', majFormulaire);

  $('#form-compta').addEventListener('submit', async function (e) {
    e.preventDefault();
    var type = $('#cp-type').value;
    if (type === 'virement' && $('#cp-compte-src').value === $('#cp-compte-dest').value) {
      toast('Le compte de départ et d\'arrivée doivent être différents', true);
      return;
    }
    var ligne = {
      id: '',
      date: $('#cp-date').value,
      type: type,
      categorie: (type === 'virement' || type === 'report') ? '' : $('#cp-categorie').value,
      libelle: $('#cp-libelle').value.trim(),
      montant: nombre($('#cp-montant').value),
      compte: $('#cp-compte-src').value,
      compteDest: type === 'virement' ? $('#cp-compte-dest').value : '',
      mode: (type === 'virement' || type === 'report') ? '' : $('#cp-mode').value,
      reference: '',
      pointee: '',
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
  var csv = 'Date;Type;Catégorie;Libellé;Montant;Compte;Vers;Mode;Pointée;Référence;Auteur\n' +
    lignes.map(function (l) {
      return [l.date, l.type, l.categorie, l.libelle, String(nombre(l.montant)).replace('.', ','),
        l.compte, l.compteDest, l.mode, l.pointee ? 'oui' : '', l.reference, l.auteur]
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
   Import HelloAsso (export CSV des paiements)
   --------------------------------------------------------------- */

/** Parseur CSV minimal : gère les guillemets et détecte ; ou , */
function parserCSV(texte) {
  texte = texte.replace(/^﻿/, '');
  var premiereLigne = texte.split(/\r?\n/)[0] || '';
  var sep = (premiereLigne.split(';').length >= premiereLigne.split(',').length) ? ';' : ',';

  var lignes = [], champ = '', ligne = [], entreGuillemets = false;
  for (var i = 0; i < texte.length; i++) {
    var c = texte[i];
    if (entreGuillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') entreGuillemets = false;
      else champ += c;
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === sep) {
      ligne.push(champ); champ = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.some(function (v) { return v.trim(); })) lignes.push(ligne);
      ligne = [];
    } else {
      champ += c;
    }
  }
  if (champ || ligne.length) { ligne.push(champ); if (ligne.some(function (v) { return v.trim(); })) lignes.push(ligne); }
  return lignes;
}

function normaliserEntete(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Transforme un export HelloAsso en écritures compta prêtes à importer. */
function analyserHelloAsso(texte) {
  var tableau = parserCSV(texte);
  if (tableau.length < 2) throw new Error('Fichier vide ou illisible');

  var entetes = tableau[0].map(normaliserEntete);
  function col() {
    for (var i = 0; i < arguments.length; i++) {
      var idx = -1;
      for (var j = 0; j < entetes.length; j++) {
        if (entetes[j].indexOf(arguments[i]) !== -1) { idx = j; break; }
      }
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var iRef = col('reference', 'numero');
  var iDate = col('date');
  var iMontant = col('montant');
  var iType = col('type');
  var iNom = col('nom acheteur', 'nom payeur', 'nom');
  var iPrenom = col('prenom');
  var iStatut = col('statut');
  var iFormule = col('formule', 'tarif', 'campagne');

  if (iDate === -1 || iMontant === -1) {
    throw new Error('Colonnes Date/Montant introuvables — est-ce bien un export HelloAsso au format CSV ?');
  }

  var ecritures = [];
  for (var n = 1; n < tableau.length; n++) {
    var l = tableau[n];
    var statut = iStatut !== -1 ? String(l[iStatut]) : '';
    if (statut && /rembours|annul|refus|erreur/i.test(statut)) continue;

    var montant = nombre(l[iMontant]);
    if (!montant) continue;

    // Date : "12/03/2026 10:23" ou ISO → ISO
    var brut = String(l[iDate] || '').trim();
    var date = brut.slice(0, 10);
    var m = brut.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) date = m[3] + '-' + m[2] + '-' + m[1];

    var typeHa = iType !== -1 ? String(l[iType]) : '';
    var categorie = 'Autre recette';
    if (/adh/i.test(typeHa)) categorie = 'Adhésions';
    else if (/boutique|vente|commande/i.test(typeHa)) categorie = 'Goodies';
    else if (/don|crowd|collecte/i.test(typeHa)) categorie = 'Dons';
    else if (/even|billet/i.test(typeHa)) categorie = 'Buvette / événements';

    var qui = ((iPrenom !== -1 ? l[iPrenom] + ' ' : '') + (iNom !== -1 ? l[iNom] : '')).trim();
    var formule = iFormule !== -1 ? String(l[iFormule]).trim() : '';
    var reference = iRef !== -1 && l[iRef] ? 'HA-' + String(l[iRef]).trim()
      : 'HA-' + date + '-' + montant + '-' + (qui || n);

    ecritures.push({
      date: date,
      type: 'recette',
      categorie: categorie,
      libelle: categorie + (qui ? ' — ' + qui : '') + (formule && formule !== qui ? ' (' + formule + ')' : ''),
      montant: montant,
      compte: 'HelloAsso',
      mode: 'HelloAsso',
      compteDest: '',
      reference: reference,
      pointee: ''
    });
  }
  return ecritures;
}

var importHelloAssoEnAttente = [];

function importerHelloAsso() {
  ouvrirModale(
    '<h3>📥 Importer les paiements HelloAsso</h3>' +
    '<p class="texte-doux">Dans votre espace admin HelloAsso : <strong>Comptabilité → Paiements → Exporter</strong> (format CSV), puis choisis le fichier ci-dessous. Chaque paiement devient une recette sur le compte HelloAsso. Réimporter le même fichier ne crée <strong>aucun doublon</strong>.</p>' +
    '<p style="margin:14px 0"><input type="file" id="ha-fichier" accept=".csv,text/csv"></p>' +
    '<div id="ha-apercu"></div>' +
    '<div class="barre-actions">' +
    '<button class="btn btn-primaire cache" id="ha-importer">Importer</button>' +
    '<button class="btn" onclick="fermerModale()">Fermer</button></div>'
  );

  $('#ha-fichier').addEventListener('change', function () {
    var fichier = this.files[0];
    if (!fichier) return;
    var lecteur = new FileReader();
    lecteur.onload = function () {
      try {
        var ecritures = analyserHelloAsso(lecteur.result);
        var refsExistantes = {};
        etat.compta.forEach(function (l) { if (l.reference) refsExistantes[String(l.reference)] = true; });
        var nouvelles = ecritures.filter(function (e) { return !refsExistantes[e.reference]; });
        var doublons = ecritures.length - nouvelles.length;
        importHelloAssoEnAttente = nouvelles;

        var parCategorie = {};
        nouvelles.forEach(function (e) {
          parCategorie[e.categorie] = parCategorie[e.categorie] || { n: 0, total: 0 };
          parCategorie[e.categorie].n++;
          parCategorie[e.categorie].total += e.montant;
        });
        var total = nouvelles.reduce(function (s, e) { return s + e.montant; }, 0);

        $('#ha-apercu').innerHTML =
          '<div class="carte" style="margin:0 0 10px">' +
          '<p><strong>' + ecritures.length + '</strong> paiement(s) dans le fichier · ' +
          '<strong>' + nouvelles.length + '</strong> nouveau(x) · ' +
          '<strong>' + doublons + '</strong> déjà importé(s), ignoré(s)</p>' +
          (nouvelles.length ?
            '<table style="margin-top:8px"><tbody>' +
            Object.keys(parCategorie).map(function (c) {
              return '<tr><td>' + echap(c) + '</td><td class="num">' + parCategorie[c].n + ' paiement(s)</td><td class="num">' + euros(parCategorie[c].total) + '</td></tr>';
            }).join('') +
            '<tr><td><strong>Total à importer</strong></td><td></td><td class="num"><strong>' + euros(total) + '</strong></td></tr>' +
            '</tbody></table>' : '<p class="texte-doux">Rien de nouveau à importer. ✔</p>') +
          '</div>';
        $('#ha-importer').classList.toggle('cache', !nouvelles.length);
        $('#ha-importer').textContent = 'Importer ' + nouvelles.length + ' paiement(s)';
      } catch (err) {
        $('#ha-apercu').innerHTML = '<p class="erreur">' + echap(err.message) + '</p>';
        $('#ha-importer').classList.add('cache');
      }
    };
    lecteur.readAsText(fichier, 'utf-8');
  });

  $('#ha-importer').addEventListener('click', async function () {
    if (!importHelloAssoEnAttente.length) return;
    var res = await action(function () { return Api.importCompta(importHelloAssoEnAttente); });
    toast(res.ajoutees + ' paiement(s) importé(s), ' + res.doublons + ' doublon(s) ignoré(s) ✔');
    importHelloAssoEnAttente = [];
    fermerModale();
    await rechargerDonnees();
    naviguer('compta');
  });
}

/* ---------------------------------------------------------------
   Import relevé bancaire Caisse d'Épargne : rapprochement auto
   --------------------------------------------------------------- */

function hashCourt(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Lit le fichier en essayant UTF-8 puis Windows-1252 (encodage Caisse d'Épargne). */
function lireFichierTexte(fichier) {
  return new Promise(function (resoudre, rejeter) {
    var lecteur = new FileReader();
    lecteur.onerror = rejeter;
    lecteur.onload = function () {
      try {
        resoudre(new TextDecoder('utf-8', { fatal: true }).decode(lecteur.result));
      } catch (e) {
        resoudre(new TextDecoder('windows-1252').decode(lecteur.result));
      }
    };
    lecteur.readAsArrayBuffer(fichier);
  });
}

/** Transforme un relevé Caisse d'Épargne en liste d'opérations. */
function analyserReleveBanque(texte) {
  var tableau = parserCSV(texte);

  // Cherche la ligne d'en-tête (les relevés ont parfois des lignes d'info avant)
  var iEntete = -1, entetes = [];
  for (var i = 0; i < Math.min(tableau.length, 10); i++) {
    var norm = tableau[i].map(normaliserEntete);
    if (norm.some(function (c) { return c.indexOf('date') === 0; }) &&
        norm.some(function (c) { return /^d.{0,2}bit|^cr.{0,2}dit|^montant/.test(c); })) {
      iEntete = i; entetes = norm; break;
    }
  }
  if (iEntete === -1) throw new Error('Format non reconnu — est-ce bien l\'export CSV des opérations de la banque ?');

  function col(regex) {
    for (var j = 0; j < entetes.length; j++) if (regex.test(entetes[j])) return j;
    return -1;
  }
  var iDate = col(/^date$/) !== -1 ? col(/^date$/) : col(/^date/);
  var iDebit = col(/^d.{0,2}bit/);
  var iCredit = col(/^cr.{0,2}dit/);
  var iMontant = col(/^montant/);
  var iLibelle = col(/^libell/);
  if (iLibelle === -1) throw new Error('Colonne Libellé introuvable dans le fichier');

  var ops = [];
  for (var n = iEntete + 1; n < tableau.length; n++) {
    var l = tableau[n];
    var brut = String(l[iDate] || '').trim();
    var m = brut.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    var date = m ? m[3] + '-' + m[2] + '-' + m[1] : brut.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    var montant, sens;
    if (iDebit !== -1 || iCredit !== -1) {
      var credit = iCredit !== -1 ? nombre(l[iCredit]) : 0;
      var debit = iDebit !== -1 ? nombre(l[iDebit]) : 0;
      if (credit) { montant = Math.abs(credit); sens = 'credit'; }
      else if (debit) { montant = Math.abs(debit); sens = 'debit'; }
      else continue;
    } else {
      var v = nombre(l[iMontant]);
      if (!v) continue;
      montant = Math.abs(v); sens = v > 0 ? 'credit' : 'debit';
    }

    var libelle = String(l[iLibelle] || '').replace(/\s+/g, ' ').trim();
    ops.push({
      date: date, montant: Math.round(montant * 100) / 100, sens: sens, libelle: libelle,
      reference: 'CE-' + date + '-' + (sens === 'credit' ? '+' : '-') + montant + '-' + hashCourt(libelle)
    });
  }
  if (!ops.length) throw new Error('Aucune opération trouvée dans le fichier');
  return ops;
}

/** Devine l'écriture à créer pour une opération non rapprochée. */
function devinerEcriture(op) {
  var lib = op.libelle.toUpperCase();
  var e = {
    date: op.date, libelle: op.libelle, montant: op.montant,
    compte: 'Banque', compteDest: '', reference: op.reference, pointee: 'oui'
  };
  if (/HELLOASSO/.test(lib) && op.sens === 'credit') {
    e.type = 'virement'; e.compte = 'HelloAsso'; e.compteDest = 'Banque';
    e.categorie = ''; e.mode = ''; e.libelle = 'Versement HelloAsso — ' + op.date.slice(0, 7);
    return e;
  }
  if (op.sens === 'credit') {
    e.type = 'recette'; e.mode = 'Virement';
    e.categorie = /FACTURE/.test(lib) ? 'Prestations'
      : /SUBVENTION|MAIRIE|CAF|ANS|FDVA/.test(lib) ? 'Subventions'
      : /SOUTIEN ASSO|RISTOURNE|INTERETS/.test(lib) ? 'Autre recette'
      : 'Autre recette';
    return e;
  }
  e.type = 'dépense';
  if (/MAIF|MACIF|AXA|MAAF|ASSUR/.test(lib)) { e.categorie = 'Assurance'; e.mode = 'Prélèvement'; }
  else if (/FACT SGT|FRAIS|COTISATION BANC|COMMISSION/.test(lib)) { e.categorie = 'Frais bancaires'; e.mode = 'Prélèvement'; }
  else if (/PAIEMENT CB|CARTE/.test(lib)) { e.categorie = 'Autre dépense'; e.mode = 'CB'; }
  else if (/^PRLV/.test(lib)) { e.categorie = 'Autre dépense'; e.mode = 'Prélèvement'; }
  else { e.categorie = 'Autre dépense'; e.mode = 'Virement'; }
  return e;
}

/** Rapproche les opérations du relevé avec les écritures existantes. */
function rapprocherOperations(ops) {
  var refsExistantes = {};
  etat.compta.forEach(function (l) { if (l.reference) refsExistantes[String(l.reference)] = true; });

  // Écritures qui touchent le compte Banque
  var pool = etat.compta.filter(function (l) {
    if (l.type === 'virement') return l.compteDest === 'Banque' || (l.compte || 'Banque') === 'Banque';
    return (l.compte || 'Banque') === 'Banque';
  }).slice();

  function sensLigne(l) {
    if (l.type === 'virement') return l.compteDest === 'Banque' ? 'credit' : 'debit';
    return (l.type === 'recette' || l.type === 'report') ? 'credit' : 'debit';
  }

  var resultat = { aPointer: [], dejaTraitees: [], aCreer: [] };
  ops.forEach(function (op) {
    if (refsExistantes[op.reference]) { resultat.dejaTraitees.push(op); return; }
    var indice = -1;
    for (var i = 0; i < pool.length; i++) {
      var l = pool[i];
      if (Math.abs(nombre(l.montant) - op.montant) > 0.005) continue;
      if (sensLigne(l) !== op.sens) continue;
      if (Math.abs(new Date(l.date) - new Date(op.date)) > 15 * 86400000) continue;
      indice = i;
      if (!l.pointee) break; // préfère une écriture pas encore pointée
    }
    if (indice !== -1) {
      var ligne = pool.splice(indice, 1)[0];
      if (ligne.pointee) resultat.dejaTraitees.push(op);
      else resultat.aPointer.push({ op: op, ligne: ligne });
    } else {
      resultat.aCreer.push(op);
    }
  });
  return resultat;
}

var releveEnAttente = null;

function importerReleveBanque() {
  ouvrirModale(
    '<h3>🏦 Rapprochement bancaire (Caisse d\'Épargne)</h3>' +
    '<p class="texte-doux">Télécharge l\'export CSV des opérations depuis l\'espace en ligne de la banque, puis choisis le fichier. L\'appli pointe automatiquement les écritures retrouvées sur le relevé et te propose de créer celles qui manquent.</p>' +
    '<p style="margin:14px 0"><input type="file" id="rb-fichier" accept=".csv,text/csv"></p>' +
    '<div id="rb-apercu"></div>' +
    '<div class="barre-actions">' +
    '<button class="btn btn-primaire cache" id="rb-appliquer">Appliquer</button>' +
    '<button class="btn" onclick="fermerModale()">Fermer</button></div>'
  );

  $('#rb-fichier').addEventListener('change', async function () {
    var fichier = this.files[0];
    if (!fichier) return;
    try {
      var ops = analyserReleveBanque(await lireFichierTexte(fichier));
      var r = rapprocherOperations(ops);
      releveEnAttente = r;

      var html =
        '<div class="carte" style="margin:0 0 10px">' +
        '<p><strong>' + ops.length + '</strong> opération(s) sur le relevé : ' +
        '<strong>' + r.aPointer.length + '</strong> à pointer automatiquement · ' +
        '<strong>' + r.dejaTraitees.length + '</strong> déjà en ordre · ' +
        '<strong>' + r.aCreer.length + '</strong> absente(s) du livre</p></div>';

      if (r.aPointer.length) {
        html += '<div class="carte" style="margin:0 0 10px"><h3>✓ Seront pointées</h3><div class="conteneur-tableau"><table><tbody>' +
          r.aPointer.map(function (p) {
            return '<tr><td>' + fmtDate(p.ligne.date) + '</td><td>' + echap(p.ligne.libelle) + '</td>' +
              '<td class="num">' + euros(p.ligne.montant) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }

      if (r.aCreer.length) {
        html += '<div class="carte" style="margin:0 0 10px"><h3>➕ À créer dans le livre</h3>' +
          '<p class="texte-doux" style="font-size:12.5px">Vérifie la catégorie proposée, décoche ce que tu ne veux pas créer.</p>' +
          '<div class="conteneur-tableau"><table><tbody>' +
          r.aCreer.map(function (op, i) {
            var e = devinerEcriture(op);
            var options;
            if (e.type === 'virement') {
              options = '<option value="__virement__" selected>Virement HelloAsso → Banque</option>' +
                CATEGORIES_RECETTES.map(function (c) { return '<option>' + c + '</option>'; }).join('');
            } else if (op.sens === 'credit') {
              options = CATEGORIES_RECETTES.map(function (c) {
                return '<option' + (c === e.categorie ? ' selected' : '') + '>' + c + '</option>';
              }).join('');
            } else {
              options = CATEGORIES_DEPENSES.map(function (c) {
                return '<option' + (c === e.categorie ? ' selected' : '') + '>' + c + '</option>';
              }).join('');
            }
            return '<tr>' +
              '<td><input type="checkbox" class="rb-coche" data-i="' + i + '" checked></td>' +
              '<td>' + fmtDate(op.date) + '</td>' +
              '<td style="max-width:280px">' + echap(op.libelle.slice(0, 90)) + '</td>' +
              '<td class="num" style="font-weight:700;color:' + (op.sens === 'credit' ? 'var(--succes)' : 'var(--danger)') + '">' +
              (op.sens === 'credit' ? '+' : '−') + ' ' + euros(op.montant) + '</td>' +
              '<td><select class="rb-categorie" data-i="' + i + '" style="min-width:150px">' + options + '</select></td>' +
              '</tr>';
          }).join('') + '</tbody></table></div></div>';
      }

      $('#rb-apercu').innerHTML = html;
      var rien = !r.aPointer.length && !r.aCreer.length;
      $('#rb-appliquer').classList.toggle('cache', rien);
      if (rien) $('#rb-apercu').innerHTML += '<p class="texte-doux">Tout est déjà à jour. ✔</p>';
    } catch (err) {
      $('#rb-apercu').innerHTML = '<p class="erreur">' + echap(err.message) + '</p>';
      $('#rb-appliquer').classList.add('cache');
    }
  });

  $('#rb-appliquer').addEventListener('click', async function () {
    var r = releveEnAttente;
    if (!r) return;
    this.disabled = true;
    chargement(true);
    try {
      for (var i = 0; i < r.aPointer.length; i++) {
        r.aPointer[i].ligne.pointee = 'oui';
        await Api.saveCompta(r.aPointer[i].ligne);
      }
      var aImporter = [];
      document.querySelectorAll('.rb-coche').forEach(function (coche) {
        if (!coche.checked) return;
        var idx = parseInt(coche.dataset.i, 10);
        var e = devinerEcriture(r.aCreer[idx]);
        var choix = document.querySelector('.rb-categorie[data-i="' + idx + '"]').value;
        if (choix === '__virement__') {
          e.type = 'virement'; e.compte = 'HelloAsso'; e.compteDest = 'Banque'; e.categorie = ''; e.mode = '';
        } else {
          if (e.type === 'virement') { // l'utilisateur a préféré une recette
            e.type = 'recette'; e.compte = 'Banque'; e.compteDest = ''; e.mode = 'Virement';
            e.libelle = r.aCreer[idx].libelle;
          }
          e.categorie = choix;
        }
        aImporter.push(e);
      });
      if (aImporter.length) await Api.importCompta(aImporter);
      toast(r.aPointer.length + ' écriture(s) pointée(s), ' + aImporter.length + ' créée(s) ✔');
      releveEnAttente = null;
      fermerModale();
      await rechargerDonnees();
      naviguer('compta');
    } catch (err) {
      toast(err.message, true);
      this.disabled = false;
    } finally {
      chargement(false);
    }
  });
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
  var report = lignes.filter(function (l) { return l.type === 'report'; })
    .reduce(function (s, l) { return s + nombre(l.montant); }, 0);

  // Synthèse mois par mois (virements internes et reports exclus)
  var MOIS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
  var parMois = MOIS.map(function () { return { r: 0, d: 0 }; });
  lignes.forEach(function (l) {
    var m = parseInt(String(l.date || '').slice(5, 7), 10) - 1;
    if (isNaN(m) || m < 0 || m > 11) return;
    if (l.type === 'recette') parMois[m].r += nombre(l.montant);
    else if (l.type === 'dépense') parMois[m].d += nombre(l.montant);
  });

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
    '<div class="carte-stat"><div class="valeur">' + euros(report) + '</div><div class="libelle">Report exercice précédent</div></div>' +
    '<div class="carte-stat accent"><div class="valeur">' + euros(report + totalR - totalD) + '</div><div class="libelle">Solde de l\'asso fin ' + annee + ' (report + résultat ' + euros(totalR - totalD) + ')</div></div>' +
    '</div>' +
    tableBilan('📈 Recettes par catégorie', recettes, totalR) +
    tableBilan('📉 Dépenses par catégorie', depenses, totalD) +
    '<div class="carte"><h3>📅 Synthèse mois par mois</h3>' +
    '<div class="conteneur-tableau"><table><thead><tr><th>Mois</th><th class="num">Recettes</th><th class="num">Dépenses</th><th class="num">Résultat</th></tr></thead><tbody>' +
    parMois.map(function (m, i) {
      if (!m.r && !m.d) return '';
      return '<tr><td>' + MOIS[i] + '</td><td class="num">' + euros(m.r) + '</td><td class="num">' + euros(m.d) + '</td>' +
        '<td class="num" style="font-weight:700;color:' + (m.r - m.d >= 0 ? 'var(--succes)' : 'var(--danger)') + '">' + euros(m.r - m.d) + '</td></tr>';
    }).join('') +
    '</tbody></table></div></div>' +
    '<p class="texte-doux">💡 En début d\'année, saisis une écriture « Report de solde » par compte (onglet Compta) avec le solde au 31 décembre — le bilan affichera alors le vrai solde de l\'asso. Utilise l\'export CSV de l\'onglet Compta pour joindre le détail au rapport d\'AG.</p>';

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
    inp('siren', 'SIREN') +
    inp('logoUrl', 'Logo (URL ou chemin, ex : assets/logo.png)', 'assets/logo.png') +
    '</div></div>' +
    '<div class="carte"><h3>Facturation</h3><div class="grille-form">' +
    inp('iban', 'IBAN', 'FR76...') +
    inp('bic', 'BIC') +
    inp('validiteDevis', 'Validité des devis', 'ex : 2 mois') +
    inp('tauxKm', 'Taux kilométrique notes de frais (€/km)', '0.35') +
    champ('Mention d\'exonération (sous le total)', '<input id="pr-mentionTva" value="' + echap(c.mentionTva || '') + '">') +
    champ('Conditions de paiement par défaut (devis)', '<textarea id="pr-conditionsPaiement" rows="2">' + echap(c.conditionsPaiement || '') + '</textarea>') +
    champ('Phrase de pied de page', '<input id="pr-mentionsPied" value="' + echap(c.mentionsPied || '') + '">') +
    '</div></div>' +
    '<div class="carte"><h3>Codes d\'accès</h3><div class="grille-form">' +
    inp('codeTresorier', 'Code trésorier') +
    inp('codeBenevole', 'Code bénévoles') +
    '</div><p class="texte-doux" style="font-size:12.5px">⚠️ Si tu changes le code trésorier, reconnecte-toi avec le nouveau code.</p></div>' +
    '<button type="submit" class="btn btn-primaire">💾 Enregistrer les paramètres</button>' +
    '</form>';

  $('#form-parametres').addEventListener('submit', async function (e) {
    e.preventDefault();
    var cles = ['nomAsso', 'email', 'adresse', 'telephone', 'rna', 'siren', 'logoUrl',
      'iban', 'bic', 'validiteDevis', 'tauxKm', 'mentionTva', 'conditionsPaiement', 'mentionsPied',
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
