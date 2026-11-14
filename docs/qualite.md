# Qualité mesurée

Tous les chiffres ci-dessous viennent de commandes reproductibles du dépôt. Ils concernent des **sons de synthèse** et un **faux micro** : ils ne remplacent pas un essai avec votre basse et votre Plug Pro (voir `branchements.md`).

## Détection de hauteur (YIN décimé ×4 + affinage pleine résolution, fenêtre 8192 à 48 kHz)

Fichiers de référence : `tests/audio/*.wav` — 45 notes de basse de **B0 (30,87 Hz) à G4 (392 Hz)**, 0,45 s, 48 kHz, 16 bits, timbre pincé avec harmoniques décroissantes, bruit de médiator, fondamentale volontairement faible sous le Mi grave. Régénérables avec `npm run wavs`.

| Mesure (`npm run measure`) | Résultat |
|---|---|
| Notes reconnues à ±5 cents | **45 / 45 (100 %)** |
| Écart moyen / maximal | **0,50 cent / 1,00 cent** (le maximum est le B0) |
| Mi grave E1 = 41,20 Hz | 41,22 Hz (+0,6 cent) |
| Si grave B0 = 30,87 Hz | 30,89 Hz (+1,0 cent) |
| Bruit blanc, rapport signal/bruit **20 dB** | **100 %** |
| Bruit blanc, rapport signal/bruit **10 dB** | **75,6 %** — échecs (erreurs d'octave) : A1 A2 C#2 C#4 C2 C3 D#2 D#3 E1 E3 G1 |
| Temps de calcul d'une détection (PC) | ≈ 4 ms (17 ms sans la décimation) |

**À retenir :** en USB (signal direct de la basse, bruit faible) la détection est très fiable ; avec le micro d'un téléphone dans une pièce bruyante elle l'est nettement moins — c'est la raison de l'avertissement du mode Bluetooth.

**Mesurer vos propres enregistrements :** déposez des WAV nommés d'après la note (`E1.wav`, `F#2.wav`, `Bb1.wav`…) dans un dossier et lancez `npm run measure -- mon_dossier`. Le test `src/audio/reference-wav.test.ts` fait de même sur `tests/audio`.

**Limite connue :** la hauteur d'une note n'est confirmée que ≥ 100 ms après l'attaque (la fenêtre de 170 ms contient sinon la note précédente). Le **rythme** vient de l'attaque et reste précis ; mais des notes plus rapides qu'environ 100 ms (doubles croches rapides) peuvent être comptées « sans hauteur ».

## Tests automatisés

| Type | Nombre | Commande |
|---|---|---|
| Unitaires (Vitest) : théorie, détection, scoring, backing, impro, groove, vocabulaire, oreille, progression, stockage, protocole NUX, WAV | voir `npm test` | `npm test` |
| Parcours (Playwright, Chromium, faux micro, faux Bluetooth) | 31 | `npm run e2e` |
| Endurance (fuites), optionnel | 1 | `SOAK=1 SOAK_SECONDS=160 npm run e2e -- soak` |

Parcours couverts : navigation et hash, réglages persistants, export/import JSON, **hors ligne** (service worker), manifeste PWA, accordeur (Mi grave à moins de 2 cents), libération réelle du micro, comptage d'utilisateurs de l'entrée, Jam + enregistrement + export WAV, import audio (ralenti sans changement de hauteur), groove, improvisation Q/R, quiz et carte de chaleur, séance du jour, théorie, oreille, vocabulaire, test de positionnement, Plug Pro simulé, accessibilité.

## Fuites mémoire (endurance)
Jam à 150 BPM en boucle infinie + entrée audio active (AudioWorklet), 160 s, mémoire JS forcée par GC et nœuds audio comptés via le protocole DevTools (`WebAudio`) :

| t (s) | 0 | 20 | 40 | 60 | 80 | 100 | 120 | 140 | 160 |
|---|---|---|---|---|---|---|---|---|---|
| Tas JS (Mo) | 3,29 | 3,35 | 3,38 | 3,40 | 3,48 | 3,41 | 3,42 | 3,43 | 3,50 |
| Nœuds audio vivants | 19 | 180 | 92 | 115 | 159 | 76 | 95 | 119 | 162 |
| Nœuds DOM | 471 | 474 | 474 | 474 | 474 | 474 | 474 | 474 | 474 |

Le tas reste plat (+0,2 Mo), le DOM constant, les nœuds audio fluctuent (voix en cours de lecture) sans tendance. **La session d'une heure n'a pas été exécutée** : 160 s ne prouvent pas l'absence de toute fuite lente, mais la conception libère tout (nœuds déconnectés à la fin des sons, micro libéré, contexte conservé).

## Démarrage
| Conditions (1ᵉʳ chargement, sans cache) | Séance du jour visible |
|---|---|
| PC | ≈ 0,1 s |
| Téléphone moyen simulé (CPU ×4, 4G rapide) | **0,38 s** |
| Téléphone modeste simulé (CPU ×6, 3G+) | **0,85 s** |
| 2ᵉ lancement (service worker), CPU ×4 | **0,16 s** |

JS principal : ≈ 96 Ko compressé. Objectif « moins de 2 s » : atteint avec marge.

## Accessibilité
Audit **axe-core** (WCAG 2.0/2.1 A et AA + bonnes pratiques) sur **17 écrans, thèmes sombre et clair : 0 violation**. Autres dispositions : tailles de texte réglables (90–150 %), manche lisible sans la couleur (formes + étiquettes ✓ ⏱ ✗), contraste élevé, boutons ≥ 44 px, focus visible, animations réduites si demandé, écran maintenu allumé pendant les exercices.
