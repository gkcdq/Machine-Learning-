console.log("ref ok ?", gridRef.current);

const map = gridRef.current!.getMap();

 console.log("map:", map);

const rows = map.length;
const cols = map[0].length;

let start: [number, number] | null = null;
let exit: [number, number] | null = null;
const collectibles: [number, number][] = [];
const walls: [number, number][] = [];

for (let r = 0; r < rows; r++)
{
    for (let c = 0; c < cols; c++)
    {
        if (map[r][c] === 'start') start = [r, c];
        if (map[r][c] === 'exit') exit = [r, c];
        if (map[r][c] === 'collectible') collectibles.push([r, c]);
        if (map[r][c] === 'wall') walls.push([r, c]);
    }
}