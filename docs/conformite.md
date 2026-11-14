# Conformité au cahier des charges — vérification point par point

**Légende** — ✅ réalisé et vérifié par un test automatisé ou une mesure · 🟡 partiel (ce qui manque est précisé) · ❌ impossible tel que demandé (raison donnée).

> **Réserve générale — à lire d'abord.** Tout a été développé et testé dans un environnement **sans basse, sans Plug Pro et sans téléphone Android** : l'audio est simulé (faux micro lisant une basse synthétique), le Bluetooth est simulé (faux périphérique GATT). Les ✅ sur la détection, la latence et le contrôle du Plug Pro signifient « correct sur simulation, trames identiques à celles de Mightier Amp », **pas** « validé sur votre matériel ». Le déploiement GitHub Pages n'a pas été exécuté (il faut fusionner dans `main` et activer Pages).

## §0 Mission
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| Travail par phases, appli qui tourne et testée à chaque phase, bilan | ✅ | 12 phases, un commit par phase sur `ccr-f9456a74-hog55f`, bilans en conversation |
| Décisions non bloquantes notées dans `DECISIONS.md` | ✅ | Fichier tenu à jour à chaque phase |
| Interface entièrement en français | ✅ | Tous les écrans, messages d'erreur, docs |

## §1 L'utilisateur
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| Séances de 10 à 30 min, démarrage rapide, séance sans réfléchir | ✅ | Bouton « Démarrer ma séance » en un tap ; démarrage 0,38 s (CPU ×4) — `docs/qualite.md` |

## §2 Choix techniques
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| PWA installable, hors ligne | ✅ | Manifeste (icônes 192/512/maskable) + service worker ; e2e « hors ligne » et « manifeste » |
| Vite + TypeScript + Preact, sans backend | ✅ | |
| Données en IndexedDB (Dexie) | ✅ | Réglages, stats, répétition espacée, journal, enregistrements ; e2e persistance |
| AudioWorklet pour la détection | ✅ | `src/audio/pitch-worklet.ts` ; e2e accordeur |
| Web Bluetooth (BLE MIDI) | ✅ (simulé) | Contrôleur + 17 tests unitaires + 2 e2e avec faux GATT |
| Entrée/sortie USB-C via `getUserMedia` | ✅ (simulé) | Contraintes sans écho/bruit/AGC ; jamais essayé sur un vrai Plug Pro |
| Déploiement GitHub Pages + workflow Actions | 🟡 | Workflows `deploy.yml` et `ci.yml` écrits ; **non exécutés** (nécessite `main` + activation de Pages) |
| Vitest (théorie, détection sur WAV, scoring) | ✅ | **205 tests** dont 45 WAV de référence |
| Playwright (parcours clés) | ✅ | **31 parcours** + 1 test d'endurance optionnel |
| Modules `audio/ theory/ nux/ exercises/ ui/ storage/` | ✅ | + `progress/` |

## §3 NUX Mighty Plug Pro
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| Étudier Mightier Amp, documenter dans `docs/nux-protocol.md` | ✅ | UUID, trames CC/PC/SysEx, accordeur, sources citées (MIT) |
| Mode USB (entrée = basse, sortie = backing), sans écho/bruit/AGC | ✅ (simulé) | |
| Détection automatique du périphérique USB + choix manuel | 🟡 | Heuristique sur le nom (« nux / mighty / plug / usb ») ; Android donne souvent des noms génériques → choix manuel prévu |
| Mode Bluetooth + micro du téléphone, avertissement clair | ✅ | Avertissement dans Matériel ; limites chiffrées dans `qualite.md` |
| Contrôle BLE MIDI en parallèle, bouton « Connecter le Plug Pro » | ✅ (simulé) | |
| Changer de preset selon l'exercice / associer un preset à chaque style | ✅ (simulé) | 9 catégories × presets 1-7, option « automatique » |
| Volume maître depuis l'appli | 🟡 | CC 73 confirmé dans le code, mais **échelle en dB non vérifiée** (signalé dans l'interface) |
| Accordeur du Plug Pro si le protocole l'expose, coexistence propre avec celui de l'appli | 🟡 | Implémenté ; dépend du firmware (> 01/2023) ; détection « sans réponse sous 2,5 s = non disponible » ; deux onglets, un seul actif |
| Ce qui n'est pas confirmé : désactivé proprement, « non disponible », jamais de plantage | ✅ | Routage USB marqué « non testé » ; Web Bluetooth absent = section désactivée (e2e) |
| Calibration de latence obligatoire avant les exercices de rythme | ✅ | Porte « Calibration requise » dans Groove et Impro, avec sortie explicite « continuer sans calibration » ; e2e `calibration.spec.ts`. L'étape rythme du test de positionnement reste ignorable |
| Calibrations séparées USB / Bluetooth | ✅ | Valeurs et validations distinctes ; e2e |

