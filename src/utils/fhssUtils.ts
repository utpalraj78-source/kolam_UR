
// Helper to convert key to hops (matching backend logic)
export const keyToHops = (key: number[], channels: number, bitsPerCell: number) => {
    const bitsNeeded = Math.ceil(Math.log2(Math.max(2, channels)));
    const cellsNeeded = Math.ceil(bitsNeeded / bitsPerCell);
    const hops: number[] = [];
    const total = key.length;
    const groups = Math.floor(total / cellsNeeded);
    const mask = (1 << bitsPerCell) - 1;

    for (let i = 0; i < groups; i++) {
        const g = key.slice(i * cellsNeeded, (i + 1) * cellsNeeded);
        let v = 0;
        for (const x of g) {
            v = (v << bitsPerCell) | (x & mask);
        }
        hops.push(v % channels);
    }

    // Fallback if empty (shouldn't happen with valid keys)
    if (hops.length === 0) {
        return key.map(x => x % channels);
    }
    return hops;
};
