import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { type Alias } from '@/hooks/useAliases'

const analyticsSearchSchema = z.object({
    interval: z.enum(['minute', 'hour', 'day', 'week', 'month', 'year']).optional().catch('hour'),
    start: z.string().optional(),
    end: z.string().optional(),
})

export interface AnalyticsResponse {
    total_clicks: number;
    timeline: { time: string; count: number }[];
    browsers: { name: string; count: number }[];
    os: { name: string; count: number }[];
    devices: { name: string; count: number }[];
    countries: { name: string; count: number }[];
    referrers: { name: string; count: number }[];
}

export const Route = createFileRoute('/$aliasId')({
    validateSearch: (search) => analyticsSearchSchema.parse(search),
    loaderDeps: ({ search: { interval, start, end } }) => ({ interval, start, end }),
    loader: async (ctx) => {
        const { aliasId } = ctx.params;
        const { interval, start, end } = ctx.deps;
        const baseUrl = import.meta.env.APP_API_BASE_URL;
        
        if (!baseUrl) throw new Error("APP_API_BASE_URL is not defined");

        try {
            // Initiate both fetches in parallel
            const aliasPromise = fetch(`${baseUrl}/management/aliases/${aliasId}`, {
                credentials: "include"
            });

            const params = new URLSearchParams();
            if (interval) params.set('interval', interval);
            if (start) params.set('start', start);
            if (end) params.set('end', end);

            const analyticsPromise = fetch(`${baseUrl}/analytics/${aliasId}?${params.toString()}`, {
                credentials: "include"
            });

            // Await both responses
            const [aliasRes, analyticsRes] = await Promise.all([aliasPromise, analyticsPromise]);

            if (!aliasRes.ok) {
                if (aliasRes.status === 404) return { error: "Alias not found", alias: null, analytics: null };
                if (aliasRes.status === 401) throw redirect({ to: '/auth/login' });
                throw new Error("Failed to fetch alias");
            }

            const alias = await aliasRes.json();
            
            let analytics: AnalyticsResponse | null = null;
            if (analyticsRes.ok) {
                analytics = await analyticsRes.json();
            } else {
                console.error("Failed to fetch analytics", await analyticsRes.text());
            }

            return { error: undefined, alias: alias as Alias, analytics };
        } catch (error) {
            console.error(error);
            if (error instanceof Response) throw error; // Re-throw redirects
            return { error: "Network error", alias: null, analytics: null };
        }
    },
})
