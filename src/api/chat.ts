import client from "./client";
import { ChatSession, ChatMessage } from "@/types/chat";

export const createSession = async (recipientUsername: string): Promise<ChatSession> => {
    const response = await client.post<ChatSession>("/api/secure-chat/sessions", {
        recipient_username: recipientUsername
    });
    return response.data;
};

export const getMySessions = async (): Promise<ChatSession[]> => {
    const response = await client.get<ChatSession[]>("/api/secure-chat/sessions");
    return response.data;
};

export const sendMessage = async (sessionId: number, message: string): Promise<ChatMessage> => {
    const response = await client.post<ChatMessage>("/api/secure-chat/messages/send", {
        session_id: sessionId,
        message: message
    });
    return response.data;
};

export const getMessages = async (sessionId: number, skip = 0, limit = 50): Promise<ChatMessage[]> => {
    const response = await client.get<ChatMessage[]>(`/api/secure-chat/messages/${sessionId}`, {
        params: { skip, limit }
    });
    return response.data;
};