## §4 Accordeur intégré
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| YIN/MPM dans un AudioWorklet, tampon ≥ 4096 à 48 kHz | ✅ | YIN décimé ×4, **8192** échantillons |
| Fiable sur le Mi grave 41,20 Hz et le Si grave 30,87 Hz | ✅ (synthèse) | +0,6 cent et +1,0 cent ; e2e : Mi grave à < 2 cents via le faux micro |
| Note, aiguille, cents ±50, zone verte ±3, Hz | ✅ | |
| Accordages : standard 4, 5 cordes, Drop D, demi-ton plus bas, **personnalisé** | ✅ | Éditeur par corde (4 à 6 cordes) ; e2e Drop D personnalisé et 5 cordes |
| La de référence réglable | ✅ | 415-466 Hz |
| Mode corde par corde guidé | ✅ | Passe à la corde suivante après ~0,9 s juste |
| Accès en un tap depuis n'importe quel écran | ✅ | Bouton flottant ♩ |
| Lissage, indication de signal trop faible | ✅ | Médiane de 5 mesures + lissage exponentiel |

## §5 Moteur musical
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| Notes, intervalles, enharmonies, notation Do/C | 🟡 | Do Ré Mi / C D E réglable ✅ ; **les altérations s'affichent en dièses** (Do#, pas Réb) pour les notes ; les symboles d'accords, eux, gardent bémols/dièses saisis |
| Gammes : majeure, mineure naturelle, pentatoniques, blues, 7 modes, mélodique, harmonique, chromatique | ✅ | 13 gammes, les 7 modes testés comme rotations de la majeure |
| Arpèges : maj, m, 7, maj7, m7, m7b5, dim7, sus4, 6 | ✅ | |
| Grilles chiffrées (« Am7 \| D7 … ») et en degrés (II-V-I) | ✅ | 13 grilles prédéfinies, éditeur libre |
| Fonction des notes (fondamentale, tierce, quinte, septième, extension, passage, avoid) | ✅ | Testé accord par accord |
| Note ↔ positions selon l'accordage, jusqu'à la case 24, cases réglables | ✅ | |

