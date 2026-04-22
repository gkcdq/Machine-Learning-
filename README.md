### 🤖 RLP: Reinforcement Learning & Pathfinding

RLP is an experimental visualization platform for Reinforcement Learning integrated into an interactive grid environment. The goal is to train an agent to collect items and reach an exit optimally using modern AI algorithms.

### 🚀 Features

- Dynamic Map Editor: Draw `walls`, place `collectibles`, and define `start` / `exit` points in real-time.

- Double Heatmap Visualization:

- __Green__ (Q-Values): Visualizes the AI's "instinct" (what it "thinks" is the best path).

- __Red__ (Frequency): Visualizes experience (the most explored areas).

- Reinforcement Learning Engine: Full implementation of Double Q-Learning with experience replay memory.

- Hybrid Pathfinding: Uses BFS (Breadth-First Search) for distance calculation and reward optimization.

### 🧠 Learning Concepts (RL)

The agent learns through trial and error. It receives rewards (positive or negative) based on its actions.
1. Double Q-Learning

- To prevent the overestimation of reward values, the project uses two Q-tables (qTableA and qTableB).

- The agent chooses an action with one table.

- It updates the value using the second table to evaluate the next state.

Formula used:
```bash
Qtarget ​= R + γ ⋅ Qeval​(s′ ,argmax Qupdate​(s′ ,a′))
```
2. Experience Replay (Memory)

The project stores past transitions in a replayBuffer. At each step, the AI "replays" a sample of 64 past transitions to stabilize its learning and prevent forgetting older paths.
3. Reward Shaping (Reward Modeling)

The reward system is finely tuned to guide the agent:

    Collection: +300

    Exit (if ready): +1000

    Wall Collision: −15

    Stagnation / Back-and-forth: Progressive penalties to force exploration.

### 🛤️ Pathfinding & Optimization

The AI does not simply walk at random; it utilizes graph theory algorithms to assist itself:

    BFS (Breadth-First Search): Used to pre-calculate real distances between all points of interest (Start, Collectibles, Exit) by ignoring walls.

    Nearest-Neighbor TSP: The AI calculates an optimal collection order before starting to structure its learning phases.

    Map Validation: An algorithm verifies that the exit and collectibles are not isolated by walls before launching the simulation.

### 🛠️ Technical Stack

    Frontend: React.js, TypeScript.

    Styling: CSS-in-JS with dynamic CSS variables for the heatmap.

    Build Tool: Vite.

    Environment: Docker & Nginx.

### 📖 Installation

    Clone the repository:
    Bash

    git clone https://github.com/your-username/rlp.git

    Launch with Docker:
    Bash

    docker-compose up --build

    Access: Go to http://localhost:5173.

### 🕹️ How to use?

    Draw walls (Wall tool █).

    Place items (◈) and an exit (⬡).

    Define the start (◉).

    Press START: Watch the AI explore (Exploration phase with Epsilon-Greedy) then optimize its path as cells turn green.

_Project developed as part of a study on autonomous agents and reinforcement learning decision-making._