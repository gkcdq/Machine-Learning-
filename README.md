### 🤖 RLP : Reinforcement Learning & Pathfinding

RLP est une plateforme expérimentale de visualisation d'apprentissage par renforcement (Reinforcement Learning) intégrée dans un environnement de grille interactive. L'objectif est d'entraîner un agent à collecter des items et à atteindre une sortie de manière optimale en utilisant des algorithmes d'IA moderne.

### 🚀 Fonctionnalités

    Éditeur de Map Dynamique : Dessinez des murs, placez des collectibles et définissez les points de départ/arrivée en temps réel.

    Visualisation "Heatmap" Double :

        Vert (Q-Values) : Visualise l'instinct de l'IA (ce qu'elle "pense" être le meilleur chemin).

        Rouge (Fréquence) : Visualise l'expérience (les zones les plus explorées).

    Moteur d'Apprentissage par Renforcement : Implémentation complète du Double Q-Learning avec mémoire d'expérience.

    Pathfinding Hybride : Utilisation du BFS pour le calcul de distance et l'optimisation des récompenses.

### 🧠 Concepts d'Apprentissage (RL)

L'agent apprend par essais et erreurs. Il reçoit des récompenses (positives ou négatives) en fonction de ses actions.
#### 1. Double Q-Learning

Pour éviter la surestimation des valeurs de récompense, le projet utilise deux tables Q (qTableA et qTableB).

- L'agent choisit une action avec une table.

- Il met à jour la valeur en utilisant la seconde table pour évaluer le prochain état.

#### Formule utilisée :
```bash
Qtarget​ = R + γ ⋅ Qeval​(s', argmax Qupdate​(s′, a′))
```

2. Experience Replay (Mémoire)

Le projet stocke les transitions passées dans un replayBuffer. À chaque étape, l'IA "rejoue" un échantillon de 64 transitions passées pour stabiliser son apprentissage et ne pas oublier les anciens chemins.
3. Reward Shaping (Modélisation des récompenses)

Le système de récompense est finement réglé pour guider l'agent :

    Collecte : +300

    Sortie (si prêt) : +1000

    Collision Mur : −15

    Stagnation/Aller-retour : Pénalités progressives pour forcer l'exploration.

### 🛤️ Pathfinding & Optimisation

L'IA ne se contente pas de marcher au hasard ; elle utilise des algorithmes de théorie des graphes pour s'aider :

    BFS (Breadth-First Search) : Utilisé pour pré-calculer les distances réelles entre tous les points d'intérêt (Start, Collectibles, Exit) en ignorant les murs.

    Nearest-Neighbor TSP : L'IA calcule un ordre de collecte optimal avant de démarrer pour structurer ses phases d'apprentissage.

    Validation de Map : Un algorithme vérifie que la sortie et les collectibles ne sont pas isolés par des murs avant de lancer la simulation.

### 🛠️ Stack Technique

    Frontend : React.js, TypeScript.

    Styling : CSS-in-JS avec variables CSS dynamiques pour la heatmap.

    Build Tool : Vite.

    Environnement : Docker & Nginx.

### 📖 Installation

    Cloner le dépôt :

    ```Bash

    git clone https://github.com/ton-pseudo/rlp.git
    ```
    Lancer avec Docker :

    ```Bash

    docker-compose up --build
    ```

    Accès : Rendez-vous sur http://localhost:5173.

### 🕹️ Comment utiliser ?

- Dessinez des murs (outil Mur █).

- Placez des items (◈) et une sortie (⬡).

- Définissez le départ (◉).

- Appuyez sur START : Observez l'IA explorer (Phase exploratoire avec Epsilon-Greedy) puis optimiser son chemin à mesure que les cases deviennent vertes.

_Projet réalisé dans le cadre d'une étude sur les agents autonomes et la prise de décision par renforcement._