## §6 Écrans et modules
| § | Exigence | Statut | Remarque |
|---|---|---|---|
| 6.1 | Séance du jour 10/20/30 min, série, temps de la semaine, objectif | ✅ | |
| 6.1 | **Rappel quotidien (notification de la PWA, heure réglable)** | ❌ → 🟡 | Impossible sans serveur : une PWA ne peut pas programmer de notification à heure fixe (l'API de notifications planifiées a été abandonnée par Chrome, la synchro en arrière-plan n'a pas d'heure garantie) et « rien ne quitte le téléphone ». **Substitut livré :** fichier agenda `.ics` quotidien avec alarme |
| 6.2 | Manche plein écran paysage, gaucher/droitier | 🟡 | Gaucher/droitier ✅ ; mise en page adaptée au paysage ✅ ; **le paysage n'est pas verrouillé** (la PWA installée peut le faire, pas l'API en page web) |
| 6.2 | Couleur par fonction, noms / degrés / rien, note jouée en direct | ✅ | Formes en plus de la couleur |
| 6.3 | 6 exercices du manche | ✅ | Chasse, corde imposée, quiz, intervalles, gammes, arpèges |
| 6.3 | « Gammes en positions : … puis la relier à la position suivante » | ✅ | Une manche sur deux relie deux positions voisines ; test unitaire et e2e |
| 6.3 | Validation audio ; déblocage à 90 % sur 3 séances ; carte de chaleur | 🟡 | ✅ — mais l'audio donne la **hauteur, pas la corde ni la case** : « toutes les positions » = toutes les hauteurs de la zone ; « corde imposée » accepte n'importe quelle octave de la corde dans la zone |
| 6.4 | Leçons ≤ 2 min suivies d'un exercice joué (4 chapitres) | ✅ | 33 leçons ≤ 260 mots, dont solfège rythmique mesuré en ms |
| 6.5 | 9 exercices d'improvisation sur backing avec grille et accord en cours | ✅ | Joueurs simulés parfaits = 100 % sur chacun |
| 6.5 | « Une seule corde » (contraintes) | 🟡 | Non détectable : remplacé par un ambitus ≤ 7 demi-tons |
| 6.5 | Retour : % dans l'accord, justesse rythmique, cibles, conseil de prof | ✅ | Règles locales, 3 conseils max |
| 6.5 | Question/réponse, copie → variation → invention | 🟡 | ✅ mesurable (hauteurs, rythme, 1 seul changement) ; la **musicalité** d'une réponse libre ne peut pas être jugée |
| 6.6 | Rythmes (noires → syncopes), analyse en ms (courbe, moyenne) | ✅ | 8 rythmes |
| 6.6 | Notes étouffées « détectées si possible, sinon auto-évaluation » | 🟡 | Détectées comme attaques sans hauteur ; l'« auto-évaluation » se limite à **les exclure du score** (pas de note sur 5) |
| 6.6 | Clic qui disparaît (1/2, 3/4, 7/8), mesure de dérive | ✅ | |
| 6.6 | +5 BPM à 90 % | ✅ | Tempo mémorisé par exercice |
| 6.6 | Technique des doigts (alternance, chromatique 1-2-3-4, cordes à vide) | 🟡 | Régularité mesurée ✅ ; **le doigt utilisé est indétectable** : l'alternance est évaluée par l'asymétrie des intervalles pairs/impairs |
| 6.7 | ≥ 60 phrases originales, ≥ 6 par style, JSON, 8 styles | ✅ | **64 phrases**, 8 par style |
| 6.7 | Tablature animée, lecture, tempo, transposition 12 tonalités, boucle | ✅ | Test : 64 phrases × 12 tonalités jouables et cohérentes |
| 6.7 | Partition simplifiée optionnelle | 🟡 | Noms de notes + glyphes de durée, **pas de portée** |
| 6.7 | Ses propres phrases (tablature ou capture audio) | ✅ | Capture quantifiée à la double croche, à retoucher |
| 6.8 | Backings synthétisés, 9 styles, tonalité/tempo/grille/éditeur/tours/swing | ✅ | Aucune basse (test) ; crêtes ≤ 0,8 |
| 6.8 | Boucle de section, accélération, sourdine par instrument | ✅ | |
| 6.8 | Enregistrement basse seule / basse + accompagnement, réécoute avec grille et notes, export WAV ou WebM | ✅ | e2e : WAV valide, non saturé |
| 6.8 | Import d'un fichier audio, boucle A-B, ralenti sans changer la hauteur | ✅ | e2e : `preservesPitch = true` à 50 % |
| 6.9 | Oreille : intervalles, qualités d'accords, degrés, relevé de ligne | ✅ | 3 niveaux |
| 6.10 | Accordeur, métronome avancé (composées, accent, subdivisions, clic visuel) | ✅ | |
| 6.10 | **Boîte à rythmes simple** | ✅ | Grille 16 pas × 6 voix, modèles issus des styles, swing |
| 6.10 | Manche de référence des gammes et arpèges, éditeur de grilles | ✅ | Liens depuis Outils |

## §7 Progression et motivation
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| ≥ 8 niveaux avec objectifs clairs | ✅ | 8 niveaux, critères mesurables (`docs/pedagogie.md`) |
| Test de positionnement (10 min), refaisable | ✅ | Étapes audio ignorables |
| Répétition espacée (notes, intervalles, phrases) | ✅ | Leitner ; un test montre que les ratés sortent > 90 % du temps |
| Série avec un joker par semaine | ✅ | 8 tests |
| Badges sobres liés à de vrais progrès | ✅ | 12 badges ; aucun badge à l'ouverture |
| Tableau de bord (semaine, modules, carte de chaleur, évolution de la mise en place) | ✅ | |
| Journal de pratique | ✅ | Note à la fin de chaque séance du jour |

