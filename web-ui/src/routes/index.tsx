import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAliases } from '@/hooks/useAliases'
import { useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { data: aliases, isLoading: isLoadingAliases } = useAliases();
    const { data: session, isLoading: isLoadingSession } = useSession();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoadingAliases || isLoadingSession) return;

        if (!session) {
            // If no session, wait for redirect or handle as needed
            // The root layout might handle auth redirection
            return;
        }

        if (aliases && aliases.length > 0) {
            // Redirect to the first alias
            navigate({ to: '/$aliasId', params: { aliasId: aliases[0].code } });
        }
    }, [aliases, session, isLoadingAliases, isLoadingSession, navigate]);

    if (isLoadingAliases || isLoadingSession) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Empty state if no aliases found
    if (aliases && aliases.length === 0) {
        return (
            <DashboardLayout aliases={aliases || []} title="Welcome">
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    No aliases found. Create one to get started.
                </div>
            </DashboardLayout>
        );
    }

    return null;
}

