# BassLab — apprendre l'improvisation à la basse

Application web installable (PWA), **entièrement en français, sans compte, sans publicité, sans serveur** : toutes les données restent sur votre téléphone. Pensée pour un bassiste qui a les bases et veut **improviser** et **connaître son manche**, avec un **NUX Mighty Plug Pro** et un smartphone Android (Chrome).

## Ce que fait l'appli
| Module | Contenu |
|---|---|
| **Séance du jour** | 10, 20 ou 30 min générées selon votre niveau et vos faiblesses ; série de jours avec un joker par semaine ; prochain objectif |
| **Accordeur** (bouton ♩ partout) | Détection YIN en AudioWorklet, Mi grave et Si grave, ±3 cents, 5 accordages, La réglable, mode guidé corde par corde, accordeur du Plug Pro si le firmware le permet |
| **Manche** | Manche interactif (couleurs **et** formes), 6 exercices par zones, déblocage à 90 %, carte de chaleur |
| **Théorie appliquée** | 6 leçons courtes suivies d'un exercice joué |
| **Improvisation** | 9 exercices progressifs sur backing track avec analyse et conseil de prof |
| **Groove** | Mise en place en ms, clic qui disparaît, tempo +5 BPM, technique des doigts |
| **Vocabulaire** | 64 phrases originales, 8 styles, tablature animée, 12 tonalités, vos propres phrases |
| **Jam** | 9 styles synthétisés (sans basse), grilles, enregistrement, réécoute annotée, export WAV/WebM |
| **Oreille** | Intervalles, accords, degrés, relevé de ligne |
| **Outils** | Métronome avancé, matériel et calibration, jouer sur un morceau (boucle A-B, ralenti sans changer la hauteur) |
| **Plug Pro** | Contrôle BLE MIDI : presets par style, volume, accordeur |

Détail de la pédagogie : [`docs/pedagogie.md`](docs/pedagogie.md) · branchements : [`docs/branchements.md`](docs/branchements.md) · protocole NUX : [`docs/nux-protocol.md`](docs/nux-protocol.md) · qualité mesurée : [`docs/qualite.md`](docs/qualite.md) · conformité au cahier des charges : [`docs/conformite.md`](docs/conformite.md) · décisions : [`DECISIONS.md`](DECISIONS.md).

## Installation et lancement local
Prérequis : Node.js 22.
```bash
npm install
npm run dev        # développement : http://localhost:5173/Basse-apprentissage-/
npm test           # tests unitaires (Vitest)
npm run build      # production dans dist/
npm run preview    # sert dist/ en local
npm run e2e        # parcours Playwright (Chromium requis, voir ci-dessous)
```
Le micro et Web Bluetooth exigent **HTTPS** (ou `localhost`).

| Script | Rôle |
|---|---|
| `npm run typecheck` | Vérification TypeScript |
| `npm run e2e` | 31 parcours Playwright ; `SOAK=1 npm run e2e -- soak` : test d'endurance |
| `npm run wavs` | Régénère les 45 WAV de référence (`tests/audio`) |
| `npm run measure -- dossier` | Mesure le taux de reconnaissance sur **vos** WAV nommés `E1.wav`, `F#2.wav`… |
| `npm run docs` | Régénère `docs/pedagogie.md` depuis le code |

Playwright : `npx playwright install chromium` (dans cet environnement, Chromium est préinstallé et la config le détecte).

## Déploiement sur GitHub Pages
1. Dépôt GitHub → **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Fusionner la branche de travail dans `main` : le workflow `.github/workflows/deploy.yml` lance les tests, construit et publie.
3. L'appli est servie sur `https://<utilisateur>.github.io/Basse-apprentissage-/` (le chemin de base est configuré dans `vite.config.ts`, surchargeable avec `BASE_PATH`).

Le workflow `.github/workflows/ci.yml` exécute typage, tests unitaires, build et parcours Playwright sur les autres branches et les pull requests.

## Installer l'appli sur Android
1. Ouvrir l'adresse ci-dessus dans **Chrome** (HTTPS).
2. Menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
3. Au premier lancement, autoriser le **micro** ; l'appli fonctionne ensuite **hors ligne**.
4. Brancher le Plug Pro : voir [`docs/branchements.md`](docs/branchements.md).

## Architecture
```
src/
  audio/      entrée (AudioWorklet YIN), moteur, métronome, backings synthétisés, enregistreur, WAV, note commande
  theory/     notes, gammes, accords, grilles, fonctions des notes, manche
  exercises/  manche, impro, groove, vocabulaire, oreille, théorie (logique pure, testée)
  progress/   niveaux, série, badges, séance du jour
  nux/        protocole BLE MIDI du Plug Pro, contrôleur Web Bluetooth, footswitch
  storage/    IndexedDB (Dexie) : réglages, stats, répétition espacée, journal, enregistrements
  ui/         écrans Preact
  data/       phrases en JSON (ajouter une phrase = ajouter une entrée)
e2e/  scripts/  tests/audio/  docs/
```
Pour **ajouter une phrase** : éditer `src/data/phrases/<style>.json` (notation `temps:corde+case:durée`, grille en degrés) ; un test vérifie sa cohérence harmonique dans les 12 tonalités.

## Limites connues (résumé)
- Non essayé sur un vrai Plug Pro ni une vraie basse : calibrations, détection et commandes BLE sont validées par simulation (voir `docs/qualite.md`).
- L'audio donne la **hauteur** de la note, pas la corde ni le doigt.
- Pas de notification push à heure fixe sans serveur : fichier agenda `.ics` à la place.
- Backings entièrement synthétisés : rendu volontairement simple.
- Détection moins fiable avec le micro d'un téléphone en pièce bruyante (≈ 76 % à 10 dB de rapport signal/bruit).

Licence du code : à définir par l'auteur. Le protocole du Plug Pro s'appuie sur *Mightier Amp* (MIT, Dian Iliev).
