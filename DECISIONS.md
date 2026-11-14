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
