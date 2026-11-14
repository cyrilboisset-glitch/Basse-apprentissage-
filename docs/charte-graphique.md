# Charte graphique v2 — graphite et laiton

Validée par l'auteur avant application (maquette : écrans Accueil, Accordeur, Manche paysage). Source unique des valeurs : `src/ui/styles.css` (variables CSS `:root` et `:root[data-theme=light]`).

## Principes
- **Sobriété** : neutres chauds et **un seul accent** (laiton). Le vert et le rouge ne servent qu'au retour d'un exercice, avec une icône et un mot.
- **Lisibilité** : contraste AA partout (audit axe-core automatisé sur 17 écrans, deux thèmes : 0 violation). Aucune information portée par la couleur seule.
- **Fait pour le pouce** : actions principales en bas, cibles ≥ 44-48 px, pas de bouton flottant.
- **Cohérence** : peu de composants (bouton, carte, puce, contrôle segmenté, choix, onglet) réutilisés partout.

## Palette
| Rôle | Sombre (défaut) | Clair |
|---|---|---|
| Fond | `#151515` | `#F4F1EA` |
| Surface | `#1E1E1E` | `#FBF9F4` |
| Bordure | `#34322F` | `#D8D2C6` |
| Texte | `#ECE8E1` (15,0:1) | `#231F1A` (14,5:1) |
| Texte discret | `#A39E95` (6,3:1) | `#5E574D` (6,3:1) |
| Accent (laiton) | `#C9A45C` (texte foncé dessus : 7,8:1) | `#8A6420` (texte blanc dessus : 5,4:1) |
| Réussite / Erreur | `#86B98F` / `#E07B6F` | `#3F7A4A` / `#A8382E` |

## Notes sur le manche (couleur + forme + étiquette)
Fondamentale `#E8946A` cercle cerclé · tierce `#E6C873` losange · quinte `#8FB8DC` carré arrondi · septième `#B9A6D6` triangle · autre `#BDB6AA` petit cercle · à éviter : pointillé rouge. Texte foncé sur chaque pastille (7,7 à 11,2:1).

## Le manche réaliste
Composant `Fretboard` (SVG) : touche en palissandre avec fibres, sillet en os, **frettes à l'échelle réelle** (position ∝ 1 − 2^(−n/12)), repères nacrés (cases 3-5-7-9, double à 12, latéraux), cordes filées dont l'épaisseur varie, notes en relief, note jouée en direct entourée d'un halo. Miroir automatique pour gaucher. En paysage, l'explorateur passe en **plein écran**.

## Typographie
Inter (texte, titres) et IBM Plex Mono (tempo, cents, durées), **embarquées dans l'appli** (latin uniquement) : tout fonctionne hors ligne. Échelle 13 · 16 · 20 · 28 · 44 · 96 px, multipliée par le réglage « taille du texte » (×0,9 à ×1,5).

## Ergonomie
Barre du bas à 5 onglets avec icônes · accordeur toujours accessible (icône en haut à droite, y compris pendant un exercice) · **mode exercice plein écran** (barre du bas, titre et onglets masqués, « Quitter » toujours en haut à gauche, barre de progression) · choix par cartes et puces à la place des boutons radio · réglages en sections repliables · séance du jour avec le plan visible avant de démarrer · icônes au trait fin à la place des emojis.
