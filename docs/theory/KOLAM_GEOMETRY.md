# Kolam Geometry & Graph Theory

## 1. The Theory
Kolam is a traditional art form from Tamil Nadu, India, consisting of geometric patterns drawn with rice flour. Mathematically, these are **Array Grammars** or **Graph Theoretic** structures.
- **Pulli (Dots)**: The vertices of the graph.
- **Kambi (Lines)**: The edges that weave around the dots.
- **Symmetry**: Kolams often exhibit $D_4$ symmetry (dihedral group of order 8), including rotation and reflection.
- **Eulerian Circuits**: Many "infinite loop" Kolams are single continuous lines that visit every node/region, related to Eulerian paths in graph theory.

## 2. Where it is Used
This theory is the foundation of the entire application, specifically:
- **Backend**: `backend/kolam_generator.py` (The logic for `drawBox`, `edges_to_segments`, and symmetry builders).
- **Frontend**: `src/components/KolamCanvas.tsx` (Rendering the lines and dots).
- **Key Generation**: The geometric complexity is directly converted into cryptographic entropy.

## 3. Methodology
We model the Kolam as a **Cellular Automaton** on a grid:
1.  **Grid Representation**: A $K \times K$ grid where each cell $(i, j)$ has 4 bits of state representing its edges (Top, Bottom, Left, Right).
2.  **Edge Rules**:
    - `0`: No line.
    - `1`: Line present.
3.  **Drawing Primitives**: We define "tiles" based on edge configurations (e.g., if Top and Right are active, draw a curve connecting them).
4.  **Symmetry Application**: We generate one quadrant (or octant) randomly and mirror/rotate it to enforce symmetry.

## 4. Observation
- **Emergent Complexity**: Simple local rules (connect neighbors) combined with global symmetry create highly complex, aesthetically pleasing patterns.
- **Uniqueness**: Even on a small $15 \times 15$ grid, the number of possible valid Kolams is astronomically high ($2^{N}$ where $N$ is the number of independent edges), making it suitable for key generation.

## 5. Purpose in Project
The Kolam serves as the **Visual Seed** for our security system. Instead of a boring alphanumeric password, users exchange these complex geometric patterns. The mathematical properties of the Kolam (its matrix representation) are extracted to generate the **Frequency Hopping Sequence** for secure communication.
