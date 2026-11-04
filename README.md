# FortressStrike — serveur multijoueur

Cette version conserve les missions solo et ajoute un matchmaking public au mode match à mort existant. Le serveur sert le jeu et relaie les messages en WebSocket ; il ne dépend pas d'ExpressTurn pour le matchmaking ou pour les parties hébergées ici.

## Mise en ligne (par exemple sur Render)

1. Créer un dépôt Git privé ou public avec **le contenu de ce dossier** : `index.html`, `server.js`, `package.json` et `package-lock.json`.
2. Sur un hébergeur compatible Node.js et WebSocket, créer un service Web depuis ce dépôt. Sur Render : **New → Web Service**, connecter le dépôt et choisir le type **Node**.
3. Commande de build : `npm ci` ; commande de démarrage : `npm start`. Utiliser Node.js 18 ou plus récent.
4. Déployer, puis partager **l'adresse HTTPS du service** à tous les joueurs. Tout le monde doit ouvrir le jeu depuis cette même adresse, pas depuis une copie locale du fichier HTML.
5. Ouvrir **MULTIJOUEUR → CHERCHER UNE PARTIE**. Le décompte de 40 secondes commence avec le premier joueur dans la file. Tous les joueurs qui ont rejoint la file avant la fin sont placés dans le même match. S'il ne reste qu'un joueur, aucune partie ne démarre et un nouveau cycle de recherche commence. Chaque joueur doit cliquer dans l'arène pour activer sa souris.

Les offres gratuites peuvent mettre le service en veille, limiter les connexions, le temps d'exécution ou le nombre de joueurs. Vérifier les conditions et le support WebSocket de l'hébergeur choisi. Aucun hébergement n'est créé automatiquement par ces fichiers.

## Partie privée

Dans **MULTIJOUEUR**, cliquer sur **CRÉER UN SALON PRIVÉ**, puis partager le code affiché. Les invités le saisissent dans le champ du salon et cliquent sur **CRÉER / REJOINDRE**. Le salon privé n'apparaît pas dans la liste publique. Chaque joueur lance ou rejoint la partie depuis le salon.

Le code est un lien d'accès secret, pas un système d'authentification : toute personne qui le possède peut rejoindre le salon. Ne le publie pas si tu veux une partie privée.

## Essai sur son ordinateur

Installer Node.js 18+, puis :

```sh
npm ci
npm start
```

Ouvrir `http://localhost:3000` dans deux fenêtres de navigateur et chercher une partie sur les deux. `PORT` est fourni automatiquement par la plupart des hébergeurs ; à défaut, le port est 3000.

## Tests du serveur

Pour accélérer uniquement le test automatisé, lancer le serveur avec `MM_SECONDS=0.4 PORT=3101 node server.js`, puis, dans un autre terminal :

```sh
node test-matchmaking.cjs
```

Le test contrôle le cas d'un joueur seul, le lancement à deux, l'isolation du match, le salon privé non listé et l'annulation. En utilisation normale, ne pas définir `MM_SECONDS` : l'attente est de 40 secondes.

## Limites

- Le matchmaking et les salons sont en mémoire : un redémarrage ou une mise en veille du serveur déconnecte les joueurs et vide la file.
- Utiliser une seule instance serveur : plusieurs instances indépendantes auraient chacune leur propre file.
- Les données de jeu transitent par le serveur WebSocket. ExpressTurn reste utilisable avec l'ancien mode LAN/WebRTC, mais n'est pas nécessaire pour le mode serveur.
- Ce prototype ne fournit ni comptes, ni authentification forte, ni protection anti-triche ; ne pas partager de mots de passe ou de données sensibles.
