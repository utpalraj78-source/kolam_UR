# Secure Chat

The **Secure Chat** component enables real-time, frequency-hopping communication between two peers.

## How it works

1.  **Connection**: Users connect by uploading a **Kolam Credential** (JSON or Image).
2.  **Room Derivation**: The system derives a unique Room ID from the uploaded credential. Only users with the *exact same* credential can enter the same room.
3.  **Synchronization**: Once connected, both peers are synchronized to the same frequency hopping sequence derived from the Kolam.
4.  **Encryption**: Messages are encrypted (simulated) and split into chunks.
5.  **Transmission**: Each chunk is transmitted on a specific frequency channel determined by the hopping sequence.

## Features

*   **Mutual Disconnect**: If one peer leaves, the session ends for both to ensure security.
*   **Approval Flow**: When a peer joins, the host must explicitly **Approve** the connection before data exchange begins.
