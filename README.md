# BIV Interface

Un projet basé sur Vue.js 3 et une API Express pour fournir des informations sur les horaires du réseau de transport de Verdun en temps réel.

## Table des matières

- [Aperçu](#aperçu)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Contributions](#contributions)

## Aperçu

Ce projet est une application Web développée en Vue.js 3 pour afficher les horaires de transport en temps réel. Une API Express est utilisée pour récupérer les données nécessaires à partir de différentes sources et les rendre accessibles à l'application front-end.

## Prérequis

Assurez-vous d'avoir les outils suivants installés sur votre système :

- Node.js (avec npm) : [Télécharger et installer Node.js](https://nodejs.org/)
- Vue CLI : Vous pouvez l'installer en exécutant `npm install -g @vue/cli`
- Git : [Télécharger et installer Git](https://git-scm.com/)

## Installation

1. Clonez ce dépôt :
```bash
   git clone https://github.com/Jara03/BIV-Realtime.git
   ```
2. Accédez au répertoire du projet :
 ```bash
   cd BIV-Realtime
   ```
3. Installez les dépendances pour le front-end et le back-end :
```bash
npm install
   ```

# Utilisation

## Démarrer l'API Express :

1. Accédez au dossier de l'API Express : `cd api`
2. Lancez l'API en exécutant `node api.js`

## Démarrer l'Application Vue.js :

À partir du dossier principal du projet, exécutez `npm run serve` pour démarrer l'application Vue.js en mode développement.
Vous pouvez exécuter `npm run build` Pour créer un build de l'application Vue.

## Accéder à l'application :

Ouvrez votre navigateur et accédez à [http://localhost:8080](http://localhost:8080) pour voir l'application en action.

# Contributions

Les contributions sont les bienvenues ! Si vous souhaitez contribuer à ce projet, veuillez suivre ces étapes :

1. Fork le projet
2. Créez une branche pour vos modifications (`git checkout -b feature/NomDeLaNouvelleFonctionnalité`)
3. Commit vos modifications (`git commit -m 'Ajout d'une nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/NomDeLaNouvelleFonctionnalité`)
5. Ouvrez une pull request

