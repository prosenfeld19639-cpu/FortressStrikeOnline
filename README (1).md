# FortressStrike : campagne de 15 missions

## Nouveautés de cette version

- 15 missions solo sur **une grande carte commune**, avec des objectifs et des parcours qui varient. Les missions 1 à 6 sont elles aussi construites autour d'actions et de l'extraction, plutôt que seulement de l'élimination des bots.
- Suis l'étape indiquée et le losange jaune. Appuie sur **E** près de l'objectif et reste à proximité le temps de l'action. Trois objectifs extérieurs précèdent deux objectifs dans le complexe à étages ; utilise son ascenseur avec E. Certaines missions demandent aussi d'éliminer un commandant.
- À la fin, rejoins la zone sud, appelle l'hélicoptère avec E et reste dans la zone pendant 12 secondes pour être extrait. Quitter la zone met le décompte en pause.
- La mini-carte suit le personnage. Appuie sur **M** pour afficher ou fermer la carte complète : attention, la partie continue pendant qu'elle est ouverte. Les points rouges indiquent les ennemis au même étage.
- Les gardes peuvent donner l'alerte s'ils voient le joueur de près ou s'il tire ; l'alerte déclenche des renforts. Les missions sont inspirées du rythme infiltration / objectifs / extraction d'IGI, sans être des reproductions.

Si ton serveur exécute déjà la version Équipement aléatoire, remplace uniquement `index.html` dans le dépôt puis redéploie. Sinon, remplace ensemble `index.html`, `server.js`, `auth.js`, `anticheat.js`, `package.json` et `package-lock.json`. Conserve tes variables Render `DATABASE_URL` et `ADMIN_CODE`. L'archive ne déploie pas le serveur automatiquement.

Les sections historiques ci-dessous décrivent les fonctionnalités conservées ; les détails de missions antérieurs à cette mise à jour sont remplacés par la description ci-dessus.

## Comptes et mode administrateur

Cette version remplace le serveur précédent. Les comptes, les mots de passe hachés, les profils et les bannissements sont stockés dans PostgreSQL ; une connexion est mémorisée dans le navigateur pendant 30 jours. Le code admin reste dans les variables d'environnement du serveur, pas dans le jeu.

## Avant de déployer

Le jeu est configuré pour `https://fortressstrikeonline.onrender.com`. Il faut mettre à jour **le même service Render** ; le nouveau fichier HTML seul ne fonctionnera pas tant que son serveur n'est pas mis à jour.

1. Sur Render, crée une base **Postgres**, si possible dans la même région que ton service. Choisis l'offre qui te convient et vérifie sa durée, ses quotas et son prix.
2. Quand elle est prête, copie son **Internal Database URL** depuis la page de la base. Ne la partage pas : elle contient des identifiants.
3. Ouvre ton service FortressStrike → **Environment** et ajoute :
   - `DATABASE_URL` : colle l'Internal Database URL de PostgreSQL.
   - `ADMIN_CODE` : choisis un code secret long et unique, d'au moins 12 caractères.
4. Dans ton dépôt GitHub, remplace ensemble les fichiers du serveur par ceux de ce dossier : `index.html`, `server.js`, `auth.js`, `package.json` et `package-lock.json`. Ils doivent rester au même niveau. Ne téléverse pas `node_modules`.
5. Vérifie sur Render que le build est `npm ci` et le démarrage `npm start`. Déploie le dernier commit. Si le service n'est pas en déploiement automatique : **Manual Deploy → Deploy latest commit**.
6. Dans les logs, vérifie le message `FortressStrike comptes sur le port ...`. Si la base ou l'une des variables est absente, le serveur affiche une erreur et ne démarre pas.

**Attention :** certains plans PostgreSQL gratuits expirent ou n'incluent pas de sauvegardes. Vérifie les conditions actuelles de Render et prévois une sauvegarde de la base : sa suppression entraîne la perte des comptes, profils et bannissements.

## Comptes et progression

À l'ouverture du jeu, chaque joueur crée un compte ou se connecte. L'identifiant est composé de 3 à 24 lettres, chiffres, tirets ou underscores ; le mot de passe doit contenir au moins 8 caractères. Il n'y a pas encore de récupération de mot de passe : conserve-le précieusement.

La session est mémorisée dans le navigateur. La progression est enregistrée localement puis synchronisée sur le serveur : l'indicateur en haut signale si elle est en attente. La synchronisation permet de la récupérer sur un autre navigateur avec le même compte. Une connexion internet est nécessaire pour jouer et synchroniser.

Lors de la création du **premier compte associé à ce navigateur**, la progression locale déjà présente sur la même adresse du jeu est importée automatiquement. Un fichier local et le site Render peuvent avoir des stockages différents : une sauvegarde présente uniquement dans l'un ne sera pas forcément visible dans l'autre. Un autre compte déjà associé au navigateur n'est pas automatiquement copié. Les sauvegardes cloud existantes sont conservées à la connexion. Si un joueur joue simultanément sur deux appareils, la dernière sauvegarde reçue gagne.

Le jeu précédent n'avait pas de comptes serveur : les joueurs doivent donc en créer un. Le changement ne supprime pas, à lui seul, la sauvegarde locale du navigateur.

## Mode admin

1. Connecte-toi à ton compte.
2. Clique sur **ADMIN** en haut à droite et saisis le `ADMIN_CODE` configuré sur Render.
3. **DÉBLOQUER TOUTES LES ARMES** déverrouille toutes les armes sur ton compte et donne accès aux agents nécessaires pour les équiper.
4. La liste permet de bannir ou débannir un compte. Un compte banni est immédiatement déconnecté et ne peut plus se connecter tant qu'il n'est pas débanni.

