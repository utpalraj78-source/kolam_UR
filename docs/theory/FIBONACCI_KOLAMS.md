# Fibonacci Sequence in Kolams

## 1. The Theory
The **Fibonacci Sequence** ($0, 1, 1, 2, 3, 5, 8, 13, \dots$) is a famous mathematical sequence where each number is the sum of the two preceding ones. It is closely related to the **Golden Ratio** ($\phi \approx 1.618$).
- **Recursive Geometry**: Squares with side lengths equal to Fibonacci numbers can be tiled perfectly to form a "Golden Rectangle."
- **Self-Similarity**: This tiling property is recursive, meaning a large square can be broken down into smaller Fibonacci squares infinitely.

## 2. Where it is Used
This theory is used to create a specific type of "Recursive Kolam":
- **Backend**: `backend/streamlit_app.py` (The `recursive_kolam` and `draw_fib_kolam` functions).
- **Frontend**: `src/pages/KolamGenerator.tsx` (When "Fibonacci" mode is selected).

## 3. Methodology
1.  **Decomposition**: We start with a large square grid of size $F_n \times F_n$.
2.  **Tiling**: We subdivide this grid into smaller squares of sizes $F_{n-1}, F_{n-2}, \dots, F_1$ according to the Golden Rectangle spiral pattern.
3.  **Pattern Filling**: Inside each smaller square, we draw a standard Kolam pattern (e.g., a loop or a diamond).
4.  **Splicing**: We connect the lines at the boundaries of these squares to ensure the entire pattern is continuous (one single line).

## 4. Observation
- **Aesthetics**: The resulting Kolam has a natural, organic look due to the Golden Ratio proportions.
- **Complexity**: The pattern is non-uniform (unlike a standard grid), making it harder to predict.
- **Fractal Nature**: It exhibits fractal-like properties, where the same structure repeats at different scales.

## 5. Purpose in Project
This demonstrates the **Mathematical Depth** of the project. It connects the ancient art of Kolam with classical Western mathematics (Fibonacci), showing that the principles of beauty and complexity are universal. It also provides a more complex "key" for the FHSS system compared to a uniform grid.
