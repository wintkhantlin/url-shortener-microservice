import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/AppSidebar'
import { type Alias } from '@/hooks/useAliases'

interface DashboardLayoutProps {
  children: React.ReactNode
  aliases: Alias[]
  selectedAliasId?: string
  title?: string
}

export function DashboardLayout({ children, aliases, selectedAliasId, title }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar aliases={aliases} selectedAliasId={selectedAliasId} />

      <SidebarInset className="bg-gradient-to-b from-background via-background to-muted/30">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-5 md:mx-3" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">URL2Short</p>
            <h1 className="truncate text-sm font-semibold tracking-tight">{title || 'Dashboard'}</h1>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[88rem] space-y-6 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
