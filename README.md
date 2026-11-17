# WebCraft ⛏️

Un clone de Minecraft qui tourne entièrement dans votre navigateur.
Aucun serveur, aucune installation : ouvrez `index.html` ou déployez le dossier tel quel.

## Fonctionnalités

- 🌍 Monde infini procédural (collines, plages, neige, arbres, lacs) avec minerais de charbon et de fer
- 🎮 **Deux modes de jeu** :
  - **Survie** : vie, délai de minage selon la dureté du bloc, dégâts de chute, régénération, mort et réapparition
  - **Créatif** : blocs infinis, casse instantanée, aucun dégât, vol (touche F)
- ⏱️ Minage réaliste : maintenez le clic gauche, une barre de progression s'affiche (les feuilles cassent vite, la pierre plus lentement, le minerai de fer encore plus)
- 🐖 Animaux (cochons, moutons) le jour · 🧟 zombies la nuit (ils brûlent au lever du soleil)
- ⚔️ Combat : épées en bois et en fer, attaque au clic gauche
- 🎒 Inventaire complet (36 emplacements) avec molette, chiffres 1-9 et pile au curseur
- 🛠️ Craft : 2×2 dans l'inventaire (touche E), 3×3 sur un établi
- 🔥 Torches qui éclairent vraiment la nuit
- 💧 Eau dynamique qui coule quand vous creusez
- 🍖 Nourriture : mangez du porc ou du mouton pour vous soigner
- 🖥️ Écran F3 détaillé (FPS, position, bloc visé, heure, mobs, mode, salon…)
- 💾 Monde sauvegardé automatiquement dans le navigateur (localStorage)
- 🌐 **Multijoueur** jusqu'à ~10 joueurs par salon (voir ci-dessous)

## Multijoueur

Le multijoueur passe par un relais MQTT public (`wss://broker.emqx.io`), donc **une connexion internet est requise** — mais aucun serveur à installer.

1. Le premier joueur choisit **Héberger** : un code de salon à 5 caractères est généré. Son monde (seed + modifications) fait autorité.
2. Il partage le code avec ses amis.
3. Les autres joueurs entrent leur pseudo et le code, puis cliquent **Rejoindre**.
4. Tout est synchronisé : blocs posés/cassés, position des joueurs, mobs, heure du jour, chat (touche **T**).

Notes :
- L'hébergeur gère la simulation (eau, zombies, apparition des mobs) ; les invités reçoivent le résultat.
- Les invités ne sauvegardent pas le monde localement.
- Si l'hébergeur quitte, le salon se ferme.

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
| Clic gauche | Casser un bloc (maintenir en survie) / attaquer |
| Clic droit | Poser un bloc / manger / ouvrir un établi |
| Molette / 1-9 | Changer d'objet |
| E | Inventaire (craft 2×2) |
| T | Chat (en multijoueur) |
| F | Voler (créatif) |
| F3 | Infos de debug |
| Échap | Pause |

## Déployer sur Vercel

1. `npm i -g vercel` (ou via le site vercel.com)
2. Dans ce dossier : `vercel --prod`
3. Ou importez le dossier/zip dans Vercel : framework **Other**, aucun réglage nécessaire (site 100 % statique)

## Technique

- Three.js r128 et MQTT.js 4.3.7 inclus localement (`js/`), aucun CDN
- `js/engine.js` : logique pure (bruit, terrain, raycast) — testable sous Node
- `js/game.js` : rendu, physique, modes, minage, inventaire, mobs, eau, ciel, réseau
- Multijoueur : salons héberge-autoritaires via MQTT over WSS, messages JSON (`hello`/`welcome`/`pos`/`blocks`/`mobs`/`time`/`chat`/`hurt`/`give`/`bye`)
- Atlas de textures généré procéduralement au démarrage (aucune image)
