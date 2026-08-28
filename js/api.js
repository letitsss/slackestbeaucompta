/* Client API — communique avec le backend Apps Script.
 *
 * Deux modes, détectés automatiquement :
 *  - « tout Google » : l'interface est servie par Apps Script lui-même,
 *    les appels passent par google.script.run (pas de CORS, pas d'URL) ;
 *  - « site séparé » (GitHub Pages...) : appels HTTP vers API_URL
 *    (Content-Type text/plain pour éviter le préflight CORS que
 *    Apps Script ne sait pas gérer). */

var Api = (function () {

  var MODE_GOOGLE = (typeof google !== 'undefined') && !!google.script && !!google.script.run;
  var memoire = null; // secours si le stockage local est bloqué (iframe)

  function session() {
    try {
      return JSON.parse(localStorage.getItem('seb-session')) || memoire;
    } catch (e) {
      return memoire;
    }
  }

  function sauverSession(s) {
    memoire = s;
    try { localStorage.setItem('seb-session', JSON.stringify(s)); } catch (e) { /* stockage bloqué */ }
  }

  function effacerSession() {
    memoire = null;
    try { localStorage.removeItem('seb-session'); } catch (e) { /* stockage bloqué */ }
  }

  async function appeler(action, params) {
    var s = session() || {};
    var corps = Object.assign({
      action: action,
      code: s.code || '',
      prenom: s.prenom || ''
    }, params || {});

    if (MODE_GOOGLE) {
      var texteG = await new Promise(function (resoudre, rejeter) {
        google.script.run
          .withSuccessHandler(resoudre)
          .withFailureHandler(function (e) { rejeter(new Error(e && e.message ? e.message : String(e))); })
          .api(JSON.stringify(corps));
      });
      var dataG = JSON.parse(texteG);
      if (!dataG.ok) throw new Error(dataG.erreur || 'Erreur inconnue');
      return dataG;
    }

    if (typeof API_URL === 'undefined' || !API_URL || API_URL.indexOf('http') !== 0) {
      throw new Error("L'URL de l'API n'est pas configurée : édite js/config.js");
    }

    // Google Apps Script renvoie parfois un 404 ou une page HTML passagère
    // (surtout juste après un déploiement) : on réessaie avant d'abandonner.
    var derniereErreur;
    for (var essai = 0; essai < 4; essai++) {
      if (essai > 0) await new Promise(function (r) { setTimeout(r, 800 * Math.pow(2, essai - 1)); });
      try {
        var res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(corps),
          redirect: 'follow'
        });
        if (!res.ok) throw new Error('Erreur réseau (' + res.status + ')');
        var texte = await res.text();
        var data;
        try { data = JSON.parse(texte); }
        catch (e) { throw new Error('Réponse inattendue du serveur (page Google au lieu des données)'); }
        if (!data.ok) throw new Error(data.erreur || 'Erreur inconnue');
        return data;
      } catch (e) {
        derniereErreur = e;
        // Une vraie erreur métier (code invalide, non autorisé...) ne se réessaie pas
        if (!/Erreur réseau|Réponse inattendue|Failed to fetch|NetworkError|Load failed/i.test(e.message)) throw e;
      }
    }
    throw new Error(derniereErreur.message + ' — le serveur Google n\'a pas répondu après 4 essais, réessaie dans une minute');
  }

  return {
    modeGoogle: MODE_GOOGLE,
    session: session,
    sauverSession: sauverSession,
    effacerSession: effacerSession,

    infosPubliques: function () { return appeler('infosPubliques'); },
    login: function (code, prenom) {
      return appeler('login', { code: code, prenom: prenom });
    },
    getData: function () { return appeler('getData'); },

    saveDevis: function (devis) { return appeler('saveDevis', { devis: devis }); },
    deleteDevis: function (id) { return appeler('deleteDevis', { id: id }); },
    convertirDevis: function (id) { return appeler('convertirDevis', { id: id }); },

    saveFacture: function (facture) { return appeler('saveFacture', { facture: facture }); },
    deleteFacture: function (id) { return appeler('deleteFacture', { id: id }); },
    marquerPayee: function (id, datePaiement) {
      return appeler('marquerPayee', { id: id, datePaiement: datePaiement });
    },

    saveNote: function (note, base64, nomFichier) {
      return appeler('saveNote', {
        note: note,
        justificatifBase64: base64 || null,
        justificatifNom: nomFichier || null
      });
    },
    traiterNote: function (id, statut, commentaire) {
      return appeler('traiterNote', { id: id, statut: statut, commentaire: commentaire });
    },
    deleteNote: function (id) { return appeler('deleteNote', { id: id }); },

    saveCompta: function (ligne) { return appeler('saveCompta', { ligne: ligne }); },
    deleteCompta: function (id) { return appeler('deleteCompta', { id: id }); },
    importCompta: function (lignes) { return appeler('importCompta', { lignes: lignes }); },

    saveConfig: function (config) { return appeler('saveConfig', { config: config }); }
  };
})();
