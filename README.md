# WebCraft ⛏️

Un clone de Minecraft en mode **survie** qui tourne entièrement dans votre navigateur.
Aucun serveur, aucune installation : ouvrez `index.html` ou déployez le dossier tel quel.

## Fonctionnalités

- 🌍 Monde infini procédural (collines, plages, neige, arbres, lacs) avec minerais de charbon et de fer
- 🌅 Cycle jour/nuit complet : soleil, lune, étoiles, aube et crépuscule orangés
- ❤️ Mode survie : vie, dégâts de chute, régénération, mort et réapparition
- 🐄 Animaux (cochons, moutons) le jour · 🧟 zombies la nuit (ils brûlent au lever du soleil)
- ⚔️ Combat : épées en bois et en fer, attaque au clic gauche
- 🎒 Inventaire complet (36 emplacements) avec molette, chiffres 1-9 et pile au curseur
- 🛠️ Craft : 2×2 dans l'inventaire (touche E), 3×3 sur un établi
- 🔥 Torches qui éclairent vraiment la nuit
- 💧 Eau dynamique qui coule quand vous creusez
- 🍖 Nourriture : mangez du porc ou du mouton pour vous soigner
- 🖼️ Écran F3 détaillé (FPS, position, bloc visé, heure, mobs, édits…)
- 💾 Monde sauvegardé automatiquement dans le navigateur (localStorage)

## Boucle de jeu

1. Cassez des arbres à la main → bûches
2. Craft : 1 bûche → 4 planches, 2 planches → 4 bâtons
3. 4 planches en carré → établi → posez-le et clic droit pour le craft 3×3
4. Minez du charbon → torches (charbon + bâton)
5. Le soir, les zombies arrivent : fabriquez une épée et abritez-vous !
6. Tuez cochons/moutons pour manger et récupérer de la laine

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD | Se déplacer |
| Espace | Sauter / nager |
| Maj | Sprinter |
| Clic gauche | Casser un bloc / attaquer |
| Clic droit | Poser un bloc / manger / ouvrir un établi |
| Molette / 1-9 | Changer d'objet |
| E | Inventaire (craft 2×2) |
| F | Voler (créatif) |
| F3 | Infos de debug |
| Échap | Pause |

## Déployer sur Vercel

1. `npm i -g vercel` (ou via le site vercel.com)
2. Dans ce dossier : `vercel --prod`
3. Ou importez le dossier/zip dans Vercel : framework **Other**, aucun réglage nécessaire (site 100 % statique)

## Technique

- Three.js r128 inclus localement (`js/three.min.js`), aucun CDN
- `js/engine.js` : logique pure (bruit, terrain, raycast) — testable sous Node
- `js/game.js` : rendu, physique, survie, inventaire, mobs, eau, ciel
- Atlas de textures généré procéduralement au démarrage (aucune image)
