import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, FilterX } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import AuthControls from "@/components/auth/AuthControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { fetchAdminAnalyticsDashboard, type AnalyticsRecentEvent } from "@/lib/admin-analytics-api";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatDay = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const formatHour = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
  }).format(new Date(value));

const spanOptions = [
  { label: "Last 1 hour", value: "1" },
  { label: "Last 4 hours", value: "4" },
  { label: "Last 12 hours", value: "12" },
  { label: "Last 24 hours", value: "24" },
  { label: "Last 1 week", value: "168" },
  { label: "Last 2 weeks", value: "336" },
];

const chartConfig = {
  events: { label: "Events", color: "hsl(var(--primary))" },
  failures: { label: "Failures", color: "hsl(var(--destructive))" },
};

const frictionEventPattern = /(fail|error|exception|timeout|invalid|reject|denied|blocked|abandon|drop|cancel)/i;
const purchaseFailedEventName = "purchase_failed";

const getDeviceLabel = (event: AnalyticsRecentEvent) => `${event.platform || "unknown"} / ${event.app_version || "unknown"}`;
const normalizeSeverity = (event: AnalyticsRecentEvent) => (event.severity ?? "").trim().toLowerCase();
const isCriticalPurchaseFailure = (event: AnalyticsRecentEvent) =>
  event.event_name === purchaseFailedEventName && normalizeSeverity(event) === "critical";

const topEntries = (rows: Map<string, number>, limit = 8) =>
  [...rows.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

const percentage = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);

