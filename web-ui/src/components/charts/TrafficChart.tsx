import { useState } from 'react'
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

type ChartType = 'bar' | 'line'

type TrafficPoint = {
  date: string
  clicks: number
}

export default function TrafficChart({ data, interval }: { data: TrafficPoint[]; interval?: string }) {
  const [chartType, setChartType] = useState<ChartType>('line')

  const config = {
    clicks: { label: 'Total Clicks', color: 'var(--chart-1)' },
  } satisfies ChartConfig

  const formatXAxis = (value: string) => {
    const date = new Date(value)

    if (interval === 'minute') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (interval === 'hour') return date.toLocaleTimeString('en-US', { hour: 'numeric' })
    if (interval === 'day' || interval === 'week') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    if (interval === 'month') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (interval === 'year') return date.getFullYear().toString()

    return date.toLocaleDateString()
  }

  if (data.length === 0) {
    return (
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Traffic Overview</CardTitle>
          <CardDescription className="text-xs">No click events were recorded for the selected window.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Traffic Overview</CardTitle>
          <CardDescription className="text-xs">Click volume over time ({interval || 'hour'})</CardDescription>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 rounded-md px-2 text-xs',
              chartType === 'line' ? 'bg-muted text-foreground' : 'text-muted-foreground',
            )}
            onClick={() => setChartType('line')}
            title="Line Chart"
          >
            Line
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 rounded-md px-2 text-xs',
              chartType === 'bar' ? 'bg-muted text-foreground' : 'text-muted-foreground',
            )}
            onClick={() => setChartType('bar')}
            title="Bar Chart"
          >
            Bar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={config} className="h-[260px] w-full">
          {chartType === 'line' ? (
            <LineChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={11}
                tickFormatter={formatXAxis}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} fontSize={11} allowDecimals={false} />
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
          ) : (
            <BarChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={11}
                tickFormatter={formatXAxis}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Bar dataKey="clicks" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={8} />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
