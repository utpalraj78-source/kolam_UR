# Symmetry

**Symmetry** defines the geometric constraints applied when generating the Kolam pattern. It determines how the edges in the grid mirror or repeat across the matrix.

## Available Types

*   **Square**: Symmetrical across both horizontal and vertical axes.
*   **Radial**: Symmetrical rotationally from the center.
*   **Diagonal**: Symmetrical across the diagonal axes.
*   **Horizontal / Vertical**: Symmetrical across a single axis.
*   **Random**: No symmetry constraints; edges are generated purely randomly.

## Impact on FHSS

Higher symmetry reduces the **entropy** (randomness) of the generated keys because parts of the matrix are copies of other parts. For maximum security (highest entropy), use **Random** or lower symmetry settings. However, symmetric Kolams are visually more appealing and easier for humans to verify.
