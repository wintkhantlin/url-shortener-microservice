import { kratos } from "@/lib/kratos";
import { useQuery } from '@tanstack/react-query'
import type { Session } from "@ory/client";

export function useSession() {
    return useQuery<Session>({
        queryKey: ["session"],
        queryFn: async () => {
            const { data } = await kratos.toSession();
            return data;
        },
        refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
        retry: false,
        refetchOnWindowFocus: true,
    })
}
