# Credential System

The **Credential System** is the mechanism by which users authenticate and establish a secure channel.

## Formats

1.  **JSON File**: A text file containing the full Kolam matrix structure (`matrix_raw`), generation parameters, and keys. This is the most robust format.
2.  **PNG Image**: A visual image of the Kolam pattern. The critical parameters are embedded in the **metadata** (tEXt chunks) of the PNG.

## Connection Process

*   When a user uploads a credential, the system extracts the parameters (either by parsing the JSON or decoding the image metadata).
*   These parameters are hashed to generate a **Room ID**.
*   Two users can only meet in the same room if they upload credentials that result in the *exact same* Room ID, proving they share the same secret key.