Le code est vérifié côté serveur. Ne le partage pas. Pour le changer, modifie `ADMIN_CODE` sur Render et redéploie/redémarre le service. Ne le place jamais dans un fichier du dépôt.

## Limites

- Les comptes et bannissements sont persistants tant que PostgreSQL est disponible et conservé ; la file et les salons restent en mémoire et sont perdus à chaque redémarrage du serveur. Utilise une seule instance de serveur.
- Le jeu et ses données de profil restent en partie contrôlés par le navigateur : ce prototype n'est pas un système anti-triche et un joueur expérimenté peut modifier ses données locales ou ses requêtes. Les droits de bannissement restent vérifiés côté serveur.
- Il n'y a ni récupération de mot de passe, ni double authentification, ni service de modération complet. Évite de réutiliser un mot de passe important.
- `account-ui.js` est une copie lisible du script déjà intégré dans `index.html` ; le serveur ne le charge pas séparément.
- Le matchmaking reste de 40 secondes, avec deux joueurs minimum ; les salons privés restent disponibles.

## Mise à jour : inscription et déconnexions

La création et la connexion aux comptes ne provoquent plus de boucle d’actualisation : le jeu attend le chargement du compte et de la progression avant de démarrer. Le filtrage des domaines d’e-mails temporaires a été supprimé. Une adresse e-mail syntaxiquement valide reste demandée à la création du compte.

Cette version **n'envoie pas de message de confirmation** et ne vérifie donc pas que le joueur possède l'adresse fournie. Un joueur peut saisir une adresse qui ne lui appartient pas. Pour une vraie vérification, il faudra ajouter un service d'envoi de mails et un lien de confirmation. Les adresses sont enregistrées en base ; informe les joueurs de cette collecte et respecte les règles de confidentialité applicables. Aucune récupération de mot de passe par e-mail n'est encore proposée.

Les connexions sont contrôlées plus fréquemment et à la fin du décompte. Fermer normalement l'onglet retire le joueur de la file ; en cas de réseau coupé sans fermeture propre, la détection peut prendre quelques secondes. Le serveur n'inclut pas dans le match les connexions qui ne répondent plus au contrôle final.

Pour passer de la version comptes précédente à cette version, remplace ensemble `index.html`, `server.js`, `auth.js`, `package.json` et `package-lock.json`, puis redéploie. Les comptes et les profils de la base existante sont conservés ; la colonne e-mail est ajoutée automatiquement au démarrage. Vérifie que le rôle PostgreSQL a le droit de modifier les tables.

## Crédits illimités en mode admin

Après activation du code ADMIN, le solde affiche ∞ et les achats et améliorations ne déduisent pas de crédits. Le solde normal est préservé. Fermer la fenêtre admin ne désactive pas le mode ; utilise DÉSACTIVER ADMIN ou recharge la page pour revenir au solde normal. Il faut réactiver le code après un rechargement. Les achats réalisés restent enregistrés.

## Missions tactiques et protection légère

Les missions 7 à 9 comportent une suite d'objectifs extérieurs et d'étage distincts. Appuie sur E puis reste à proximité pendant l'action. À la fin, appelle l'hélicoptère et défends le point d'extraction pendant 12 secondes ; si tu quittes la zone, le compte à rebours s'arrête. En mission 9, le commandant doit être éliminé avant l'appel. Les missions et l'hélicoptère sont originaux et seulement inspirés du rythme infiltration / objectifs / extraction de jeux tactiques.

L'anti-triche léger s'applique aux parties multijoueur **hébergées sur ce serveur** : il rejette certaines positions impossibles, contrôle les messages de dégâts et les victimes déclarées, et limite les dégâts et le débit des messages de tir. Il ne bannit pas automatiquement. Ces contrôles ne rendent pas le jeu inviolable : les tirs et les profils restent en grande partie contrôlés par le client, et une connexion instable peut provoquer un avertissement. Le mode LAN / WebRTC direct ne passe pas par ces vérifications.

Lors de la mise à jour du dépôt, téléverse également **anticheat.js**, en plus de `index.html`, `server.js`, `auth.js`, `package.json` et `package-lock.json`. Redéploie le serveur. Pour tester la logique sans lancer le jeu : `node test-logic.cjs`.

## Équipement aléatoire multijoueur

Au démarrage de chaque match public ou privé, chaque joueur reçoit une arme tirée parmi les armes de campagne et six modèles exclusifs au multijoueur, ainsi qu'un bandage, un kit médical ou une potion de bouclier tiré au hasard. Il ne dispose que d'une arme à feu ; le couteau reste accessible avec 3 ou V. Touche 4 pour utiliser le consommable. L'arme et le même consommable sont restitués à chaque réapparition ; le tirage change au match suivant.

L'arme reçoit le meilleur niveau d'amélioration acheté parmi toutes les armes de sa catégorie (PM, fusil, fusil à pompe, sniper, mitrailleuse ou pistolet). Les améliorations restent liées à la catégorie, même si l'arme tirée est exclusive au multijoueur. La campagne conserve son équipement habituel et les armes exclusives n'apparaissent pas dans son armurerie.

Si ton serveur exécute déjà la version Missions tactiques, seul `index.html` doit être remplacé. Sinon, déploie tous les fichiers du dossier, y compris `anticheat.js`, `auth.js` et `server.js`. Test de la logique : `node test-loadout.cjs`.
