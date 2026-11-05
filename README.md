# FortressStrike : comptes et mode administrateur

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

## Mise à jour V2 : e-mail et déconnexions

Les nouvelles inscriptions demandent une adresse e-mail. Une liste locale refuse les domaines temporaires connus, notamment `drtall.com` : l'inscription est refusée avant la création du compte. Les comptes déjà créés sans e-mail ne sont pas automatiquement bannis : aucune adresse n'est disponible pour les contrôler.

Cette version **n'envoie pas de message de confirmation** et ne vérifie donc pas que le joueur possède l'adresse fournie. Un joueur peut saisir une autre adresse ; la liste ne couvre pas non plus tous les domaines jetables. Pour une vraie vérification, il faudra ajouter un service d'envoi de mails et un lien de confirmation. Les adresses sont enregistrées en base ; informe les joueurs de cette collecte et respecte les règles de confidentialité applicables. Aucune récupération de mot de passe par e-mail n'est encore proposée.

Les connexions sont contrôlées plus fréquemment et à la fin du décompte. Fermer normalement l'onglet retire le joueur de la file ; en cas de réseau coupé sans fermeture propre, la détection peut prendre quelques secondes. Le serveur n'inclut pas dans le match les connexions qui ne répondent plus au contrôle final.

Pour passer de la version comptes précédente à cette version, remplace ensemble `index.html`, `server.js`, `auth.js`, `package.json` et `package-lock.json`, puis redéploie. Les comptes et les profils de la base existante sont conservés ; la colonne e-mail est ajoutée automatiquement au démarrage. Vérifie que le rôle PostgreSQL a le droit de modifier les tables.