const AdminAnalyticsPage = () => {
  const { user, supabaseConfigured } = useAuth();
  const [spanHours, setSpanHours] = useState<number>(1);
  const [eventNameFilter, setEventNameFilter] = useState("");
  const [installFilter, setInstallFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [exactEventFilter, setExactEventFilter] = useState("all");
  const [exactUserFilter, setExactUserFilter] = useState("all");
  const [eventsPage, setEventsPage] = useState(1);

  const dashboardQuery = useQuery({
    queryKey: ["admin-analytics-dashboard", user?.id, spanHours],
    queryFn: () => fetchAdminAnalyticsDashboard({ userId: user?.id, spanHours, limit: 200 }),
    enabled: Boolean(user?.id) && supabaseConfigured,
  });

  const data = dashboardQuery.data;

  const eventNameFilterNormalized = eventNameFilter.trim().toLowerCase();
  const installFilterNormalized = installFilter.trim().toLowerCase();
  const userFilterNormalized = userFilter.trim().toLowerCase();
  const recentEvents = data?.recent_events ?? [];

  const deviceOptions = [...new Set(recentEvents.map((event) => getDeviceLabel(event)))].sort((a, b) => a.localeCompare(b));

  const eventOptions = [...new Set(recentEvents.map((event) => event.event_name))].sort((a, b) => a.localeCompare(b));
  const userOptions = [...new Set(recentEvents.map((event) => event.user_id).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

  const filteredEvents = recentEvents.filter((event) => {
    const eventUserId = event.user_id ?? "anonymous";

    if (deviceFilter !== "all" && getDeviceLabel(event) !== deviceFilter) {
      return false;
    }
    if (exactEventFilter !== "all" && event.event_name !== exactEventFilter) {
      return false;
    }
    if (exactUserFilter === "anonymous" && event.user_id) {
      return false;
    }
    if (exactUserFilter !== "all" && exactUserFilter !== "anonymous" && event.user_id !== exactUserFilter) {
      return false;
    }
    if (eventNameFilterNormalized && !event.event_name.toLowerCase().includes(eventNameFilterNormalized)) {
      return false;
    }
    if (userFilterNormalized && !eventUserId.toLowerCase().includes(userFilterNormalized)) {
      return false;
    }
    if (installFilterNormalized && !(event.install_id ?? "").toLowerCase().includes(installFilterNormalized)) {
      return false;
    }
    return true;
  });
  const eventsPerPage = 20;
  const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / eventsPerPage));
  const clampedEventsPage = Math.min(eventsPage, totalEventPages);
  const paginatedEvents = filteredEvents.slice((clampedEventsPage - 1) * eventsPerPage, clampedEventsPage * eventsPerPage);

  useEffect(() => {
    setEventsPage(1);
  }, [spanHours, eventNameFilter, installFilter, userFilter, deviceFilter, exactEventFilter, exactUserFilter]);

  useEffect(() => {
    if (eventsPage > totalEventPages) {
      setEventsPage(totalEventPages);
    }
  }, [eventsPage, totalEventPages]);

  const uniqueUsers = new Set(filteredEvents.map((event) => event.user_id).filter(Boolean));
  const uniqueInstalls = new Set(filteredEvents.map((event) => event.install_id).filter(Boolean));
  const uniqueEvents = new Set(filteredEvents.map((event) => event.event_name).filter(Boolean));
  const failureEvents = filteredEvents.filter((event) => frictionEventPattern.test(event.event_name));
  const purchaseFailedEvents = filteredEvents.filter((event) => event.event_name === purchaseFailedEventName);
  const criticalPurchaseFailedEvents = purchaseFailedEvents.filter(isCriticalPurchaseFailure);
  const allCriticalPurchaseFailedEvents = recentEvents.filter(isCriticalPurchaseFailure);
  const purchaseFailureRate = percentage(purchaseFailedEvents.length, filteredEvents.length);

  const filteredStats = {
    total: filteredEvents.length,
    users: uniqueUsers.size,
    installs: uniqueInstalls.size,
    uniqueEventNames: uniqueEvents.size,
    failures: failureEvents.length,
    failureRate: percentage(failureEvents.length, filteredEvents.length),
    purchaseFailures: purchaseFailedEvents.length,
    criticalPurchaseFailures: criticalPurchaseFailedEvents.length,
  };

  const useHourlyBuckets = spanHours <= 24;
  const chartRows = new Map<string, { time: string; events: number; failures: number }>();
  for (const event of filteredEvents) {
    const timestamp = new Date(event.created_at).toISOString();
    const key = useHourlyBuckets ? `${timestamp.slice(0, 13)}:00:00.000Z` : `${timestamp.slice(0, 10)}T00:00:00.000Z`;
    const current = chartRows.get(key) ?? { time: key, events: 0, failures: 0 };
    current.events += 1;
    if (frictionEventPattern.test(event.event_name)) {
      current.failures += 1;
    }
    chartRows.set(key, current);
  }
  const dailyChartData = [...chartRows.values()].sort((a, b) => a.time.localeCompare(b.time));

  const topEventCounts = new Map<string, number>();
  for (const event of filteredEvents) {
    topEventCounts.set(event.event_name, (topEventCounts.get(event.event_name) ?? 0) + 1);
  }
  const topEventRows = topEntries(topEventCounts, 10);

  const platformCounts = new Map<string, number>();
  for (const event of filteredEvents) {
    const platform = event.platform || "unknown";
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  }
  const platformRows = topEntries(platformCounts, 10);

  const frictionCounts = new Map<string, number>();
  for (const event of filteredEvents) {
    if (frictionEventPattern.test(event.event_name)) {
      frictionCounts.set(event.event_name, (frictionCounts.get(event.event_name) ?? 0) + 1);
    }
  }
  const frictionRows = topEntries(frictionCounts, 10);

  const purchaseFailureCodeCounts = new Map<string, number>();
  const purchaseFailureProductCounts = new Map<string, number>();
  for (const event of purchaseFailedEvents) {
    const errorCode = event.error_code || "unknown_error_code";
    purchaseFailureCodeCounts.set(errorCode, (purchaseFailureCodeCounts.get(errorCode) ?? 0) + 1);

    const productId = event.purchase_product_id || "unknown_product";
    purchaseFailureProductCounts.set(productId, (purchaseFailureProductCounts.get(productId) ?? 0) + 1);
  }
  const purchaseFailureCodeRows = topEntries(purchaseFailureCodeCounts, 10);
  const purchaseFailureProductRows = topEntries(purchaseFailureProductCounts, 10);

  const installRows = new Map<string, { installId: string; total: number; failures: number }>();
  for (const event of filteredEvents) {
    const installId = event.install_id || "unknown";
    const current = installRows.get(installId) ?? { installId, total: 0, failures: 0 };
    current.total += 1;
    if (frictionEventPattern.test(event.event_name)) {
      current.failures += 1;
    }
    installRows.set(installId, current);
  }
  const installHotspots = [...installRows.values()]
    .sort((a, b) => (b.failures === a.failures ? b.total - a.total : b.failures - a.failures))
    .slice(0, 10);

  const purchaseFailureInstallCounts = new Map<string, number>();
  for (const event of purchaseFailedEvents) {
    const installId = event.install_id || "unknown";
    purchaseFailureInstallCounts.set(installId, (purchaseFailureInstallCounts.get(installId) ?? 0) + 1);
  }
  const purchaseFailureInstallRows = topEntries(purchaseFailureInstallCounts, 10);

  const userEventCounts = new Map<string, number>();
  for (const event of filteredEvents) {
    const userId = event.user_id || "anonymous";
    userEventCounts.set(userId, (userEventCounts.get(userId) ?? 0) + 1);
  }
  const topUserRows = topEntries(userEventCounts, 10);

  const insights: string[] = [];
  if (filteredStats.total === 0) {
    insights.push("No events match the current filters. Broaden filters to inspect activity and friction.");
  } else {
    const topEvent = topEventRows[0];
    if (topEvent) {
      const share = percentage(topEvent.count, filteredStats.total);
      if (share >= 45) {
        insights.push(`"${topEvent.label}" is dominating activity (${share.toFixed(1)}% of filtered events).`);
      }
    }

    if (filteredStats.failureRate >= 20) {
      insights.push(`Failure-like events are elevated at ${filteredStats.failureRate.toFixed(1)}% of filtered traffic.`);
    } else if (filteredStats.failureRate > 0) {
      insights.push(`Failure-like events are ${filteredStats.failureRate.toFixed(1)}% of filtered traffic.`);
    }

    if (filteredStats.criticalPurchaseFailures > 0) {
      insights.push(`${filteredStats.criticalPurchaseFailures} critical purchase_failed events detected in the filtered sample.`);
    } else if (filteredStats.purchaseFailures > 0) {
      insights.push(`${filteredStats.purchaseFailures} purchase_failed events detected (${purchaseFailureRate.toFixed(1)}% of filtered events).`);
    }

    if (installHotspots[0] && installHotspots[0].failures >= 3) {
      insights.push(`Install "${installHotspots[0].installId}" has repeated friction (${installHotspots[0].failures} failure-like events).`);
    }

    const oneEventInstalls = installHotspots.filter((row) => row.total === 1).length;
    if (oneEventInstalls > 0 && filteredStats.installs > 0) {
      const quickDropRate = percentage(oneEventInstalls, filteredStats.installs);
      if (quickDropRate >= 35) {
        insights.push(`${quickDropRate.toFixed(1)}% of installs in this sample produced only one event (possible early drop-off).`);
      }
    }

    if (insights.length === 0) {
      insights.push("No high-severity friction patterns detected in the current filtered sample.");
    }
  }

  const clearFilters = () => {
    setEventNameFilter("");
    setInstallFilter("");
    setUserFilter("");
    setDeviceFilter("all");
    setExactEventFilter("all");
    setExactUserFilter("all");
  };

  const globalFailureRate = percentage(data?.summary.totals.failures ?? 0, data?.summary.totals.events ?? 0);
  const latestCriticalPurchaseFailure = [...allCriticalPurchaseFailedEvents].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  const latestFilteredPurchaseFailure = [...purchaseFailedEvents].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const pageStart = filteredEvents.length === 0 ? 0 : (clampedEventsPage - 1) * eventsPerPage + 1;
  const pageEnd = Math.min(clampedEventsPage * eventsPerPage, filteredEvents.length);

  const pageWindow: number[] = [];
  const windowStart = Math.max(1, clampedEventsPage - 2);
  const windowEnd = Math.min(totalEventPages, clampedEventsPage + 2);
  for (let page = windowStart; page <= windowEnd; page += 1) {
    pageWindow.push(page);
  }

  if (!supabaseConfigured) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-destructive">Supabase not configured.</div>;
  }

  if (!user) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Log in as admin to view analytics.</div>;
  }

  if (dashboardQuery.isLoading) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Loading admin analytics...</div>;
  }

  if (dashboardQuery.error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-destructive">
        {dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Could not load analytics."}
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">No analytics data found.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <Link to="/features" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to forum
          </Link>
          <div className="flex items-center gap-2">
            <Select value={String(spanHours)} onValueChange={(value) => setSpanHours(Number(value))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Time span" />
              </SelectTrigger>
              <SelectContent>
                {spanOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AuthControls />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Range: {formatDateTime(data.summary.from)} to {formatDateTime(data.summary.to)}
          </p>
          <p className="text-xs text-muted-foreground">
            Filter controls apply to the recent events sample ({recentEvents.length.toLocaleString()} rows).
          </p>
        </div>

        {allCriticalPurchaseFailedEvents.length > 0 ? (
          <Card className="border-destructive/60 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Critical purchase failures detected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Found {allCriticalPurchaseFailedEvents.length.toLocaleString()} critical `purchase_failed` events in the current time range sample.
              </p>
              {latestCriticalPurchaseFailure ? (
                <p className="text-muted-foreground">
                  Latest: {formatDateTime(latestCriticalPurchaseFailure.created_at)}
                  {latestCriticalPurchaseFailure.error_code ? ` • code: ${latestCriticalPurchaseFailure.error_code}` : ""}
                  {latestCriticalPurchaseFailure.purchase_product_id ? ` • product: ${latestCriticalPurchaseFailure.purchase_product_id}` : ""}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => setExactEventFilter(purchaseFailedEventName)}>
                  Focus purchase_failed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEventNameFilter("");
                    setInstallFilter("");
                    setUserFilter("");
                    setDeviceFilter("all");
                    setExactUserFilter("all");
                  }}
                >
                  Keep only event filter
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <Input
              value={eventNameFilter}
              onChange={(event) => setEventNameFilter(event.target.value)}
              placeholder="Event name contains..."
            />
            <Input
              value={installFilter}
              onChange={(event) => setInstallFilter(event.target.value)}
              placeholder="Install id contains..."
            />
            <Input value={userFilter} onChange={(event) => setUserFilter(event.target.value)} placeholder="User id contains..." />
            <Select value={exactEventFilter} onValueChange={setExactEventFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Exact event name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event names</SelectItem>
                {eventOptions.map((eventName) => (
                  <SelectItem key={eventName} value={eventName}>
                    {eventName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Device (platform/app)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All devices</SelectItem>
                {deviceOptions.map((device) => (
                  <SelectItem key={device} value={device}>
                    {device}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exactUserFilter} onValueChange={setExactUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Exact user id" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="anonymous">Anonymous (no user_id)</SelectItem>
                {userOptions.map((userId) => (
                  <SelectItem key={userId} value={userId}>
                    {userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} className="justify-start gap-2 xl:justify-center">
              <FilterX className="h-4 w-4" />
              Clear filters
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Global Events</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{data.summary.totals.events.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Global Users</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{data.summary.totals.users.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Global Failure Rate</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{globalFailureRate.toFixed(1)}%</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Events</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{filteredStats.total.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Users</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{filteredStats.users.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Installs</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{filteredStats.installs.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Unique Events</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{filteredStats.uniqueEventNames.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Friction</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{filteredStats.failureRate.toFixed(1)}%</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Failed</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{filteredStats.purchaseFailures.toLocaleString()}</CardContent>
          </Card>
          <Card className={filteredStats.criticalPurchaseFailures > 0 ? "border-destructive/50" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Purchase Failed</CardTitle>
            </CardHeader>
            <CardContent className={filteredStats.criticalPurchaseFailures > 0 ? "text-2xl font-semibold text-destructive" : "text-2xl font-semibold"}>
              {filteredStats.criticalPurchaseFailures.toLocaleString()}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daily Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-[280px] w-full" config={chartConfig}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={spanHours <= 24 ? formatHour : formatDay}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="events" stroke="var(--color-events)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="failures" stroke="var(--color-failures)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actionable Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {insights.map((insight, index) => (
                <div key={`${insight}-${index}`} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                  <p>{insight}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Top Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {topEventRows.length === 0 ? <p className="text-muted-foreground">No events in this filtered range.</p> : null}
              {topEventRows.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded bg-muted">
                    <div
                      className="h-1.5 rounded bg-primary"
                      style={{ width: `${percentage(row.count, filteredStats.total).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {platformRows.length === 0 ? <p className="text-muted-foreground">No platform data in this filtered range.</p> : null}
              {platformRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="truncate text-muted-foreground">{row.label}</span>
                  <Badge variant="outline">{row.count.toLocaleString()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {topUserRows.length === 0 ? <p className="text-muted-foreground">No user activity in this filtered range.</p> : null}
              {topUserRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="max-w-[320px] truncate text-muted-foreground">{row.label}</span>
                  <Badge variant="outline">{row.count.toLocaleString()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Friction Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {frictionRows.length === 0 ? <p className="text-muted-foreground">No failure-like event names matched in this filtered range.</p> : null}
              {frictionRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="truncate text-muted-foreground">{row.label}</span>
                  <Badge variant="destructive">{row.count.toLocaleString()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Install Hotspots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {installHotspots.length === 0 ? <p className="text-muted-foreground">No install activity in this filtered range.</p> : null}
              {installHotspots.map((row) => (
                <div key={row.installId} className="flex items-center justify-between gap-2">
                  <span className="max-w-[320px] truncate text-muted-foreground">{row.installId}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{row.total} events</Badge>
                    <Badge variant={row.failures > 0 ? "destructive" : "secondary"}>{row.failures} friction</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Failure Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Latest purchase_failed</p>
                {latestFilteredPurchaseFailure ? (
                  <div className="mt-1 space-y-1">
                    <p>{formatDateTime(latestFilteredPurchaseFailure.created_at)}</p>
                    <p className="text-muted-foreground">
                      Severity: {latestFilteredPurchaseFailure.severity || "unknown"}
                      {latestFilteredPurchaseFailure.error_code ? ` • Code: ${latestFilteredPurchaseFailure.error_code}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      Product: {latestFilteredPurchaseFailure.purchase_product_id || "unknown"}
                      {latestFilteredPurchaseFailure.purchase_storefront ? ` • Storefront: ${latestFilteredPurchaseFailure.purchase_storefront}` : ""}
                    </p>
                    {latestFilteredPurchaseFailure.error_message ? (
                      <p className="line-clamp-2 text-muted-foreground">Message: {latestFilteredPurchaseFailure.error_message}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">No purchase_failed events in this filtered range.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Top purchase failure codes</p>
                {purchaseFailureCodeRows.length === 0 ? <p className="text-muted-foreground">No error codes found.</p> : null}
                {purchaseFailureCodeRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{row.label}</span>
                    <Badge variant="destructive">{row.count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Top affected products</p>
                {purchaseFailureProductRows.length === 0 ? <p className="text-muted-foreground">No product metadata found.</p> : null}
                {purchaseFailureProductRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{row.label}</span>
                    <Badge variant="outline">{row.count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Failure Installs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {purchaseFailureInstallRows.length === 0 ? <p className="text-muted-foreground">No purchase failure installs in this filtered range.</p> : null}
              {purchaseFailureInstallRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="max-w-[320px] truncate text-muted-foreground">{row.label}</span>
                  <Badge variant="destructive">{row.count.toLocaleString()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Purchase Context</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Locale</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Install</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No events in this filtered range.
                    </TableCell>
                  </TableRow>
                ) : null}
                {paginatedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatDateTime(event.created_at)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{event.event_name}</span>
                      {event.error_code ? <p className="text-xs text-muted-foreground">Code: {event.error_code}</p> : null}
                    </TableCell>
                    <TableCell>
                      {event.severity ? (
                        <Badge variant={normalizeSeverity(event) === "critical" ? "destructive" : "outline"}>{event.severity}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      {event.event_name === purchaseFailedEventName ? (
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <p className="truncate">{event.purchase_product_id || "unknown product"}</p>
                          <p className="truncate">{event.error_message || event.error_code || "no failure message"}</p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {event.platform || "unknown"} / {event.app_version || "unknown"}
                    </TableCell>
                    <TableCell>{event.locale || "-"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{event.user_id || "-"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{event.install_id || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {pageStart}-{pageEnd} of {filteredEvents.length.toLocaleString()} events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clampedEventsPage <= 1}
                  onClick={() => setEventsPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                {windowStart > 1 ? (
                  <>
                    <Button variant={clampedEventsPage === 1 ? "default" : "outline"} size="sm" onClick={() => setEventsPage(1)}>
                      1
                    </Button>
                    {windowStart > 2 ? <span className="px-1 text-xs text-muted-foreground">...</span> : null}
                  </>
                ) : null}
                {pageWindow.map((page) => (
                  <Button
                    key={page}
                    variant={clampedEventsPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEventsPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                {windowEnd < totalEventPages ? (
                  <>
                    {windowEnd < totalEventPages - 1 ? <span className="px-1 text-xs text-muted-foreground">...</span> : null}
                    <Button
                      variant={clampedEventsPage === totalEventPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEventsPage(totalEventPages)}
                    >
                      {totalEventPages}
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clampedEventsPage >= totalEventPages}
                  onClick={() => setEventsPage((current) => Math.min(totalEventPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAnalyticsPage;
