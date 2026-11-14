# BassLab

Appli PWA (français) pour apprendre l'improvisation à la basse. Sans compte, sans serveur, données en local.

## Lancer
```
npm install
npm run dev      # développement
npm test         # tests Vitest
npm run build    # production (dist/)
```

## Déploiement GitHub Pages
Activer *Settings → Pages → Source : GitHub Actions*. Le workflow `.github/workflows/deploy.yml` déploie à chaque push sur `main`.
URL : `https://<utilisateur>.github.io/Basse-apprentissage-/`

## Installer sur Android
Ouvrir l'URL dans Chrome → menu ⋮ → « Installer l'application ».

## État
Phase 1 (socle) terminée : PWA, stockage IndexedDB, navigation, thème, réglages, export/import.
