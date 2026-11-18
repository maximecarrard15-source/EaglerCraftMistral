# WebCraft — un clone de Minecraft dans le navigateur

Jeu voxel type **Minecraft 1.14** (inspiré d'Eaglercraft), 100 % fait main en JavaScript,
aucune dépendance à installer : Three.js r128 est vendu dans le dépôt. C'est un site
100 % statique — déployable tel quel sur Vercel (ou Netlify, GitHub Pages…).

## Jouer en ligne

1. Télécharge le zip du dépôt (Code → Download ZIP) ou `git clone`.
2. Sur [vercel.com](https://vercel.com) : Import Project → glisse le dossier
   (ou `vercel deploy`). Aucune configuration : `index.html` à la racine, c'est tout.
3. Chaque push redéploie automatiquement le site.

Lancer en local : double-cliquez `index.html` ou `npx serve .`

## Mode de jeu

- **Survie** : délai de minage selon le bloc et l'outil, vie, faim/exhaustion,
  dégâts de chute, mobs hostiles la nuit, XP.
- **Créatif** : minage instantané, vol (double Espace ou F), inventaire prérempli,
  pas de dégâts.

## Contenu (fidélité MC 1.14)

**Monde**
- Génération procédurale par graine (champ « Graine »), collines, plages,
  océans avec eau animée qui coule, étage de bedrock irrégulier.
- **Grottes** creusées par double bruit 3D (densité proche du vrai MC).
- **4 biomes** : plaines, forêt (arbres denses), désert (sans arbres),
  neige — herbes hautes et fleurs (coquelicot, pissenlit) en croix dans les plaines/forêts.
- Sable et gravier **tombent** s'ils ne sont pas soutenus.
- Minerais : charbon, fer (le fer exige une pioche en fer pour être récupéré).
- **Torches** qui éclairent réellement la zone (lumière bloquée
  par les murs), ciel qui change (aube/jour/crépuscule/nuit), étoiles, **nuages qui dérivent**.

**Rendu**
- Éclairage lisse avec **occlusion ambiante** aux coins (comme le « Smooth Lighting » de MC).
- Brouillard par distance (réglable dans le menu : 2 à 6 chunks).
- **Particules** colorées à la casse d'un bloc.
- **Objet tenu en vue subjective** avec animation de frappe, **vibrations de marche**
  et **FOV élargi en sprint**.
- Surbrillance du bloc visé, portée 6 blocs.

**Survie**
- **Faim** : marcher/sprinter/sauter coûte de l'épuisement ; sprint bloqué sous 9 points;
  mangée de la chair de porc/mouton pour récupérer ; la famine fait perdre de la vie
  (min. 1) ; la régénération mange de la faim (≥ 18 points).
- Barres de vie ❤ et de faim 🍗 au-dessus de la barre rapide, **barre d'XP** verte
  avec niveau.
- **XP** : minerais de charbon/fer, mobs tués.
- Sons par matériau (pierre/bois/verre/terre), **bruits de pas**, plouf dans l'eau,
  grognements de zombie, **sifflement du creeper**, son de niveau.

**Mobs**
- Cochons et moutons (viande + laine) le jour, **zombies, squelettes (tirent des flèches)
  et creepers (explosion destructrice)** la nuit.
- Les zombies brûlent au soleil, les mobs apparaissent/disparaissent selon la distance.

**Inventaire & craft**
- Inventaire 36 slots (touche **E**), barre rapide 9 slots (molette ou touches 1-9).
- Craft 2×2 à la main, **table de craft 3×3** (planche ×4).
- Recettes : planches, bâtons, torche, verre, pierre taillée, **table de craft**,
  épée en bois, **pioche en bois et en fer** (indispensables pour la pierre et le fer).
- Les blocs cassés se remettent dans l'inventaire ; le monde sauvegarde vos
  modifications automatiquement (localStorage, par graine).

## Commandes

| Touche | Action |
|---|---|
| ZQSD / WASD | Se déplacer (détection auto) |
| Souris | Regarder / viser |
| Clic gauche (maintenu) | Miner (barre de progression en survie) |
| Clic droit | Poser un bloc / manger |
| Espace | Sauter (×2 : vol en créatif) |
| Maj | Sprinter |
| E | Inventaire |
| F | Vol (créatif) |
| 1-9 / molette | Barre rapide |
| F3 | Infos de debug (biome, coordonnés, FPS, faim…) |
| Échap | Pause |

## Technique

- `js/engine.js` — génération de terrain, bruits (2D/3D), biomes, grottes,
  raycast, helper de faces : pur, sans rendu (expose `WebCraftEngine`).
- `js/game.js` — rendu, physique, mobs, faim, XP, sons, UI (expose `WebCraftDebug`).
- `js/three.min.js` — Three.js r128 (vendu, aucune installation).
- Aucune build, aucun serveur : fichiers statiques.

## Vérification

Suite de tests sans navigateur : `node /tmp/smoke.js` (harnais à reconstituer via
VM Node) — 42 contrôles : moteur, grottes, biomes, craft, minage/délais, drops,
faim/regen, explosions, squelettes/flèches, XP, sable, jour/nuit, mobs, particules.
