import hmac
import hashlib
import struct
import random

# Configuration
K = b'demonstration_key'
CTR = 1
SLOT_COUNT = 20
R = 10
C = 10

# Generate a random 10x10 matrix of 4-bit cells (nibbles 0-15)
# We use a fixed seed for reproducibility of this demo
random.seed(42)
M = [[random.randint(0, 15) for _ in range(C)] for _ in range(R)]

# Flatten
flat_nibbles = [M[r][c] for r in range(R) for c in range(C)]
N = len(flat_nibbles)

def prf_hmac_sha256_int(key: bytes, data: bytes, out_len=8) -> int:
    mac = hmac.new(key, data, hashlib.sha256).digest()
    return int.from_bytes(mac[:out_len], 'big')

def select_index_for_slot(t: int, key: bytes, ctr: int, N: int) -> int:
    data = struct.pack(">QQ", ctr, t)
    rnd = prf_hmac_sha256_int(key, data)
    return rnd % N

print(f"10x10 Matrix (First 5 rows shown):")
for r in range(5):
    print(f"Row {r}: " + " ".join(f"{x:2d}" for x in M[r]))
print("... (remaining 5 rows omitted for brevity)\n")

print(f"Hopping Sequence (First {SLOT_COUNT} slots):")
print(f"{'Slot':<5} {'Index':<6} {'(Row,Col)':<10} {'Nibble':<8} {'Channel':<8}")
print("-" * 45)

for t in range(SLOT_COUNT):
    idx = select_index_for_slot(t, K, CTR, N)
    row = idx // C
    col = idx % C
    nibble = flat_nibbles[idx]
    channel = nibble # Identity mapping
    
    print(f"{t:<5} {idx:<6} ({row},{col})      {nibble:<8} {channel:<8}")
