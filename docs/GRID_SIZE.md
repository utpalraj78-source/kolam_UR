# Grid Size (k)

**Grid Size** (denoted as `k`) determines the dimensions of the Kolam matrix. A grid size of `k` creates a `k x k` matrix of cells.

## Impact on Keys

*   **Total Cells**: A `k x k` grid has `k²` cells.
*   **Sequence Length**: The base length of the generated frequency hopping sequence is equal to the number of cells (`k²`).
*   **Security**: Larger grids produce longer non-repeating sequences and more total entropy, providing stronger security for the FHSS session.

## Performance

Larger grids require more computation to generate and analyze. Common sizes range from 10 (100 cells) to 50 (2500 cells).