## §8 Interface et ergonomie
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| Gros boutons, lisible à 1 m, contraste élevé | ✅ | Axe : 0 violation |
| Mode sombre par défaut, clair disponible | ✅ | Les deux audités |
| Paysage pour manche/jam, portrait ailleurs | 🟡 | Voir 6.2 |
| Écran maintenu allumé pendant les exercices (Wake Lock) | ✅ | Tous les exercices ; dépend du support du navigateur |
| Démarrer/arrêter sans toucher l'écran (note commande ou footswitch BLE MIDI) | ✅ (simulé) | Doublé de Mi à vide après silence ; footswitch : toute pression. À valider avec votre modèle |
| Démarrage < 2 s ; séance du jour en un tap | ✅ | 0,38 s / 0,85 s (CPU ×4 / ×6) |
| Sobre, sans publicité, sans compte, rien envoyé sur Internet | ✅ | Test e2e : toutes les requêtes restent sur l'origine de l'appli |

## §9 Données et réglages
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| Tout en local | ✅ | |
| Export/import JSON de toutes les données | 🟡 | ✅ pour tout **sauf les enregistrements audio** (volumineux, exportables un par un) ; pas d'option ZIP |
| Réglages : notation, gaucher, cordes/cases, accordage, La, latence, presets, durée, rappel | ✅ | Latence modifiable à la main ; nombre de cordes relié à l'accordage |

## §10 Qualité et robustesse
| Exigence | Statut | Preuve / remarque |
|---|---|---|
| Micro refusé / indisponible : message clair + explication | ✅ | |
| Déconnexion USB : pause, message, reconnexion automatique | ✅ (simulé) | Événement `devicechange` + bouton ; **jamais essayé avec un vrai câble débranché** |
| Détection testée sur WAV de référence B0 → G4, taux mesuré et documenté | ✅ | 45/45, écart moyen 0,5 cent ; 100 % à 20 dB de SNR, **75,6 % à 10 dB** ; **sons synthétiques** (script fourni pour vos propres WAV) |
| Pas de fuite mémoire sur une session d'une heure | 🟡 | Mesuré sur **160 s** : tas plat (+0,2 Mo), DOM constant, nœuds audio sans tendance. **Une heure n'a pas été exécutée** |
| Accessibilité : polices réglables, couleurs distinguables par forme/étiquette | ✅ | Texte 90-150 %, formes + ✓ ⏱ ✗ |

## §11 Documentation
`README.md` ✅ · `docs/branchements.md` ✅ (schémas, réglages Android, routage USB) · `docs/nux-protocol.md` ✅ · `docs/pedagogie.md` ✅ (générée depuis le code) · `DECISIONS.md` ✅ — plus `docs/qualite.md` et ce fichier.

## §12 Ordre de réalisation
Les 12 phases ont été réalisées dans l'ordre (la théorie appliquée §6.4 a été ajoutée en phase 10 faute d'avoir sa propre phase).

---

## Synthèse

**✅ Réalisé (la grande majorité) :** les 12 phases, tous les modules §6 sauf nuances ci-dessous, le moteur musical, l'accordeur complet, le contrôle du Plug Pro (protocole sourcé), la progression, l'enregistrement, la documentation, **176 tests unitaires + 31 parcours + audit d'accessibilité**.

**🟡 Partiel :** déploiement Pages (écrit, non exécuté) · détection automatique de l'entrée USB (heuristique) · volume du Plug Pro (échelle dB inconnue) · accordeur du Plug Pro (selon firmware) · altérations en dièses seulement · paysage non verrouillable · « une seule corde » (ambitus) · notes étouffées (exclusion du score, pas d'auto-notation) · partition simplifiée (sans portée) · export JSON sans l'audio · mémoire testée 160 s et non 1 h.

**❌ Impossible tel que demandé :**
- **Notification quotidienne à heure fixe** — exige un serveur de push ; remplacée par un rappel d'agenda `.ics`.
- **Savoir sur quelle corde / avec quel doigt une note est jouée** — le signal audio ne contient que la hauteur ; les exercices sont donc validés par hauteur et l'alternance par la régularité.
- **Juger la musicalité d'une improvisation** — seuls des critères mesurables (dans l'accord, rythme, cibles, densité) sont évaluables.
- **Valider les calibrations, la détection réelle et les commandes Bluetooth sans le matériel** — à faire chez vous (checklist dans `docs/nux-protocol.md` et `docs/branchements.md`).
