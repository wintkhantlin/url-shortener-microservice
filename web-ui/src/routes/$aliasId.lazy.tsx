import { createLazyFileRoute } from '@tanstack/react-router'
import { useMemo, lazy, Suspense, useState } from 'react'
import MousePointer2 from 'lucide-react/dist/esm/icons/mouse-pointer-2'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Share2 from 'lucide-react/dist/esm/icons/share-2'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import Copy from 'lucide-react/dist/esm/icons/copy'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link'
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label as UILabel } from "@/components/ui/label"

// Hooks & Libs
import { useAliases } from '@/hooks/useAliases'

// Lazy Load Charts
const TrafficChart = lazy(() => import('@/components/charts/TrafficChart'))
const DeviceChart = lazy(() => import('@/components/charts/DeviceChart'))

export const Route = createLazyFileRoute('/$aliasId')({
  component: DashboardRoute,
})

// --- Helper Functions ---
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface DataItem {
    label: string;
    value: number;
    fill: string;
}

function transformData(data: { name: string; count: number }[] | undefined): DataItem[] {
    if (!data) return [];
    return data.map((item, index) => ({
        label: item.name,
        value: item.count,
        fill: COLORS[index % COLORS.length]
    }));
}

function transformDeviceData(data: { name: string; count: number }[] | undefined) {
    if (!data) return [];
    return data.map((item, index) => ({
        device: item.name,
        visitors: item.count,
        fill: COLORS[index % COLORS.length]
    }));
}

// --- Sub-Components ---

function AnalyticsFilter() {
    const navigate = Route.useNavigate();
    const { interval, start, end } = Route.useSearch();

    const handleIntervalChange = (val: string) => {
        navigate({
            search: (prev) => ({ ...prev, interval: val as any }),
        });
    };

    const handleDateChange = (key: 'start' | 'end', val: string) => {
        const isoDate = val ? new Date(val).toISOString() : undefined;
        navigate({
            search: (prev) => ({ ...prev, [key]: isoDate }),
        });
    };

    // Convert ISO string to "YYYY-MM-DDTHH:mm" for input
    const toInputFormat = (iso?: string) => {
        if (!iso) return "";
        // Simple hack to get local time string for input
        const date = new Date(iso);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    return (
        <div className="flex flex-wrap items-end gap-4 bg-background border rounded-lg p-4 mb-6">
            <div className="flex flex-col gap-1.5">
                <UILabel htmlFor="interval" className="text-xs font-medium">Interval</UILabel>
                <Select value={interval || 'hour'} onValueChange={handleIntervalChange}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="minute">Minute</SelectItem>
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-1.5">
                <UILabel htmlFor="start-date" className="text-xs font-medium">Start Date</UILabel>
                <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="start-date"
                        type="datetime-local" 
                        className="pl-9 w-[200px]"
                        value={toInputFormat(start)}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <UILabel htmlFor="end-date" className="text-xs font-medium">End Date</UILabel>
                <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="end-date"
                        type="datetime-local" 
                        className="pl-9 w-[200px]"
                        value={toInputFormat(end)}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                    />
                </div>
            </div>
            
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate({ search: { interval: 'hour' } })}
                className="ml-auto"
            >
                Reset Filters
            </Button>
        </div>
    )
}

function MetricCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}

function CopyShortUrl({ code }: { code: string }) {
    const base = (import.meta.env.VITE_REDIRECT_BASE_URL as string | undefined) || "http://localhost:3001/";
    const url = `${base.replace(/\/$/, '')}/${code}`;
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="flex items-center gap-2 bg-background border rounded-lg p-3">
            <Input value={url} readOnly />
            <Button variant="secondary" onClick={onCopy} title={copied ? "Copied!" : "Copy short URL"}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
            </Button>
            <Button variant="outline" asChild title="Open short URL">
                <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">Open</span>
                </a>
            </Button>
        </div>
    )
}

function DistributionCard({ title, subtitle, data }: { title: string, subtitle: string, data: DataItem[] }) {
    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    if (total === 0) {
        return (
            <Card className="flex items-center justify-center p-6 h-full min-h-[200px]">
                <div className="text-center space-y-2">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-muted-foreground text-xs">No data available</p>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-md font-semibold">{title}</CardTitle>
                <CardDescription className="text-xs">{subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <div className="space-y-4">
                    {data.map((item) => (
                        <div key={item.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium capitalize">{item.label}</span>
                                <span className="font-bold">{((item.value / total) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all duration-500"
                                    style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.fill }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function DashboardRoute() {
    const { aliasId } = Route.useParams();
    const { interval } = Route.useSearch();
    const { data: aliases } = useAliases();
    const { alias, analytics, error: loaderError } = Route.useLoaderData();

    const timelineData = useMemo(() => {
        if (!analytics?.timeline) return [];
        return analytics.timeline.map(t => ({
            date: t.time,
            clicks: t.count
        }));
    }, [analytics]);

    const browserData = useMemo(() => transformData(analytics?.browsers), [analytics]);
    const osData = useMemo(() => transformData(analytics?.os), [analytics]);
    const deviceData = useMemo(() => transformDeviceData(analytics?.devices), [analytics]);
    const referrerData = useMemo(() => transformData(analytics?.referrers), [analytics]);

    if (loaderError) {
        return (
            <DashboardLayout aliases={aliases || []} selectedAliasId={aliasId} title="Error">
                 <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
                    <p className="text-destructive mb-4">{loaderError}</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </DashboardLayout>
        )
    }

    if (!alias) {
        return (
            <DashboardLayout aliases={aliases || []} selectedAliasId={aliasId} title="Loading...">
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout aliases={aliases || []} selectedAliasId={aliasId} title={alias.code}>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{alias.target}</span>
                            <span>•</span>
                            <span>Created {new Date(alias.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CopyShortUrl code={alias.code} />
                    </div>
                </div>

                {/* Filters */}
                <AnalyticsFilter />

                {/* Primary Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Total Clicks" value={analytics?.total_clicks?.toLocaleString() || 0} icon={<MousePointer2 size={18} />} />
                    <MetricCard title="Unique Visitors" value={analytics?.devices?.reduce((acc, curr) => acc + curr.count, 0)?.toLocaleString() || 0} icon={<Share2 size={18} />} />
                    <MetricCard title="Avg. Time" value="-" icon={<Clock size={18} />} />
                    <MetricCard title="Top Referrer" value={analytics?.referrers?.[0]?.name || "-"} icon={<Share2 size={18} />} />
                </div>

                {/* Main Chart */}
                <Suspense fallback={<Card className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin" /></Card>}>
                    <TrafficChart data={timelineData} interval={interval} />
                </Suspense>

                {/* Secondary Metrics Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <DistributionCard 
                        title="Top Referrers" 
                        subtitle="Top traffic sources" 
                        data={referrerData} 
                    />
                    <Suspense fallback={<Card className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin" /></Card>}>
                        <DeviceChart data={deviceData} />
                    </Suspense>
                    <DistributionCard 
                        title="Browser Usage" 
                        subtitle="Most popular browsers" 
                        data={browserData} 
                    />
                </div>

                {/* Tertiary Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <DistributionCard 
                        title="Operating Systems" 
                        subtitle="Visitor distribution by platform" 
                        data={osData} 
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
