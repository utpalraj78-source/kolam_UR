# Bits Per Cell

**Bits Per Cell** defines the amount of information extracted from each individual cell in the Kolam grid to generate the cryptographic keys.

## How it works

*   **Standard Square Grid**: Each cell in a standard Kolam grid has **4 edges** (Top, Bottom, Left, Right).
*   **Binary Representation**: Each edge can be either "present" (1) or "absent" (0).
*   **Default Value**: Therefore, the natural information density is **4 bits per cell**. For example, a cell with Top and Left edges present would be represented as `1010` (Top=1, Bottom=0, Left=1, Right=0).

## Usage

This parameter tells the system how to interpret the visual pattern into binary data.
*   **Key Generation**: These bits are concatenated from all cells to form the raw binary sequence used for key generation.
*   **Modulus**: The 4 bits form a value from 0 to 15 (2^4 = 16), which corresponds to the default **Modulo** of 16.
