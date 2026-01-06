# Self-Avoidance Logic: Technical Reference

## Concept
**Self-Avoidance** is a deterministic post-processing step applied to the Hybrid Key. It transforms a "statistically random" sequence into a "structurally diverse" sequence by actively preventing short-term repetitions.

## The Algorithm: Pair-Wise Diversity

Our FHSS system generates channels (Hops) by combining multiple "Cells" of data.
- **Constraints**: 1 Cell = 4 bits. 1 Hop $\approx$ 6-8 bits.
- **Formation**: Therefore, 1 Hop is formed by $\approx$ 2 Cells.

To prevent Hop Collisions, we must prevent **Cell Pair Collisions**.

### Logic Flow

1.  **Input**: Flattened array of Hybrid Cells (0-15).
2.  **Window**: Sliding window of size 4 (Previous Pair + Current Pair).
3.  **Condition**:
    $$ (C_i == C_{i-2}) \land (C_{i+1} == C_{i-1}) $$
    *In English: "Is the current pair identical to the immediate previous pair?"*
4.  **Reaction (Mutation)**:
    $$ C_i = C_i \oplus \text{MASK} $$
    *In English: "Flip all bits of the first cell in the repeating pair."*

### Example Trace

**Initial Sequence (Random Chance):**
`| A | B | A | B | C | D |`
- Hop 1: `(A, B)`
- Hop 2: `(A, B)` $\rightarrow$ **COLLISION!**

**Processing:**
- Index `i=2` (The second 'A').
- Check: `A == A` (True) AND `B == B` (True).
- Action: `A` becomes `A'`.

**Final Sequence (Self-Avoided):**
`| A | B | A'| B | C | D |`
- Hop 1: `(A, B)`
- Hop 2: `(A', B)` $\rightarrow$ **UNIQUE**

## Why This Matters
For frequency hopping, **burst errors** (losing consecutive packets on the same jammed channel) are worse than random errors. This logic mathematically guarantees that no two consecutive hops can be identical, eliminating burst errors caused by self-collision.
