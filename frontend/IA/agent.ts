import React from "react";
import { GridHandle } from "../map/grid";
import { CellType } from "../map/cell";
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

interface Transition {
  stateKey:     string;
  action:       number;
  reward:       number;
  nextStateKey: string;
  done:         boolean;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const ALPHA          = 0.15;
const GAMMA          = 0.95;
const EPSILON_START  = 0.4;
const EPSILON_MIN    = 0.05;
const HISTORY_SIZE   = 20;

// Experience Replay
const REPLAY_CAPACITY = 5000; // taille max du buffer
const REPLAY_BATCH    = 32;   // transitions rejouées par step
const REPLAY_START    = 200;  // n'apprend depuis le buffer qu'après N transitions

// Double Q-Learning : swap toutes les N steps
const SWAP_INTERVAL = 500;

// ─── État Global ──────────────────────────────────────────────────────────────

// Double Q-Learning : deux tables, on alterne laquelle est "active"
export let qTableA: Record<string, number[]> = {};
export let qTableB: Record<string, number[]> = {};
export let qTable  = qTableA; // alias pour la compat avec saveSessionToDB

let moveInterval: ReturnType<typeof setInterval> | null = null;
let count      = 0;
let totalSteps = 0; // compteur global pour le swap et le replay

let posHistory: string[]              = [];
let visitFreq:  Record<string, number> = {};

// Buffer de replay
const replayBuffer: Transition[] = [];

// ─── Q-Table helpers (Double Q-Learning) ─────────────────────────────────────

/**
 * État enrichi : position + index du prochain collectible cible.
 * Bien plus précis que "count" — l'agent sait QUOI chercher, pas juste COMBIEN.
 */
function makeStateKey(r: number, c: number, nextTargetIdx: number): string {
  return `${r},${c}|t${nextTargetIdx}`;
}

function getValues(table: Record<string, number[]>, key: string): number[] {
  if (!table[key]) table[key] = [0, 0, 0, 0];
  return table[key];
}

// Choix d'action : on utilise A pour choisir, B pour évaluer (Double Q)
function chooseAction(key: string, epsilon: number): number {
  if (Math.random() < epsilon) return Math.floor(Math.random() * 4);
  const vals = getValues(qTableA, key);
  return vals.indexOf(Math.max(...vals));
}

// Mise à jour Double Q : on alterne aléatoirement quelle table est mise à jour
function updateQ(
  stateKey: string, action: number, reward: number,
  nextKey: string, done: boolean
) {
  // 50% chance : update A en utilisant B pour évaluer le next state
  // 50% chance : update B en utilisant A pour évaluer le next state
  const [updateTable, evalTable] = Math.random() < 0.5
    ? [qTableA, qTableB]
    : [qTableB, qTableA];

  const current   = getValues(updateTable, stateKey);
  const nextEval  = getValues(evalTable,   nextKey);
  const nextAct   = getValues(updateTable, nextKey).indexOf(
    Math.max(...getValues(updateTable, nextKey))
  );

  const target = done
    ? reward
    : reward + GAMMA * nextEval[nextAct];

  current[action] += ALPHA * (target - current[action]);
}

// ─── Experience Replay ────────────────────────────────────────────────────────

function pushTransition(t: Transition) {
  replayBuffer.push(t);
  if (replayBuffer.length > REPLAY_CAPACITY) replayBuffer.shift();
}

function replayBatch() {
  if (replayBuffer.length < REPLAY_START) return;

  // Pioche REPLAY_BATCH transitions aléatoires
  for (let i = 0; i < REPLAY_BATCH; i++) {
    const idx = Math.floor(Math.random() * replayBuffer.length);
    const { stateKey, action, reward, nextStateKey, done } = replayBuffer[idx];
    updateQ(stateKey, action, reward, nextStateKey, done);
  }
}

// ─── BFS avec cache ───────────────────────────────────────────────────────────

let distCache: Record<string, Record<string, number>> = {};

function bfsFromSource(map: CellType[][], srcR: number, srcC: number): Record<string, number> {
  const rows = map.length;
  const cols = map[0]?.length ?? 0;
  const dist: Record<string, number> = {};
  const queue: [number, number, number][] = [[srcR, srcC, 0]];
  dist[`${srcR},${srcC}`] = 0;

  while (queue.length > 0) {
    const [r, c, d] = queue.shift()!;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (key in dist) continue;
      if (map[nr][nc] === "wall") continue;
      dist[key] = d + 1;
      queue.push([nr, nc, d + 1]);
    }
  }
  return dist;
}

