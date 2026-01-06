# Backend API

The **Backend API** is built with **FastAPI** (Python) and handles the heavy lifting for Kolam generation and real-time communication.

## Key Endpoints

*   `POST /generate-kolam-key`: Generates the Kolam matrix, extracts cryptographic keys, and creates the preview image.
*   `POST /decode-image`: Extracts hidden Kolam metadata from an uploaded PNG image to allow connection via image files.
*   `GET /kolam-preview`: Returns a raw PNG image for a given set of parameters (used for dynamic previews).

## WebSocket

*   `/ws/chat/{room_id}/{user_id}`: Manages the real-time chat connection.
    *   Handles user presence (join/leave).
    *   Broadcasts encrypted messages and hopping metadata.
    *   Enforces the "Approval Required" flow for new connections.
