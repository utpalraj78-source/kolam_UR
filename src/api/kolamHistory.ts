import client from "./client";

export interface KolamHistoryItem {
    id: number;
    kolam_params: any;
    kolam_image_path: string | null;
    created_at: string;
}

export const saveKolam = async (kolamParams: any, imagePath?: string): Promise<KolamHistoryItem> => {
    const response = await client.post<KolamHistoryItem>("/api/kolams/save", {
        kolam_params: kolamParams,
        kolam_image_path: imagePath
    });
    return response.data;
};

export const getMyHistory = async (skip = 0, limit = 50): Promise<KolamHistoryItem[]> => {
    const response = await client.get<KolamHistoryItem[]>("/api/kolams/my-history", {
        params: { skip, limit }
    });
    return response.data;
};

export const deleteKolam = async (id: number): Promise<void> => {
    await client.delete(`/api/kolams/${id}`);
};
