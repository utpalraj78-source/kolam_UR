# Randomness (m)

**Randomness** (often denoted as `m`) controls the number of possible edge configurations available for each cell during generation.

## How it works

*   It determines the "pool" of edge choices the generator picks from.
*   A higher `m` value generally leads to more complex and varied patterns.
*   A lower `m` value restricts the choices, potentially leading to simpler or more repetitive local structures.

## Impact

Increasing randomness increases the **entropy** of the generated keys, making the frequency hopping sequence harder to predict for an adversary who doesn't have the matrix.