function cachedDist(
  map: CellType[][], fromR: number, fromC: number, toR: number, toC: number
): number {
  const k = `${fromR},${fromC}`;
  if (!distCache[k]) distCache[k] = bfsFromSource(map, fromR, fromC);
  return distCache[k][`${toR},${toC}`] ?? Infinity;
}

// ─── Ordre optimal des collectibles (nearest-neighbor TSP) ───────────────────

function computeOptimalOrder(
  map: CellType[][], fromR: number, fromC: number,
  keys: string[], exitR: number, exitC: number
): string[] {
  const remaining = [...keys];
  const ordered: string[] = [];
  let curR = fromR, curC = fromC;

  while (remaining.length > 0) {
    let bestIdx = 0, bestDist = Infinity;
    remaining.forEach((key, idx) => {
      const [cr, cc] = key.split(",").map(Number);
      const d = cachedDist(map, curR, curC, cr, cc);
      if (d < bestDist) { bestDist = d; bestIdx = idx; }
    });
    const chosen = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosen);
    [curR, curC] = chosen.split(",").map(Number);
  }
  return ordered;
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
        q_table: qTableA,
      }),
    });
    const json = await res.json();
    if (json.status === "ok") return json.session_id;
    return null;
  } catch { return null; }
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
  } catch { return null; }
}

