# Décisions

- **Preact + Dexie** : léger, démarrage rapide.
- **Navigation par hash** (`#/...`) : fonctionne sur GitHub Pages sans configuration serveur.
- **Base `/Basse-apprentissage-/`** pour Pages ; surchargeable via `BASE_PATH`.
- **Rappel quotidien** : pas de push sans serveur ; repli prévu par fichier .ics.
- **Icône SVG unique** (pas de PNG) pour la phase 1.
- **Détection YIN décimée ×4 + affinage pleine résolution** : ~4 ms/détection (contre ~17 ms), même précision (45/45 notes B0→G4 à ±2 cents sur sons de synthèse). Buffer 8192 @48 kHz : couvre le Si grave (30,87 Hz).
- **Médiane sur 5 mesures + lissage exponentiel** de l'aiguille ; seuil de clarté 0,8 ; silence sous RMS 0,003 = « signal trop faible ».
- **Calibration de latence** : médiane (attaque − clic), temps de réaction humain inclus volontairement. Valeurs séparées USB / Bluetooth.
- **Contexte audio partagé** entre accordeur, métronome et futurs backings ; le micro est libéré à la fermeture de l'accordeur.
- Accordeur du Plug Pro (BLE) repoussé à la phase 9.
- **Validation par hauteur, pas par case** : l'audio ne distingue pas les cordes. « Toutes les positions » = toutes les hauteurs distinctes de la zone ; « note sur une corde » accepte toute octave présente sur cette corde dans la zone.
- **Déblocage des zones** : moyenne des 3 dernières séances de la zone ≥ 90 % (3 séances minimum). Option « Tout débloquer » dans les réglages (le test de positionnement pourra aussi débloquer).
- **Réussite d'une séance** = notes justes / (justes + fausses) ; « Passer » compte les notes restantes comme fausses.
- **Carte de chaleur** par hauteur : maîtrisée ≥ 90 % et < 3 s ; lente > 3 s ; ratée < 70 %. Symboles ✓ ⏱ ✗ en plus des couleurs.
- **Répétition espacée** : boîtes de Leitner (0/1/2/4/8/16 jours), tirage pondéré (jamais vu 2, raté 3 + retard, non dû 0,2).
- **Backings 100 % synthétisés** (aucun fichier audio) : batterie bruit+oscillateurs, claviers, guitare, orgue. Planification pure (`plan.ts`, testée) séparée du rendu audio (`voices.ts`). Limiteur maître pour éviter toute saturation (crêtes mesurées ≤ 0,8).
- **Swing** : retard de la 2ᵉ croche jusqu'à 1/3 de croche ; blues = grille ternaire à 12 pas (shuffle exact, sans réglage).
- **Aucune basse** dans les accompagnements (test automatisé : voicings ≥ Ré2). La basse synthétisée n'existe que pour les phrases d'exemple (`playBassNote`).
