import {start, exit, collectibles, walls } from "utils";

// frontend/src/IA/deplacerRobot.ts

export const deplacerRobot = (gridRef: any) => {
  if (gridRef.current) {
    console.log("Début du mouvement...");

    // On attend 100ms que la grille soit bien initialisée
    setTimeout(() => {
      // Maintenant on force le mouvement
      gridRef.current.moveAgent(3, 3); 
      console.log("Le robot devrait être en 3,3 maintenant");
    }, 100);

    setTimeout(() => {
      console.log("2 secondes plus tard...");
    }, 2000);
  }
};