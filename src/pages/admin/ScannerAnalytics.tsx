import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScannerHeatmap } from '@/components/admin/dashboard/ScannerHeatmap';
import { 
  ScanLine, 
  Mail, 
  Percent, 
  MapPin, 
  Download, 
  TrendingUp,
  Building2,
  Thermometer,
  Fan,
  Wind,
  Package,
  BarChart3,
  Map
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

// Equipment type normalization mapping
const normalizeEquipmentType = (type: string | null): string => {
  if (!type) return 'Unknown';
  
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('heat pump') && (lowerType.includes('mini') || lowerType.includes('ductless'))) {
    return 'Mini-Split Heat Pump';
  }
  if (lowerType.includes('heat pump')) return 'Heat Pump';
  if (lowerType.includes('furnace') || lowerType.includes('gas')) return 'Furnace';
  if (lowerType.includes('air handler')) return 'Air Handler';
  if (lowerType.includes('package') || lowerType.includes('rooftop')) return 'Package Unit';
  if (lowerType.includes('evaporator') || lowerType.includes('coil')) return 'Evaporator Coil';
  if (lowerType.includes('condenser') || lowerType.includes('air conditioner') || lowerType.includes('central ac')) {
    return 'Air Conditioner';
  }
  if (lowerType.includes('mini') || lowerType.includes('ductless') || lowerType.includes('split')) {
    return 'Mini-Split';
  }
  
  return type;
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

const equipmentIcons: Record<string, React.ReactNode> = {
  'Air Conditioner': <Thermometer className="h-4 w-4" />,
  'Heat Pump': <Fan className="h-4 w-4" />,
  'Furnace': <Thermometer className="h-4 w-4" />,
  'Mini-Split': <Wind className="h-4 w-4" />,
  'Mini-Split Heat Pump': <Wind className="h-4 w-4" />,
  'Package Unit': <Package className="h-4 w-4" />,
  'Air Handler': <Fan className="h-4 w-4" />,
  'Evaporator Coil': <Building2 className="h-4 w-4" />,
};

export default function ScannerAnalytics() {
  const [dateRange, setDateRange] = useState('30');

  const startDate = useMemo(() => {
    const days = parseInt(dateRange);
    return startOfDay(subDays(new Date(), days)).toISOString();
  }, [dateRange]);

  // Fetch all scanner data
  const { data: scans, isLoading } = useQuery({
    queryKey: ['scanner-analytics', startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_scans')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!scans) return null;

    const totalScans = scans.length;
    const emailCaptures = scans.filter(s => s.email).length;
    const conversionRate = totalScans > 0 ? ((emailCaptures / totalScans) * 100).toFixed(1) : '0';
    const dfwScans = scans.filter(s => s.is_dfw).length;
    const dfwLeads = scans.filter(s => s.is_dfw && s.email).length;

    return { totalScans, emailCaptures, conversionRate, dfwScans, dfwLeads };
  }, [scans]);

  // Equipment type breakdown
  const equipmentTypeData = useMemo(() => {
    if (!scans) return [];

    const typeCounts: Record<string, number> = {};
    scans.forEach(scan => {
      const normalizedType = normalizeEquipmentType(scan.equipment_type);
      typeCounts[normalizedType] = (typeCounts[normalizedType] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count, percentage: ((count / scans.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [scans]);

  // Zip code analysis
  const zipCodeData = useMemo(() => {
    if (!scans) return [];

    const zipCounts: Record<string, { count: number; city: string | null; state: string | null; isDfw: boolean }> = {};
    scans.forEach(scan => {
      if (!scan.zip_code) return;
      if (!zipCounts[scan.zip_code]) {
        zipCounts[scan.zip_code] = { count: 0, city: scan.city, state: scan.state, isDfw: scan.is_dfw || false };
      }
      zipCounts[scan.zip_code].count++;
    });

    return Object.entries(zipCounts)
      .map(([zip, data]) => ({ zip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [scans]);

  // DFW vs Non-DFW breakdown
  const dfwBreakdown = useMemo(() => {
    if (!scans) return [];

    const dfwCount = scans.filter(s => s.is_dfw).length;
    const nonDfwCount = scans.length - dfwCount;

    return [
      { name: 'DFW Service Area', value: dfwCount },
      { name: 'Outside Service Area', value: nonDfwCount },
    ];
  }, [scans]);

  // Brand distribution
  const brandData = useMemo(() => {
    if (!scans) return [];

    const brandCounts: Record<string, number> = {};
    scans.forEach(scan => {
      const brand = scan.brand || 'Unknown';
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });

    return Object.entries(brandCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [scans]);

  // Daily trend data
  const trendData = useMemo(() => {
    if (!scans) return [];

    const days = parseInt(dateRange);
    const dailyCounts: Record<string, { scans: number; emails: number }> = {};

    // Initialize all days
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyCounts[date] = { scans: 0, emails: 0 };
    }

    // Count scans per day
    scans.forEach(scan => {
      const date = format(parseISO(scan.created_at!), 'yyyy-MM-dd');
      if (dailyCounts[date]) {
        dailyCounts[date].scans++;
        if (scan.email) dailyCounts[date].emails++;
      }
    });

    return Object.entries(dailyCounts).map(([date, counts]) => ({
      date: format(parseISO(date), 'MMM d'),
      scans: counts.scans,
      emails: counts.emails,
    }));
  }, [scans, dateRange]);

  // Export to CSV
  const exportCSV = () => {
    if (!scans) return;

    const headers = ['Date', 'Zip Code', 'City', 'State', 'DFW', 'Equipment Type', 'Brand', 'Model', 'Email Captured'];
    const rows = scans.map(scan => [
      scan.created_at ? format(parseISO(scan.created_at), 'yyyy-MM-dd HH:mm') : '',
      scan.zip_code,
      scan.city || '',
      scan.state || '',
      scan.is_dfw ? 'Yes' : 'No',
      scan.equipment_type || '',
      scan.brand || '',
      scan.model_number,
      scan.email ? 'Yes' : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanner-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AdminLayout title="Scanner Analytics">
      {/* Page Description */}
      <p className="text-muted-foreground mb-6">Track equipment scans, conversions, and geographic data</p>
      <div className="flex items-center justify-between mb-6">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={exportCSV} disabled={!scans?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <ScanLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalScans || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Captures</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.emailCaptures || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.conversionRate}%</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DFW Scans</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.dfwScans || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DFW Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-primary">{stats?.dfwLeads || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Equipment Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Equipment Types Scanned
            </CardTitle>
            <CardDescription>Breakdown of equipment categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : equipmentTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={equipmentTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No scan data available</p>
            )}
          </CardContent>
        </Card>

        {/* DFW vs Non-DFW Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Area Distribution
            </CardTitle>
            <CardDescription>DFW vs outside service area</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : dfwBreakdown.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dfwBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {dfwBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No scan data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Scan Trends Over Time
          </CardTitle>
          <CardDescription>Daily scans and email captures</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="scans" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Total Scans"
                />
                <Line 
                  type="monotone" 
                  dataKey="emails" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Email Captures"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No trend data available</p>
          )}
        </CardContent>
      </Card>

      {/* DFW Heatmap */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            DFW Scanner Activity Heatmap
          </CardTitle>
          <CardDescription>Geographic visualization of equipment scans across zip codes</CardDescription>
        </CardHeader>
        <CardContent>
          <ScannerHeatmap 
            zipCodeData={zipCodeData.map(z => ({
              zip: z.zip,
              count: z.count,
              city: z.city,
              isDfw: z.isDfw
            }))} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equipment Type Table */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Type Breakdown</CardTitle>
            <CardDescription>Detailed counts by category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : equipmentTypeData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentTypeData.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="flex items-center gap-2">
                        {equipmentIcons[item.name] || <Package className="h-4 w-4" />}
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Top Zip Codes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Zip Codes</CardTitle>
            <CardDescription>Most scanned locations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : zipCodeData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zip Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Area</TableHead>
                    <TableHead className="text-right">Scans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zipCodeData.map((item) => (
                    <TableRow key={item.zip}>
                      <TableCell className="font-mono">{item.zip}</TableCell>
                      <TableCell>{item.city ? `${item.city}, ${item.state}` : '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.isDfw ? 'default' : 'secondary'}>
                          {item.isDfw ? 'DFW' : 'Outside'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Brand Distribution Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Brands Scanned</CardTitle>
            <CardDescription>Most common equipment manufacturers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : brandData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brandData.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Scanner to lead pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stats ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Scans</span>
                    <span className="font-medium">{stats.totalScans}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>DFW Service Area</span>
                    <span className="font-medium">{stats.dfwScans} ({stats.totalScans > 0 ? ((stats.dfwScans / stats.totalScans) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-chart-2" 
                      style={{ width: stats.totalScans > 0 ? `${(stats.dfwScans / stats.totalScans) * 100}%` : '0%' }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Email Captured</span>
                    <span className="font-medium">{stats.emailCaptures} ({stats.conversionRate}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-chart-3" 
                      style={{ width: stats.totalScans > 0 ? `${(stats.emailCaptures / stats.totalScans) * 100}%` : '0%' }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-primary">DFW Leads (Qualified)</span>
                    <span className="font-bold text-primary">{stats.dfwLeads}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: stats.totalScans > 0 ? `${(stats.dfwLeads / stats.totalScans) * 100}%` : '0%' }} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
