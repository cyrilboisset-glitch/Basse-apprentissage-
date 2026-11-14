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
Phases 1-2 terminées : socle PWA ; audio (détection YIN en AudioWorklet), accordeur, métronome, calibration de latence.
