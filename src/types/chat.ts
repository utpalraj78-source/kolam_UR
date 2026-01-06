export interface ChatSession {
    id: number;
    user_a_id: number;
    user_b_id: number;
    created_at: string;
    recipient?: User; // Helper for UI
}

export interface ChatMessage {
    id: number;
    session_id: number;
    sender_id: number;
    decrypted_message: string;
    encrypted_payload: any;
    created_at: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
}