// ─── Logique principale ───────────────────────────────────────────────────────

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
  let exitR = -1, exitC = -1;

  initialMap.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === "collectible") collectiblesList.push(`${r},${c}`);
      if (cell === "exit") { exitR = r; exitC = c; }
    })
  );

  const totalCollectibles = collectiblesList.length;

  // Précalcul BFS
  distCache = {};
  console.log("[IA] Précalcul BFS...");
  const sources: [number, number][] = [
    [startX, startY],
    ...collectiblesList.map(k => k.split(",").map(Number) as [number, number]),
    [exitR, exitC],
  ];
  sources.forEach(([r, c]) => {
    const key = `${r},${c}`;
    if (!distCache[key]) distCache[key] = bfsFromSource(initialMap, r, c);
  });
  console.log(`[IA] BFS précalculé pour ${sources.length} points.`);

  // Ordre optimal
  const optimalOrder = computeOptimalOrder(
    initialMap, startX, startY, [...collectiblesList], exitR, exitC
  );
  console.log("[IA] Ordre optimal :", optimalOrder);

  // Reset Q-tables et buffer pour une nouvelle map
  qTableA = {}; qTableB = {};
  replayBuffer.length = 0;
  totalSteps = 0;

  // Init épisode
  let curX = startX, curY = startY;
  let prevX = startX, prevY = startY;
  let picked         = new Set<string>();
  let currentEpsilon = EPSILON_START;
  let exitSeen       = false;
  posHistory = [];
  visitFreq  = {};

  moveInterval = setInterval(() => {
    if (!gridRef.current) return;
    const map = gridRef.current.getMap();

    // Index du prochain collectible cible dans l'ordre optimal
    const nextTargetIdx = optimalOrder.findIndex(k => !picked.has(k));
    // -1 si tous ramassés → on encode totalCollectibles comme "phase sortie"
    const targetPhase   = nextTargetIdx === -1 ? totalCollectibles : nextTargetIdx;
    const stateKey      = makeStateKey(curX, curY, targetPhase);

    // ── 1. Choix de l'action ──────────────────────────────────────────────────
    const action = chooseAction(stateKey, currentEpsilon);

    let nr = curX, nc = curY;
    if (action === 0) nr--;
    if (action === 1) nr++;
    if (action === 2) nc--;
    if (action === 3) nc++;

    // ── 2. Récompense ─────────────────────────────────────────────────────────
    let reward = -1;
    const targetCell = map[nr]?.[nc];
    const nextPicked = new Set(picked);
    let done = false;

    if (!targetCell || targetCell === "wall") {
      reward = -15;
      nr = curX; nc = curY;

    } else if (targetCell === "collectible") {
      const cellKey = `${nr},${nc}`;
      if (!picked.has(cellKey)) {
        reward = 300;
        nextPicked.add(cellKey);
        gridRef.current!.consumeCell(nr, nc);
      }

    } else if (targetCell === "exit") {
      if (picked.size === totalCollectibles) {
        reward = 1000;
        done   = true;
      } else {
        reward = -100;
      }
    }

    // ── 3. Reward shaping ─────────────────────────────────────────────────────
    if (nr !== curX || nc !== curY) {
      if (nextTargetIdx !== -1) {
        // Phase collecte : guider vers le prochain dans l'ordre optimal
        const [tr, tc] = optimalOrder[nextTargetIdx].split(",").map(Number);
        const db = distCache[`${curX},${curY}`]?.[`${tr},${tc}`] ?? Infinity;
        const da = distCache[`${nr},${nc}`]?.[`${tr},${tc}`] ?? Infinity;
        if (db !== Infinity && da !== Infinity) reward += (db - da) * 4;

        // Signal faible vers la sortie si déjà vue
        if (exitSeen && exitR >= 0) {
          const db2 = distCache[`${curX},${curY}`]?.[`${exitR},${exitC}`] ?? Infinity;
          const da2 = distCache[`${nr},${nc}`]?.[`${exitR},${exitC}`] ?? Infinity;
          if (db2 !== Infinity && da2 !== Infinity) reward += (db2 - da2) * 1;
        }
      } else if (exitR >= 0) {
        // Phase sortie : signal fort
        const db = distCache[`${curX},${curY}`]?.[`${exitR},${exitC}`] ?? Infinity;
        const da = distCache[`${nr},${nc}`]?.[`${exitR},${exitC}`] ?? Infinity;
        if (db !== Infinity && da !== Infinity) reward += (db - da) * 6;
      }
    }

    // ── Mémoire sortie ────────────────────────────────────────────────────────
    if (targetCell === "exit" && !exitSeen) {
      exitSeen = true;
      console.log(`[IA] Sortie mémorisée en [${exitR},${exitC}]`);
    }

    // ── 4. Anti-cycle ─────────────────────────────────────────────────────────
// ── 4. Anti-cycle ─────────────────────────────────────────────────────────
    
    // Pénalité massive si l'agent fait un aller-retour immédiat (U-Turn)
    if (nr === prevX && nc === prevY) {
      reward -= 60; 
    }

    const posKey = `${nr},${nc}`;
    
    // Pénalité pour les petites boucles (ex: carré de 4 cases)
    const recentCount = posHistory.filter(p => p === posKey).length;
    if (recentCount >= 2) {
      reward -= 20 * recentCount; 
    }

    // Pénalité de stagnation (l'agent reste dans la même zone trop longtemps)
    visitFreq[posKey] = (visitFreq[posKey] ?? 0) + 1;
    if (visitFreq[posKey] > 4) {
      // On diminue la récompense dynamiquement. 
      // Plus il passe ici, plus le pas coûte cher, mais on NE TOUCHE PAS à la Q-Table directement.
      reward -= 5 * visitFreq[posKey]; 
    }

    posHistory.push(posKey);
    if (posHistory.length > HISTORY_SIZE) posHistory.shift();

    // ── 5. Apprentissage ──────────────────────────────────────────────────────
    const nextPhase    = nextPicked.size === totalCollectibles ? totalCollectibles
                       : optimalOrder.findIndex(k => !nextPicked.has(k));
    const nextStateKey = makeStateKey(nr, nc, nextPhase === -1 ? totalCollectibles : nextPhase);

    // Mise à jour immédiate (online)
    updateQ(stateKey, action, reward, nextStateKey, done);

    // Stocke dans le buffer
    pushTransition({ stateKey, action, reward, nextStateKey, done });

    // Replay batch tous les steps
    replayBatch();

    // ── 6. Mise à jour état ───────────────────────────────────────────────────
    prevX  = curX; // 👈 3. On enregistre d'où on vient
    prevY  = curY;
    curX   = nr;
    curY   = nc;
    picked = nextPicked;
    gridRef.current.moveAgent(curX, curY);
    totalSteps++;

    // ── 7. Décroissance epsilon ───────────────────────────────────────────────
    if (currentEpsilon > EPSILON_MIN) currentEpsilon *= 0.9998;

    // ── 8. Reset épisode ──────────────────────────────────────────────────────
    if (done) {
      count++;
      console.log(`Épisode ${count} | Epsilon : ${currentEpsilon.toFixed(3)} | Buffer : ${replayBuffer.length}`);

      curX   = startX; curY = startY;
      picked = new Set<string>();
      posHistory = []; visitFreq = {};
      exitSeen = true;

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