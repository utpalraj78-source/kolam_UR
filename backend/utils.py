import numpy as np


def compute_binary_from_M(M):
    """Convert 4-edge matrix into binary crossings."""
    k = M.shape[0]
    B = np.zeros((k, k), dtype=np.uint8)
    for r in range(k):
        for c in range(k):
            top, bottom, left, right = M[r, c]
            if (top + bottom + left + right) >= 3:
                B[r, c] = 1
            else:
                B[r, c] = 0
    return B


def flatten_and_repeat(mat, min_length=None):
    """Flatten binary matrix and repeat to reach optional min length."""
    flat = mat.flatten().astype(np.uint8)
    if min_length is None or min_length <= flat.size:
        return flat
    reps = int(np.ceil(min_length / flat.size))
    return np.tile(flat, reps)[:min_length]


def M_to_nibble_matrix(M, bit_order=(8, 4, 2, 1)):
    """Convert combined matrix M (k,k,4) into an integer matrix (k,k) with values 0..15.

    bit_order is a tuple representing the bit weights for the 4 entries
    in each cell. Default mapping: [top, bottom, left, right] -> [8,4,2,1].
    """
    arr = np.array(M, dtype=np.int8)
    if arr.ndim != 3 or arr.shape[2] != 4:
        raise ValueError("M must be a (k,k,4) array")
    weights = np.array(bit_order, dtype=np.int8).reshape((1, 1, 4))
    nib = (arr * weights).sum(axis=2).astype(np.uint8)
    return nib


def hamming_distance_between_cells(a: int, b: int) -> int:
    """Return Hamming distance (0..4) between two 4-bit cell integers (0..15)."""
    x = int(a) ^ int(b)
    # count set bits
    return bin(x).count("1")


def matrix_hamming_distance(M1_int, M2_int):
    """Compute total and normalized Hamming distance between two integer matrices.

    Returns a dict: {total_bits, max_bits, normalized (0..1), per_cell matrix of distances}.
    """
    a = np.array(M1_int, dtype=np.uint8)
    b = np.array(M2_int, dtype=np.uint8)
    if a.shape != b.shape:
        raise ValueError("Matrices must have the same shape")
    k = a.shape[0]
    per = np.zeros_like(a, dtype=np.uint8)
    total = 0
    for r in range(k):
        for c in range(k):
            d = hamming_distance_between_cells(int(a[r, c]), int(b[r, c]))
            per[r, c] = d
            total += d
    max_bits = a.size * 4
    normalized = float(total) / float(max_bits) if max_bits > 0 else 0.0
    return {"total_bits": int(total), "max_bits": int(max_bits), "normalized": normalized, "per_cell": per.tolist()}


def nibble_matrix_to_bits(nibble_mat, msb_first=True):
    """Convert a (k,k) nibble matrix (0..15) into a flat bit array (4 bits per cell).

    msb_first=True yields bits in order [b3,b2,b1,b0] for each nibble (MSB->LSB).
    """
    arr = np.array(nibble_mat, dtype=np.uint8)
    bits = []
    for v in arr.flatten():
        if msb_first:
            bits.extend([ (int(v) >> 3) & 1, (int(v) >> 2) & 1, (int(v) >> 1) & 1, int(v) & 1 ])
        else:
            bits.extend([ int(v) & 1, (int(v) >> 1) & 1, (int(v) >> 2) & 1, (int(v) >> 3) & 1 ])
    return np.array(bits, dtype=np.uint8)


def bits_to_hops(bits, channels: int, bits_per_hop: int, msb_first=True):
    """Convert a flat bit array into a sequence of hop indices (0..channels-1).

    Pads with zeros at the end if needed. Returns numpy array of int32.
    """
    if bits is None:
        return np.array([], dtype=np.int32)
    bits = np.array(bits, dtype=np.uint8)
    if bits.size == 0:
        return np.array([], dtype=np.int32)
    groups = int(np.ceil(bits.size / bits_per_hop))
    total_len = groups * bits_per_hop
    if total_len > bits.size:
        bits = np.pad(bits, (0, total_len - bits.size), 'constant', constant_values=0)

    hops = []
    for i in range(groups):
        chunk = bits[i*bits_per_hop:(i+1)*bits_per_hop]
        val = 0
        if msb_first:
            for b in chunk:
                val = (val << 1) | int(b)
        else:
            for idx, b in enumerate(chunk):
                val |= (int(b) << idx)
        hops.append(int(val % max(1, channels)))
    return np.array(hops, dtype=np.int32)
