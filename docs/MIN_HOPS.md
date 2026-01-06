# Min Hops

**Min Hops** (Minimum Hops) specifies the minimum length of the frequency hopping sequence generated from the Kolam matrix.

## Why is it needed?

1.  **Finite Matrix Size**: A Kolam matrix has a fixed number of cells (e.g., a 10x10 grid has 100 cells). This produces a sequence of 100 channel hops.
2.  **Longer Sessions**: If you want to send a message that requires more than 100 hops (chunks), or keep the connection alive for a longer time, you need a longer sequence.
3.  **Looping**: The 'Min Hops' parameter tells the system to **repeat** the matrix pattern as many times as needed to reach the specified length.

## Example

If your matrix gives 100 hops but you set **Min Hops** to 500, the sequence will repeat the matrix pattern 5 times to ensure there are enough hopping codes for the session.
