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
- Minerais : charbon, fer (le fer se récolte dès la pioche en bois, comme dans le vrai jeu).
- **Torches** qui éclairent réellement la zone (lumière bloquée
  par les murs), ciel qui change (aube/jour/crépuscule/nuit), étoiles, **nuages qui dérivent**.

**Rendu**
- Éclairage lisse avec **occlusion ambiante** aux coins (comme le « Smooth Lighting » de MC).
- Brouillard par distance (réglable dans le menu : 2 à 6 chunks).
- **Particules** colorées à la casse d'un bloc.
- **Objet tenu en vue subjective** avec animation de frappe, **vibrations de marche**
  et **FOV élargi en sprint**.
- Surbrillance du bloc visé, portée 6 blocs.
- **Minimap circulaire** en haut à droite : terrain réel autour de toi (profondeur
  assombrie/éclaircie), eau en bleu, **points des mobs** (rouge = hostile,
  blanc = passif) et flèche du joueur — le Nord en haut.

**Survie**
- **Faim** : marcher/sprinter/sauter coûte de l'épuisement ; sprint bloqué sous 9 points;
  mangée de la chair de porc/mouton pour récupérer ; la famine fait perdre de la vie
  (min. 1) ; la régénération mange de la faim (≥ 18 points).
- Barres de vie ❤ et de faim 🍗 au-dessus de la barre rapide, **barre d'XP** verte
  avec niveau.
- **XP** : minerais de charbon/fer, mobs tués.
- Sons par matériau (pierre/bois/verre/terre), **bruits de pas**, plouf dans l'eau,
  grognements de zombie, meuglement des vaches, caquètements, creak des portes,
  **sifflement du creeper**, son de niveau.
- **Musique d'ambiance calme** (arpèges doux, touche **M** pour couper),
  tonalité plus grave la nuit.

**Mobs**
- Cochons et moutons (viande + laine) le jour, **zombies, squelettes (tirent des flèches)
  et creepers (explosion destructrice)** la nuit.
- Les zombies brûlent au soleil, les mobs apparaissent/disparaissent selon la distance.
- **Modèles et textures refaits façon Minecraft** : proportions du vrai jeu, visages
  peints à la main (groin du cochon, camo du creeper, orbites du squelette), zombie
  aux bras tendus, squelette qui tient son arc.
- Les **squelettes lâchent des flèches** à leur mort (comme dans MC).
- **Enderman** (la nuit) : grand et noir aux yeux violets. Ne l'attaque pas
  sans raison — **le regarder directement le met en colère** (comme dans le
  vrai jeu), alors il fonce sur toi. Touché par une flèche, **il se téléporte**
  (particules violettes) sans subir de dégâts ; il ne brûle pas au soleil,
  mais **l'eau lui fait mal**.

**Animaux domestiques & nourriture**
- **Vaches** (la journée) : lâchent du bœuf cru, cuisable en **steak**.
  **Traite** : clic droit avec un **seau** → seau de lait, qui restaure toute la faim
  et rend 4 cœurs (le seau revient vide).
- **Poules** : lâchent des **œufs** — jette-les au clic droit !
- Recettes : porte = 6 planches (2 colonnes), pancarte = 6 planches + bâton,
  seau = 3 lingots de fer en V.

**Portes & pancartes**
- **Portes en bois** : posez-les (elles occupent 2 blocs), clic droit pour
  ouvrir/fermer — le panneau pivote et on peut passer. Recette : 6 planches → 3 portes.
