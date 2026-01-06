
/**
 * Utilities to convert Audio Data <-> Kolam Matrix Structure
 * 
 * Flow:
 * 1. Float32Array (Audio) -> Uint8Array (Quantized) -> Bit Array
 * 2. Bit Array -> Kolam Edges (allRows, allCols)
 * 3. Kolam Edges -> JSON
 * ... Transfer ...
 * 4. JSON -> Kolam Edges
 * 5. Kolam Edges -> Bit Array
 * 6. Bit Array -> Uint8Array -> Float32Array (Audio)
 */

export interface KolamAudioPayload {
    type: 'audio_kolam';
    k: number;
    rows: number[][];
    cols: number[][];
    sampleRate?: number;
}

/**
 * Quantize Float32 audio (-1.0 to 1.0) to Uint8 (0 to 255)
 */
function floatToUint8(data: Float32Array): Uint8Array {
    const uint8 = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        // Clamp and map -1..1 to 0..255
        let s = Math.max(-1, Math.min(1, data[i]));
        s = (s + 1) * 127.5;
        uint8[i] = Math.floor(s);
    }
    return uint8;
}

/**
 * Dequantize Uint8 (0 to 255) to Float32 (-1.0 to 1.0)
 */
function uint8ToFloat(data: Uint8Array): Float32Array {
    const float32 = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
        float32[i] = (data[i] / 127.5) - 1;
    }
    return float32;
}

/**
 * Convert Uint8Array to a flat array of bits (0s and 1s)
 */
function bytesToBits(bytes: Uint8Array): number[] {
    const bits: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        for (let j = 7; j >= 0; j--) {
            bits.push((b >> j) & 1);
        }
    }
    return bits;
}

/**
 * Convert flat array of bits to Uint8Array
 */
function bitsToBytes(bits: number[]): Uint8Array {
    const numBytes = Math.floor(bits.length / 8);
    const bytes = new Uint8Array(numBytes);
    for (let i = 0; i < numBytes; i++) {
        let val = 0;
        for (let j = 0; j < 8; j++) {
            val = (val << 1) | bits[i * 8 + j];
        }
        bytes[i] = val;
    }
    return bytes;
}

/**
 * Calculate minimum K needed to store N bits in a Kolam
 * Total edges = 2 * k * (k + 1)
 */
function calculateK(numBits: number): number {
    // 2k^2 + 2k >= numBits
    // k^2 + k - numBits/2 >= 0
    // Quadratic formula: k = (-1 + sqrt(1 - 4(1)(-numBits/2))) / 2
    // k = (-1 + sqrt(1 + 2*numBits)) / 2
    const k = Math.ceil((-1 + Math.sqrt(1 + 2 * numBits)) / 2);
    return Math.max(k, 1);
}

export function encodeAudioToKolam(audioData: Float32Array): KolamAudioPayload {
    const bytes = floatToUint8(audioData);
    const bits = bytesToBits(bytes);

    const k = calculateK(bits.length);

    // Initialize edges
    const rows: number[][] = []; // k rows of k+1 edges
    const cols: number[][] = []; // k cols of k+1 edges (transposed logic in storage, but here we just need storage slots)

    // We need to fill 2*k*(k+1) slots.
    // Let's fill rows first, then cols.

    let bitIdx = 0;

    // Fill Rows: k arrays of length k+1
    for (let r = 0; r < k; r++) {
        const rowEdges: number[] = [];
        for (let c = 0; c < k + 1; c++) {
            if (bitIdx < bits.length) {
                rowEdges.push(bits[bitIdx++]);
            } else {
                rowEdges.push(0); // Pad with 0
            }
        }
        rows.push(rowEdges);
    }

    // Fill Cols: k arrays of length k+1
    for (let c = 0; c < k; c++) {
        const colEdges: number[] = [];
        for (let r = 0; r < k + 1; r++) {
            if (bitIdx < bits.length) {
                colEdges.push(bits[bitIdx++]);
            } else {
                colEdges.push(0); // Pad with 0
            }
        }
        cols.push(colEdges);
    }

    return {
        type: 'audio_kolam',
        k,
        rows,
        cols
    };
}

export function decodeKolamToAudio(payload: KolamAudioPayload): Float32Array {
    const { k, rows, cols } = payload;
    const bits: number[] = [];

    // Extract from Rows
    for (let r = 0; r < k; r++) {
        if (rows[r]) {
            for (let c = 0; c < k + 1; c++) {
                bits.push(rows[r][c]);
            }
        }
    }

    // Extract from Cols
    for (let c = 0; c < k; c++) {
        if (cols[c]) {
            for (let r = 0; r < k + 1; r++) {
                bits.push(cols[c][r]);
            }
        }
    }

    // Convert bits back to bytes
    const bytes = bitsToBytes(bits);

    // Convert bytes back to float
    return uint8ToFloat(bytes);
}
