import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MousePointer, TrendingUp, Clock } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { HomepageHeatmap } from "@/components/admin/dashboard/HomepageHeatmap";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const ButtonClicks = () => {
  const [dateRange, setDateRange] = useState("7");

  const { data: clicks, isLoading } = useQuery({
    queryKey: ["button-clicks", dateRange],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
      const { data, error } = await supabase
        .from("button_clicks")
        .select("*")
        .gte("clicked_at", startDate.toISOString())
        .order("clicked_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Group by button name for summary
  const buttonSummary = clicks?.reduce((acc, click) => {
    acc[click.button_name] = (acc[click.button_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Group by location for pie chart
  const locationSummary = clicks?.reduce((acc, click) => {
    acc[click.button_location] = (acc[click.button_location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Group by day for trend chart
  const dailyClicks = clicks?.reduce((acc, click) => {
    const day = format(new Date(click.clicked_at), "MMM d");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const chartData = Object.entries(buttonSummary)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const locationChartData = Object.entries(locationSummary)
    .map(([name, value]) => ({ name, value }));

  const trendData = Object.entries(dailyClicks)
    .map(([date, clicks]) => ({ date, clicks }))
    .reverse();

  const totalClicks = clicks?.length || 0;
  const uniqueButtons = Object.keys(buttonSummary).length;
  const topButton = chartData[0]?.name || "N/A";

  return (
    <AdminLayout title="Button Click Tracking">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Button Click Tracking</h1>
            <p className="text-muted-foreground mt-1">
              Track where visitors are clicking on your homepage
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Buttons</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueButtons}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Button</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{topButton}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg/Day</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(totalClicks / parseInt(dateRange)).toFixed(1)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Clicks by Button</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clicks by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={locationChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {locationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Homepage Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Homepage Section Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <HomepageHeatmap locationData={locationSummary} totalClicks={totalClicks} />
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Click Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="clicks" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Clicks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : clicks && clicks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Button</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clicks.slice(0, 50).map((click) => (
                    <TableRow key={click.id}>
                      <TableCell className="font-medium">{click.button_name}</TableCell>
                      <TableCell>{click.button_location}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {click.destination_url || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(click.clicked_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No button clicks recorded yet. Clicks will appear here once visitors start interacting with the homepage.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ButtonClicks;
