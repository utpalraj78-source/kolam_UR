# Hybrid Key Analysis - Final Report

## Executive Summary

We have reverted the hybrid key generation to a **Pure XOR** strategy.

## The Strategy

The `smart_hybrid` function in `backend/algo.py` now strictly performs:

```python
hybrid = np.bitwise_xor(pure, rnd)
```

No additional self-avoidance or collision manipulation is applied.

## Rationale

- **Maximum Entropy**: XORing a structured source (Kolam) with a random source (CSPRNG) preserves the full entropy of the random source.
- **Statistical Purity**: By not intervening, we avoid introducing any bias or patterns.
- **Expected Behavior**: Collision rates will be statistically similar to random keys (sometimes better, sometimes worse, depending on the random seed). This is the mathematically correct behavior for this operation.

## Action Required
Restart the backend server (`npm run dev:all`) to ensure the clean logic is loaded.
