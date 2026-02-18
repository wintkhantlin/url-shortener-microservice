import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink, Power, PowerOff, BarChart3, Trash2 } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAliases, useUpdateAlias, useDeleteAlias } from '@/hooks/useAliases'

export const Route = createFileRoute('/aliases')({
  component: AliasesPage,
})

function AliasesPage() {
  const { data: aliases, isLoading, error } = useAliases()
  const updateAlias = useUpdateAlias()
  const deleteAlias = useDeleteAlias()

  const handleToggleStatus = (code: string, currentStatus: boolean) => {
    updateAlias.mutate({ code, is_active: !currentStatus })
  }

  const handleDelete = (code: string) => {
    if (window.confirm("Are you sure you want to delete this alias?")) {
        deleteAlias.mutate(code)
    }
  }

  if (isLoading) {
    return (
    <DashboardLayout aliases={[]}>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
    <DashboardLayout aliases={[]}>
        <div className="p-6 text-destructive">Error loading aliases. Please try again later.</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout aliases={aliases || []}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Aliases</h1>
          <p className="text-muted-foreground">Manage your short links and view their performance.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aliases?.map((alias) => (
            <Card key={alias.code} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1 overflow-hidden mr-2">
                  <CardTitle className="text-base font-medium truncate">
                    <Link to="/$aliasId" params={{ aliasId: alias.code }} className="hover:underline flex items-center gap-1">
                      /{alias.code}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-1 text-xs break-all" title={alias.target}>
                    {alias.target}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleStatus(alias.code, !!alias.is_active)}
                        disabled={updateAlias.isPending}
                        title={alias.is_active ? "Deactivate" : "Activate"}
                    >
                        {alias.is_active ? (
                            <Power className="h-4 w-4 text-green-500" />
                        ) : (
                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(alias.code)}
                        disabled={deleteAlias.isPending}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>{new Date(alias.created_at).toLocaleDateString()}</span>
                    <Link to="/$aliasId" params={{ aliasId: alias.code }}>
                        <Button variant="secondary" size="sm" className="h-7 text-xs">
                            <BarChart3 className="mr-1 h-3 w-3" />
                            Analytics
                        </Button>
                    </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {aliases?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No aliases found. Create one to get started!
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
