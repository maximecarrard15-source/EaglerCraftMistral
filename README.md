# ⛏️ WebCraft

Un clone de Minecraft façon **Eaglercraft** : un monde voxel infini, généré
procéduralement, qui tourne **entièrement dans le navigateur** — aucun serveur
de jeu, aucune installation. Site 100 % statique, déployable sur Vercel en
quelques secondes.

## Fonctionnalités

- Monde procédural infini (collines, lacs, plages, arbres, montagnes enneigées)
- Casser / poser des blocs avec surbrillance du bloc visé (portée 6)
- 9 blocs dans la barre d'accès rapide : herbe, terre, pierre, planches, bois,
  feuilles, verre, brique, sable
- Physique : gravité, saut, sprint, nage, **mode vol** (touche F)
- Textures générées procéduralement (aucun asset externe)
- Sons (WebAudio), brume, effet sous-marin
- Sauvegarde automatique des constructions dans le navigateur (localStorage),
  par graine de monde
- Compatible AZERTY (ZQSD) et QWERTY (WASD) automatiquement

## Contrôles

| Action | Touche |
|---|---|
| Se déplacer | ZQSD / WASD |
| Sauter | Espace |
| Sprinter | Maj |
| Voler (monter/descendre) | F, puis Espace / Maj |
| Casser un bloc | Clic gauche |
| Poser un bloc | Clic droit |
| Choisir un bloc | Molette ou touches 1–9 |
| Infos de debug | F3 |
| Pause | Échap |

## Déployer sur Vercel

### Méthode 1 — GitHub (recommandée, mises à jour automatiques)
1. Poussez ce dossier dans un dépôt GitHub.
2. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt.
3. Ne changez rien (aucun framework, aucun build) → **Deploy**.
4. Votre site est en ligne sur `https://votre-projet.vercel.app`.

### Méthode 2 — Glisser-déposer
1. Dézippez l'archive.
2. Ouvrez [vercel.com/new](https://vercel.com/new) et glissez le dossier
   complet dans la zone d'import.

### Méthode 3 — Ligne de commande
```bash
npm i -g vercel
cd webcraft
vercel --prod
```

## Tester en local

```bash
cd webcraft
npx serve .
```

Puis ouvrez http://localhost:3000.

## Structure

```
webcraft/
├── index.html      Page unique (menu, HUD, jeu)
├── style.css       Interface façon Minecraft
└── js/
    ├── three.min.js  Three.js r128 (fourni, aucune CDN)
    ├── engine.js     Moteur pur : bruit, terrain, faces, raycast
    └── game.js       Rendu, chunks, physique, contrôles, UI
```
