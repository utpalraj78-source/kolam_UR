# Database

The project uses **Supabase** (PostgreSQL) to persist user data and history.

## Tables

*   **kolams**: Stores the history of generated Kolams for each user.
    *   `id`: Unique identifier.
    *   `user_id`: Links to the authenticated user.
    *   `params`: JSON object containing the Kolam configuration (k, m, seed, etc.).
    *   `keys`: JSON object containing the generated keys.
    *   `image_base64`: The visual representation of the Kolam.
    *   `created_at`: Timestamp.

## Integration

The frontend interacts with Supabase directly for storing and retrieving history, ensuring that users can access their previously generated credentials across sessions.
