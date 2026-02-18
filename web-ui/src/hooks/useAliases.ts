import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Alias {
    code: string;
    target: string;
    user_id: string;
    is_active: boolean;
    created_at: string;
    expires_at?: string;
    metadata?: Record<string, unknown>;
}

export function useAliases() {
    return useQuery({
        queryKey: ["aliases"],
        queryFn: async (): Promise<Alias[]> => {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:4455/api"}/management/aliases`, {
                credentials: "include"
            });
            if (!res.ok) {
                throw new Error("Failed to fetch aliases");
            }
            return res.json();
        }
    });
}

export function useCreateAlias() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { target: string; code?: string; expires_at?: string }) => {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:4455/api"}/management/aliases`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
                credentials: "include"
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to create alias");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aliases"] });
        }
    });
}

export function useDeleteAlias() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (code: string) => {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:4455/api"}/management/aliases/${code}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to delete alias");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aliases"] });
        }
    });
}

export function useUpdateAlias() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ code, ...data }: Partial<Alias> & { code: string }) => {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:4455/api"}/management/aliases/${code}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
                credentials: "include"
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to update alias");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aliases"] });
        }
    });
}
