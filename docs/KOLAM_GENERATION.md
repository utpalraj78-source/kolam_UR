# Kolam Matrix Generation Logic

This document details how the Kolam grid is generated, how the "walls" or "edges" are determined, and how this translates into the binary and numeric matrices used for encryption and FHSS hopping.

## 1. Grid Structure

The Kolam is based on a grid of size $k \times k$.
- **$k$**: The dimension of the grid (e.g., $8 \times 8$).
- **Cells**: There are $k^2$ cells in total.

Each cell $(r, c)$ is defined by its four boundaries or "edges":
1.  **Top**
2.  **Bottom**
3.  **Left**
4.  **Right**

## 2. Edge Generation (Walls vs. Openings)

The generation process determines whether each of these edges is a **Wall (1)** or an **Opening (0)**.

### The Algorithm
The edges are generated using two 2D arrays:
-   `allRows`: Stores the vertical boundaries (Left/Right edges). Size: $k \times (k+1)$.
-   `allCols`: Stores the horizontal boundaries (Top/Bottom edges). Size: $k \times (k+1)$.

The value of an edge is determined probabilistically based on the **Randomness ($m$)** parameter:
-   **$m$**: An integer controlling the density of walls.
-   **Logic**: `_rand_edge(m)` returns `0` (Opening) with probability $1/m$, and `1` (Wall) otherwise.
    -   *Correction*: Looking at the code `return 0 if np.random.randint(m) == 0 else 1`, it actually returns `0` (Opening) with probability $1/m$ and `1` (Wall) with probability $(m-1)/m$.
    -   So higher $m$ means more walls (denser grid).

### Symmetry
To create aesthetic Kolam patterns, the edges are not always random. We apply symmetry constraints (e.g., 180° rotation, 90° rotation, Diagonal).
-   **Random**: Every edge is independent.
-   **Symmetric**: We generate edges for a "fundamental region" (e.g., the top-left quadrant) and then mirror/copy them to the other sections to ensure the pattern is symmetrical.

## 3. The Raw Matrix ($M$)

Once `allRows` and `allCols` are generated, they are combined into a 3D matrix $M$ of shape $(k, k, 4)$.

For a cell at row $r$ and column $c$:
$$ M[r, c] = [\text{Top}, \text{Bottom}, \text{Left}, \text{Right}] $$

Where each value is $0$ or $1$.

## 4. Binary Matrix Conversion (0s and 1s)

For certain applications (like simple binary keys), we convert the complex 4-edge cell into a single bit ($0$ or $1$).

**Logic:**
The binary value $B[r, c]$ depends on the "closedness" of the cell.

$$ B[r, c] = \begin{cases} 1 & \text{if } (\text{Top} + \text{Bottom} + \text{Left} + \text{Right}) \ge 3 \\ 0 & \text{otherwise} \end{cases} $$

-   **1 (Closed/Dense)**: The cell has 3 or 4 walls. It is a "tight" or "terminal" part of the loop.
-   **0 (Open/Sparse)**: The cell has 0, 1, or 2 walls. It is a "passage" or "corner" where the loop flows through.

## 5. Nibble Matrix (0-15)

For higher-density keys (like the FHSS hopping sequence), we use all 4 bits of information in a cell.

We treat the edges as a 4-bit integer (Nibble):
-   **Top**: Bit 3 (Value 8)
-   **Bottom**: Bit 2 (Value 4)
-   **Left**: Bit 1 (Value 2)
-   **Right**: Bit 0 (Value 1)

$$ \text{Value} = (8 \times \text{Top}) + (4 \times \text{Bottom}) + (2 \times \text{Left}) + (1 \times \text{Right}) $$

This gives each cell a value ranging from $0$ to $15$.

## Summary Table

| Representation | Shape | Data Type | Meaning |
| :--- | :--- | :--- | :--- |
| **Edges** | $k \times (k+1)$ (x2) | 0/1 | Raw boundary data (Walls vs Openings). |
| **Raw Matrix ($M$)** | $k \times k \times 4$ | [0/1, 0/1, 0/1, 0/1] | The 4 boundaries of every cell. |
| **Binary Matrix** | $k \times k$ | 0 or 1 | **1** = Closed cell ($\ge 3$ walls), **0** = Open cell. |
| **Nibble Matrix** | $k \times k$ | 0 - 15 | Integer value of the 4 edges treated as bits. |
