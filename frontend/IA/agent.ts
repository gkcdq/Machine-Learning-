import React from "react";
import { GridHandle } from "../map/grid";
import { parseMap } from "./utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapData {
  start: [number, number] | null;
  exit: [number, number] | null;
  collectibles: [number, number][];
  walls: [number, number][];
  rows: number;
  cols: number;
  iaposeX: number;
  iaposeY: number;
  qTable?: Record<string, number[]>;
}

// ─── Configuration Q-Learning ─────────────────────────────────────────────────

const ALPHA         = 0.1;  // Taux d'apprentissage
const GAMMA         = 0.9;  // Importance des récompenses futures
const EPSILON_START = 0.3;  // Exploration initiale
const EPSILON_MIN   = 0.08; // Plancher — évite de figer sur un cycle
const HISTORY_SIZE  = 16;   // Fenêtre anti-cycle (positions récentes)

// ─── État Global ──────────────────────────────────────────────────────────────

export let qTable: Record<string, number[]> = {};
let currentX = 0;
let currentY = 0;
let moveInterval: ReturnType<typeof setInterval> | null = null;
let count = 0;
let posHistory: string[]              = [];
let visitFreq: Record<string, number> = {}; // fréquence dans l'épisode courant

// ─── Q-Table helpers ──────────────────────────────────────────────────────────

/**
 * Clé = position + set des collectibles déjà ramassés (trié, sans limite de bits).
 * Remplace le bitmask qui cassait au-delà de 30 collectibles.
 */
function getQKey(r: number, c: number, picked: Set<string>): string {
  return `${r},${c}|${[...picked].sort().join(";")}`;
}

function getQValues(r: number, c: number, picked: Set<string>): number[] {
  const key = getQKey(r, c, picked);
  if (!qTable[key]) qTable[key] = [0, 0, 0, 0];
  return qTable[key];
}

// ─── Backend & Persistance ────────────────────────────────────────────────────

export async function saveSessionToDB(data: MapData): Promise<number | null> {
  try {
    const res = await fetch("/api/ia/session/save/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: data.rows,
        cols: data.cols,
        collectibles: data.collectibles.map(([r, c]) => [c, r]),
        q_table: qTable,
      }),
    });
    const json = await res.json();
    if (json.status === "ok") return json.session_id;
    return null;
  } catch {
    return null;
  }
}

export async function loadLastSession(): Promise<{ sessionId: number; collectibles: [number, number][] } | null> {
  try {
    const res  = await fetch("/api/ia/session/last/");
    const json = await res.json();
    if (json.status !== "ok") return null;
    const collectibles: [number, number][] = json.collectibles.map(
      (c: { x: number; y: number }) => [c.y, c.x] as [number, number]
    );
    return { sessionId: json.session_id, collectibles };
  } catch {
    return null;
  }
}

// ─── Logique de Déplacement & Entraînement ────────────────────────────────────