- **Pancartes** : posez-en une, écrivez votre texte (jusqu'à 60 caractères),
  il reste affiché quand vous visez la pancarte. Clic droit pour modifier.

**Combat**
- **Arc** : maintenez le clic droit pour bander l'arc, relâchez pour tirer — les
  dégâts (1 à 9) et la portée dépendent de la charge. Recette : 3 bâtons + 3 laines
  (faute d'araignées, la laine tient lieu de corde).
- **Flèches** : gravier + bâton + laine → 4 flèches (le gravier tient lieu de silex).
  Nécessaires en survie ; parfois récupérables quand elles touchent un bloc.
- Épées en bois et en fer, plastron de fer, recul sur les mobs touchés.

**Inventaire & craft**
- Inventaire 36 slots (touche **E**), barre rapide 9 slots (molette ou touches 1-9).
- **Icônes d'objets refaites** (16×16 peintes) : épées en diagonale avec garde et
  poignée, pioches en arche, lingot trapézoïdal, porc/mouton avec os, charbon
  facetté, bâton en diagonale, flèche et arc détaillés…
- **Infobulle** : survolez un objet (inventaire, coffre, four) → son nom s'affiche
  près du curseur, comme dans Minecraft.
- Craft 2×2 à la main, **table de craft 3×3** (planche ×4).
- Recettes : planches, bâtons, torche, verre, pierre taillée, **table de craft**,
  épée en bois, **pioche en bois et en fer** (indispensables pour la pierre et le fer),
  **four** (8 pierres taillées), arc, flèches.
- **Four** (clic droit pour ouvrir) : cuisez minerai de fer → lingot, sable → verre,
  pierre taillée → pierre, porc/mouton crus → cuits (bien plus nourrissants).
  Combustibles : charbon (8 fontes), bûches et planches (1,5), bâtons (0,5), laine (0,25).
  Jauges de progression et de flamme dans l'interface ; le contenu se répand au sol
  si le four est cassé ou soufflé.
- Les blocs cassés se remettent dans l'inventaire ; le monde sauvegarde vos
  modifications automatiquement (localStorage, par graine).
- **Coffres** : posables (clic droit pour ouvrir), 27 cases, contenu conservé
  dans le monde ; leur butin se repand au sol s'ils sont cassés ou explosés.
- **Lit** : la nuit (ou sous la pluie…), clic droit pour dormir — le temps passe
  au matin et votre **point de réapparition** y est fixé. Recette : 3 laines
  au-dessus de 3 planches.
- **Plastron en fer** : réduit les dégâts subis de 35 %. S'équipe/retire par
  clic droit (recette 8 lingots de fer), indicateur 🛡 au-dessus des barres.
- **Villages** : des petites cabanes (lit, coffre approvisionné, torche,
  fenêtres) apparaissent parfois dans les plaines.
- **Sortie d'eau façon Minecraft** : en nageant contre un bord, vous êtes
  automatiquement propulsé hors de l'eau, même sur un bloc à la même hauteur.

## Menu pause (Échap)

Façon Minecraft 1.14 : le monde reste visible derrière un voile sombre.
- **Revenir au jeu**, **Statistiques** (= écran F3), **Options…** (distance
  d'affichage, musique) et **Sauvegarder et retourner au menu titre**.

## Commandes

| Touche | Action |
|---|---|
| ZQSD / WASD | Se déplacer (détection auto) |
| Souris | Regarder / viser |
| Clic gauche (maintenu) | Miner (barre de progression en survie) |
| Clic droit | Poser un bloc / manger |
| Espace | Sauter (×2 : vol en créatif) |
| R | Sprinter |
| E | Inventaire |
| F | Vol (créatif) |
| 1-9 / molette | Barre rapide |
| M | Musique on/off |
| F3 | Infos de debug (biome, coordonnés, FPS, faim…) |
| Échap | Pause |

## Multijoueur

- Menu principal → **Créer un salon** : un code à 5 caractères est généré
  et s'affiche **en grand dans un lobby**, avec un bouton **Copier le code**.
  **Tu ne rentres dans le monde que quand tu cliques sur « Lancer la partie »** —
  tu as tout ton temps pour partager le code.
- **Rejoindre** avec le code (les invités peuvent même rejoindre le salon
  avant que l'hôte ait lancé la partie). Les mondes sont synchronisés par le broker
  public MQTT (broker.emqx.io, chiffré wss) : blocs, positions, avatars colorés — mode et heure du jour partagés.
- Le multijoueur est **entièrement facultatif** : le bouton « Jouer en solo »
  n'y touche jamais — si le serveur est injoignable, le solo fonctionne
  toujours normalement.
- Le salon ferme la connexion quand l'hôte quitte (pas de serveur à payer).
- **Corrigé (v9b)** : l'invité ne pouvait jamais rejoindre — le rôle hôte/invité
  n'était pas enregistré (les « hello » étaient ignorés) et l'invité générait
  sa propre graine au lieu de celle de l'hôte. Le protocole complet est
  vérifié par des tests (hello → welcome → graine imposée → blocs partagés → bye).

## Technique

- `js/engine.js` — génération de terrain, bruits (2D/3D), biomes, grottes,
  raycast, helper de faces : pur, sans rendu (expose `WebCraftEngine`).
- `js/game.js` — rendu, physique, mobs, faim, XP, sons, UI (expose `WebCraftDebug`).
- `js/three.min.js` — Three.js r128 (vendu, aucune installation).
- Aucune build, aucun serveur : fichiers statiques.

## Textures

L'atlas de textures (16×16) et toutes les icônes d'objets sont **redessinés à la
main dans le style de Minecraft** (herbe bordée, bûches cerclées, briques en
quinconce, minerais mouchetés, fleurs, lit, coffre, four à bouche incandescente,
épées/pioches, viandes, arc, flèches…), de même que les skins des mobs (peints
en 8×8 : camo du creeper, côtes du squelette, groin, laine tissée…). Les textures
et sons officiels de Mojang ne peuvent pas être copiés (droits d'auteur) : tout
a été recréé de zéro pixel par pixel en reprenant les codes visuels emblématiques
(taille des tuiles, motifs, palettes).

## Vérification

Suite de tests sans navigateur : `node /tmp/smoke.js` (harnais VM Node) —
101 contrôles : moteur, grottes, biomes, craft, minage/délais, drops, faim/regen,
explosions, squelettes/flèches, XP, sable, jour/nuit, mobs, particules,
sortie d'eau, lit/dormir, armure, coffres persistants, villages,
four (fabrication, fusion, jauges), infobulle des noms, arc (tir, dégâts,
kill avec butin et XP), flèches des squelettes,
**portes (craft, pose en paire, ouverture/collision), pancartes (texte),
vaches/poules, seau/lait/œufs lançables, sprint sur R, multijoueur complet
(poignée de main hôte/invité, **lobby avec code affiché avant lancement**, graine imposée, blocs partagés),
minimap (couleurs + mise à jour), enderman (spawn, aggro par le regard,
aggro en mélée/fleche → téléportation)**.
