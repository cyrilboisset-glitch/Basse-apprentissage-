# Branchements Plug Pro ↔ téléphone Android

> Les schémas décrivent les connexions prévues par la fiche technique du Mighty Plug Pro (USB-C 48 kHz, OTG, Bluetooth 4.2 double mode, routages Normal / Dry Out / Re-amp / Loopback). **Rien n'a été essayé sur matériel réel** pendant le développement : les points marqués ⚠ sont à vérifier chez vous.

## Mode 1 — USB (recommandé)

```
                      câble USB-C ↔ USB-C (ou adaptateur OTG si la prise du téléphone est différente)
 ┌──────────┐ jack  ┌────────────────────┐ ─────────────────────────────► ┌────────────────┐
 │  Basse   │──────►│  NUX Mighty Plug   │  entrée : votre basse (Dry Out)  │   Téléphone    │
 └──────────┘       │  Pro               │ ◄───────────────────────────── │   Android      │
                    │                    │  sortie : backing + métronome    │   Chrome       │
                    └─────────┬──────────┘                                 └────────────────┘
                              │ sortie casque
                          🎧 Casque : vous entendez votre basse (avec le son du preset)
                                       + l'accompagnement de l'appli
```

1. Allumer le Plug Pro, brancher la basse sur son entrée instrument et le casque sur sa sortie casque.
2. Brancher le Plug Pro au téléphone en USB-C (le Plug Pro a sa propre batterie ⚠ d'après la fiche produit ; si le téléphone se met à le charger, c'est normal).
3. Ouvrir BassLab → **Outils → Matériel** → *Mode USB* → **Tester l'entrée**. Autoriser le micro à la première demande (Chrome l'exige même pour une interface USB). Le niveau doit bouger quand vous jouez.
4. Si l'entrée n'apparaît pas par défaut, la choisir dans *Entrée audio* (l'appli devine « NUX / Mighty / USB » d'après le nom ; Android affiche parfois un nom générique).
5. Faire la **calibration de latence** (8 clics) avant les exercices de rythme.

### Réglage du routage USB du Plug Pro
| Routage | Ce que reçoit l'appli | Conseil |
|---|---|---|
| **Dry Out** | Votre basse **sans effet** | ✅ **Recommandé** : détection la plus fiable, quel que soit le preset |
| Normal | Basse avec les effets du preset | Correct avec un son propre ; saturation et compression gênent la détection des graves |
| Re-amp | Pensé pour renvoyer un signal sec vers l'ampli | Inutile ici |
| **Loopback** | Entrée + audio du téléphone mélangés | ❌ À éviter : le backing reviendrait dans l'entrée et fausserait la détection |

Le routage se change depuis l'appli NUX ou, expérimentalement, depuis *Outils → Matériel → Routage USB* une fois le contrôle Bluetooth connecté (commande déduite du code de Mightier Amp, non testée ⚠).

## Mode 2 — Bluetooth audio + micro du téléphone (dépannage)

```
 ┌──────────┐ jack  ┌──────────────┐   Bluetooth audio (A2DP)   ┌────────────┐
 │  Basse   │──────►│ Mighty Plug  │ ◄───────────────────────── │ Téléphone  │
 └──────────┘       │ Pro          │  backing + métronome        │            │
                    └──────┬───────┘                             └─────▲──────┘
                       🎧 casque                                       │ micro du téléphone
                                                         (capte la pièce, pas le câble de la basse)
```

⚠ **Moins fiable** : le micro capte aussi le bruit ambiant (mesuré en laboratoire : 100 % de reconnaissance à 20 dB de rapport signal/bruit, environ 75 % à 10 dB — voir `qualite.md`) et le Bluetooth ajoute un retard de l'ordre de 150 à 300 ms qui varie d'un téléphone à l'autre. Choisir *Mode Bluetooth* dans Matériel et **recalibrer la latence** pour ce mode (les deux calibrations sont séparées).

## Contrôle BLE MIDI (en plus du mode 1 ou 2)

Dans **Outils → Matériel → Plug Pro (Bluetooth MIDI)** : *Connecter le Plug Pro*. Chrome ouvre une liste d'appareils : choisir le Plug Pro.
- Permission Android : « Appareils à proximité » (Android 12 et +) ou « Localisation » (Android 11 et −) ; Chrome la demande lui-même.
- Possible en même temps que l'audio USB : ce sont deux liaisons indépendantes.
- Une fois connecté : choix des presets (1 à 7), volume, changement automatique de preset par style, accordeur du Plug Pro.
- Si la connexion se coupe, l'appli retente 4 fois (1, 2, 4, 8 s). Après un redémarrage de l'appli, Chrome impose de refaire le geste de connexion.

## Footswitch Bluetooth MIDI
*Outils → Matériel → Connecter un footswitch* : toute pression démarre/arrête l'exercice ouvert (le footswitch doit être en mode BLE MIDI ; certains modèles ne l'annoncent pas — l'appli le connecte quand même).

## Réglages Android utiles
- Chrome : autoriser le **micro** pour le site (cadenas de la barre d'adresse → Autorisations).
- Installer la PWA (menu ⋮ → *Installer l'application*) : lancement plein écran, hors ligne.
- Désactiver l'économiseur de batterie pour Chrome si le son se coupe écran éteint (BassLab garde l'écran allumé pendant les exercices).
- Verrouillage de l'orientation : le paysage est plus confortable pour le manche et le Jam (la PWA installée peut s'y verrouiller).

## Dépannage
| Symptôme | Piste |
|---|---|
| « Accès au micro refusé » | Cadenas → Autorisations → Micro → Autoriser, puis *Réessayer* |
| Le niveau ne bouge pas | Mauvaise entrée : la choisir dans Matériel ; vérifier le jack et le gain du Plug Pro |
| Notes graves instables | Passer en *Dry Out* ; jouer plus fort / à vide ; éviter les effets de compression ou de saturation |
| Exercices toujours « en retard » ou « en avance » | Refaire la calibration de latence dans le bon mode (USB ou Bluetooth) |
| Pas de son d'accompagnement dans le casque | Vérifier la sortie audio du téléphone : le Plug Pro doit être la sortie USB active |
| Rien ne se passe au clic « Connecter le Plug Pro » | Web Bluetooth exige Chrome + HTTPS + le Bluetooth du téléphone activé |
| Exercice interrompu, bandeau rouge | Le câble a été débranché : rebrancher, la reconnexion est automatique |
