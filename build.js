/**
 * Fabrique le kit d'installation « tout Google » dans dist/ :
 *   - Code.gs              : le script serveur
 *   - Index.html           : l'interface complète (CSS + JS intégrés)
 *   - GUIDE-INSTALLATION.html, LICENSE.txt, LISEZ-MOI.txt
 *   - gestion-asso-kit-<version>.zip : le tout, prêt à envoyer (WeTransfer, mail...)
 *
 * Usage : node build.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const racine = __dirname;
const dist = path.join(racine, 'dist');
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');

const version = (/var VERSION_APP = '([^']+)'/.exec(lire('js/app.js')) || [])[1] || '0.0.0';
const versionServeur = (/var VERSION = '([^']+)'/.exec(lire('apps-script/Code.gs')) || [])[1];
if (version !== versionServeur) {
  console.warn('⚠️  Versions différentes : app.js ' + version + ' / Code.gs ' + versionServeur);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

/* ---- Index.html : page unique avec CSS et JS intégrés (pour Apps Script) ---- */
const css = lire('css/style.css');
const js = 'var API_URL = "";\n\n' + lire('js/api.js') + '\n\n' + lire('js/app.js');
if (/<\/script/i.test(js)) throw new Error('Le JS contient "</script", impossible de l\'intégrer tel quel');

let page = lire('index.html')
  .replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
  .replace(/\s*<script src="js\/config\.js"><\/script>\s*<script src="js\/api\.js"><\/script>\s*<script src="js\/app\.js"><\/script>/,
    '\n<script>\n' + js + '\n</script>');
if (page.includes('js/app.js')) throw new Error('Balises script non remplacées dans index.html');
fs.writeFileSync(path.join(dist, 'Index.html'), page, 'utf8');

/* ---- Autres fichiers ---- */
fs.copyFileSync(path.join(racine, 'apps-script/Code.gs'), path.join(dist, 'Code.gs'));
fs.copyFileSync(path.join(racine, 'docs/GUIDE-INSTALLATION.html'), path.join(dist, 'GUIDE-INSTALLATION.html'));
fs.copyFileSync(path.join(racine, 'LICENSE'), path.join(dist, 'LICENSE.txt'));
fs.writeFileSync(path.join(dist, 'LISEZ-MOI.txt'), [
  'GESTION ASSO — kit d\'installation, version ' + version,
  '',
  'Devis, factures, comptabilité et notes de frais pour associations.',
  'Gratuit, sans serveur à payer : tout tourne dans un Google Sheet de votre asso.',
  '',
  '1. Ouvrez GUIDE-INSTALLATION.html dans votre navigateur (double-clic).',
  '2. Suivez les étapes (environ 15 minutes, un simple compte Google suffit).',
  '',
  'Les deux fichiers à copier dans Google Apps Script : Code.gs et Index.html.',
  '',
  'Logiciel libre (licence MIT) créé par S\'Lac\'K Est Beau — https://slackestbeau.org',
  'Code source, guide et mises à jour : https://github.com/letitsss/slackestbeaucompta'
].join('\r\n'), 'utf8');

/* ---- Archive zip ---- */
const zip = 'gestion-asso-kit-' + version + '.zip';
try {
  execSync('tar -a -c -f "' + zip + '" Code.gs Index.html GUIDE-INSTALLATION.html LICENSE.txt LISEZ-MOI.txt', { cwd: dist, stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️  Archive zip non créée (tar indisponible ?) — les fichiers sont dans dist/');
}

console.log('✅ Kit version ' + version + ' construit dans dist/ (' + zip + ')');
