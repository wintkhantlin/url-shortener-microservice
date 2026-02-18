import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { 
    MousePointer2, Clock, Share2, Loader2, Copy, ExternalLink, Calendar as CalendarIcon,
    BarChart3, LineChart as LineChartIcon
} from 'lucide-react'
import { 
    Bar, BarChart, Line, LineChart, 
    CartesianGrid, Label, Pie, PieChart, XAxis, YAxis, Cell 
} from 'recharts'
import { z } from 'zod'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
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
import { cn } from "@/lib/utils"

// Hooks & Libs
import { useAliases, type Alias } from '@/hooks/useAliases'

// --- Types ---
const analyticsSearchSchema = z.object({
    interval: z.enum(['minute', 'hour', 'day', 'week', 'month', 'year']).optional().catch('hour'),
    start: z.string().optional(),
    end: z.string().optional(),
})

interface DataItem {
    label: string;
    value: number;
    fill: string;
}

interface AnalyticsResponse {
    total_clicks: number;
    timeline: { time: string; count: number }[];
    browsers: { name: string; count: number }[];
    os: { name: string; count: number }[];
    devices: { name: string; count: number }[];
    countries: { name: string; count: number }[];
    referrers: { name: string; count: number }[];
}

// --- Route Definition ---
export const Route = createFileRoute('/$aliasId')({
    component: DashboardRoute,
    validateSearch: (search) => analyticsSearchSchema.parse(search),
    loaderDeps: ({ search: { interval, start, end } }) => ({ interval, start, end }),
    loader: async (ctx) => {
        const { aliasId } = ctx.params;
        const { interval, start, end } = ctx.deps;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4455/api";

        try {
            // Fetch Alias Details
            const aliasRes = await fetch(`${baseUrl}/management/aliases/${aliasId}`, {
                credentials: "include"
            });

            if (!aliasRes.ok) {
                if (aliasRes.status === 404) return { error: "Alias not found", alias: null, analytics: null };
                if (aliasRes.status === 401) throw redirect({ to: '/auth/login' });
                throw new Error("Failed to fetch alias");
            }

            const alias = await aliasRes.json();

            // Fetch Analytics
            const params = new URLSearchParams();
            if (interval) params.set('interval', interval);
            if (start) params.set('start', start);
            if (end) params.set('end', end);

            const analyticsRes = await fetch(`${baseUrl}/analytics/${aliasId}?${params.toString()}`, {
                credentials: "include"
            });
            
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

// --- Helper Functions ---
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

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

function TrafficChart({ data, interval }: { data: { date: string, clicks: number }[], interval?: string }) {
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
    const config = {
        clicks: { label: "Total Clicks", color: "var(--chart-1)" }
    } satisfies ChartConfig

    const formatXAxis = (value: string) => {
        const date = new Date(value);
        if (interval === 'minute') return date.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
        if (interval === 'hour') return date.toLocaleTimeString("en-US", { hour: 'numeric' });
        if (interval === 'day') return date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
        if (interval === 'week') return date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
        if (interval === 'month') return date.toLocaleDateString("en-US", { month: 'short', year: '2-digit' });
        if (interval === 'year') return date.getFullYear().toString();
        return date.toLocaleDateString();
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className='pb-3 pt-5 px-6 flex flex-row items-center justify-between'>
                <div>
                    <CardTitle className="text-md font-semibold">Traffic Overview</CardTitle>
                    <CardDescription className="text-xs">Click volume over time ({interval || 'hour'})</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-6 w-6 rounded-md", chartType === 'bar' ? "bg-secondary text-foreground" : "text-muted-foreground")}
                        onClick={() => setChartType('bar')}
                        title="Bar Chart"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span className="sr-only">Bar Chart</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-6 w-6 rounded-md", chartType === 'line' ? "bg-secondary text-foreground" : "text-muted-foreground")}
                        onClick={() => setChartType('line')}
                        title="Line Chart"
                    >
                        <LineChartIcon className="h-4 w-4" />
                        <span className="sr-only">Line Chart</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-3 pb-5">
                <ChartContainer config={config} className="aspect-auto h-50 w-full">
                    {chartType === 'bar' ? (
                        <BarChart data={data} margin={{ left: 10, right: 10 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={10} 
                                fontSize={11} 
                                tickFormatter={formatXAxis}
                            />
                            <YAxis tickLine={false} axisLine={false} tickMargin={10} fontSize={11} />
                            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                            <Bar dataKey="clicks" fill="var(--chart-1)" radius={[3, 3, 0, 0]} barSize={6} />
                        </BarChart>
                    ) : (
                        <LineChart data={data} margin={{ left: 10, right: 10 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={10} 
                                fontSize={11} 
                                tickFormatter={formatXAxis}
                            />
                            <YAxis tickLine={false} axisLine={false} tickMargin={10} fontSize={11} />
                            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                            <Line 
                                type="monotone" 
                                dataKey="clicks" 
                                stroke="var(--chart-1)" 
                                strokeWidth={2} 
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                        </LineChart>
                    )}
                </ChartContainer>
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

function DeviceChart({ data }: { data: { device: string, visitors: number, fill: string }[] }) {
    const totalVisitors = useMemo(() => data.reduce((acc, curr) => acc + curr.visitors, 0), [data]);
    const config = { visitors: { label: "Visitors" } } satisfies ChartConfig

    if (totalVisitors === 0) {
        return (
             <Card className="flex items-center justify-center p-6 h-full min-h-[300px]">
                <p className="text-muted-foreground text-sm">No device data available</p>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-md font-semibold">Device Distribution</CardTitle>
                <CardDescription className="text-xs">Breakdown by device type</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
                <ChartContainer config={config} className="mx-auto aspect-square h-45">
                    <PieChart>
                        <Pie data={data} dataKey="visitors" nameKey="device" innerRadius={55} strokeWidth={4} stroke="white">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <Label content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    return (
                                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                                {((data[0]?.visitors / totalVisitors) * 100 || 0).toFixed(0)}%
                                            </tspan>
                                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 15} className="fill-muted-foreground text-[10px] font-medium">
                                                {data[0]?.device || 'Unknown'}
                                            </tspan>
                                        </text>
                                    )
                                }
                            }} />
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <div className="w-full mt-6 grid grid-cols-3 gap-3 border-t pt-6">
                    {data.map(d => (
                        <div key={d.device} className="text-center">
                            <p className="text-[9px] text-muted-foreground capitalize font-medium mb-0.5">{d.device}</p>
                            <p className="text-xs font-bold tracking-tight">{d.visitors.toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
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
    const { data: aliases, isLoading: isLoadingAliases, error: aliasesError } = useAliases();
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

    if (isLoadingAliases) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (aliasesError) return <div className="flex h-screen w-full items-center justify-center text-destructive">Error loading aliases</div>;
    
    if (loaderError || !alias) {
        return (
            <DashboardLayout aliases={aliases || []} selectedAliasId={aliasId} title="Not Found">
                <div className="flex h-full flex-col items-center justify-center gap-4">
                    <h1 className="text-2xl font-bold">Alias not found</h1>
                    <p className="text-muted-foreground">{loaderError || "The requested alias does not exist."}</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout 
            aliases={aliases || []} 
            selectedAliasId={aliasId} 
            title={`Analytics Dashboard: ${alias.code}`}
        >
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                    <CopyShortUrl code={alias.code} />
                    <AnalyticsFilter />
                </div>

                {/* Top Level Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <MetricCard title="Total Clicks" value={analytics?.total_clicks?.toLocaleString() || "0"} icon={<MousePointer2 size={18} />} />
                    <MetricCard title="Avg. Visit Per Day" value="-" icon={<Clock size={18} />} />
                    <MetricCard title="Top Referrer" value={analytics?.referrers?.[0]?.name || "-"} icon={<Share2 size={18} />} />
                </div>

                {/* Main Chart */}
                <TrafficChart data={timelineData} interval={interval} />

                {/* Secondary Metrics Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <DistributionCard 
                        title="Top Referrers" 
                        subtitle="Top traffic sources" 
                        data={referrerData} 
                    />
                    <DeviceChart data={deviceData} />
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
