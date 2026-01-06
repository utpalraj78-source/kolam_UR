import client from "./client";
import { LoginCredentials, RegisterData, User, AuthResponse } from "@/types/auth";

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>("/api/auth/login", new URLSearchParams({
        username: credentials.username,
        password: credentials.password
    }), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });
    return response.data;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>("/api/auth/register", data);
    return response.data;
};

export const getMe = async (): Promise<User> => {
    const response = await client.get<User>("/api/auth/me");
    return response.data;
};

export const getAllUsers = async (): Promise<User[]> => {
    const response = await client.get<User[]>("/api/auth/users");
    return response.data;
};

export const logout = async (): Promise<void> => {
    await client.post("/api/auth/logout");
};