export function startMovement(
  gridRef: React.RefObject<GridHandle>,
  maxRows: number,
  maxCols: number,
  startX: number,
  startY: number
) {
  if (moveInterval) clearInterval(moveInterval);

  const initialMap = gridRef.current!.getMap();
  const collectiblesList: string[] = [];
  initialMap.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === "collectible") collectiblesList.push(`${r},${c}`);
    })
  );

  const totalCollectibles = collectiblesList.length;

  // Init état épisode
  currentX = startX;
  currentY = startY;
  let picked        = new Set<string>(); // collectibles ramassés dans cet épisode
  let currentEpsilon = EPSILON_START;
  let lastX = startX;
  let lastY = startY;
  posHistory = [];
  visitFreq  = {};

  moveInterval = setInterval(() => {
    if (!gridRef.current) return;
    const map = gridRef.current.getMap();

    // ── 1. Choix de l'action (Epsilon-Greedy) ─────────────────────────────────
    const qValues = getQValues(currentX, currentY, picked);
    const action  = Math.random() < currentEpsilon
      ? Math.floor(Math.random() * 4)
      : qValues.indexOf(Math.max(...qValues));

    let nr = currentX, nc = currentY;
    if (action === 0) nr--;
    if (action === 1) nr++;
    if (action === 2) nc--;
    if (action === 3) nc++;

    // ── 2. Calcul de la récompense ─────────────────────────────────────────────
    let reward = -1; // malus de temps → pousse vers le chemin court
    const targetCell = map[nr]?.[nc];
    const nextPicked = new Set(picked);

    if (!targetCell || targetCell === "wall") {
      reward = -25;
      nr = currentX;
      nc = currentY;

    } else if (targetCell === "collectible") {
      const cellKey = `${nr},${nc}`;
      if (!picked.has(cellKey)) {
        reward = 350;
        nextPicked.add(cellKey);
        gridRef.current!.consumeCell(nr, nc); // disparaît visuellement
      }

    } else if (targetCell === "exit") {
      if (picked.size === totalCollectibles) {
        reward = 1000; // victoire — reset géré en bas
      } else {
        reward = -200; // sortie interdite sans tous les collectibles
      }
    }

    // ── Reward shaping : bonus/malus selon rapprochement vers le prochain objectif
    if (nr !== currentX || nc !== currentY) { // seulement si mouvement réel
      let targetR: number, targetC: number;

      if (picked.size < totalCollectibles) {
        // Prochain objectif = collectible non ramassé le plus proche
        let bestDist = Infinity;
        collectiblesList.forEach((key) => {
          if (!picked.has(key)) {
            const [cr, cc] = key.split(",").map(Number);
            const d = Math.abs(cr - nr) + Math.abs(cc - nc);
            if (d < bestDist) { bestDist = d; targetR = cr; targetC = cc; }
          }
        });
        targetR = targetR!; targetC = targetC!;
      } else {
        // Tous ramassés → objectif = sortie
        const exitPos = collectiblesList.length > 0
          ? (() => {
              // on cherche la sortie dans la map
              for (let r = 0; r < maxRows; r++)
                for (let c = 0; c < maxCols; c++)
                  if (map[r]?.[c] === "exit") return [r, c];
              return [currentX, currentY];
            })()
          : [currentX, currentY];
        targetR = exitPos[0]; targetC = exitPos[1];
      }

      const distBefore = Math.abs(currentX - targetR) + Math.abs(currentY - targetC);
      const distAfter  = Math.abs(nr - targetR)       + Math.abs(nc - targetC);
      reward += (distBefore - distAfter) * 5; // +3 si rapprochement, -3 si éloignement
    }

    // ── 3. Anti-cycle : punition historique + dégradation Q-table ─────────────
    const posKey = `${nr},${nc}`;

    // Punition dans la récompense si case déjà visitée récemment
    const recentCount = posHistory.filter(p => p === posKey).length;
    if (recentCount >= 2) reward -= 15 * recentCount;

    // Dégradation directe dans la Q-table si case trop visitée dans l'épisode
    visitFreq[posKey] = (visitFreq[posKey] ?? 0) + 1;
    if (visitFreq[posKey] > 5) {
      qValues[action] -= 20 * (visitFreq[posKey] - 5);
    }

    // Mise à jour historique glissant
    posHistory.push(posKey);
    if (posHistory.length > HISTORY_SIZE) posHistory.shift();

    // ── 4. Apprentissage Bellman ───────────────────────────────────────────────
    const nextQValues = getQValues(nr, nc, nextPicked);
    const maxNextQ    = Math.max(...nextQValues);
    qValues[action]  += ALPHA * (reward + GAMMA * maxNextQ - qValues[action]);

    // ── 5. Mise à jour état physique ──────────────────────────────────────────
    lastX    = currentX;
    lastY    = currentY;
    currentX = nr;
    currentY = nc;
    picked   = nextPicked;
    gridRef.current.moveAgent(currentX, currentY);

    // ── 6. Décroissance epsilon ────────────────────────────────────────────────
    if (currentEpsilon > EPSILON_MIN) currentEpsilon *= 0.9995;

    // ── 7. Reset épisode — UNIQUEMENT sur la sortie avec tous les collectibles ──
    if (targetCell === "exit" && picked.size === totalCollectibles) {
      count++;
      console.log(`Épisode ${count} | Epsilon : ${currentEpsilon.toFixed(3)}`);

      currentX = startX;
      currentY = startY;
      lastX    = startX;
      lastY    = startY;
      picked   = new Set<string>();
      posHistory = [];
      visitFreq  = {};

      // Restore visuellement tous les collectibles
      collectiblesList.forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        gridRef.current!.restoreCell(r, c, "collectible");
      });

      gridRef.current.moveAgent(startX, startY);
    }
  }, 0);
}

export function stopRandomMovement() {
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
}

export async function runAgent(gridRef: React.RefObject<GridHandle>) {
  if (!gridRef.current) return;
  const map  = gridRef.current.getMap();
  const data = parseMap(map);

  if (!data.start) return;
  const [startRow, startCol] = data.start;

  await loadLastSession();
  startMovement(gridRef, data.rows, data.cols, startRow, startCol);
  saveSessionToDB(data);
}