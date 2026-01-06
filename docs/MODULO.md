# Modulo

**Modulo** defines the range of values used in the generated keys.

## Default: 16
*   Since we use **4 Bits Per Cell**, each cell produces a value between 0 and 15 (2^4 = 16).
*   Therefore, the default modulo is **16**.
*   This maps perfectly to a hexadecimal digit (0-F).

## Custom Modulo
*   If you change the modulo (e.g., to 10), the values extracted from the cells will be wrapped around (modulo 10).
*   This is useful if you need to map the key to a specific alphabet size (e.g., decimal digits 0-9).
