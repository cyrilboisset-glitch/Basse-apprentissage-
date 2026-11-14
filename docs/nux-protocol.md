# Protocole BLE MIDI du NUX Mighty Plug Pro — ce qui est implémenté

## Sources
Tout vient du code source **Mightier Amp** de Dian Iliev (Tuntorius), licence **MIT**,
<https://github.com/tuntorius/mightier_amp> (consulté le 14/11/2026). Fichiers lus :

| Information | Fichier |
|---|---|
| UUID du service et de la caractéristique | `lib/bluetooth/ble_controllers/BLEController.dart` |
| Connexion Web Bluetooth (service MIDI en *optional service*) | `lib/bluetooth/ble_controllers/WebBleController.dart` |
| Trames CC / PC / SysEx | `lib/bluetooth/NuxDeviceControl.dart`, `lib/bluetooth/devices/communication/communication.dart` |
| Numéros de CC du Plug Pro (`MidiCCValuesPro`), constantes SysEx | `lib/bluetooth/devices/NuxConstants.dart` |
| Envoi/réception (volume, accordeur, USB, presets) | `lib/bluetooth/devices/communication/plugProCommunication.dart` |
| Accordeur : modes, disponibilité (firmware > 2023-01-01), échelle | `lib/bluetooth/devices/features/tuner.dart`, `NuxMightyPlugPro.dart`, `lib/UI/pages/tunerPage.dart` |

Aucun octet n'est « deviné » : chaque trame ci-dessous est celle construite par Mightier Amp.
**Rien n'a été essayé sur un vrai Plug Pro** (pas de matériel dans l'environnement de développement) :
les trames sont vérifiées par des tests unitaires (`src/nux/nux.test.ts`) et un faux périphérique Web Bluetooth.

## Connexion
- Service : `03b80e5a-ede8-4b33-a751-6ce34ec4c700` — caractéristique : `7772e5db-3868-4112-a1a9-f2669d106bf3` (standard BLE MIDI).
- Web Bluetooth : `requestDevice({ acceptAllDevices: true, optionalServices: [service] })`, comme Mightier Amp (le nom exact annoncé par le Plug Pro n'est pas documenté, donc pas de filtre par nom). Exige un **geste utilisateur** et **HTTPS** ; Chrome Android uniquement.
- Notifications activées sur la caractéristique ; écriture via `writeValueWithoutResponse`.
- Reconnexion automatique (1 s, 2 s, 4 s, 8 s) après une coupure involontaire dans la même session. Après un redémarrage de l'appli, Chrome impose de nouveau le geste utilisateur.

## Trames envoyées (octets en hexadécimal)
En-tête BLE MIDI `80 80` (en-tête + horodatage), puis le message :

| Fonction | Trame | Statut |
|---|---|---|
| Changer de preset (1-7) | `80 80 C0 <n-1>` | Confirmé dans le code (7 presets : `channelsCount = 7`) |
| Volume du preset | `80 80 B0 49 <0-127>` (CC 73, « patch level ») | Confirmé dans le code ; **échelle dB non vérifiée** (Mightier Amp passe par un `decibelFormatter`), l'appli envoie 0-100 % → 0-127 proportionnel |
| Routage audio USB | `80 80 B0 58 <v>` (CC 88) : `0` Dry Out, `1` Normal, `2` Re-amp, bit `0x10` Loopback | Déduit d'un commentaire du code ; **non confirmé** — interface marquée « non testée » |
| Accordeur : réglages | `80 80 F0 43 58 70 6F 01 <on> <mode> <réf> <mute> 00 00 00 80 F7` | Confirmé dans le code. `mode` : 0 chromatique, 1 guitare compensée, 2 guitare standard, **3 basse**. `réf` = Hz − 430 (0-20) |
| Accordeur : demande des réglages | même trame avec direction `00` (GET) | Confirmé |

## Trames reçues
| Message | Signification |
|---|---|
| `B0 0B <0/1>` (CC 11) | accordeur actif |
| `B0 0C <n>` (CC 12) | note : demi-tons depuis le **La** (0 = La, 1 = La#, …) |
| `B0 47 <n>` (CC 71) | numéro de corde |
| `B0 48 <v>` (CC 72) | écart : `v − 50` cents (50 = juste) ; `note = 0` et `v = 50` = aucun signal |
| `B0 49 <v>` (CC 73) | volume courant |
| `C0 <n>` | preset courant |

Le décodeur (`parseIncoming`) gère l'en-tête, les horodatages, plusieurs messages par paquet et les SysEx ; il ne lève jamais d'exception sur un paquet tronqué.

## Ce qui est volontairement désactivé ou signalé « non disponible »
- **Accordeur du Plug Pro** : Mightier Amp ne l'active que pour un firmware postérieur au 01/01/2023. L'appli n'a pas de moyen fiable de lire la version : elle envoie la commande et, **sans réponse sous 2,5 s**, déclare l'accordeur « non disponible » et propose celui de l'appli. Les deux accordeurs coexistent (onglets dans l'accordeur ; un seul actif à la fois).
- **Routage USB** et **volume** : disponibles mais marqués non vérifiés.
- **Loopback** : non proposé (déconseillé : le backing reviendrait dans l'entrée de détection).
- Web Bluetooth absent (Firefox, iOS, navigateur sans HTTPS) : section désactivée, le reste fonctionne.
- Tout envoi hors connexion renvoie `false` sans exception.

## Presets automatiques
Réglage « Changer de preset automatiquement » : chaque catégorie (son clair pour le manche/théorie, blues, funk, rock, pop, reggae, soul, jazz, latin) est associée à un preset 1-7. Le changement est envoyé au démarrage d'un exercice, jamais pendant. Les presets eux-mêmes se créent dans l'appli NUX / Mightier Amp.

## Pour compléter ce document
Pour vérifier sur matériel : connecter le Plug Pro, tester les 7 boutons de preset (Outils → Matériel), le volume, puis l'accordeur (♩ → Plug Pro). Noter ici le nom BLE annoncé, la version de firmware et tout écart avec les valeurs ci-dessus.
